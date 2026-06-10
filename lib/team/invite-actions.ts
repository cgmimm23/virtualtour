"use server";

// Team-member invite flow. Auth as owner/admin to create or revoke;
// the invitee accepts via the SECURITY DEFINER RPC defined in 0011.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { requireActiveTeam, requireUser, getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  // Plan-limit check: count current members + outstanding (unaccepted) invites
  // and refuse if adding one more would exceed the cap. Explicitly scoped to
  // team.id (RLS no longer exists).
  const [memberCount, pendingCount] = await Promise.all([
    prisma.team_members.count({ where: { team_id: team.id } }),
    prisma.team_invites.count({ where: { team_id: team.id, accepted_at: null } }),
  ]);
  const used = memberCount + pendingCount;
  const limit = PLAN_LIMITS[team.plan].members;
  if (limit !== Number.POSITIVE_INFINITY && used >= limit) {
    return {
      ok: false,
      error: `Your ${team.plan} plan allows ${limit} ${limit === 1 ? "user" : "users"} (you have ${memberCount} member${memberCount === 1 ? "" : "s"} + ${pendingCount} pending). Upgrade to invite more.`,
    };
  }

  // Reject duplicate pending invite to the same address — a no-op confuses
  // the inviter ("did it send?") and the invitee ("which link is real?").
  // Explicitly scoped to team.id.
  const existing = await prisma.team_invites.findFirst({
    where: { team_id: team.id, email, accepted_at: null },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "There's already a pending invite for that email. Revoke it first to resend.",
    };
  }

  const token = randomToken();
  let invite: { id: string };
  try {
    invite = await prisma.team_invites.create({
      data: {
        team_id: team.id,
        email,
        role: input.role,
        token,
        invited_by: user?.id ?? null,
      },
      select: { id: true },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't create the invite." };
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

  // Scope by both invite id AND team.id so a caller can't revoke another
  // team's invite (RLS no longer enforces this).
  try {
    await prisma.team_invites.deleteMany({
      where: { id: input.inviteId, team_id: team.id },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "revoke failed" };
  }

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

  // Don't let the last owner be removed — would orphan the team. All queries
  // explicitly scoped to team.id (RLS no longer exists).
  const target = await prisma.team_members.findUnique({
    where: { team_id_user_id: { team_id: team.id, user_id: input.userId } },
    select: { role: true },
  });
  if (!target) return { ok: false, error: "Member not found on this team." };

  if (target.role === "owner") {
    const ownerCount = await prisma.team_members.count({
      where: { team_id: team.id, role: "owner" },
    });
    if (ownerCount <= 1) {
      return { ok: false, error: "Can't remove the last owner — promote someone else first." };
    }
  }

  try {
    await prisma.team_members.delete({
      where: { team_id_user_id: { team_id: team.id, user_id: input.userId } },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "remove failed" };
  }

  revalidatePath("/dashboard/team");
  return { ok: true };
}

export async function acceptTeamInvite(input: {
  token: string;
}): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  // Previously a SECURITY DEFINER RPC (accept_team_invite) that derived the
  // caller from auth.uid(). With NextAuth + Prisma there is no Postgres session
  // identity, so auth.uid() would be NULL and the RPC would always reject.
  // We reimplement its logic here against the authenticated NextAuth user.
  // Writes are intentionally cross-tenant (invitee may not yet be a member of
  // the inviting team) — scoped to the invite's own team_id.
  const user = await requireUser("/dashboard");

  const invite = await prisma.team_invites.findUnique({
    where: { token: input.token },
  });
  if (!invite) return { ok: false, error: "invite not found" };
  if (invite.accepted_at !== null) return { ok: false, error: "invite already used" };
  if (invite.expires_at <= new Date()) return { ok: false, error: "invite has expired" };

  const userEmail = user.email;
  if (
    !userEmail ||
    invite.email.toLowerCase() !== userEmail.toLowerCase()
  ) {
    return {
      ok: false,
      error: `invite was sent to ${invite.email} — sign in with that email to accept`,
    };
  }

  // Atomically add membership (if not already present) and mark accepted.
  await prisma.$transaction(async (tx) => {
    const already = await tx.team_members.findUnique({
      where: { team_id_user_id: { team_id: invite.team_id, user_id: user.id } },
      select: { user_id: true },
    });
    if (!already) {
      await tx.team_members.create({
        data: { team_id: invite.team_id, user_id: user.id, role: invite.role },
      });
    }
    await tx.team_invites.update({
      where: { id: invite.id },
      data: { accepted_at: new Date(), accepted_by: user.id },
    });
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
