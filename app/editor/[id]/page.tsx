import { notFound } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
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
  // requireTourAccess gates on either team membership OR platform admin —
  // matches the RLS policy in 0007 so admins can edit any tour.
  await requireTourAccess(id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    // Disambiguate the embed: tours has two FKs touching scenes
    // (scenes.tour_id → tours.id, and tours.cover_scene_id → scenes.id).
    // The `!scenes_tour_id_fkey` hint tells PostgREST which relationship
    // the embed means. No team_id filter here — RLS already enforces
    // membership-or-admin, and we don't want to lock admins out of
    // other teams' tours.
    .select("*, scenes!scenes_tour_id_fkey(*, hotspots(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const tour = await resolveTourImageUrls(
    rowToTour(data as unknown as TourWithRelations),
  );

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
