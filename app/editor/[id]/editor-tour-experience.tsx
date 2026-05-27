"use client";

// Authed editor wrapper. Wires the TourExperience component up to its
// Supabase-backed save / load callbacks so /editor/[id] can stay a thin
// server component.
//
// When a tour has zero scenes yet, we render an upload landing page instead
// of TourExperience — TourExperience assumes at least one scene and crashes
// without one. The uploader creates scene rows + uploads to R2, then refreshes
// the page so this component re-mounts with scenes in hand.
//
// When the tour already has scenes, we render TourExperience plus three
// floating actions:
//   - "Share" — toggle publish/unpublish + copy the public /t/[slug] URL.
//   - "Scenes" — open a grid view of every scene with inline rename.
//   - "+ Add scenes" — open the upload modal for more 360 photos.

import { useCallback, useState } from "react";
import Link from "next/link";
import { TourExperience } from "@/components/tour-editor/tour-experience";
import { SceneUploader } from "@/components/tour-editor/scene-uploader";
import { SceneUploaderModal } from "@/components/tour-editor/scene-uploader-modal";
import { ShareModal } from "@/components/tour-editor/share-modal";
import { ManageScenesModal } from "@/components/tour-editor/manage-scenes-modal";
import { saveTour } from "@/lib/tour/actions";
import { listLeadsForTour } from "@/lib/tour/lead-actions";
import type { Tour } from "@/lib/tour/types";

interface EditorTourExperienceProps {
  tour: Tour;
  tourId: string;
  initialStatus: "draft" | "published";
}

export function EditorTourExperience({ tour, tourId, initialStatus }: EditorTourExperienceProps) {
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

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

  const isPublished = initialStatus === "published";
  return (
    <>
      <TourExperience
        baseTour={tour}
        canEdit
        onSaveTour={onSaveTour}
        onLoadLeads={onLoadLeads}
      />
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isPublished
              ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
              : "bg-white text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-400 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          }`}
          title="Publish & share this tour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {isPublished ? "Live · Share" : "Share"}
        </button>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-lg hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          title="View all scenes and rename them"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          Scenes ({tour.scenes.length})
        </button>
        <button
          type="button"
          onClick={() => setUploaderOpen(true)}
          className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          title="Upload more 360° photos"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add scenes
        </button>
      </div>
      <SceneUploaderModal
        tourId={tourId}
        open={uploaderOpen}
        onClose={() => setUploaderOpen(false)}
      />
      <ShareModal
        tourId={tourId}
        slug={tour.slug}
        initialStatus={initialStatus}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <ManageScenesModal
        tourId={tourId}
        scenes={tour.scenes}
        coverSceneId={tour.coverSceneId}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
      />
    </>
  );
}
