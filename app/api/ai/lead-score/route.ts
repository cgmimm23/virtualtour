// POST /api/ai/lead-score — score a lead. Owner/admin or platform-admin.
// Caches result on the lead row (ai_score, ai_reason, ai_scored_at).

import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreLead } from "@/lib/ai/lead-score";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({ leadId: z.string().uuid() });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad input" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, name, email, phone, preferred_time, source, scenes_viewed, duration_ms, captured_at, tour_id",
    )
    .eq("id", parsed.data.leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: "lead not found" }, { status: 404 });

  const { data: tour } = await supabase
    .from("tours")
    .select("team_id, details, status")
    .eq("id", lead.tour_id)
    .maybeSingle();
  if (!tour) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  const admin = await isPlatformAdmin();
  if (!admin) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("team_id", tour.team_id)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { count: totalScenes } = await supabase
    .from("scenes")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", lead.tour_id);

  const { count: priorLeads } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("tour_id", lead.tour_id)
    .eq("email", lead.email)
    .neq("id", lead.id);

  try {
    const details =
      tour.details && typeof tour.details === "object"
        ? (tour.details as { listPrice?: number; status?: string })
        : undefined;
    const result = await scoreLead({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      preferredTime: lead.preferred_time,
      source: lead.source,
      scenesViewed: lead.scenes_viewed ?? 0,
      totalScenes: totalScenes ?? 0,
      durationMs: lead.duration_ms ?? 0,
      capturedAt: lead.captured_at,
      priorLeadsForEmail: priorLeads ?? 0,
      property: { listPrice: details?.listPrice, status: tour.status },
    });

    await supabase
      .from("leads")
      .update({
        ai_score: result.score,
        ai_reason: result.reason,
        ai_scored_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
