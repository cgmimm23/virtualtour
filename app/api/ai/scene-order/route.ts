// POST /api/ai/scene-order — admin/owner asks the AI to suggest an
// optimal walking order. Returns the ID list; the editor applies it.

import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestSceneOrder } from "@/lib/ai/scene-order";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const Body = z.object({ tourId: z.string().uuid() });

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

  const tour = await prisma.tours.findUnique({
    where: { id: parsed.data.tourId },
    select: { id: true, team_id: true },
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

  const scenes = await prisma.scenes.findMany({
    where: { tour_id: tour.id },
    select: { id: true, name: true, floor: true, order_index: true },
    orderBy: { order_index: "asc" },
  });

  try {
    const orderedIds = await suggestSceneOrder(
      (scenes ?? []).map((s) => ({ id: s.id, name: s.name, floor: s.floor ?? undefined })),
    );
    return NextResponse.json({ orderedIds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
