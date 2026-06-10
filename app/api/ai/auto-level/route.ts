// POST /api/ai/auto-level
// Body: { sceneId, imageUrl }
// → { ok: true, roll, pitch, confidence, note }
//
// Auth-gated to team owners/admins or platform admins. Writes the
// returned roll + pitch to scenes.initial_roll / initial_pitch so the
// next page render opens with a leveled view.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
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

  // Scope the scene to the caller's tour. Admin bypasses team check.
  const scene = await prisma.scenes.findUnique({
    where: { id: parsed.data.sceneId },
    select: {
      id: true,
      tour_id: true,
      tours_scenes_tour_idTotours: { select: { team_id: true } },
    },
  });
  if (!scene) {
    return NextResponse.json({ ok: false, error: "scene not found" }, { status: 404 });
  }
  const sceneTeamId = scene.tours_scenes_tour_idTotours?.team_id;
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

  try {
    await prisma.scenes.update({
      where: { id: parsed.data.sceneId },
      data: { initial_roll: level.roll, initial_pitch: level.pitch },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "update failed" },
      { status: 500 },
    );
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
