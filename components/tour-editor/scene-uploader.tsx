"use client";

// Drag-drop / file-picker UI that uploads 360 equirect panos directly to R2.
// Used by the editor's empty-state landing and (later) by an "Add scenes"
// modal. Surfaces per-file progress + error states.
//
// Flow per file:
//   1. requestSceneUpload server action → { sceneId, putUrl, key }
//   2. fetch(putUrl, PUT, body=file) with progress via XHR
//   3. completeSceneUpload server action → flips processing_status to ready
//   4. After all files done, router.refresh() re-fetches the tour so the
//      editor re-renders with the new scenes.

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  requestSceneUpload,
  completeSceneUpload,
  abortSceneUpload,
} from "@/lib/tour/upload-actions";

type ItemStatus = "queued" | "uploading" | "done" | "error";
interface UploadItem {
  id: string; // local id (filename + size + idx) for React keys
  file: File;
  status: ItemStatus;
  progress: number; // 0–100
  error?: string;
}

interface SceneUploaderProps {
  tourId: string;
  /** Tone the empty-state inside the editor's full-screen viewport. */
  variant?: "page" | "card";
  onUploaded?: () => void;
}

const ACCEPT = "image/jpeg,image/jpg,image/png,image/webp";

export function SceneUploader({ tourId, variant = "page", onUploaded }: SceneUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      updateItem(item.id, { status: "uploading", progress: 0 });

      const req = await requestSceneUpload({
        tourId,
        filename: item.file.name,
        contentType: item.file.type || "image/jpeg",
        size: item.file.size,
      });
      if (!req.ok) {
        updateItem(item.id, { status: "error", error: req.error });
        return;
      }

      // PUT direct to R2 with progress via XHR (fetch can't report progress).
      const ok = await new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", req.putUrl);
        xhr.setRequestHeader("Content-Type", item.file.type || "image/jpeg");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            updateItem(item.id, { progress: Math.round((ev.loaded / ev.total) * 100) });
          }
        };
        xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
        xhr.onerror = () => resolve(false);
        xhr.send(item.file);
      });

      if (!ok) {
        await abortSceneUpload({ tourId, sceneId: req.sceneId, key: req.key });
        updateItem(item.id, {
          status: "error",
          error: "Upload failed (network or CORS). Check the browser console.",
        });
        return;
      }

      const done = await completeSceneUpload({ tourId, sceneId: req.sceneId });
      if (!done.ok) {
        updateItem(item.id, { status: "error", error: done.error });
        return;
      }

      updateItem(item.id, { status: "done", progress: 100 });
    },
    [tourId, updateItem],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fresh: UploadItem[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((file, i) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${i}`,
          file,
          status: "queued" as const,
          progress: 0,
        }));
      if (fresh.length === 0) return;

      setItems((prev) => [...prev, ...fresh]);

      // Kick off uploads — concurrency 2 to avoid hammering the browser /
      // saturating the connection on slow networks.
      void (async () => {
        const queue = [...fresh];
        const inFlight: Promise<void>[] = [];
        const next = () => {
          const it = queue.shift();
          if (!it) return null;
          const p = uploadOne(it).finally(() => {
            const idx = inFlight.indexOf(p);
            if (idx >= 0) inFlight.splice(idx, 1);
          });
          inFlight.push(p);
          return p;
        };
        while (queue.length > 0 || inFlight.length > 0) {
          while (inFlight.length < 2 && queue.length > 0) next();
          await Promise.race(inFlight);
        }
        // All done — refresh the page so the editor reloads with new scenes.
        router.refresh();
        onUploaded?.();
      })();
    },
    [router, uploadOne, onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const isCard = variant === "card";
  return (
    <div
      className={
        isCard
          ? "rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          : "mx-auto w-full max-w-2xl"
      }
    >
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${
          isDragging
            ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
            : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
        }`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-neutral-400"
        >
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="text-sm font-medium">Drop your whole batch here</div>
          <div className="mt-1 text-xs text-neutral-500">
            Drag in 30 photos at once or pick a folder. JPEG / PNG / WebP equirectangular
            panoramas · up to 50&nbsp;MB each · resized automatically.
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {items.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{it.file.name}</div>
                {it.status === "uploading" ? (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full bg-brand-600 transition-[width]"
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                ) : null}
                {it.status === "error" ? (
                  <div className="mt-1 text-xs text-red-600">{it.error}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-xs text-neutral-500">
                {it.status === "queued" && "Queued"}
                {it.status === "uploading" && `${it.progress}%`}
                {it.status === "done" && (
                  <span className="text-emerald-600 dark:text-emerald-400">Done</span>
                )}
                {it.status === "error" && <span className="text-red-600">Failed</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
