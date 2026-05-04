// Stripe product/price bootstrap. The first time the admin saves a Stripe key
// without already having price IDs configured, /admin/settings → "Create
// Stripe products" calls this to provision the 3 Tourly tiers and write the
// resulting price IDs back into app_secrets so checkout can use them.
//
// Idempotent: if products with the canonical metadata key already exist on
// the account, we reuse them instead of creating duplicates.

import "server-only";
import { requireStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

interface TierSpec {
  key: "solo" | "team" | "brokerage";
  name: string;
  description: string;
  unitAmountCents: number;
  metadataKey: string;
  secretKey: "STRIPE_PRICE_ID_SOLO" | "STRIPE_PRICE_ID_TEAM" | "STRIPE_PRICE_ID_BROKERAGE";
}

const TIERS: TierSpec[] = [
  {
    key: "solo",
    name: "Tourly Solo",
    description: "5 active tours, 1 user, 25 GB storage, lead capture.",
    unitAmountCents: 2900,
    metadataKey: "tourly_solo",
    secretKey: "STRIPE_PRICE_ID_SOLO",
  },
  {
    key: "team",
    name: "Tourly Team",
    description: "25 active tours, 5 users, 100 GB storage, native CRM.",
    unitAmountCents: 7900,
    metadataKey: "tourly_team",
    secretKey: "STRIPE_PRICE_ID_TEAM",
  },
  {
    key: "brokerage",
    name: "Tourly Brokerage",
    description: "Unlimited tours, 20 users, 500 GB, white-label, custom domain.",
    unitAmountCents: 19900,
    metadataKey: "tourly_brokerage",
    secretKey: "STRIPE_PRICE_ID_BROKERAGE",
  },
];

export interface BootstrapResult {
  created: Array<{ tier: string; productId: string; priceId: string }>;
  reused: Array<{ tier: string; productId: string; priceId: string }>;
}

export async function bootstrapStripeProducts(): Promise<BootstrapResult> {
  const stripe = await requireStripe();
  const supabase = createAdminClient();

  const result: BootstrapResult = { created: [], reused: [] };

  // Pull existing products tagged with our metadata key so we don't duplicate
  // on re-runs (idempotency).
  const products = await stripe.products.list({ active: true, limit: 100 });

  for (const tier of TIERS) {
    let product = products.data.find(
      (p) => p.metadata?.tourly_tier === tier.metadataKey,
    );
    let createdNow = false;

    if (!product) {
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: { tourly_tier: tier.metadataKey },
      });
      createdNow = true;
    }

    // Find an active recurring price matching the unit amount.
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(
      (p) =>
        p.recurring?.interval === "month" &&
        p.unit_amount === tier.unitAmountCents &&
        p.currency === "usd",
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.unitAmountCents,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tourly_tier: tier.metadataKey },
      });
      createdNow = true;
    }

    // Persist the price ID into app_secrets so checkout can resolve it.
    await supabase.from("app_secrets").upsert(
      {
        key: tier.secretKey,
        value: price.id,
        description: `${tier.name} monthly price ID`,
      },
      { onConflict: "key" },
    );

    const entry = { tier: tier.key, productId: product.id, priceId: price.id };
    if (createdNow) result.created.push(entry);
    else result.reused.push(entry);
  }

  return result;
}
