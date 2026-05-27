"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tour } from "./types";
import { rowToTour, tourToRows, type TourWithRelations } from "./db-mapper";
import { dehydrateImageUrl } from "@/lib/r2/resolve";

// loadTour ---------------------------------------------------------------
//
// Used by the editor route. RLS keeps it scoped to the caller's team — we
// query by id alone and rely on policy denial for cross-team attempts.

export async function loadTour(tourId: string): Promise<Tour | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tours")
    // Disambiguate the embed — see app/editor/[id]/page.tsx for the why.
    .select("*, scenes!scenes_tour_id_fkey(*, hotspots(*))")
    .eq("id", tourId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return rowToTour(data as unknown as TourWithRelations);
}

// saveTour ---------------------------------------------------------------
//
// Persists the full in-memory tour back to the DB. Strategy: upsert tour
// metadata, replace-all scenes, replace-all hotspots. The full-replace is
// dumb but predictable — the editor sends a few KB of JSON, never enough to
// matter, and it sidesteps the diffing bugs that would come from per-row
// patches plus reorder.
//
// We do this in a transaction-shaped sequence: delete-then-insert for child
// rows. Without a true transaction we accept the small risk of a half-write
// on Supabase failure; the editor will see a stale tour and re-save on next
// edit. Worth the simplicity at this scope.

export async function saveTour(tour: Tour): Promise<{ ok: true } | { ok: false; error: string }> {
  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  // Defensive scope check — RLS will also reject, but a clear error message
  // beats "0 rows updated".
  const { data: existing, error: fetchError } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tour.id)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!existing) return { ok: false, error: "Tour not found." };
  if (existing.team_id !== team.id) return { ok: false, error: "Forbidden." };

  // Convert any presigned R2 URLs the client round-tripped back to bare
  // `r2:<key>` refs before persisting. The page renderer re-signs on read.
  const dehydrated: Tour = {
    ...tour,
    scenes: tour.scenes.map((s) => ({ ...s, imageUrl: dehydrateImageUrl(s.imageUrl) })),
    floorPlan: tour.floorPlan
      ? { ...tour.floorPlan, imageUrl: dehydrateImageUrl(tour.floorPlan.imageUrl) }
      : tour.floorPlan,
  };

  const { tourRow, scenes, hotspots } = tourToRows(dehydrated, team.id);

  // 1) Tour metadata.
  const { error: tourErr } = await supabase
    .from("tours")
    .update(tourRow)
    .eq("id", tour.id);
  if (tourErr) return { ok: false, error: tourErr.message };

  // 2) Hotspots first (children of scenes). Easier to wipe + recreate than
  //    diff per row, and avoids FK violations during scene replacement.
  const sceneIds = scenes.map((s) => s.id);
  if (sceneIds.length > 0) {
    const { error: hsDelErr } = await supabase
      .from("hotspots")
      .delete()
      .in("scene_id", sceneIds);
    if (hsDelErr) return { ok: false, error: hsDelErr.message };
  }

  // 3) Scenes — upsert by id so existing scene rows keep created_at.
  if (scenes.length > 0) {
    const sceneRows = scenes.map((s) => ({ ...s, tour_id: tour.id }));
    const { error: sceneErr } = await supabase
      .from("scenes")
      .upsert(sceneRows, { onConflict: "id" });
    if (sceneErr) return { ok: false, error: sceneErr.message };

    // Drop scenes that are no longer in the tour. Only delete scenes that
    // belong to THIS tour and aren't in the new id set.
    const { error: orphanErr } = await supabase
      .from("scenes")
      .delete()
      .eq("tour_id", tour.id)
      .not("id", "in", `(${sceneIds.map((id) => `"${id}"`).join(",")})`);
    if (orphanErr) return { ok: false, error: orphanErr.message };
  } else {
    // Tour with no scenes — clear them all.
    const { error: clearErr } = await supabase
      .from("scenes")
      .delete()
      .eq("tour_id", tour.id);
    if (clearErr) return { ok: false, error: clearErr.message };
  }

  // 4) Hotspots — fresh insert (we deleted them in step 2).
  if (hotspots.length > 0) {
    const { error: hsInsErr } = await supabase.from("hotspots").insert(hotspots);
    if (hsInsErr) return { ok: false, error: hsInsErr.message };
  }

  revalidatePath(`/editor/${tour.id}`);
  revalidatePath(`/t/${tour.slug}`);
  return { ok: true };
}

// updateTourMeta --------------------------------------------------------
//
// Lightweight rename for the tour title + property address. Direct DB write
// that skips the full saveTour replace-all path — used by the Tour info
// modal where the user is only touching metadata and we don't want to
// reconcile with the in-memory editor state.

export async function updateTourMeta(params: {
  tourId: string;
  title: string;
  propertyAddress: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tourId } = params;
  const title = params.title.trim().slice(0, 120);
  const propertyAddress = params.propertyAddress.trim().slice(0, 240) || null;
  if (!title) return { ok: false, error: "Title can't be empty." };

  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tourId)
    .maybeSingle();
  if (!existing || existing.team_id !== team.id) return { ok: false, error: "Forbidden." };

  const { error } = await supabase
    .from("tours")
    .update({ title, property_address: propertyAddress })
    .eq("id", tourId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/editor/${tourId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// publishTour / unpublishTour -------------------------------------------

export async function setTourStatus(
  tourId: string,
  status: "draft" | "published",
): Promise<void> {
  const { team } = await requireActiveTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tours")
    .update({ status })
    .eq("id", tourId)
    .eq("team_id", team.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard`);
  revalidatePath(`/editor/${tourId}`);
}

// deleteTour ------------------------------------------------------------

export async function deleteTour(tourId: string): Promise<void> {
  const { team } = await requireActiveTeam();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tours")
    .delete()
    .eq("id", tourId)
    .eq("team_id", team.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
