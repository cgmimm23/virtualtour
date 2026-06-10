// Auth + tenancy helpers used across server components and server actions.
//
// Every authed page should call `requireUser()` first to redirect anon visitors
// to the login flow. Then use `requireActiveTeam()` to load the user's team.
//
// Backed by NextAuth (JWT session) + Prisma against the InMotion Postgres.
// Replaces the previous Supabase Auth implementation; the exported API is
// unchanged so callers don't need edits.

import { redirect } from "next/navigation";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import type { teams, team_role } from "@prisma/client";

export type UserRow = { id: string; email: string | null };
export type TeamRole = team_role;
export type TeamRow = teams;

export const getUser = cache(async (): Promise<UserRow | null> => {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session?.user as any;
  if (!u?.id) return null;
  return { id: u.id, email: u.email ?? null };
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

  // Single-team mode: take the first (and currently only) team.
  const membership = await prisma.team_members.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: "asc" },
    include: { teams: true },
  });

  if (!membership || !membership.teams) return null;
  return { team: membership.teams, role: membership.role };
});

export async function requireActiveTeam(currentPath = "/dashboard"): Promise<ActiveTeam> {
  await requireUser(currentPath);
  const active = await getActiveTeam();
  if (!active) {
    // This shouldn't happen — the on_auth_user_created trigger creates a team
    // for every new auth user.
    throw new Error(
      "No team found for current user. The on_auth_user_created trigger needs " +
        "to be in place before signup.",
    );
  }
  return active;
}

// Platform / super-admin helpers. Backed by the `platform_admins` table.

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  const row = await prisma.platform_admins.findUnique({ where: { user_id: user.id } });
  return row !== null;
});

export async function requirePlatformAdmin(currentPath = "/admin"): Promise<UserRow> {
  const user = await requireUser(currentPath);
  const ok = await isPlatformAdmin();
  if (!ok) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}
