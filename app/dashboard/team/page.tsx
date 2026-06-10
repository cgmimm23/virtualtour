import Link from "next/link";
import { requireActiveTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { InviteForm, InviteList, MemberList } from "./controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team — VITA" };

interface MemberRow {
  userId: string;
  email: string;
  role: "owner" | "admin" | "agent";
  joinedAt: string;
}
interface InviteRow {
  id: string;
  email: string;
  role: "owner" | "admin" | "agent";
  invitedAt: string;
  expiresAt: string;
}

export default async function TeamPage() {
  const { team, role: callerRole } = await requireActiveTeam("/dashboard/team");
  const canManage = callerRole === "owner" || callerRole === "admin";

  const [members, invites] = await Promise.all([
    prisma.team_members.findMany({
      where: { team_id: team.id },
      select: {
        user_id: true,
        role: true,
        created_at: true,
        // auth.users join — resolves member emails (no admin API anymore).
        users: { select: { email: true } },
      },
      orderBy: { created_at: "asc" },
    }),
    prisma.team_invites.findMany({
      where: { team_id: team.id, accepted_at: null },
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
        expires_at: true,
        accepted_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  const memberRows: MemberRow[] = (members ?? []).map((m) => ({
    userId: m.user_id,
    email: m.users?.email ?? "(unknown)",
    role: m.role,
    joinedAt: m.created_at.toISOString(),
  }));
  const inviteRows: InviteRow[] = (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    invitedAt: i.created_at.toISOString(),
    expiresAt: i.expires_at.toISOString(),
  }));

  const memberLimit = PLAN_LIMITS[team.plan].members;
  const used = memberRows.length + inviteRows.length;
  const atLimit = memberLimit !== Number.POSITIVE_INFINITY && used >= memberLimit;
  const usageLabel =
    memberLimit === Number.POSITIVE_INFINITY
      ? `${memberRows.length} ${memberRows.length === 1 ? "member" : "members"} + ${inviteRows.length} pending`
      : `${used} / ${memberLimit} (${memberRows.length} ${memberRows.length === 1 ? "member" : "members"}, ${inviteRows.length} pending)`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-neutral-500">
          {team.name} · {usageLabel}
          {atLimit ? (
            <>
              {" · "}
              <Link
                href="/dashboard/billing"
                className="font-medium text-brand-700 hover:text-brand-800"
              >
                Upgrade to invite more →
              </Link>
            </>
          ) : null}
        </p>
      </div>

      {canManage ? (
        <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Invite a teammate
          </h2>
          <InviteForm atLimit={atLimit} />
        </section>
      ) : (
        <p className="mb-6 rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-500">
          Only team owners and admins can invite or remove members. You&apos;re an {callerRole}.
        </p>
      )}

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Members
        </h2>
        <MemberList rows={memberRows} canManage={canManage} />
      </section>

      {inviteRows.length > 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white">
          <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Pending invites
          </h2>
          <InviteList rows={inviteRows} canManage={canManage} />
        </section>
      ) : null}
    </div>
  );
}
