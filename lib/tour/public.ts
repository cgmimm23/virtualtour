// Public-tour fetch helpers used by /t/[slug]. Hits the public_tour_by_slug
// RPC which only returns published tours — no auth required, RLS bypass is
// scoped inside the RPC.

import { createAdminClient } from "@/lib/supabase/admin";
import { kremmenPlaceTour } from "./kremmen-place";
import type { Tour } from "./types";

const HARDCODED_DEMO_TOURS: Record<string, Tour> = {
  [kremmenPlaceTour.slug]: kremmenPlaceTour,
};

export async function fetchPublicTourBySlug(slug: string): Promise<Tour | null> {
  // If Supabase isn't configured yet (early prod, before M2 env vars + seed
  // are wired up), fall back to the hardcoded demo tour map so the marketing
  // landing's "See a live tour" link keeps working.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return HARDCODED_DEMO_TOURS[slug] ?? null;
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return HARDCODED_DEMO_TOURS[slug] ?? null;
  }

  try {
    const { data, error } = await supabase.rpc("public_tour_by_slug", { p_slug: slug });
    if (error) throw new Error(error.message);
    if (data) {
      // The RPC returns the tour shaped exactly like our in-memory `Tour`,
      // so we cast through unknown. If the migration drifts this is the
      // place we'll notice it (runtime errors in the viewer).
      return data as unknown as Tour;
    }
  } catch (err) {
    // RPC missing (migrations not applied yet) or any DB error — fall back to
    // the hardcoded demo for known slugs so prod doesn't 500. Real Supabase
    // tours will return cleanly once migrations land.
    console.error("[fetchPublicTourBySlug] Supabase RPC failed:", err);
  }

  return HARDCODED_DEMO_TOURS[slug] ?? null;
}
