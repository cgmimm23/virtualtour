"use client";

// If the page loads with ?checkout=<plan>, kick off the Stripe checkout
// session immediately and redirect — turns a "land here from signup" into
// "drop straight into Stripe checkout" without a manual click.
//
// Stays a noisy banner if checkout fails so the user understands why
// they're still on the billing page.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startCheckout } from "@/lib/stripe/billing-actions";

const PAID_PLANS = new Set(["solo", "team", "brokerage"]);

export function AutoCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("checkout") ?? "";
  const plan = PAID_PLANS.has(requested) ? requested : null;
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plan || fired.current) return;
    fired.current = true;
    (async () => {
      const r = await startCheckout({ plan: plan as "solo" | "team" | "brokerage" });
      if (r.ok && r.url) {
        window.location.href = r.url;
      } else {
        setError(r.ok ? "Checkout returned no URL." : r.error);
        // Strip ?checkout from the URL so a refresh doesn't retry forever.
        router.replace("/dashboard/billing");
      }
    })();
  }, [plan, router]);

  if (!plan) return null;
  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Couldn&apos;t start checkout: {error}. Use the plan grid below to try again.
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
      Sending you to Stripe to complete checkout…
    </div>
  );
}
