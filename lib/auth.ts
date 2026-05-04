// Auth + tenancy helpers used across server components and server actions.
//
// Every authed page should call `requireUser()` first to redirect anon visitors
// to the login flow. Then use `requireActiveTeam()` to load the user's team.
// We assume single-team membership for now — multi-team picker can be added
// later by reading a `last_team_id` column off auth.users and validating it
// against team_members.

import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database, TeamRole } from "@/types/supabase";

export type UserRow = { id: string; email: string | null };
export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];

export const getUser = cache(async (): Promise<UserRow | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
});

export async function requireUser(currentPath = "/dashboard"): Promise<UserRow> {
  const user = await getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }
  return user;
}

export interface ActiveTeam {
  team: TeamRow;
  role: TeamRole;
}

export const getActiveTeam = cache(async (): Promise<ActiveTeam | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  // Single-team mode: take the first (and currently only) team. RLS is the
  // source of truth — this query is just to surface the membership row.
  const { data: membership } = await supabase
    .from("team_members")
    .select("role, team:teams(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.team) return null;
  // PostgREST returns a single relation as either an object or a single-elem
  // array depending on join cardinality — normalize to an object.
  const team = Array.isArray(membership.team) ? membership.team[0] : membership.team;
  if (!team) return null;
  return { team, role: membership.role };
});

export async function requireActiveTeam(currentPath = "/dashboard"): Promise<ActiveTeam> {
  await requireUser(currentPath);
  const active = await getActiveTeam();
  if (!active) {
    // This shouldn't happen — the on_auth_user_created trigger creates a team
    // for every new auth user. If we hit it, the trigger probably wasn't
    // applied; surface the problem clearly rather than silently 404ing.
    throw new Error(
      "No team found for current user. Did you apply db/migrations/0001_init.sql? " +
        "The on_auth_user_created trigger needs to be in place before signup.",
    );
  }
  return active;
}

// Platform / super-admin helpers. Backed by the `platform_admins` table
// (db/migrations/0004_platform_admins.sql). Distinct from team_members.role —
// these are people who can see across every team.

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error || data === null || data === undefined) return false;
  return Boolean(data);
});

export async function requirePlatformAdmin(currentPath = "/admin"): Promise<UserRow> {
  const user = await requireUser(currentPath);
  const ok = await isPlatformAdmin();
  if (!ok) {
    // Surface a 404 to non-admins rather than 403 — they shouldn't even know
    // /admin exists. notFound() throws a Next-recognized signal.
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}
