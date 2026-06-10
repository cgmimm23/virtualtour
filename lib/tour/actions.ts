"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Tour } from "./types";
import { rowToTour, tourToRows, type TourWithRelations } from "./db-mapper";
import { dehydrateImageUrl } from "@/lib/r2/resolve";
import { authorizeTourAccess } from "./access";

// loadTour ---------------------------------------------------------------
//
// Used by the editor route. There is no RLS on InMotion Postgres, so we must
// scope this explicitly: authorizeTourAccess confirms the caller is a platform
// admin or a member of the tour's own team before we return any data.

export async function loadTour(tourId: string): Promise<Tour | null> {
  const access = await authorizeTourAccess(tourId);
  if (!access.ok) {
    if (access.status === 404) return null;
    throw new Error(access.error);
  }

  const data = await prisma.tours.findUnique({
    where: { id: tourId },
    include: {
      // Disambiguate the dual FK — the tour's own scenes, with their hotspots.
      scenes_scenes_tour_idTotours: { include: { hotspots: true } },
    },
  });

  if (!data) return null;
  // Map the Prisma relation name onto the `scenes` property the mapper expects.
  const shaped = {
    ...data,
    scenes: data.scenes_scenes_tour_idTotours,
  };
  return rowToTour(shaped as unknown as TourWithRelations);
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
  const access = await authorizeTourAccess(tour.id);
  if (!access.ok) return { ok: false, error: access.error };
  const teamId = access.teamId;

  // Convert any presigned R2 URLs the client round-tripped back to bare
  // `r2:<key>` refs before persisting. The page renderer re-signs on read.
  const dehydrated: Tour = {
    ...tour,
    scenes: tour.scenes.map((s) => ({ ...s, imageUrl: dehydrateImageUrl(s.imageUrl) })),
    floorPlan: tour.floorPlan
      ? { ...tour.floorPlan, imageUrl: dehydrateImageUrl(tour.floorPlan.imageUrl) }
      : tour.floorPlan,
  };

  const { tourRow, scenes, hotspots } = tourToRows(dehydrated, teamId);

  try {
    // 1) Tour metadata. Scoped by id; authorizeTourAccess already proved the
    //    caller may write this tour.
    await prisma.tours.update({
      where: { id: tour.id },
      // tourRow uses snake_case column names, which Prisma accepts directly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: tourRow as any,
    });

    // 2) Hotspots first (children of scenes). Easier to wipe + recreate than
    //    diff per row, and avoids FK violations during scene replacement.
    const sceneIds = scenes.map((s) => s.id);
    if (sceneIds.length > 0) {
      await prisma.hotspots.deleteMany({ where: { scene_id: { in: sceneIds } } });
    }

    // 3) Scenes — upsert by id so existing scene rows keep created_at.
    if (scenes.length > 0) {
      for (const s of scenes) {
        // SceneUpsert uses snake_case column names; floor_plan_position is a
        // nullable Json column, so cast to bypass Prisma's JsonNull typing.
        const sceneData = { ...s, tour_id: tour.id };
        await prisma.scenes.upsert({
          where: { id: s.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: sceneData as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          update: sceneData as any,
        });
      }

      // Drop scenes that are no longer in the tour. Only delete scenes that
      // belong to THIS tour and aren't in the new id set.
      await prisma.scenes.deleteMany({
        where: { tour_id: tour.id, id: { notIn: sceneIds } },
      });
    } else {
      // Tour with no scenes — clear them all.
      await prisma.scenes.deleteMany({ where: { tour_id: tour.id } });
    }

    // 4) Hotspots — fresh insert (we deleted them in step 2).
    if (hotspots.length > 0) {
      // HotspotUpsert mirrors the column names (type enum + Json payload).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.hotspots.createMany({ data: hotspots as any });
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
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
//
// Renaming the title also regenerates the URL slug (kebab-case of the new
// title, suffixed to avoid collisions). For a published tour this means
// previously-shared links 404 — a stability trade-off we accept because
// agents expect /t/<address-rename> to match the rename they just did.

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function updateTourMeta(params: {
  tourId: string;
  title: string;
  propertyAddress: string;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { tourId } = params;
  const title = params.title.trim().slice(0, 120);
  const propertyAddress = params.propertyAddress.trim().slice(0, 240) || null;
  if (!title) return { ok: false, error: "Title can't be empty." };

  const access = await authorizeTourAccess(tourId);
  if (!access.ok) return { ok: false, error: access.error };

  const existing = await prisma.tours.findUnique({
    where: { id: tourId },
    select: { id: true, slug: true },
  });
  if (!existing) return { ok: false, error: "Tour not found." };

  // Compute a fresh slug. Keep the existing one if it already matches the
  // new title (avoid pointless writes / version churn).
  const baseSlug = slugify(title) || "tour";
  let nextSlug = existing.slug;
  if (existing.slug !== baseSlug && !existing.slug.startsWith(`${baseSlug}-`)) {
    nextSlug = baseSlug;
    // Find a free variant. Exclude our own tour from the uniqueness check so
    // re-running with the same title doesn't ladder up suffixes.
    for (let i = 1; i < 50; i++) {
      const candidate = i === 1 ? baseSlug : `${baseSlug}-${i}`;
      // Slug is globally unique, so this uniqueness probe is intentionally
      // cross-tenant — it just needs a free slug.
      const clash = await prisma.tours.findFirst({
        where: { slug: candidate, id: { not: tourId } },
        select: { id: true },
      });
      if (!clash) {
        nextSlug = candidate;
        break;
      }
    }
    // Final fallback: stamp with a timestamp if 50 collisions happened
    // somehow. Effectively unreachable, but safer than infinite loop.
    if (!nextSlug || nextSlug === existing.slug) {
      nextSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }
  }

  try {
    await prisma.tours.update({
      where: { id: tourId },
      data: { title, property_address: propertyAddress, slug: nextSlug },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }

  revalidatePath(`/editor/${tourId}`);
  revalidatePath(`/t/${existing.slug}`);
  revalidatePath(`/t/${nextSlug}`);
  revalidatePath("/dashboard");
  return { ok: true, slug: nextSlug };
}

// publishTour / unpublishTour -------------------------------------------

export async function setTourStatus(
  tourId: string,
  status: "draft" | "published",
): Promise<void> {
  const access = await authorizeTourAccess(tourId);
  if (!access.ok) throw new Error(access.error);
  await prisma.tours.update({ where: { id: tourId }, data: { status } });
  revalidatePath(`/dashboard`);
  revalidatePath(`/editor/${tourId}`);
}

// deleteTour ------------------------------------------------------------

export async function deleteTour(tourId: string): Promise<void> {
  const access = await authorizeTourAccess(tourId);
  if (!access.ok) throw new Error(access.error);
  await prisma.tours.delete({ where: { id: tourId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
