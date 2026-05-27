"use client";

import type { Hotspot, Scene } from "@/lib/tour/types";

interface HotspotMarkerProps {
  hotspot: Hotspot;
  selected?: boolean;
  editMode?: boolean;
  onDelete?: (hotspotId: string) => void;
  /** When provided, scene_link hotspots show a hover preview of the target scene. */
  targetScene?: Scene;
}

/**
 * Visual style of a hotspot in the panorama. Real CSS, real React — this is
 * exactly what PROJECT_SPEC.md §5 calls out as the moat (DOM hotspots vs.
 * canvas-baked).
 */
export function HotspotMarker({
  hotspot,
  selected,
  editMode,
  onDelete,
  targetScene,
}: HotspotMarkerProps) {
  const icon = iconFor(hotspot);

  return (
    <div
      role="button"
      aria-label={hotspot.label || hotspot.payload.type}
      className="group relative -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
    >
      {editMode && onDelete ? (
        <button
          type="button"
          aria-label="Delete hotspot"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(hotspot.id);
          }}
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-red-600 text-white opacity-0 shadow transition-opacity hover:bg-red-500 group-hover:opacity-100"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : null}
      <span
        className={`absolute inset-0 rounded-full ${
          selected ? "bg-amber-400/40" : "bg-white/30"
        } animate-ping`}
        style={{ animationDuration: "2s" }}
      />
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 ${
          selected
            ? "border-amber-300 bg-amber-400 text-neutral-900"
            : "border-white bg-black/60 text-white"
        } shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110`}
      >
        <span
          className="flex items-center justify-center transition-transform"
          style={
            hotspot.payload.type === "scene_link"
              ? { transform: `rotate(${hotspot.payload.data.arrowRotation ?? 90}deg)` }
              : undefined
          }
        >
          {icon}
        </span>
      </span>
      {targetScene && hotspot.payload.type === "scene_link" ? (
        <span className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 flex flex-col items-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="overflow-hidden rounded-lg border-2 border-white/80 bg-black/40 shadow-2xl backdrop-blur-md">
            <img
              src={targetScene.imageUrl}
              crossOrigin="anonymous"
              alt=""
              className="block h-20 w-32 object-cover"
              loading="lazy"
            />
          </span>
          <span className="mt-1 whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-xs font-medium text-white shadow-md">
            {hotspot.label || `→ ${targetScene.name}`}
          </span>
        </span>
      ) : hotspot.label ? (
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          {hotspot.label}
        </span>
      ) : null}
    </div>
  );
}

function iconFor(h: Hotspot) {
  switch (h.payload.type) {
    case "scene_link":
      return <ArrowIcon />;
    case "info":
      return <InfoIcon />;
    case "url":
      return <LinkIcon />;
    case "image":
      return <ImageIcon />;
    case "video":
      return <VideoIcon />;
    case "contact":
      return <ContactIcon />;
  }
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
