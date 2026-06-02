// POST /api/ai/auto-level
// Body: { sceneId, imageUrl }
// → { ok: true, roll, pitch, confidence, note }
//
// Auth-gated to team owners/admins or platform admins. Writes the
// returned roll + pitch to scenes.initial_roll / initial_pitch so the
// next page render opens with a leveled view.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveTeam, isPlatformAdmin } from "@/lib/auth";
import { detectHorizonTilt } from "@/lib/ai/auto-level";
import { revalidatePath } from "next/cache";

const Body = z.object({
  sceneId: z.string().uuid(),
  imageUrl: z.string().url(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const { team, role } = await requireActiveTeam();
  const admin = await isPlatformAdmin();
  const canEdit = admin || role === "owner" || role === "admin";
  if (!canEdit) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  // Scope the scene to the caller's tour. Admin bypasses team check.
  const { data: scene } = await supabase
    .from("scenes")
    .select("id, tour_id, tours:tours!scenes_tour_id_fkey(team_id)")
    .eq("id", parsed.data.sceneId)
    .maybeSingle();
  if (!scene) {
    return NextResponse.json({ ok: false, error: "scene not found" }, { status: 404 });
  }
  const sceneTeamId = (Array.isArray(scene.tours) ? scene.tours[0] : scene.tours)?.team_id;
  if (!admin && sceneTeamId !== team.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let level;
  try {
    level = await detectHorizonTilt(parsed.data.imageUrl);
  } catch (err) {
    console.error("[auto-level] detection failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "detection failed" },
      { status: 500 },
    );
  }

  const { error: updErr } = await supabase
    .from("scenes")
    .update({ initial_roll: level.roll, initial_pitch: level.pitch })
    .eq("id", parsed.data.sceneId);
  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  revalidatePath(`/editor/${scene.tour_id}`);
  return NextResponse.json({
    ok: true,
    roll: level.roll,
    pitch: level.pitch,
    confidence: level.confidence,
    note: level.note,
  });
}
