// Default OG image for the marketing site. Used as fallback for any
// /(marketing)/* page that doesn't ship its own opengraph-image.tsx.
// 1200x630 is the canonical OG card size.

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VITA — AI Virtual Tour Creator by CGMIMM";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #205081 0%, #1a3a5c 50%, #122846 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Decorative panorama arc */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: 600,
            border: "2px solid rgba(255,255,255,0.06)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -200,
            width: 700,
            height: 700,
            borderRadius: 700,
            border: "2px solid rgba(217,83,79,0.15)",
            display: "flex",
          }}
        />

        {/* Mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              fontWeight: 800,
              color: "#205081",
              letterSpacing: -1,
            }}
          >
            V
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>VITA</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2,
                textTransform: "uppercase",
                opacity: 0.7,
              }}
            >
              by CGMIMM
            </span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 960,
            }}
          >
            The <span style={{ color: "#f3999c" }}>AI virtual tour creator</span>
          </div>
          <div
            style={{
              fontSize: 32,
              opacity: 0.85,
              fontWeight: 500,
              maxWidth: 900,
            }}
          >
            Built for real estate. Camera-agnostic. Lead-capturing. Ready in minutes.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
