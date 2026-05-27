"use client";

import { useEffect, useRef, useState } from "react";
import type { Scene } from "@/lib/tour/types";

interface FloorPlanEditorProps {
  imageUrl?: string;
  scenes: Scene[];
  onSetImage: (imageUrl: string | undefined) => void;
  onSetPosition: (sceneId: string, position: { x: number; y: number } | undefined) => void;
  onClose: () => void;
}

export function FloorPlanEditor({
  imageUrl,
  scenes,
  onSetImage,
  onSetPosition,
  onClose,
}: FloorPlanEditorProps) {
  const [armedSceneId, setArmedSceneId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onSetImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Convert click position into 0–1 normalized coords inside the image box.
  const computeCoords = (clientX: number, clientY: number) => {
    const el = imageRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const handlePlaneClick = (e: React.MouseEvent) => {
    if (!armedSceneId) return;
    const coords = computeCoords(e.clientX, e.clientY);
    if (!coords) return;
    onSetPosition(armedSceneId, coords);
    setArmedSceneId(null);
  };

  // Drag-to-move existing dots.
  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e: PointerEvent) => {
      const coords = computeCoords(e.clientX, e.clientY);
      if (coords) onSetPosition(draggingId, coords);
    };
    const onUp = () => setDraggingId(null);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [draggingId, onSetPosition]);

  const placedCount = scenes.filter((s) => s.floorPlanPosition).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white dark:bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Floor plan</h3>
            <p className="text-xs text-neutral-500">
              Upload an image, then place a dot for each scene. Buyers see a mini-map and click dots to teleport between rooms.
              {scenes.length ? ` · ${placedCount}/${scenes.length} placed` : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-[1fr_280px]">
          <div className="relative flex items-center justify-center overflow-auto bg-neutral-100 dark:bg-neutral-900 p-4">
            {imageUrl ? (
              <div
                ref={imageRef}
                onClick={handlePlaneClick}
                className={`relative inline-block max-h-full max-w-full ${armedSceneId ? "cursor-crosshair ring-2 ring-amber-400" : "cursor-default"}`}
                style={{ lineHeight: 0 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  crossOrigin="anonymous"
                  alt="Floor plan"
                  className="max-h-[60vh] w-auto"
                  draggable={false}
                />
                {scenes.map((s, i) => {
                  if (!s.floorPlanPosition) return null;
                  const isArmed = armedSceneId === s.id;
                  return (
                    <div
                      key={s.id}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setDraggingId(s.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setArmedSceneId(isArmed ? null : s.id);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing ${draggingId === s.id ? "opacity-60" : ""}`}
                      style={{ left: `${s.floorPlanPosition.x * 100}%`, top: `${s.floorPlanPosition.y * 100}%` }}
                      title={s.name}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg transition-transform ${
                        isArmed
                          ? "border-amber-400 bg-amber-400 text-neutral-900 scale-125"
                          : "border-white bg-neutral-900 text-white hover:scale-110"
                      }`}>
                        {i + 1}
                      </span>
                    </div>
                  );
                })}
                {armedSceneId ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                    <div className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg">
                      Click on the plan to place "{scenes.find((s) => s.id === armedSceneId)?.name}"
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <UploadDropzone onUpload={onUpload} />
            )}
          </div>

          <div className="flex flex-col overflow-hidden border-t border-neutral-200 dark:border-neutral-800 md:border-l md:border-t-0">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 p-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Scenes</span>
              {imageUrl ? (
                <label className="cursor-pointer text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
                  Replace image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {scenes.map((s, i) => {
                const placed = !!s.floorPlanPosition;
                const isArmed = armedSceneId === s.id;
                return (
                  <li key={s.id} className="mb-1">
                    <div
                      className={`flex items-center gap-2 rounded-md p-2 ${
                        isArmed ? "bg-amber-100 dark:bg-amber-950/30 ring-1 ring-amber-400" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        placed ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "border border-dashed border-neutral-400 text-neutral-400"
                      }`}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => setArmedSceneId(isArmed ? null : s.id)}
                        disabled={!imageUrl}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                          isArmed
                            ? "bg-amber-400 text-neutral-900"
                            : "border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {isArmed ? "Click plan…" : placed ? "Replace" : "Place"}
                      </button>
                      {placed ? (
                        <button
                          type="button"
                          onClick={() => onSetPosition(s.id, undefined)}
                          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          aria-label="Remove dot"
                          title="Remove dot"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            {imageUrl ? (
              <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Remove the floor plan image and all placed dots?")) return;
                    onSetImage(undefined);
                    scenes.forEach((s) => {
                      if (s.floorPlanPosition) onSetPosition(s.id, undefined);
                    });
                  }}
                  className="w-full rounded-md border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50"
                >
                  Delete floor plan
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadDropzone({ onUpload }: { onUpload: (file: File) => void }) {
  return (
    <label className="flex h-64 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 p-8 text-center transition-colors hover:border-neutral-500 dark:hover:border-neutral-500">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <div className="text-sm font-medium">Upload a floor plan image</div>
      <div className="text-xs text-neutral-500">PNG, JPG, or PDF screenshot · Stored locally as base64 in this prototype</div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
