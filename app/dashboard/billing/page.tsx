import Link from "next/link";
import { requireActiveTeam } from "@/lib/auth";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { BillingPlanGrid } from "./plan-grid";

export const dynamic = "force-dynamic";

const PLAN_BLURB: Record<string, { price: string; bullets: string[] }> = {
  trial: { price: "free", bullets: ["1 tour", "Tourly footer", "lead capture disabled"] },
  solo: {
    price: "$29 / mo",
    bullets: ["5 active tours", "1 user", "lead capture", "CSV export", "Zapier"],
  },
  team: {
    price: "$79 / mo",
    bullets: ["25 active tours", "5 users", "native CRM (FUB, kvCORE, Sierra)"],
  },
  brokerage: {
    price: "$199 / mo",
    bullets: ["unlimited tours", "20 users", "white-label", "custom domain", "API"],
  },
};

export default async function DashboardBilling({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; cancelled?: string }>;
}) {
  const { team, role } = await requireActiveTeam("/dashboard/billing");
  const sp = await searchParams;
  const stripe = await getStripe();
  const stripeConfigured = stripe !== null;

  // Recent billing events (just for this team — RLS allows it).
  const supabase = createAdminClient();
  const { data: events } = await supabase
    .from("billing_events")
    .select("type, source, from_plan, to_plan, amount_cents, currency, created_at")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const blurb = PLAN_BLURB[team.plan] ?? PLAN_BLURB.trial;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-xs text-brand-600 hover:text-brand-700">
          ← Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-neutral-500">Manage your subscription and payment method.</p>
      </div>

      {sp.ok ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ Subscription updated. Changes take effect immediately; the next invoice reflects the
          new plan.
        </div>
      ) : null}
      {sp.cancelled ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Checkout cancelled. Your plan didn&apos;t change.
        </div>
      ) : null}

      <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Current plan
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-semibold capitalize text-brand-700">
                {team.plan}
              </span>
              <span className="text-sm text-neutral-500">{blurb.price}</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
              {blurb.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            {team.stripe_status ? (
              <p className="mt-3 text-xs text-neutral-500">
                Stripe status: <strong>{team.stripe_status}</strong>
                {team.current_period_end ? (
                  <>
                    {" · "}renews{" "}
                    {new Date(team.current_period_end).toLocaleDateString()}
                  </>
                ) : null}
                {team.cancel_at_period_end ? " · cancelling at period end" : null}
              </p>
            ) : null}
          </div>
        </div>

        {role === "owner" || role === "admin" ? (
          <div className="mt-6 border-t border-neutral-100 pt-6">
            {!stripeConfigured ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Stripe isn&apos;t configured yet. Self-serve checkout / Customer Portal will
                appear here once the platform admin sets the Stripe keys.
              </div>
            ) : (
              <BillingPlanGrid
                currentPlan={team.plan}
                hasCustomer={Boolean(team.stripe_customer_id)}
              />
            )}
          </div>
        ) : (
          <p className="mt-6 border-t border-neutral-100 pt-6 text-sm text-neutral-500">
            Only team owners and admins can change the plan.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Recent billing activity
        </h2>
        {(events?.length ?? 0) === 0 ? (
          <div className="p-5 text-sm text-neutral-500">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {events!.map((e, i) => (
              <li key={i} className="grid grid-cols-12 gap-2 p-4 text-sm">
                <div className="col-span-4 text-xs text-neutral-500 tabular-nums">
                  {new Date(e.created_at).toLocaleString()}
                </div>
                <div className="col-span-4 font-medium">{e.type}</div>
                <div className="col-span-4 text-xs text-neutral-500">
                  {e.from_plan && e.to_plan ? `${e.from_plan} → ${e.to_plan}` : ""}
                  {e.amount_cents
                    ? ` ${(e.amount_cents / 100).toLocaleString("en-US", {
                        style: "currency",
                        currency: (e.currency ?? "usd").toUpperCase(),
                      })}`
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
