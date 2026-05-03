"use client";

import type { ListingDetails } from "@/lib/tour/types";

interface ListingDetailsOverlayProps {
  details: ListingDetails;
  /** Compact: small floating chip. Full: bigger card with all stats. */
  variant?: "compact" | "full";
}

export function ListingDetailsOverlay({ details, variant = "compact" }: ListingDetailsOverlayProps) {
  const hasAny =
    details.listPrice ||
    details.beds !== undefined ||
    details.baths !== undefined ||
    details.sqft ||
    details.status;
  if (!hasAny) return null;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-white shadow-lg backdrop-blur-md">
        {details.status ? <StatusBadge status={details.status} /> : null}
        {details.listPrice ? (
          <span className="text-sm font-semibold">{formatPrice(details.listPrice)}</span>
        ) : null}
        {details.beds !== undefined || details.baths !== undefined || details.sqft ? (
          <span className="text-xs text-white/70">
            {compactStats(details)}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/20 bg-black/70 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-baseline gap-2">
        {details.listPrice ? (
          <span className="text-xl font-semibold">{formatPrice(details.listPrice)}</span>
        ) : null}
        {details.status ? <StatusBadge status={details.status} /> : null}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {details.beds !== undefined ? (
          <Stat label="Beds" value={String(details.beds)} />
        ) : null}
        {details.baths !== undefined ? (
          <Stat label="Baths" value={String(details.baths)} />
        ) : null}
        {details.sqft ? <Stat label="Sqft" value={details.sqft.toLocaleString()} /> : null}
        {details.lotSqft ? <Stat label="Lot" value={`${details.lotSqft.toLocaleString()} sqft`} /> : null}
        {details.yearBuilt ? <Stat label="Built" value={String(details.yearBuilt)} /> : null}
        {details.mlsNumber ? <Stat label="MLS#" value={details.mlsNumber} /> : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-white/60">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: NonNullable<ListingDetails["status"]> }) {
  const map: Record<NonNullable<ListingDetails["status"]>, { label: string; class: string }> = {
    for_sale: { label: "For sale", class: "bg-emerald-500 text-white" },
    pending: { label: "Pending", class: "bg-amber-400 text-neutral-900" },
    sold: { label: "Sold", class: "bg-neutral-700 text-white" },
    off_market: { label: "Off market", class: "bg-neutral-500 text-white" },
  };
  const m = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.class}`}>
      {m.label}
    </span>
  );
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `$${(n / 1000).toFixed(0)}k`;
  }
  return `$${n.toLocaleString()}`;
}

function compactStats(d: ListingDetails): string {
  const parts: string[] = [];
  if (d.beds !== undefined) parts.push(`${d.beds} bd`);
  if (d.baths !== undefined) parts.push(`${d.baths} ba`);
  if (d.sqft) parts.push(`${d.sqft.toLocaleString()} sqft`);
  return parts.join(" · ");
}
