"use client";

interface PlaybackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  isPlaying: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  variant?: "share" | "editor";
}

export function PlaybackControls({
  onPrev,
  onNext,
  onTogglePlay,
  isPlaying,
  hasPrev,
  hasNext,
  variant = "share",
}: PlaybackControlsProps) {
  return (
    <div
      className={
        variant === "share"
          ? "flex items-center gap-1 rounded-full border border-white/15 bg-black/60 p-1 text-white shadow-2xl backdrop-blur-md"
          : "flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-1 shadow-lg"
      }
    >
      <Btn onClick={onPrev} disabled={!hasPrev} ariaLabel="Previous scene" variant={variant} title="Previous (←)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Btn>
      <Btn onClick={onTogglePlay} ariaLabel={isPlaying ? "Pause" : "Play"} variant={variant} title={isPlaying ? "Pause (Space)" : "Auto-play (Space)"} highlight>
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
        )}
      </Btn>
      <Btn onClick={onNext} disabled={!hasNext} ariaLabel="Next scene" variant={variant} title="Next (→)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Btn>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  ariaLabel,
  title,
  variant,
  highlight,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  variant: "share" | "editor";
  highlight?: boolean;
}) {
  const base = "flex h-9 w-9 items-center justify-center rounded-full transition-colors";
  const palette =
    variant === "share"
      ? highlight
        ? "bg-white text-neutral-900 hover:bg-neutral-200"
        : "hover:bg-white/15"
      : highlight
        ? "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        : "hover:bg-neutral-100 dark:hover:bg-neutral-800";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`${base} ${palette} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

interface SideArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

/** Big left/right arrows on the panorama edges, like an image carousel. */
export function SideArrows({ onPrev, onNext, hasPrev, hasNext }: SideArrowsProps) {
  return (
    <>
      {hasPrev ? (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous scene"
          title="Previous (←)"
          className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/70 hover:scale-105"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      ) : null}
      {hasNext ? (
        <button
          type="button"
          onClick={onNext}
          aria-label="Next scene"
          title="Next (→)"
          className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-md transition-all hover:bg-black/70 hover:scale-105"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
