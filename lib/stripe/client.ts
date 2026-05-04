// Lazy Stripe client. Initialized on first use using the secret resolved from
// env (preferred) or app_secrets DB table (admin override). Returns null if
// no key is configured anywhere — callers must handle that.

import "server-only";
import Stripe from "stripe";
import { getSecret } from "@/lib/secrets";

let cached: Stripe | null = null;
let cachedKey: string | null = null;

export async function getStripe(): Promise<Stripe | null> {
  const key = await getSecret("STRIPE_SECRET_KEY");
  if (!key) return null;
  if (cached && cachedKey === key) return cached;
  cached = new Stripe(key, {
    // Use the SDK's default (latest) API version. Pinning here would tie us
    // to whatever was current when the SDK was installed; let Stripe drive it.
    typescript: true,
  });
  cachedKey = key;
  return cached;
}

export async function requireStripe(): Promise<Stripe> {
  const stripe = await getStripe();
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in env or paste it at /admin/settings.",
    );
  }
  return stripe;
}

export function clearStripeCache(): void {
  cached = null;
  cachedKey = null;
}
