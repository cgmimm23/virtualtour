import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface TeamRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  memberCount: number;
  tourCount: number;
}

async function loadTeams(): Promise<TeamRow[]> {
  const teams = await prisma.teams.findMany({
    orderBy: { created_at: "desc" },
    include: {
      _count: { select: { team_members: true, tours: true } },
    },
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    stripeCustomerId: t.stripe_customer_id ?? null,
    stripeSubscriptionId: t.stripe_subscription_id ?? null,
    createdAt: t.created_at.toISOString(),
    memberCount: t._count.team_members,
    tourCount: t._count.tours,
  }));
}

export default async function AdminTeams() {
  const teams = await loadTeams();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-neutral-500">
            Tenancy + plan + Stripe linkage. {teams.length} total.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
          ← Overview
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Team</th>
              <th className="px-5 py-2 text-left font-medium">Plan</th>
              <th className="px-5 py-2 text-right font-medium">Members</th>
              <th className="px-5 py-2 text-right font-medium">Tours</th>
              <th className="px-5 py-2 text-left font-medium">Stripe</th>
              <th className="px-5 py-2 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                  No teams yet.
                </td>
              </tr>
            ) : (
              teams.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-neutral-500">/{t.slug}</div>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.memberCount}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{t.tourCount}</td>
                  <td className="px-5 py-2.5 text-xs">
                    {t.stripeSubscriptionId ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        active
                      </span>
                    ) : t.stripeCustomerId ? (
                      <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                        no sub
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                        none
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
