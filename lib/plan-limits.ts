// Per-plan quotas. The marketing pricing page advertises these numbers; this
// file makes them load-bearing — no mutation goes through without checking.
//
// Numbers must match db/migrations/0008_pricing_tiers.sql feature bullets
// and the marketing page. If you change one, change all three.

import "server-only";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  // Service-role would let us count past RLS, but the caller is always a
  // member of the team — RLS lets them count too.
  const [tours, members] = await Promise.all([
    supabase.from("tours").select("id", { count: "exact", head: true }).eq("team_id", teamId),
    supabase.from("team_members").select("user_id", { count: "exact", head: true }).eq("team_id", teamId),
  ]);
  return {
    tours: tours.count ?? 0,
    members: members.count ?? 0,
  };
}

/**
 * Check whether the team can create one more tour under its current plan.
 * Platform admins always pass — we're our own first customer and the founder
 * shouldn't be locked out of their own product.
 */
export async function checkTourQuota(teamId: string, plan: Plan): Promise<QuotaResult> {
  const limits = PLAN_LIMITS[plan];
  const isAdmin = await isPlatformAdmin();

  const supabase = await createClient();
  const { count } = await supabase
    .from("tours")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  const current = count ?? 0;
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
