"use client";

import { useEffect } from "react";

interface VideoModalProps {
  url: string;
  caption?: string;
  autoplay?: boolean;
  onClose: () => void;
}

export function VideoModal({ url, caption, autoplay, onClose }: VideoModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const embed = resolveVideoEmbed(url, autoplay);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col"
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

        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-2xl">
          {embed.kind === "iframe" ? (
            <iframe
              src={embed.src}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={embed.src}
              className="absolute inset-0 h-full w-full object-contain"
              controls
              autoPlay={autoplay}
              playsInline
            />
          )}
        </div>

        {caption ? (
          <p className="mx-auto mt-3 max-w-2xl rounded-md bg-black/60 px-3 py-2 text-center text-sm text-white/90 backdrop-blur">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface ResolvedEmbed {
  kind: "iframe" | "video";
  src: string;
}

function resolveVideoEmbed(url: string, autoplay?: boolean): ResolvedEmbed {
  // YouTube — convert any watch/short/shareable form to an embed URL.
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) {
    const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
    if (autoplay) params.set("autoplay", "1");
    return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}?${params}` };
  }
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) {
    const params = new URLSearchParams();
    if (autoplay) params.set("autoplay", "1");
    const qs = params.toString();
    return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}${qs ? `?${qs}` : ""}` };
  }
  // Direct file (mp4 / webm / mov)
  return { kind: "video", src: url };
}
