import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { rowToTour, type TourWithRelations } from "@/lib/tour/db-mapper";
import { EditorTourExperience } from "./editor-tour-experience";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Edit tour — Tourly" };

export default async function EditTourPage({ params }: PageProps) {
  const { id } = await params;
  const { team } = await requireActiveTeam(`/editor/${id}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*, scenes(*, hotspots(*))")
    .eq("id", id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const tour = rowToTour(data as unknown as TourWithRelations);

  return (
    <Suspense
      fallback={
        <div className="tour-stage flex items-center justify-center text-white/60 text-sm">
          Loading editor…
        </div>
      }
    >
      <EditorTourExperience tour={tour} tourId={id} />
    </Suspense>
  );
}
