// Per-plan quotas. The marketing pricing page advertises these numbers; this
// file makes them load-bearing — no mutation goes through without checking.
//
// Numbers must match db/migrations/0008_pricing_tiers.sql feature bullets
// and the marketing page. If you change one, change all three.

import "server-only";
import { prisma } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/auth";
import type { Plan } from "@/types/supabase";

export interface PlanLimits {
  tours: number;
  members: number;
}

// Infinity is fine — JS comparisons treat it sensibly. Brokerage gets
// "unlimited" tours per the marketing page.
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  trial: { tours: 1, members: 1 },
  solo: { tours: 5, members: 1 },
  team: { tours: 25, members: 5 },
  brokerage: { tours: Number.POSITIVE_INFINITY, members: 20 },
};

export interface TeamUsage {
  tours: number;
  members: number;
}

export interface QuotaResult {
  ok: boolean;
  /** Reason text for UI — null if ok. */
  reason: string | null;
  plan: Plan;
  current: number;
  limit: number;
  /** True if this user bypasses quota (platform admin). */
  bypassed: boolean;
}

export async function getTeamUsage(teamId: string): Promise<TeamUsage> {
  // Explicitly scoped to the passed teamId (RLS no longer exists).
  const [tours, members] = await Promise.all([
    prisma.tours.count({ where: { team_id: teamId } }),
    prisma.team_members.count({ where: { team_id: teamId } }),
  ]);
  return { tours, members };
}

/**
 * Check whether the team can create one more tour under its current plan.
 * Platform admins always pass — we're our own first customer and the founder
 * shouldn't be locked out of their own product.
 */
export async function checkTourQuota(teamId: string, plan: Plan): Promise<QuotaResult> {
  const limits = PLAN_LIMITS[plan];
  const isAdmin = await isPlatformAdmin();

  // Explicitly scoped to the passed teamId (RLS no longer exists).
  const current = await prisma.tours.count({ where: { team_id: teamId } });
  const limit = limits.tours;

  if (isAdmin) {
    return { ok: true, reason: null, plan, current, limit, bypassed: true };
  }
  if (current < limit) {
    return { ok: true, reason: null, plan, current, limit, bypassed: false };
  }

  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
  const reason =
    limit === Number.POSITIVE_INFINITY
      ? `Unexpected limit on ${planName} plan.`
      : `${planName} plan is limited to ${limit} ${limit === 1 ? "tour" : "tours"}. You're at ${current}. Upgrade to add more.`;
  return { ok: false, reason, plan, current, limit, bypassed: false };
}
