"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckout, switchPlan, openCustomerPortal } from "@/lib/stripe/billing-actions";
import type { PricingTier } from "@/lib/pricing";

export function BillingPlanGrid({
  currentPlan,
  hasCustomer,
  hasSubscription,
  tiers,
}: {
  currentPlan: string;
  hasCustomer: boolean;
  hasSubscription: boolean;
  tiers: PricingTier[];
}) {
  const router = useRouter();
  const PLANS = tiers.map((t) => ({
    value: t.plan,
    label: t.displayName,
    price: `$${Math.round(t.priceCents / 100)}`,
    bullets: t.features.filter((f) => f.included).slice(0, 4).map((f) => f.label),
    highlight: t.highlight,
  }));
  const [pending, startTransition] = useTransition();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPickPlan = (plan: "solo" | "team" | "brokerage", label: string) => {
    setError(null);

    // Already-paying customer → modify subscription in place. Otherwise →
    // first-time checkout. Doing both via Checkout would create a second
    // subscription on top of the first and double-charge the customer.
    if (hasSubscription) {
      if (!window.confirm(`Switch to ${label}? Stripe will prorate the difference on your next invoice.`)) {
        return;
      }
      setBusyPlan(plan);
      startTransition(async () => {
        const r = await switchPlan({ plan });
        setBusyPlan(null);
        if (r.ok) {
          router.push("/dashboard/billing?ok=switched");
          router.refresh();
        } else {
          setError(r.error);
        }
      });
      return;
    }

    setBusyPlan(plan);
    startTransition(async () => {
      const r = await startCheckout({ plan });
      setBusyPlan(null);
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setError(r.ok ? "Checkout returned no URL." : r.error);
      }
    });
  };

  const onManage = () => {
    setError(null);
    startTransition(async () => {
      const r = await openCustomerPortal();
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setError(r.ok ? "Portal returned no URL." : r.error);
      }
    });
  };

  const ctaLabel = (planValue: string, label: string, isCurrent: boolean) => {
    if (isCurrent) return "Current plan";
    if (busyPlan === planValue) return "…";
    if (!hasSubscription) return `Upgrade to ${label}`;
    // Determine direction relative to current plan.
    const order = ["trial", "solo", "team", "brokerage"];
    const fromIdx = order.indexOf(currentPlan);
    const toIdx = order.indexOf(planValue);
    if (fromIdx < 0 || toIdx < 0) return `Switch to ${label}`;
    return toIdx > fromIdx ? `Upgrade to ${label}` : `Downgrade to ${label}`;
  };

  return (
    <div>
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

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
                onClick={() => onPickPlan(p.value as "solo" | "team" | "brokerage", p.label)}
                className={`mt-3 w-full rounded-md px-3 py-1.5 text-xs font-semibold ${
                  isCurrent
                    ? "bg-neutral-100 text-neutral-400"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                } disabled:opacity-40`}
              >
                {ctaLabel(p.value, p.label, isCurrent)}
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
