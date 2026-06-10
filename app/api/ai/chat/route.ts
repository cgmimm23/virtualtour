// POST /api/ai/chat — public buyer chatbot for the share-mode tour viewer.
// Body: { tourSlug, sessionId, message, email?, name? }
// No auth required (it's the public viewer). We persist the conversation in
// tour_chats keyed on tourId+sessionId for the leads dashboard.

import { NextResponse } from "next/server";
import { z } from "zod";
import { answerBuyerQuestion, type VisionAttachment } from "@/lib/ai/chatbot";
import { prisma } from "@/lib/db";
import { resolveImageUrl } from "@/lib/r2/resolve";

const Body = z.object({
  tourSlug: z.string().min(1).max(120),
  sessionId: z.string().min(8).max(80),
  message: z.string().min(1).max(2000),
  email: z.string().email().max(160).optional(),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 },
    );
  }

  const tour = await prisma.tours.findFirst({
    where: { slug: parsed.data.tourSlug, status: "published" },
  });
  if (!tour) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  // Scenes + hotspots. The hotspot label / payload text is often the highest-
  // signal content the agent has authored ("new appliances 2023", "Bosch
  // dishwasher"). Two queries because PostgREST can't disambiguate hotspot
  // relations cleanly here; faster + simpler to just stitch in JS.
  const scenes = await prisma.scenes.findMany({
    where: { tour_id: tour.id },
    select: { id: true, name: true, floor: true, order_index: true, source_image_url: true },
    orderBy: { order_index: "asc" },
  });
  const sceneIds = scenes.map((s) => s.id);
  const hotspotsRaw =
    sceneIds.length > 0
      ? await prisma.hotspots.findMany({
          where: { scene_id: { in: sceneIds } },
          select: { scene_id: true, label: true, type: true, payload: true },
        })
      : [];
  const hotspotsByScene = new Map<string, Array<{ label: string; type: string; payload: unknown }>>();
  for (const h of hotspotsRaw ?? []) {
    if (!hotspotsByScene.has(h.scene_id)) hotspotsByScene.set(h.scene_id, []);
    hotspotsByScene.get(h.scene_id)!.push({ label: h.label, type: h.type, payload: h.payload });
  }

  const sceneHotspots = (sceneId: string) => {
    return (hotspotsByScene.get(sceneId) ?? [])
      .map((h) => {
        const payload =
          h?.payload && typeof h.payload === "object"
            ? (h.payload as Record<string, unknown>)
            : null;
        const info =
          h.type === "info" && typeof payload?.bodyMarkdown === "string"
            ? payload.bodyMarkdown
            : h.type === "url" && typeof payload?.url === "string"
              ? `Link: ${payload.url}`
              : undefined;
        return { label: h.label, info };
      })
      .filter((h) => h.label?.trim());
  };

  // Load or create the chat session.
  const existing = await prisma.tour_chats.findUnique({
    where: { tour_id_session_id: { tour_id: tour.id, session_id: parsed.data.sessionId } },
    select: { id: true, messages: true, email: true, name: true, message_count: true },
  });

  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(
    existing?.messages,
  )
    ? (existing!.messages as Array<{ role: "user" | "assistant"; content: string }>)
    : [];

  history.push({ role: "user", content: parsed.data.message });

  // Vision-on-demand: if the buyer mentioned a specific room by name, include
  // that scene's image as a Claude vision attachment on this turn — but only
  // if no prior user message in this session already mentioned it (we
  // approximate that with a substring scan of historical user messages).
  const lowerMsg = parsed.data.message.toLowerCase();
  const earlierUserText = history
    .slice(0, -1) // exclude the message just pushed
    .filter((t) => t.role === "user")
    .map((t) => t.content.toLowerCase())
    .join(" ");
  const attachments: VisionAttachment[] = [];
  for (const s of scenes ?? []) {
    const name = s.name?.trim();
    if (!name || name.length < 3) continue;
    const needle = name.toLowerCase();
    // Only attach if the current message mentions it AND prior messages
    // didn't. Cap at 2 attachments per turn to keep cost bounded.
    if (lowerMsg.includes(needle) && !earlierUserText.includes(needle)) {
      const url = await resolveImageUrl(s.source_image_url);
      if (url) attachments.push({ sceneName: name, imageUrl: url });
      if (attachments.length >= 2) break;
    }
  }

  let answer = "";
  try {
    answer = await answerBuyerQuestion(
      {
        title: tour.title,
        propertyAddress: tour.property_address ?? "",
        scenes: (scenes ?? []).map((s) => ({
          name: s.name,
          floor: s.floor ?? undefined,
          hotspots: sceneHotspots(s.id),
        })),
        highlights: Array.isArray(tour.highlights) ? tour.highlights : undefined,
        agent: tour.branding
          ? {
              name: (tour.branding as Record<string, string>).agentName,
              brokerage: (tour.branding as Record<string, string>).brokerageName,
              email: (tour.branding as Record<string, string>).agentEmail,
              phone: (tour.branding as Record<string, string>).agentPhone,
            }
          : undefined,
        details:
          tour.details && typeof tour.details === "object"
            ? (tour.details as Record<string, number | string>)
            : undefined,
        description: tour.ai_description ?? undefined,
        mlsDescription: tour.mls_description ?? undefined,
        qAndA: Array.isArray(tour.q_and_a)
          ? (tour.q_and_a as Array<{ q: string; a: string }>)
          : undefined,
        externalSources: Array.isArray(tour.external_sources)
          ? (tour.external_sources as Array<{ url: string; content: string }>).map((s) => ({
              url: s.url,
              content: s.content,
            }))
          : undefined,
      },
      history,
      attachments,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  history.push({ role: "assistant", content: answer });

  // Upsert the conversation.
  const upsertEmail = parsed.data.email ?? existing?.email ?? null;
  const upsertName = parsed.data.name ?? existing?.name ?? null;

  if (existing) {
    await prisma.tour_chats.update({
      where: { id: existing.id },
      data: {
        messages: history,
        message_count: (existing.message_count ?? 0) + 2,
        email: upsertEmail,
        name: upsertName,
      },
    });
  } else {
    await prisma.tour_chats.create({
      data: {
        tour_id: tour.id,
        session_id: parsed.data.sessionId,
        messages: history,
        message_count: 2,
        email: upsertEmail,
        name: upsertName,
        user_agent: req.headers.get("user-agent"),
        referrer: req.headers.get("referer"),
      },
    });
  }

  // If the buyer just left their email AND we don't already have a lead for
  // them on this tour, write one.
  if (parsed.data.email && !existing?.email) {
    const dupe = await prisma.leads.findFirst({
      where: { tour_id: tour.id, email: parsed.data.email },
      select: { id: true },
    });
    if (!dupe) {
      await prisma.leads.create({
        data: {
          tour_id: tour.id,
          email: parsed.data.email,
          name: parsed.data.name ?? null,
          source: "in_scene_contact", // closest existing source value
          scenes_viewed: 0,
          duration_ms: 0,
        },
      });
    }
  }

  return NextResponse.json({ reply: answer });
}
