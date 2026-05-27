// Shared authorization for tour-scoped writes.
//
// Without this helper every editor server action did the same dance:
//   1. requireActiveTeam() → caller's own team
//   2. fetch the tour row
//   3. assert tour.team_id === team.id
// which silently locked platform admins out of any tour that wasn't on
// their own team. Migration 0007 already granted admins RLS access; this
// helper closes the application-layer gap so /editor/[id] and saveTour
// behave the same way the DB does.
//
// authorizeTourAccess returns the EFFECTIVE team_id — i.e. the tour's
// own team — so callers can use it for things like building R2 object
// keys (tours/{team_id}/{tour_id}/...) without having to thread the
// caller's team separately.

import "server-only";
import { getUser, isPlatformAdmin, requireUser, requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type TourAccessOk = {
  ok: true;
  tourId: string;
  teamId: string;
  userId: string;
  isAdmin: boolean;
};

export type TourAccessErr = {
  ok: false;
  error: string;
  status?: number;
};

export type TourAccess = TourAccessOk | TourAccessErr;

/**
 * Returns the effective team_id (the tour's own team_id) if the caller
 * may write to this tour, or an error otherwise. Platform admins always
 * pass; regular users must be on the tour's team.
 */
export async function authorizeTourAccess(tourId: string): Promise<TourAccess> {
  const user = await getUser();
  if (!user) return { ok: false, error: "not signed in", status: 401 };

  const supabase = await createClient();
  const { data: tour, error } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tourId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!tour) return { ok: false, error: "Tour not found.", status: 404 };

  const admin = await isPlatformAdmin();
  if (admin) {
    return { ok: true, tourId, teamId: tour.team_id, userId: user.id, isAdmin: true };
  }

  const { team } = await requireActiveTeam();
  if (tour.team_id !== team.id) {
    return { ok: false, error: "Forbidden.", status: 403 };
  }
  return { ok: true, tourId, teamId: team.id, userId: user.id, isAdmin: false };
}

/**
 * Throw-style variant for page components (Server Components) that want
 * to bubble auth failures via redirect/notFound instead of returning a
 * result object.
 */
export async function requireTourAccess(tourId: string): Promise<TourAccessOk> {
  // Force a redirect to login if not signed in.
  await requireUser(`/editor/${tourId}`);
  const r = await authorizeTourAccess(tourId);
  if (!r.ok) {
    if (r.status === 404) {
      const { notFound } = await import("next/navigation");
      notFound();
    }
    throw new Error(r.error);
  }
  return r;
}
