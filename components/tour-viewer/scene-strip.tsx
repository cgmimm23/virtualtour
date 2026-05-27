"use client";

import type { Scene } from "@/lib/tour/types";

interface SceneStripProps {
  scenes: Scene[];
  currentSceneId: string;
  onSelect: (sceneId: string) => void;
}

/** Compact horizontal scene picker shown in share/public mode. */
export function SceneStrip({ scenes, currentSceneId, onSelect }: SceneStripProps) {
  return (
    <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl border border-white/15 bg-black/60 p-1.5 shadow-2xl backdrop-blur-md">
      {scenes.map((s) => {
        const isCurrent = s.id === currentSceneId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`group relative flex-shrink-0 overflow-hidden rounded-md transition-all ${
              isCurrent
                ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-black"
                : "opacity-70 hover:opacity-100"
            }`}
            aria-label={`Switch to ${s.name}`}
            title={s.name}
          >
            <img
              src={s.imageUrl}
              crossOrigin="anonymous"
              alt=""
              loading="lazy"
              className="h-12 w-20 object-cover"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 text-[10px] font-medium text-white truncate">
              {s.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
