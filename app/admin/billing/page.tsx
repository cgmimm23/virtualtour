import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPricingTiers } from "@/lib/pricing";

export const dynamic = "force-dynamic";

interface BillingRow {
  teamId: string;
  name: string;
  slug: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  mrrCents: number;
}

async function loadPlanMrr(): Promise<Record<string, number>> {
  const tiers = await getPricingTiers();
  const map: Record<string, number> = { trial: 0 };
  for (const t of tiers) map[t.plan] = t.priceCents;
  return map;
}

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusBadge(s: string | null) {
  if (!s) {
    return (
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
        no sub
      </span>
    );
  }
  const tone =
    s === "active" || s === "trialing"
      ? "bg-emerald-50 text-emerald-700"
      : s === "past_due" || s === "incomplete" || s === "unpaid"
        ? "bg-red-50 text-red-700"
        : s === "canceled"
          ? "bg-neutral-100 text-neutral-600"
          : "bg-yellow-50 text-yellow-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}>
      {s}
    </span>
  );
}

async function loadRows(): Promise<{ rows: BillingRow[]; mrrCents: number }> {
  const PLAN_MRR = await loadPlanMrr();
  const teams = await prisma.teams.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      stripe_customer_id: true,
      stripe_subscription_id: true,
      stripe_status: true,
      current_period_end: true,
      cancel_at_period_end: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
  });

  const rows = teams.map((t) => ({
    teamId: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    stripeCustomerId: t.stripe_customer_id ?? null,
    stripeSubscriptionId: t.stripe_subscription_id ?? null,
    stripeStatus: t.stripe_status ?? null,
    currentPeriodEnd: t.current_period_end ? t.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: t.cancel_at_period_end ?? false,
    createdAt: t.created_at.toISOString(),
    mrrCents: t.stripe_status === "active" ? (PLAN_MRR[t.plan] ?? 0) : 0,
  }));

  const mrrCents = rows.reduce((sum, r) => sum + r.mrrCents, 0);
  return { rows, mrrCents };
}

export default async function AdminBilling() {
  await requirePlatformAdmin("/admin/billing");
  const { rows, mrrCents } = await loadRows();

  const activeCount = rows.filter((r) => r.stripeStatus === "active").length;
  const trialCount = rows.filter((r) => r.stripeStatus === "trialing").length;
  const pastDueCount = rows.filter(
    (r) => r.stripeStatus === "past_due" || r.stripeStatus === "unpaid",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-neutral-500">
            Subscription state across every team. MRR sums active subscriptions only.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/settings"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Stripe settings →
          </Link>
          <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700 self-center">
            ← Overview
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="MRR" value={fmtMoney(mrrCents)} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Trial" value={trialCount} />
        <Stat label="Past-due" value={pastDueCount} tone={pastDueCount > 0 ? "warn" : "ok"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium">Team</th>
              <th className="px-5 py-2 text-left font-medium">Plan</th>
              <th className="px-5 py-2 text-left font-medium">Status</th>
              <th className="px-5 py-2 text-right font-medium">MRR</th>
              <th className="px-5 py-2 text-left font-medium">Renews</th>
              <th className="px-5 py-2 text-left font-medium">Created</th>
              <th className="px-5 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                  No teams yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.teamId} className="border-t border-neutral-100">
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-neutral-500">/{r.slug}</div>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700">
                      {r.plan}
                    </span>
                    {r.cancelAtPeriodEnd ? (
                      <span className="ml-2 text-[10px] text-amber-700">
                        cancels at period end
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-2.5">{statusBadge(r.stripeStatus)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    {fmtMoney(r.mrrCents)}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {r.currentPeriodEnd
                      ? new Date(r.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-neutral-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <Link
                      href={`/admin/teams/${r.teamId}`}
                      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50"
                    >
                      Manage →
                    </Link>
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

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "ok" | "warn";
}) {
  const valueClass =
    tone === "warn"
      ? "text-red-600"
      : tone === "ok"
        ? "text-neutral-700"
        : "text-brand-700";
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}
