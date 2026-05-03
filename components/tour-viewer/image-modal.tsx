"use client";

import { useEffect, useRef, useState } from "react";

interface ImageModalProps {
  url: string;
  caption?: string;
  /** When provided, renders an A/B before/after slider with `beforeUrl` on the left. */
  beforeUrl?: string;
  onClose: () => void;
}

export function ImageModal({ url, caption, beforeUrl, onClose }: ImageModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        {beforeUrl ? (
          <BeforeAfterSlider beforeUrl={beforeUrl} afterUrl={url} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={caption ?? ""}
            className="mx-auto max-h-[80vh] w-auto rounded-lg object-contain shadow-2xl"
          />
        )}
        {caption ? (
          <p className="mx-auto mt-3 max-w-2xl rounded-md bg-black/60 px-3 py-2 text-center text-sm text-white/90 backdrop-blur">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BeforeAfterSlider({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [percent, setPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const onMove = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPercent(next);
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-h-[80vh] w-full overflow-hidden rounded-lg shadow-2xl select-none"
      onMouseMove={(e) => draggingRef.current && onMove(e.clientX)}
      onMouseUp={() => (draggingRef.current = false)}
      onMouseLeave={() => (draggingRef.current = false)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt="" className="block max-h-[80vh] w-full object-contain" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${percent}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={beforeUrl}
          alt=""
          className="block max-h-[80vh] w-auto object-contain"
          style={{ width: `${(100 / percent) * 100}%`, maxWidth: "none" }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 -translate-x-1/2 cursor-ew-resize bg-white shadow-lg"
        style={{ left: `${percent}%` }}
        onMouseDown={() => (draggingRef.current = true)}
        onTouchStart={() => (draggingRef.current = true)}
      >
        <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18-6-6 6-6" />
            <path d="m15 6 6 6-6 6" />
          </svg>
        </div>
      </div>
      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
        Before
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
        After
      </div>
    </div>
  );
}
