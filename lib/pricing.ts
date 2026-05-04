// Pricing read helpers. Single source of truth = pricing_tiers table.
// All display surfaces (marketing, dashboard, admin MRR) call these.

import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PricingFeature {
  label: string;
  included: boolean;
}

export interface PricingTier {
  plan: "solo" | "team" | "brokerage";
  displayName: string;
  priceCents: number;
  currency: string;
  blurb: string;
  features: PricingFeature[];
  ctaLabel: string;
  highlight: boolean;
  active: boolean;
  sortOrder: number;
  stripeProductId: string | null;
  stripePriceId: string | null;
}

export const getPricingTiers = cache(async (): Promise<PricingTier[]> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error || !data) {
    console.error("[pricing] getPricingTiers failed:", error?.message);
    return [];
  }
  return data
    .filter((row) => row.plan !== "trial")
    .map(rowToTier);
});

export const getPricingTierByPlan = cache(
  async (plan: string): Promise<PricingTier | null> => {
    if (!isPlan(plan)) return null;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pricing_tiers")
      .select("*")
      .eq("plan", plan)
      .maybeSingle();
    return data ? rowToTier(data) : null;
  },
);

function isPlan(p: string): p is "trial" | "solo" | "team" | "brokerage" {
  return p === "trial" || p === "solo" || p === "team" || p === "brokerage";
}

export async function getPriceCentsForPlan(plan: string): Promise<number> {
  const tier = await getPricingTierByPlan(plan);
  return tier?.priceCents ?? 0;
}

type Row = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<typeof createAdminClient>["from"]
    >["select"] extends never
      ? never
      : never
  >
>;

interface DbRow {
  plan: string;
  display_name: string;
  price_cents: number;
  currency: string;
  blurb: string;
  features: PricingFeature[];
  cta_label: string;
  highlight: boolean;
  active: boolean;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

function rowToTier(r: DbRow): PricingTier {
  return {
    plan: r.plan as PricingTier["plan"],
    displayName: r.display_name,
    priceCents: r.price_cents,
    currency: r.currency,
    blurb: r.blurb,
    features: Array.isArray(r.features) ? r.features : [],
    ctaLabel: r.cta_label,
    highlight: r.highlight,
    active: r.active,
    sortOrder: r.sort_order,
    stripeProductId: r.stripe_product_id,
    stripePriceId: r.stripe_price_id,
  };
}
