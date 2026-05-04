"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";
import { bootstrapStripeProducts, bootstrapStripeWebhook } from "./products";
import { invalidateSecret } from "@/lib/secrets";
import type { SecretKey } from "@/lib/secrets";

// ─────────────────────────────────────────────────────────────
// Admin: app-level secret management (Stripe keys, etc.)
// ─────────────────────────────────────────────────────────────

const SaveSecretSchema = z.object({
  key: z.enum([
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID_SOLO",
    "STRIPE_PRICE_ID_TEAM",
    "STRIPE_PRICE_ID_BROKERAGE",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
  ]),
  value: z.string().min(1).max(2048),
});

export async function saveSecret(input: { key: string; value: string }) {
  const admin = await requirePlatformAdmin("/admin/settings");
  const parsed = SaveSecretSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "invalid input" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_secrets").upsert(
    {
      key: parsed.data.key,
      value: parsed.data.value.trim(),
      updated_by: admin.id,
    },
    { onConflict: "key" },
  );
  if (error) return { ok: false as const, error: error.message };

  invalidateSecret(parsed.data.key as SecretKey);
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function deleteSecret(key: string) {
  await requirePlatformAdmin("/admin/settings");
  const parsed = SaveSecretSchema.shape.key.safeParse(key);
  if (!parsed.success) return { ok: false as const, error: "invalid key" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_secrets").delete().eq("key", parsed.data);
  if (error) return { ok: false as const, error: error.message };

  invalidateSecret(parsed.data);
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function provisionStripeProducts() {
  await requirePlatformAdmin("/admin/settings");
  const stripe = await getStripe();
  if (!stripe) {
    return {
      ok: false as const,
      error: "STRIPE_SECRET_KEY not set. Save it first, then click 'Create products'.",
    };
  }
  try {
    const result = await bootstrapStripeProducts();
    revalidatePath("/admin/settings");
    return { ok: true as const, ...result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false as const, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────
// Admin: edit pricing tiers + sync to Stripe
// ─────────────────────────────────────────────────────────────

const SavePricingSchema = z.object({
  plan: z.enum(["solo", "team", "brokerage"]),
  displayName: z.string().min(1).max(64),
  priceCents: z.number().int().min(0).max(10_000_00), // $10k cap sanity
  blurb: z.string().max(280),
  ctaLabel: z.string().max(64),
  highlight: z.boolean(),
  active: z.boolean(),
  features: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        included: z.boolean(),
      }),
    )
    .max(20),
});

export async function savePricingTier(input: {
  plan: string;
  displayName: string;
  priceCents: number;
  blurb: string;
  ctaLabel: string;
  highlight: boolean;
  active: boolean;
  features: Array<{ label: string; included: boolean }>;
}) {
  await requirePlatformAdmin("/admin/pricing");
  const parsed = SavePricingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pricing_tiers")
    .update({
      display_name: parsed.data.displayName,
      price_cents: parsed.data.priceCents,
      blurb: parsed.data.blurb,
      cta_label: parsed.data.ctaLabel,
      highlight: parsed.data.highlight,
      active: parsed.data.active,
      features: parsed.data.features,
    })
    .eq("plan", parsed.data.plan);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/pricing");
  revalidatePath("/pricing");
  revalidatePath("/dashboard/billing");
  revalidatePath("/admin/billing");
  return { ok: true as const };
}

export async function syncTierToStripe(input: { plan: string }) {
  await requirePlatformAdmin("/admin/pricing");
  if (!["solo", "team", "brokerage"].includes(input.plan)) {
    return { ok: false as const, error: "invalid plan" };
  }
  const stripe = await getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe not configured" };
  }
  const supabase = createAdminClient();
  const planValue = input.plan as "solo" | "team" | "brokerage";
  const { data: tier } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("plan", planValue)
    .maybeSingle();
  if (!tier) return { ok: false as const, error: "tier not found" };

  // Locate or create the product (one product per plan, matched by metadata).
  const products = await stripe.products.list({ active: true, limit: 100 });
  const metadataKey = `tourly_${tier.plan}`;
  let product = products.data.find((p) => p.metadata?.tourly_tier === metadataKey);
  if (!product) {
    product = await stripe.products.create({
      name: `Tourly ${tier.display_name}`,
      description: tier.blurb,
      metadata: { tourly_tier: metadataKey },
    });
  } else if (
    product.name !== `Tourly ${tier.display_name}` ||
    product.description !== tier.blurb
  ) {
    product = await stripe.products.update(product.id, {
      name: `Tourly ${tier.display_name}`,
      description: tier.blurb || undefined,
    });
  }

  // Compare current Stripe price's amount to the tier's amount. If
  // different, archive the old price and create a new one. Existing
  // subscriptions on the old price keep their billing — Stripe won't
  // force-migrate them, which is the safe default.
  let priceId = tier.stripe_price_id;
  let createdNew = false;
  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId).catch(() => null);
    if (
      !existing ||
      existing.unit_amount !== tier.price_cents ||
      existing.currency !== tier.currency ||
      existing.recurring?.interval !== "month"
    ) {
      // Need a new price.
      if (existing && existing.active) {
        await stripe.prices.update(existing.id, { active: false });
      }
      const fresh = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price_cents,
        currency: tier.currency,
        recurring: { interval: "month" },
        metadata: { tourly_tier: metadataKey },
      });
      priceId = fresh.id;
      createdNew = true;
    }
  } else {
    // Never synced before. Create.
    const fresh = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.price_cents,
      currency: tier.currency,
      recurring: { interval: "month" },
      metadata: { tourly_tier: metadataKey },
    });
    priceId = fresh.id;
    createdNew = true;
  }

  // Persist the linkage.
  await supabase
    .from("pricing_tiers")
    .update({ stripe_product_id: product.id, stripe_price_id: priceId })
    .eq("plan", tier.plan);

  // Mirror into app_secrets so checkout's getSecret('STRIPE_PRICE_ID_*') still works.
  const secretKey =
    tier.plan === "solo"
      ? "STRIPE_PRICE_ID_SOLO"
      : tier.plan === "team"
        ? "STRIPE_PRICE_ID_TEAM"
        : "STRIPE_PRICE_ID_BROKERAGE";
  await supabase.from("app_secrets").upsert(
    { key: secretKey, value: priceId, description: `${tier.display_name} monthly price ID` },
    { onConflict: "key" },
  );
  invalidateSecret(secretKey as Parameters<typeof invalidateSecret>[0]);

  revalidatePath("/admin/pricing");
  return {
    ok: true as const,
    productId: product.id,
    priceId,
    createdNew,
  };
}

export async function provisionStripeWebhook() {
  await requirePlatformAdmin("/admin/settings");
  const stripe = await getStripe();
  if (!stripe) {
    return {
      ok: false as const,
      error: "STRIPE_SECRET_KEY not set. Save it first.",
    };
  }
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const webhookUrl = `${appUrl}/api/stripe/webhook`;
  try {
    const result = await bootstrapStripeWebhook(webhookUrl);
    invalidateSecret("STRIPE_WEBHOOK_SECRET");
    revalidatePath("/admin/settings");
    return { ok: true as const, ...result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false as const, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────
// Admin: per-team plan overrides + audit log
// ─────────────────────────────────────────────────────────────

const SetPlanSchema = z.object({
  teamId: z.string().uuid(),
  toPlan: z.enum(["trial", "solo", "team", "brokerage"]),
  reason: z.string().max(500).optional(),
});

export async function setTeamPlan(input: {
  teamId: string;
  toPlan: string;
  reason?: string;
}) {
  const admin = await requirePlatformAdmin();
  const parsed = SetPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "invalid input" };
  }
  const supabase = createAdminClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, plan")
    .eq("id", parsed.data.teamId)
    .maybeSingle();
  if (!team) return { ok: false as const, error: "team not found" };
  if (team.plan === parsed.data.toPlan) {
    return { ok: false as const, error: `team is already on plan ${team.plan}` };
  }

  const { error: updateErr } = await supabase
    .from("teams")
    .update({ plan: parsed.data.toPlan })
    .eq("id", parsed.data.teamId);
  if (updateErr) return { ok: false as const, error: updateErr.message };

  await supabase.from("billing_events").insert({
    team_id: parsed.data.teamId,
    type: "plan_changed",
    source: "admin",
    actor_user_id: admin.id,
    from_plan: team.plan,
    to_plan: parsed.data.toPlan,
    metadata: parsed.data.reason ? { reason: parsed.data.reason } : null,
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/teams/${parsed.data.teamId}`);
  return { ok: true as const };
}

const DeleteTeamSchema = z.object({
  teamId: z.string().uuid(),
  confirm: z.literal(true),
});

export async function deleteTeam(input: { teamId: string; confirm: true }) {
  const admin = await requirePlatformAdmin();
  const parsed = DeleteTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "confirmation required" };
  }
  const supabase = createAdminClient();

  // Audit log first (before cascade) — captures the team metadata.
  const { data: team } = await supabase
    .from("teams")
    .select("name, plan")
    .eq("id", parsed.data.teamId)
    .maybeSingle();
  if (!team) return { ok: false as const, error: "team not found" };

  await supabase.from("billing_events").insert({
    team_id: parsed.data.teamId,
    type: "team_deleted",
    source: "admin",
    actor_user_id: admin.id,
    from_plan: team.plan,
    metadata: { team_name: team.name, deleted_by: admin.email },
  });

  // Cascade-delete the team. RLS bypassed via service-role.
  const { error } = await supabase.from("teams").delete().eq("id", parsed.data.teamId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/billing");
  revalidatePath("/admin/teams");
  return { ok: true as const };
}

// ─────────────────────────────────────────────────────────────
// Customer self-serve: launch Stripe Checkout / Customer Portal
// ─────────────────────────────────────────────────────────────

const StartCheckoutSchema = z.object({
  plan: z.enum(["solo", "team", "brokerage"]),
});

export async function startCheckout(input: { plan: string }) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "not signed in" };

  const parsed = StartCheckoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid plan" };

  const stripe = await getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe not configured yet" };

  const supabase = createAdminClient();
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id, team:teams(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || !membership.team) return { ok: false as const, error: "no team" };
  const team = Array.isArray(membership.team) ? membership.team[0] : membership.team;
  if (!team) return { ok: false as const, error: "no team" };

  const priceKey: SecretKey =
    parsed.data.plan === "solo"
      ? "STRIPE_PRICE_ID_SOLO"
      : parsed.data.plan === "team"
        ? "STRIPE_PRICE_ID_TEAM"
        : "STRIPE_PRICE_ID_BROKERAGE";
  const { getSecret } = await import("@/lib/secrets");
  const priceId = await getSecret(priceKey);
  if (!priceId) {
    return {
      ok: false as const,
      error: `${priceKey} not configured. Admin needs to provision Stripe products.`,
    };
  }

  // Reuse customer if we already have one, else create.
  let customerId = team.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: team.name,
      metadata: { team_id: team.id },
    });
    customerId = customer.id;
    await supabase
      .from("teams")
      .update({ stripe_customer_id: customerId })
      .eq("id", team.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { team_id: team.id, plan: parsed.data.plan },
    },
    success_url: `${appUrl}/dashboard/billing?ok=1`,
    cancel_url: `${appUrl}/dashboard/billing?cancelled=1`,
    allow_promotion_codes: true,
  });

  return { ok: true as const, url: session.url };
}

export async function openCustomerPortal() {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "not signed in" };

  const stripe = await getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe not configured yet" };

  const supabase = createAdminClient();
  const { data: membership } = await supabase
    .from("team_members")
    .select("team:teams(stripe_customer_id)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const team = membership?.team
    ? Array.isArray(membership.team)
      ? membership.team[0]
      : membership.team
    : null;
  if (!team?.stripe_customer_id) {
    return { ok: false as const, error: "no Stripe customer yet — start a subscription first" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
  const session = await stripe.billingPortal.sessions.create({
    customer: team.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return { ok: true as const, url: session.url };
}
