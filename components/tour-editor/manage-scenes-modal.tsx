"use client";

// Grid view of every scene with inline rename. Opened from a "Manage" button
// in the editor — useful when you've uploaded a batch and want to rename all
// the IMG_20260527_... filenames into "Living Room" / "Kitchen" / etc.
//
// Each row writes directly to the DB via renameScene (skips the TourExperience
// debounce so the modal can stay simple), then router.refresh()es on close so
// the editor picks up the new names.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { renameScene } from "@/lib/tour/upload-actions";
import type { Scene } from "@/lib/tour/types";

type RowStatus = "idle" | "saving" | "saved" | "error";

interface ManageScenesModalProps {
  tourId: string;
  scenes: Scene[];
  coverSceneId: string;
  open: boolean;
  onClose: () => void;
}

export function ManageScenesModal({
  tourId,
  scenes,
  coverSceneId,
  open,
  onClose,
}: ManageScenesModalProps) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(scenes.map((s) => [s.id, s.name])),
  );
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const baselineRef = useRef<Record<string, string>>(
    Object.fromEntries(scenes.map((s) => [s.id, s.name])),
  );
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    // Re-seed when the modal re-opens — scenes may have changed.
    setNames(Object.fromEntries(scenes.map((s) => [s.id, s.name])));
    baselineRef.current = Object.fromEntries(scenes.map((s) => [s.id, s.name]));
    setStatuses({});
    dirtyRef.current = false;
  }, [open, scenes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = useCallback(() => {
    if (dirtyRef.current) router.refresh();
    onClose();
  }, [onClose, router]);

  const commitName = useCallback(
    async (sceneId: string) => {
      const next = (names[sceneId] ?? "").trim();
      const prev = baselineRef.current[sceneId] ?? "";
      if (!next || next === prev) return;

      setStatuses((s) => ({ ...s, [sceneId]: "saving" }));
      const result = await renameScene({ tourId, sceneId, name: next });
      if (result.ok) {
        baselineRef.current[sceneId] = next;
        dirtyRef.current = true;
        setStatuses((s) => ({ ...s, [sceneId]: "saved" }));
        // Auto-fade the "saved" badge after a moment so the grid stays clean.
        window.setTimeout(() => {
          setStatuses((s) => (s[sceneId] === "saved" ? { ...s, [sceneId]: "idle" } : s));
        }, 1200);
      } else {
        setStatuses((s) => ({ ...s, [sceneId]: "error" }));
      }
    },
    [names, tourId],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold">All scenes</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}. Click a name to rename it.
              Changes save when you leave the field.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {scenes.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-500">
              No scenes yet. Upload some 360° photos first.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenes.map((s) => {
                const status = statuses[s.id] ?? "idle";
                const isCover = s.id === coverSceneId;
                return (
                  <li
                    key={s.id}
                    className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="relative aspect-[2/1] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {isCover ? (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          Cover
                        </span>
                      ) : null}
                    </div>
                    <div className="px-3 py-3">
                      <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                        Scene name
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={names[s.id] ?? ""}
                          onChange={(e) =>
                            setNames((n) => ({ ...n, [s.id]: e.target.value }))
                          }
                          onBlur={() => void commitName(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-neutral-700 dark:bg-neutral-950"
                          placeholder="e.g. Living Room"
                          maxLength={80}
                        />
                        <span className="w-12 shrink-0 text-right text-[11px] text-neutral-500">
                          {status === "saving" && "Saving…"}
                          {status === "saved" && (
                            <span className="text-emerald-600 dark:text-emerald-400">Saved</span>
                          )}
                          {status === "error" && <span className="text-red-600">Error</span>}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-200 px-6 py-3 text-right dark:border-neutral-800">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
