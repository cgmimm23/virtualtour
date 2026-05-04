"use client";

import type { BrandingConfig } from "@/lib/tour/types";

interface AgentCardProps {
  branding: BrandingConfig;
  variant?: "compact" | "full";
  onContact?: () => void;
}

export function AgentCard({ branding, variant = "compact", onContact }: AgentCardProps) {
  const { agentName, agentPhotoUrl, agentPhone, agentEmail, brokerageName, primaryColor } = branding;
  if (!agentName && !brokerageName) return null;

  const initials = (agentName ?? "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const accent = primaryColor ?? "#205081";

  return (
    <div
      className={
        variant === "full"
          ? "flex items-center gap-3 rounded-xl border border-white/20 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md"
          : "flex items-center gap-2 rounded-full border border-white/20 bg-black/60 py-1.5 pl-1.5 pr-3 text-white shadow-lg backdrop-blur-md"
      }
    >
      <div
        className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${variant === "full" ? "h-12 w-12 text-base" : "h-8 w-8 text-xs"} font-semibold`}
        style={{ background: accent }}
      >
        {agentPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agentPhotoUrl} alt={agentName ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span>{initials || "★"}</span>
        )}
      </div>
      <div className="min-w-0">
        {agentName ? (
          <div className={variant === "full" ? "truncate text-sm font-semibold" : "truncate text-xs font-medium"}>
            {agentName}
          </div>
        ) : null}
        {brokerageName ? (
          <div className={variant === "full" ? "truncate text-xs text-white/70" : "hidden"}>
            {brokerageName}
          </div>
        ) : null}
      </div>
      {variant === "full" ? (
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          {agentPhone ? (
            <a
              href={`tel:${agentPhone}`}
              className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-white/10"
              aria-label={`Call ${agentName}`}
            >
              Call
            </a>
          ) : null}
          {onContact ? (
            <button
              type="button"
              onClick={onContact}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: accent }}
            >
              Contact
            </button>
          ) : agentEmail ? (
            <a
              href={`mailto:${agentEmail}`}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: accent }}
            >
              Contact
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
