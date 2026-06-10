// Public-tour fetch helpers used by /t/[slug]. Hits the public_tour_by_slug
// RPC which only returns published tours — no auth required. The slug + status
// gating lives inside the SECURITY DEFINER function, so this path is
// intentionally public for anonymous viewers.

import { prisma } from "@/lib/db";
import { kremmenPlaceTour } from "./kremmen-place";
import type { Tour } from "./types";

const HARDCODED_DEMO_TOURS: Record<string, Tour> = {
  [kremmenPlaceTour.slug]: kremmenPlaceTour,
};

export async function fetchPublicTourBySlug(slug: string): Promise<Tour | null> {
  // If the DB isn't configured yet (early prod, before env vars + seed are
  // wired up), fall back to the hardcoded demo tour map so the marketing
  // landing's "See a live tour" link keeps working.
  if (!process.env.DATABASE_URL) {
    return HARDCODED_DEMO_TOURS[slug] ?? null;
  }

  try {
    const rows = await prisma.$queryRaw<{ public_tour_by_slug: unknown }[]>`
      select public_tour_by_slug(${slug}) as public_tour_by_slug
    `;
    const data = rows[0]?.public_tour_by_slug ?? null;
    if (data) {
      // The RPC returns the tour shaped exactly like our in-memory `Tour`,
      // so we cast through unknown. If the migration drifts this is the
      // place we'll notice it (runtime errors in the viewer).
      return data as unknown as Tour;
    }
  } catch (err) {
    // RPC missing (migrations not applied yet) or any DB error — fall back to
    // the hardcoded demo for known slugs so prod doesn't 500. Real DB tours
    // will return cleanly once migrations land.
    console.error("[fetchPublicTourBySlug] public_tour_by_slug RPC failed:", err);
  }

  return HARDCODED_DEMO_TOURS[slug] ?? null;
}
