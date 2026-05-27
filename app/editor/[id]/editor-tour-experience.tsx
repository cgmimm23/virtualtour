"use client";

// Authed editor wrapper. Wires the TourExperience component up to its
// Supabase-backed save / load callbacks so /editor/[id] can stay a thin
// server component.
//
// When a tour has zero scenes yet, we render an upload landing page instead
// of TourExperience — TourExperience assumes at least one scene and crashes
// without one. The uploader creates scene rows + uploads to R2, then refreshes
// the page so this component re-mounts with scenes in hand.

import { useCallback } from "react";
import Link from "next/link";
import { TourExperience } from "@/components/tour-editor/tour-experience";
import { SceneUploader } from "@/components/tour-editor/scene-uploader";
import { saveTour } from "@/lib/tour/actions";
import { listLeadsForTour } from "@/lib/tour/lead-actions";
import type { Tour } from "@/lib/tour/types";

interface EditorTourExperienceProps {
  tour: Tour;
  tourId: string;
}

export function EditorTourExperience({ tour, tourId }: EditorTourExperienceProps) {
  const onSaveTour = useCallback(
    async (next: Tour) => {
      const result = await saveTour(next);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    [],
  );

  const onLoadLeads = useCallback(() => listLeadsForTour(tourId), [tourId]);

  if (tour.scenes.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{tour.title}</div>
              {tour.propertyAddress ? (
                <div className="truncate text-xs text-neutral-500">{tour.propertyAddress}</div>
              ) : null}
            </div>
            <Link
              href="/dashboard"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ← Tours
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold">Add your first 360° photos</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Upload equirectangular panos from Insta360, Theta, or any 360 camera. We&apos;ll
              create a scene for each photo — you can rename them, add hotspots, and
              reorder once they&apos;re in.
            </p>
          </div>
          <SceneUploader tourId={tourId} variant="card" />
        </main>
      </div>
    );
  }

  return (
    <TourExperience
      baseTour={tour}
      canEdit
      onSaveTour={onSaveTour}
      onLoadLeads={onLoadLeads}
    />
  );
}
