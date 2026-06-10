"use server";

import "server-only";
import type Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin, getUser, getActiveTeam } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  try {
    await prisma.app_secrets.upsert({
      where: { key: parsed.data.key },
      update: { value: parsed.data.value.trim(), updated_by: admin.id },
      create: {
        key: parsed.data.key,
        value: parsed.data.value.trim(),
        updated_by: admin.id,
      },
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "save failed" };
  }

  invalidateSecret(parsed.data.key as SecretKey);
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function deleteSecret(key: string) {
  await requirePlatformAdmin("/admin/settings");
  const parsed = SaveSecretSchema.shape.key.safeParse(key);
  if (!parsed.success) return { ok: false as const, error: "invalid key" };

  try {
    await prisma.app_secrets.deleteMany({ where: { key: parsed.data } });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "delete failed" };
  }

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
  try {
    await prisma.pricing_tiers.update({
      where: { plan: parsed.data.plan },
      data: {
        display_name: parsed.data.displayName,
        price_cents: parsed.data.priceCents,
        blurb: parsed.data.blurb,
        cta_label: parsed.data.ctaLabel,
        highlight: parsed.data.highlight,
        active: parsed.data.active,
        features: parsed.data.features,
      },
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "update failed" };
  }
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
  const planValue = input.plan as "solo" | "team" | "brokerage";
  const tier = await prisma.pricing_tiers.findUnique({ where: { plan: planValue } });
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
  await prisma.pricing_tiers.update({
    where: { plan: tier.plan },
    data: { stripe_product_id: product.id, stripe_price_id: priceId },
  });

  // Mirror into app_secrets so checkout's getSecret('STRIPE_PRICE_ID_*') still works.
  const secretKey =
    tier.plan === "solo"
      ? "STRIPE_PRICE_ID_SOLO"
      : tier.plan === "team"
        ? "STRIPE_PRICE_ID_TEAM"
        : "STRIPE_PRICE_ID_BROKERAGE";
  await prisma.app_secrets.upsert({
    where: { key: secretKey },
    update: { value: priceId, description: `${tier.display_name} monthly price ID` },
    create: { key: secretKey, value: priceId, description: `${tier.display_name} monthly price ID` },
  });
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
  // Admin cross-team operation — intentionally unscoped to a single team.
  const team = await prisma.teams.findUnique({
    where: { id: parsed.data.teamId },
    select: { id: true, plan: true },
  });
  if (!team) return { ok: false as const, error: "team not found" };
  if (team.plan === parsed.data.toPlan) {
    return { ok: false as const, error: `team is already on plan ${team.plan}` };
  }

  try {
    await prisma.teams.update({
      where: { id: parsed.data.teamId },
      data: { plan: parsed.data.toPlan },
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "update failed" };
  }

  await prisma.billing_events.create({
    data: {
      team_id: parsed.data.teamId,
      type: "plan_changed",
      source: "admin",
      actor_user_id: admin.id,
      from_plan: team.plan,
      to_plan: parsed.data.toPlan,
      metadata: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
    },
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
  // Admin cross-team operation — intentionally unscoped to a single team.
  // Audit log first (before cascade) — captures the team metadata.
  const team = await prisma.teams.findUnique({
    where: { id: parsed.data.teamId },
    select: { name: true, plan: true },
  });
  if (!team) return { ok: false as const, error: "team not found" };

  await prisma.billing_events.create({
    data: {
      team_id: parsed.data.teamId,
      type: "team_deleted",
      source: "admin",
      actor_user_id: admin.id,
      from_plan: team.plan,
      metadata: { team_name: team.name, deleted_by: admin.email },
    },
  });

  // Cascade-delete the team.
  try {
    await prisma.teams.delete({ where: { id: parsed.data.teamId } });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "delete failed" };
  }

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

  // Scope to the signed-in user's active team.
  const active = await getActiveTeam();
  if (!active) return { ok: false as const, error: "no team" };
  const team = active.team;

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
    await prisma.teams.update({
      where: { id: team.id },
      data: { stripe_customer_id: customerId },
    });
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

/**
 * Switch an existing subscription to a different plan. For customers who
 * already have a Stripe subscription, calling Checkout would create a SECOND
 * subscription — double-charging them. This updates the existing one and
 * lets Stripe prorate the difference.
 *
 * Webhook (customer.subscription.updated) updates teams.plan in our DB.
 */
export async function switchPlan(input: { plan: string }) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "not signed in" };

  const parsed = StartCheckoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid plan" };

  const stripe = await getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe not configured yet" };

  // Scope to the signed-in user's active team.
  const active = await getActiveTeam();
  if (!active) return { ok: false as const, error: "no team" };
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false as const, error: "only owners / admins can change the plan" };
  }
  const team = active.team;
  if (!team.stripe_subscription_id) {
    return {
      ok: false as const,
      error: "no active subscription to switch — start a new checkout instead",
    };
  }

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

  // Look up the current subscription item so we can swap its price.
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(team.stripe_subscription_id);
  } catch (err) {
    return {
      ok: false as const,
      error: `Couldn't load Stripe subscription: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const item = subscription.items.data[0];
  if (!item) {
    return {
      ok: false as const,
      error: "Subscription has no items — something's off in Stripe.",
    };
  }
  if (item.price.id === priceId) {
    return { ok: false as const, error: "Already on this plan." };
  }

  try {
    await stripe.subscriptions.update(team.stripe_subscription_id, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { team_id: team.id, plan: parsed.data.plan },
    });
  } catch (err) {
    return {
      ok: false as const,
      error: `Stripe rejected the switch: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Webhook will update teams.plan + stripe_status when Stripe fires
  // customer.subscription.updated. We optimistically write the plan field
  // too so the UI reflects the change immediately without waiting for the
  // webhook round-trip.
  await prisma.teams.update({
    where: { id: team.id },
    data: { plan: parsed.data.plan },
  });
  await prisma.billing_events.create({
    data: {
      team_id: team.id,
      type: "plan_switched",
      source: "self_serve",
      actor_user_id: user.id,
      from_plan: team.plan,
      to_plan: parsed.data.plan,
      stripe_object_id: subscription.id,
      metadata: { proration: "create_prorations" },
    },
  });

  revalidatePath("/dashboard/billing");
  return { ok: true as const };
}

export async function openCustomerPortal() {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "not signed in" };

  const stripe = await getStripe();
  if (!stripe) return { ok: false as const, error: "Stripe not configured yet" };

  // Scope to the signed-in user's active team.
  const active = await getActiveTeam();
  const team = active?.team ?? null;
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
