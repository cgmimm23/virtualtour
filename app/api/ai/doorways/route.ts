// POST /api/ai/doorways — admin/owner-only. Detects doorways in a scene's
// panorama; the editor inserts hotspots from the response.

import { NextResponse } from "next/server";
import { z } from "zod";
import { detectDoorways } from "@/lib/ai/doorways";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const supabase = createAdminClient();
    const { data: scene } = await supabase
      .from("scenes")
      .select("tour:tours(team_id)")
      .eq("id", parsed.data.sceneId)
      .maybeSingle();
    const tour = scene?.tour
      ? Array.isArray(scene.tour)
        ? scene.tour[0]
        : scene.tour
      : null;
    if (!tour) return NextResponse.json({ error: "scene not found" }, { status: 404 });
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

  try {
    const doorways = await detectDoorways(parsed.data.imageUrl);
    return NextResponse.json({ doorways });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
