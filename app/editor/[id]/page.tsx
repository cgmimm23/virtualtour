import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { rowToTour, type TourWithRelations } from "@/lib/tour/db-mapper";
import { resolveTourImageUrls } from "@/lib/r2/resolve";
import { requireTourAccess } from "@/lib/tour/access";
import { EditorTourExperience } from "./editor-tour-experience";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit tour — Tourly" };

export default async function EditTourPage({ params }: PageProps) {
  const { id } = await params;
  // requireTourAccess gates on either team membership OR platform admin (it
  // loads the tour and asserts the caller is on its team, or is a platform
  // admin). That call IS the access scope for this load — so the findUnique
  // below is by id alone, matching the prior behavior where admins can edit
  // any team's tour. Removing it would drop the membership-or-admin check.
  await requireTourAccess(id);

  // Disambiguate the relation: tours has two FKs touching scenes
  // (scenes.tour_id → tours.id, and tours.cover_scene_id → scenes.id).
  // `scenes_scenes_tour_idTotours` is the scenes.tour_id → tours.id side.
  const data = await prisma.tours.findUnique({
    where: { id },
    include: {
      scenes_scenes_tour_idTotours: { include: { hotspots: true } },
    },
  });

  if (!data) notFound();

  // rowToTour / TourWithRelations expect the relation under `scenes`; alias
  // the Prisma relation property to that name before mapping.
  const tourRow = {
    ...data,
    scenes: data.scenes_scenes_tour_idTotours,
  } as unknown as TourWithRelations;

  const tour = await resolveTourImageUrls(rowToTour(tourRow));

  return (
    <Suspense
      fallback={
        <div className="tour-stage flex items-center justify-center text-white/60 text-sm">
          Loading editor…
        </div>
      }
    >
      <EditorTourExperience
        tour={tour}
        tourId={id}
        initialStatus={(data as { status?: "draft" | "published" }).status ?? "draft"}
      />
    </Suspense>
  );
}
