// POST /api/ai/lead-score — score a lead. Owner/admin or platform-admin.
// Caches result on the lead row (ai_score, ai_reason, ai_scored_at).

import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreLead } from "@/lib/ai/lead-score";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({ leadId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad input" }, { status: 400 });
  }

  const lead = await prisma.leads.findUnique({
    where: { id: parsed.data.leadId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      preferred_time: true,
      source: true,
      scenes_viewed: true,
      duration_ms: true,
      captured_at: true,
      tour_id: true,
    },
  });
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const tour = await prisma.tours.findUnique({
    where: { id: lead.tour_id },
    select: { team_id: true, details: true, status: true },
  });
  if (!tour) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  const admin = await isPlatformAdmin();
  if (!admin) {
    const membership = await prisma.team_members.findUnique({
      where: { team_id_user_id: { team_id: tour.team_id, user_id: user.id } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const totalScenes = await prisma.scenes.count({
    where: { tour_id: lead.tour_id },
  });

  const priorLeads = await prisma.leads.count({
    where: { tour_id: lead.tour_id, email: lead.email, id: { not: lead.id } },
  });

  try {
    const details =
      tour.details && typeof tour.details === "object"
        ? (tour.details as { listPrice?: number; status?: string })
        : undefined;
    const result = await scoreLead({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      preferredTime: lead.preferred_time ? lead.preferred_time.toISOString() : null,
      source: lead.source,
      scenesViewed: lead.scenes_viewed ?? 0,
      totalScenes: totalScenes ?? 0,
      durationMs: lead.duration_ms ?? 0,
      capturedAt: lead.captured_at.toISOString(),
      priorLeadsForEmail: priorLeads ?? 0,
      property: { listPrice: details?.listPrice, status: tour.status },
    });

    await prisma.leads.update({
      where: { id: lead.id },
      data: {
        ai_score: result.score,
        ai_reason: result.reason,
        ai_scored_at: new Date(),
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
