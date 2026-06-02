"use server";

// Team-member invite flow. Auth as owner/admin to create or revoke;
// the invitee accepts via the SECURITY DEFINER RPC defined in 0011.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireActiveTeam, getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTeamInviteEmail } from "@/lib/email/team-invite";
import { PLAN_LIMITS } from "@/lib/plan-limits";

const ALLOWED_ROLES = new Set(["agent", "admin"]);

function randomToken(): string {
  // 32 bytes → 64 hex chars. Plenty of entropy, URL-safe, no padding.
  return randomBytes(32).toString("hex");
}

interface CreateInviteResult {
  ok: true;
  inviteId: string;
  emailed: boolean;
}
interface CreateInviteError {
  ok: false;
  error: string;
}

export async function createTeamInvite(input: {
  email: string;
  role: "agent" | "admin";
}): Promise<CreateInviteResult | CreateInviteError> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "A valid email is required." };
  }
  if (!ALLOWED_ROLES.has(input.role)) {
    return { ok: false, error: "Role must be agent or admin." };
  }

  const { team, role: callerRole } = await requireActiveTeam("/dashboard/team");
  if (callerRole !== "owner" && callerRole !== "admin") {
    return { ok: false, error: "Only owners and admins can invite teammates." };
  }

  const user = await getUser();
  const supabase = await createClient();

  // Plan-limit check: count current members + outstanding (unaccepted) invites
  // and refuse if adding one more would exceed the cap. Use the admin client
  // for counting so RLS doesn't blur the numbers across teams.
  const admin = createAdminClient();
  const { count: memberCount } = await admin
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", team.id);
  const { count: pendingCount } = await admin
    .from("team_invites")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team.id)
    .is("accepted_at", null);
  const used = (memberCount ?? 0) + (pendingCount ?? 0);
  const limit = PLAN_LIMITS[team.plan].members;
  if (limit !== Number.POSITIVE_INFINITY && used >= limit) {
    return {
      ok: false,
      error: `Your ${team.plan} plan allows ${limit} ${limit === 1 ? "user" : "users"} (you have ${memberCount ?? 0} member${memberCount === 1 ? "" : "s"} + ${pendingCount ?? 0} pending). Upgrade to invite more.`,
    };
  }

  // Reject duplicate pending invite to the same address — a no-op confuses
  // the inviter ("did it send?") and the invitee ("which link is real?").
  const { data: existing } = await supabase
    .from("team_invites")
    .select("id")
    .eq("team_id", team.id)
    .eq("email", email)
    .is("accepted_at", null)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "There's already a pending invite for that email. Revoke it first to resend.",
    };
  }

  const token = randomToken();
  const { data: invite, error } = await supabase
    .from("team_invites")
    .insert({
      team_id: team.id,
      email,
      role: input.role,
      token,
      invited_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !invite) {
    return { ok: false, error: error?.message ?? "Couldn't create the invite." };
  }

  const emailed = await sendTeamInviteEmail({
    to: email,
    teamName: team.name,
    inviterEmail: user?.email ?? null,
    role: input.role,
    token,
  });

  revalidatePath("/dashboard/team");
  return { ok: true, inviteId: invite.id, emailed };
}

export async function revokeTeamInvite(input: {
  inviteId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { team, role: callerRole } = await requireActiveTeam("/dashboard/team");
  if (callerRole !== "owner" && callerRole !== "admin") {
    return { ok: false, error: "Only owners and admins can revoke invites." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_invites")
    .delete()
    .eq("id", input.inviteId)
    .eq("team_id", team.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function removeTeamMember(input: {
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { team, role: callerRole } = await requireActiveTeam("/dashboard/team");
  if (callerRole !== "owner" && callerRole !== "admin") {
    return { ok: false, error: "Only owners and admins can remove members." };
  }
  if (input.userId === (await getUser())?.id) {
    return { ok: false, error: "Use 'Leave team' to remove yourself, not this." };
  }

  // Don't let the last owner be removed — would orphan the team.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", team.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Member not found on this team." };

  if (target.role === "owner") {
    const { count } = await supabase
      .from("team_members")
      .select("user_id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Can't remove the last owner — promote someone else first." };
    }
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", team.id)
    .eq("user_id", input.userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function acceptTeamInvite(input: {
  token: string;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_team_invite", {
    p_token: input.token,
  });
  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; team_id?: string };
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Couldn't accept the invite." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
