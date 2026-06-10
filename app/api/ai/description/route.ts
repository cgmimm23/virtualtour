// POST /api/ai/description — generate/regenerate a property description for
// a tour. Owner/admin or platform-admin only. Caches the result on the tour row.

import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePropertyDescription } from "@/lib/ai/description";
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
  });
  if (!tour) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  const admin = await isPlatformAdmin();
  if (!admin) {
    const membership = await prisma.team_members.findUnique({
      where: { team_id_user_id: { team_id: tour.team_id, user_id: user.id } },
      select: { role: true },
    });
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Pull scene names + a few image URLs for visual context.
  const scenes = await prisma.scenes.findMany({
    where: { tour_id: tour.id },
    select: { name: true, source_image_url: true, order_index: true },
    orderBy: { order_index: "asc" },
  });
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

    await prisma.tours.update({
      where: { id: tour.id },
      data: {
        ai_description: description,
        ai_description_generated_at: new Date(),
      },
    });

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
