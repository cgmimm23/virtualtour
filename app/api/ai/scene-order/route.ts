// POST /api/ai/scene-order — admin/owner asks the AI to suggest an
// optimal walking order. Returns the ID list; the editor applies it.

import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestSceneOrder } from "@/lib/ai/scene-order";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const supabase = createAdminClient();
  const { data: tour } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", parsed.data.tourId)
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

  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, name, floor, order_index")
    .eq("tour_id", tour.id)
    .order("order_index");

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
