"use client";

import { useTransition } from "react";
import { startCheckout, openCustomerPortal } from "@/lib/stripe/billing-actions";
import type { PricingTier } from "@/lib/pricing";

export function BillingPlanGrid({
  currentPlan,
  hasCustomer,
  tiers,
}: {
  currentPlan: string;
  hasCustomer: boolean;
  tiers: PricingTier[];
}) {
  const PLANS = tiers.map((t) => ({
    value: t.plan,
    label: t.displayName,
    price: `$${Math.round(t.priceCents / 100)}`,
    bullets: t.features.filter((f) => f.included).slice(0, 4).map((f) => f.label),
    highlight: t.highlight,
  }));
  const [pending, startTransition] = useTransition();

  const onUpgrade = (plan: "solo" | "team" | "brokerage") => {
    startTransition(async () => {
      const r = await startCheckout({ plan });
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        alert(`Couldn't start checkout: ${r.ok ? "" : r.error}`);
      }
    });
  };

  const onManage = () => {
    startTransition(async () => {
      const r = await openCustomerPortal();
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        alert(`Couldn't open portal: ${r.ok ? "" : r.error}`);
      }
    });
  };

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.value;
          return (
            <div
              key={p.value}
              className={`rounded-xl border p-4 ${
                isCurrent
                  ? "border-brand-500 bg-brand-50"
                  : p.highlight
                    ? "border-accent-300 bg-white"
                    : "border-neutral-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.label}</h3>
                {p.highlight ? (
                  <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    popular
                  </span>
                ) : null}
              </div>
              <div className="mt-1">
                <span className="text-2xl font-semibold tabular-nums">{p.price}</span>
                <span className="text-xs text-neutral-500">/mo</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-xs text-neutral-600">
                {p.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
              <button
                type="button"
                disabled={pending || isCurrent}
                onClick={() => onUpgrade(p.value)}
                className={`mt-3 w-full rounded-md px-3 py-1.5 text-xs font-semibold ${
                  isCurrent
                    ? "bg-neutral-100 text-neutral-400"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                } disabled:opacity-40`}
              >
                {isCurrent ? "Current plan" : pending ? "…" : `Upgrade to ${p.label}`}
              </button>
            </div>
          );
        })}
      </div>

      {hasCustomer ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-600">
            Manage card, invoices, and cancellation in the Stripe-hosted Customer Portal.
          </p>
          <button
            type="button"
            onClick={onManage}
            disabled={pending}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100 disabled:opacity-40"
          >
            {pending ? "…" : "Open Stripe portal →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
