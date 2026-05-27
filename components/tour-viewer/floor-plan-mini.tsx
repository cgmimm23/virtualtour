"use client";

import { useState } from "react";
import type { Scene } from "@/lib/tour/types";

interface FloorPlanMiniProps {
  imageUrl: string;
  scenes: Scene[];
  currentSceneId: string;
  onSelect: (sceneId: string) => void;
}

/** Collapsible mini floor plan overlay shown in the viewer corner. */
export function FloorPlanMini({ imageUrl, scenes, currentSceneId, onSelect }: FloorPlanMiniProps) {
  const [open, setOpen] = useState(false);
  const placed = scenes.filter((s) => s.floorPlanPosition);
  if (placed.length === 0 && !open) return null;

  return (
    <div className="pointer-events-auto">
      {open ? (
        <div className="overflow-hidden rounded-xl border border-white/15 bg-black/70 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-1.5 text-xs text-white">
            <span className="font-semibold uppercase tracking-wider">Floor plan</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Collapse floor plan"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <div className="relative" style={{ lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              crossOrigin="anonymous"
              alt="Floor plan"
              className="block max-h-[40vh] max-w-[40vw] min-w-[200px]"
              draggable={false}
            />
            {scenes.map((s, i) => {
              if (!s.floorPlanPosition) return null;
              const isCurrent = s.id === currentSceneId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${s.floorPlanPosition.x * 100}%`, top: `${s.floorPlanPosition.y * 100}%` }}
                  aria-label={`Jump to ${s.name}`}
                  title={s.name}
                >
                  <span className={`absolute inset-0 rounded-full ${isCurrent ? "animate-ping bg-amber-400/70" : ""}`} />
                  <span className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-lg transition-transform hover:scale-125 ${
                    isCurrent
                      ? "border-amber-400 bg-amber-400 text-neutral-900 scale-110"
                      : "border-white bg-neutral-900 text-white"
                  }`}>
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-md hover:bg-black/80"
          title="Show floor plan"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Floor plan
        </button>
      )}
    </div>
  );
}
