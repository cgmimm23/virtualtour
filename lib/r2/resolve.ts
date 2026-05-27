// Server-side helpers that translate stored `r2:<key>` references into
// presigned GET URLs the browser / Marzipano can fetch directly.
//
// We sign for 7 days. That's long enough for a public tour share, short
// enough that a leaked URL stops working soon. The page re-signs on every
// render, so the only failure mode is a 7-day-old open browser tab.

import "server-only";
import { presignGet } from "./client";
import type { Tour, Scene } from "@/lib/tour/types";

const R2_PREFIX = "r2:";

export function isR2Ref(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith(R2_PREFIX);
}

/** Public R2.dev URL or custom CDN domain. Set when the bucket is public. */
function publicBase(): string | null {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

/**
 * Reverse of resolveImageUrl: if a URL is a presigned R2 URL or a public R2
 * URL (browser may send one back via saveTour since we resolved on the way
 * out), strip the host and store the bare `r2:<key>` form. Non-R2 URLs are
 * passed through unchanged.
 */
export function dehydrateImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (isR2Ref(url)) return url;
  try {
    const parsed = new URL(url);
    const pub = publicBase();
    if (pub) {
      const pubParsed = new URL(pub);
      if (parsed.hostname === pubParsed.hostname) {
        return `r2:${parsed.pathname.replace(/^\/+/, "")}`;
      }
    }
    if (parsed.hostname.endsWith(".r2.dev")) {
      return `r2:${parsed.pathname.replace(/^\/+/, "")}`;
    }
    if (parsed.hostname.endsWith(".r2.cloudflarestorage.com")) {
      const bucket = process.env.R2_BUCKET_NAME ?? "";
      const path = parsed.pathname.replace(/^\/+/, "");
      if (bucket && path.startsWith(`${bucket}/`)) {
        return `r2:${path.slice(bucket.length + 1)}`;
      }
      return `r2:${path}`;
    }
    return url;
  } catch {
    return url;
  }
}

function keyFromRef(url: string): string {
  return url.slice(R2_PREFIX.length);
}

export async function resolveImageUrl(url: string | null | undefined): Promise<string> {
  if (!url) return "";
  if (!isR2Ref(url)) return url;
  const key = keyFromRef(url);
  const pub = publicBase();
  if (pub) {
    // Public bucket — stable URL, browser-cacheable, no signature expiration.
    // Encode each path segment so spaces / weird chars in filenames don't break.
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `${pub}/${encoded}`;
  }
  // Fallback: presigned GET (works for private buckets).
  return presignGet(key);
}

/** Walk a Tour, replacing any r2: refs on scenes / floor plan with signed URLs. */
export async function resolveTourImageUrls(tour: Tour): Promise<Tour> {
  const scenes: Scene[] = await Promise.all(
    tour.scenes.map(async (s) => ({
      ...s,
      imageUrl: await resolveImageUrl(s.imageUrl),
    })),
  );

  const floorPlan = tour.floorPlan
    ? {
        ...tour.floorPlan,
        imageUrl: tour.floorPlan.imageUrl
          ? await resolveImageUrl(tour.floorPlan.imageUrl)
          : tour.floorPlan.imageUrl,
      }
    : tour.floorPlan;

  return { ...tour, scenes, floorPlan };
}
