"use client";

import type { BrandingConfig } from "@/lib/tour/types";
import { readableTextOn } from "@/lib/branding/contrast";

interface AgentCardProps {
  branding: BrandingConfig;
  variant?: "compact" | "full" | "responsive";
  onContact?: () => void;
}

export function AgentCard({ branding, variant = "compact", onContact }: AgentCardProps) {
  const { agentName, agentPhotoUrl, agentPhone, agentEmail, brokerageName, primaryColor } = branding;
  if (!agentName && !brokerageName) return null;

  // Responsive variant: compact on phone (just photo + name pill, tap to
  // open contact gate), full on desktop. Reduces the chrome footprint
  // on the public viewer where the variant="full" card was eating ~280px
  // of the top-right on phones.
  if (variant === "responsive") {
    return (
      <>
        <div className="md:hidden">
          <AgentCard branding={branding} variant="compact" onContact={onContact} />
        </div>
        <div className="hidden md:block">
          <AgentCard branding={branding} variant="full" onContact={onContact} />
        </div>
      </>
    );
  }

  const initials = (agentName ?? "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const accent = primaryColor ?? "#205081";
  const accentText = readableTextOn(accent);

  // Compact variant doubles as the mobile contact-trigger. If onContact is
  // wired we render the pill as a button so a single tap reaches the gate.
  const compactAsButton = variant === "compact" && Boolean(onContact);
  const Wrapper = (compactAsButton ? "button" : "div") as "div" | "button";
  return (
    <Wrapper
      type={compactAsButton ? "button" : undefined}
      onClick={compactAsButton ? onContact : undefined}
      aria-label={compactAsButton ? `Contact ${agentName ?? "agent"}` : undefined}
      className={
        variant === "full"
          ? "flex items-center gap-3 rounded-xl border border-white/20 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md"
          : compactAsButton
            ? "flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-black/60 py-1.5 pl-1.5 pr-3 text-left text-white shadow-lg backdrop-blur-md hover:bg-black/70"
            : "flex items-center gap-2 rounded-full border border-white/20 bg-black/60 py-1.5 pl-1.5 pr-3 text-white shadow-lg backdrop-blur-md"
      }
    >
      <div
        className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${variant === "full" ? "h-12 w-12 text-base" : "h-8 w-8 text-xs"} font-semibold`}
        style={{ background: accent, color: accentText }}
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
              style={{ background: accent, color: accentText }}
            >
              Contact
            </button>
          ) : agentEmail ? (
            <a
              href={`mailto:${agentEmail}`}
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              style={{ background: accent, color: accentText }}
            >
              Contact
            </a>
          ) : null}
        </div>
      ) : null}
    </Wrapper>
  );
}
