// POST /api/ai/chat — public buyer chatbot for the share-mode tour viewer.
// Body: { tourSlug, sessionId, message, email?, name? }
// No auth required (it's the public viewer). We persist the conversation in
// tour_chats keyed on tourId+sessionId for the leads dashboard.

import { NextResponse } from "next/server";
import { z } from "zod";
import { answerBuyerQuestion } from "@/lib/ai/chatbot";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const supabase = createAdminClient();
  const { data: tour } = await supabase
    .from("tours")
    .select("*")
    .eq("slug", parsed.data.tourSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!tour) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  const { data: scenes } = await supabase
    .from("scenes")
    .select("name, floor, order_index")
    .eq("tour_id", tour.id)
    .order("order_index");

  // Load or create the chat session.
  const { data: existing } = await supabase
    .from("tour_chats")
    .select("id, messages, email, name, message_count")
    .eq("tour_id", tour.id)
    .eq("session_id", parsed.data.sessionId)
    .maybeSingle();

  const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(
    existing?.messages,
  )
    ? (existing!.messages as Array<{ role: "user" | "assistant"; content: string }>)
    : [];

  history.push({ role: "user", content: parsed.data.message });

  let answer = "";
  try {
    answer = await answerBuyerQuestion(
      {
        title: tour.title,
        propertyAddress: tour.property_address ?? "",
        scenes:
          (scenes ?? []).map((s) => ({ name: s.name, floor: s.floor ?? undefined })),
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
      },
      history,
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
    await supabase
      .from("tour_chats")
      .update({
        messages: history,
        message_count: (existing.message_count ?? 0) + 2,
        email: upsertEmail,
        name: upsertName,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("tour_chats").insert({
      tour_id: tour.id,
      session_id: parsed.data.sessionId,
      messages: history,
      message_count: 2,
      email: upsertEmail,
      name: upsertName,
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
    });
  }

  // If the buyer just left their email AND we don't already have a lead for
  // them on this tour, write one.
  if (parsed.data.email && !existing?.email) {
    const { data: dupe } = await supabase
      .from("leads")
      .select("id")
      .eq("tour_id", tour.id)
      .eq("email", parsed.data.email)
      .maybeSingle();
    if (!dupe) {
      await supabase.from("leads").insert({
        tour_id: tour.id,
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        source: "in_scene_contact", // closest existing source value
        scenes_viewed: 0,
        duration_ms: 0,
      });
    }
  }

  return NextResponse.json({ reply: answer });
}
