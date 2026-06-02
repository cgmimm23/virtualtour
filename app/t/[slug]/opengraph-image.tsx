// Per-tour Open Graph image. Composes title + address + price/bed/bath
// chips + brokerage in a 1200x630 card with the panorama cover as a
// blurred background. Generated on demand via next/og.
//
// Runs on the Node.js runtime because we need fetchPublicTourBySlug
// (which uses the Supabase admin client — not edge-safe).

import { ImageResponse } from "next/og";
import { fetchPublicTourBySlug } from "@/lib/tour/public";
import { resolveTourImageUrls } from "@/lib/r2/resolve";
import type { ListingDetails } from "@/lib/tour/types";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Virtual tour preview";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export default async function Image({ params }: RouteParams) {
  const { slug } = await params;
  const raw = await fetchPublicTourBySlug(slug);
  if (!raw) return fallbackCard();
  const tour = await resolveTourImageUrls(raw);
  const cover = tour.scenes.find((s) => s.id === tour.coverSceneId) ?? tour.scenes[0];
  const d = tour.details;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "linear-gradient(135deg, #205081 0%, #1a3a5c 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {cover?.imageUrl ? (
          <>
            <img
              src={cover.imageUrl}
              width={1200}
              height={630}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                filter: "saturate(1.05)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(15,30,48,0.35) 0%, rgba(15,30,48,0.55) 50%, rgba(15,30,48,0.92) 100%)",
              }}
            />
          </>
        ) : null}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            height: "100%",
          }}
        >
          {/* Top — VITA mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "white",
                color: "#205081",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: -1,
              }}
            >
              V
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              VITA · Virtual Tour
            </div>
          </div>

          {/* Bottom — title / address / chips / brokerage */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tour.propertyAddress ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 500,
                  opacity: 0.85,
                  letterSpacing: -0.3,
                }}
              >
                {tour.propertyAddress}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -2,
                maxWidth: 1080,
              }}
            >
              {clamp(tour.title, 60)}
            </div>

            <ChipRow details={d} />

            {tour.branding?.agentName || tour.branding?.brokerageName ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 8,
                  fontSize: 18,
                  fontWeight: 500,
                  opacity: 0.9,
                  letterSpacing: -0.2,
                }}
              >
                {[tour.branding?.agentName, tour.branding?.brokerageName]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

function ChipRow({ details }: { details: ListingDetails | undefined }) {
  const chips: Array<{ key: string; label: string; tone: "accent" | "default" }> = [];
  if (details?.listPrice) {
    chips.push({
      key: "price",
      label: formatPrice(details.listPrice),
      tone: "accent",
    });
  }
  if (details?.beds !== undefined) {
    chips.push({ key: "beds", label: `${details.beds} bed`, tone: "default" });
  }
  if (details?.baths !== undefined) {
    chips.push({ key: "baths", label: `${details.baths} bath`, tone: "default" });
  }
  if (details?.sqft) {
    chips.push({
      key: "sqft",
      label: `${details.sqft.toLocaleString()} sqft`,
      tone: "default",
    });
  }
  if (details?.status === "for_sale") {
    chips.push({ key: "status", label: "For sale", tone: "accent" });
  } else if (details?.status === "for_rent") {
    chips.push({ key: "status", label: "For rent", tone: "accent" });
  } else if (details?.status === "pending") {
    chips.push({ key: "status", label: "Pending", tone: "default" });
  } else if (details?.status === "sold") {
    chips.push({ key: "status", label: "Sold", tone: "default" });
  }

  if (chips.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {chips.map((c) => (
        <div
          key={c.key}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 600,
            ...(c.tone === "accent"
              ? { background: "#d9534f", color: "white" }
              : { background: "rgba(255,255,255,0.18)", color: "white" }),
          }}
        >
          {c.label}
        </div>
      ))}
    </div>
  );
}

function clamp(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  if (n >= 1000) {
    return `$${Math.round(n / 1000)}K`;
  }
  return `$${n.toLocaleString()}`;
}

function fallbackCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #205081 0%, #1a3a5c 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        VITA · Virtual Tour
      </div>
    ),
    size,
  );
}
