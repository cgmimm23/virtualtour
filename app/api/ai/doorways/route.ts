// POST /api/ai/doorways — admin/owner-only. Detects doorways in a scene's
// panorama; the editor inserts hotspots from the response.

import { NextResponse } from "next/server";
import { z } from "zod";
import { detectDoorways } from "@/lib/ai/doorways";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({ sceneId: z.string().uuid(), imageUrl: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 },
    );
  }

  // Authorization: scene must belong to a tour the user can edit (their team
  // or platform admin). Service-role lookup, then check membership.
  const admin = await isPlatformAdmin();
  if (!admin) {
    const scene = await prisma.scenes.findUnique({
      where: { id: parsed.data.sceneId },
      select: { tours_scenes_tour_idTotours: { select: { team_id: true } } },
    });
    const tour = scene?.tours_scenes_tour_idTotours ?? null;
    if (!tour) return NextResponse.json({ error: "scene not found" }, { status: 404 });
    const membership = await prisma.team_members.findUnique({
      where: { team_id_user_id: { team_id: tour.team_id, user_id: user.id } },
      select: { role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  try {
    const doorways = await detectDoorways(parsed.data.imageUrl);
    return NextResponse.json({ doorways });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
