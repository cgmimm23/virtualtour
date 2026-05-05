// POST /api/ai/description — generate/regenerate a property description for
// a tour. Owner/admin or platform-admin only. Caches the result on the tour row.

import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePropertyDescription } from "@/lib/ai/description";
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
    .select("*")
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
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Pull scene names + a few image URLs for visual context.
  const { data: scenes } = await supabase
    .from("scenes")
    .select("name, source_image_url, order_index")
    .eq("tour_id", tour.id)
    .order("order_index");
  const sceneList = (scenes ?? []).map((s) => ({
    name: s.name,
    imageUrl: s.source_image_url,
  }));
  // Cover + 1/3 + 2/3 sample for visual context (3 images max keeps the bill low).
  const samples =
    sceneList.length === 0
      ? []
      : [
          sceneList[0].imageUrl,
          sceneList[Math.floor(sceneList.length / 3)]?.imageUrl,
          sceneList[Math.floor((2 * sceneList.length) / 3)]?.imageUrl,
        ].filter(
          (v, i, arr): v is string =>
            typeof v === "string" && arr.indexOf(v) === i,
        );

  try {
    const description = await generatePropertyDescription({
      title: tour.title,
      propertyAddress: tour.property_address ?? "",
      details:
        tour.details && typeof tour.details === "object"
          ? (tour.details as DescribeDetails)
          : undefined,
      scenes: sceneList,
      visualSampleUrls: samples,
    });

    await supabase
      .from("tours")
      .update({
        ai_description: description,
        ai_description_generated_at: new Date().toISOString(),
      })
      .eq("id", tour.id);

    return NextResponse.json({ description });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface DescribeDetails {
  beds?: number;
  baths?: number;
  sqft?: number;
  yearBuilt?: number;
  propertyType?: string;
  listPrice?: number;
}
