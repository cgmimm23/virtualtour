// VITA brand mark + wordmark.
// Drop the parent component anywhere. Variants:
//   - <Logo />           — full lockup (mark + "VITA" + "by CGMIMM" tag)
//   - <Logo compact />   — mark + "VITA" only (for tight spots like the admin header)
//   - <LogoMark />       — just the icon (for favicons, OG cards, square contexts)
//
// Replace the inline SVG below with your real CGMIMM/VITA brand asset
// when you have one — the file URL goes in `public/brand/` and the
// <LogoMark /> body becomes <img src="/brand/vita.svg" ... />.

import type { CSSProperties } from "react";

interface LogoProps {
  compact?: boolean;
  className?: string;
  // Override the default brand colors. Defaults pull from CSS vars set
  // in globals.css (--color-brand-600 / --color-accent-500).
  style?: CSSProperties;
}

export function Logo({ compact, className, style }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      style={style}
      aria-label="VITA by CGMIMM"
    >
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-brand-700">VITA</span>
        {compact ? null : (
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            by CGMIMM
          </span>
        )}
      </span>
    </span>
  );
}

interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * The "V" mark with a 360° panorama horizon arc threaded through it.
 * Brand colors from globals.css: navy primary + crimson accent.
 */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="VITA"
      className={className}
    >
      {/* Rounded square plate */}
      <rect width="32" height="32" rx="7" fill="var(--color-brand-600, #205081)" />
      {/* Panorama arc — represents the 360° horizon */}
      <path
        d="M5 18 C 10 13, 22 13, 27 18"
        stroke="var(--color-brand-200, #b9d0e8)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      {/* "V" letter mark */}
      <path
        d="M9 9 L16 23 L23 9"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Accent dot — vista/horizon point */}
      <circle cx="23" cy="9" r="1.6" fill="var(--color-accent-500, #d9534f)" />
    </svg>
  );
}
