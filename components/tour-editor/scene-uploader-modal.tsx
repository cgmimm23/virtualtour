"use client";

// Modal wrapper around <SceneUploader> for the "Add more scenes" flow when
// the editor already has one or more scenes loaded. Renders as a simple
// fixed-position overlay (no portal needed — TourExperience is full-screen
// and z-index 10 sits above it).

import { useEffect } from "react";
import { SceneUploader } from "./scene-uploader";

interface SceneUploaderModalProps {
  tourId: string;
  open: boolean;
  onClose: () => void;
}

export function SceneUploaderModal({ tourId, open, onClose }: SceneUploaderModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Add scenes</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Drop more 360° photos. They&apos;ll appear in the editor after upload.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <SceneUploader tourId={tourId} variant="card" onUploaded={onClose} />
      </div>
    </div>
  );
}
