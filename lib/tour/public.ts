// Public-tour fetch helpers used by /t/[slug]. Hits the public_tour_by_slug
// RPC which only returns published tours — no auth required, RLS bypass is
// scoped inside the RPC.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tour } from "./types";

export async function fetchPublicTourBySlug(slug: string): Promise<Tour | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("public_tour_by_slug", { p_slug: slug });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  // The RPC returns the tour shaped exactly like our in-memory `Tour`, so we
  // cast through unknown. If the migration drifts this is the place we'll
  // notice it (runtime errors in the viewer).
  return data as unknown as Tour;
}
