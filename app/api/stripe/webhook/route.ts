// Stripe webhook handler. Receives subscription + invoice events and keeps
// teams.plan / teams.stripe_status in sync. Every event is also logged to
// billing_events for the admin audit trail.
//
// Configure in Stripe dashboard → Developers → Webhooks → add endpoint:
//   https://virtualtour.cgmimm.com/api/stripe/webhook
//   Events: customer.subscription.{created,updated,deleted},
//           invoice.{paid,payment_failed},
//           checkout.session.completed
// Then copy the signing secret (starts with `whsec_`) into /admin/settings.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getSecret } from "@/lib/secrets";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Plan = "trial" | "solo" | "team" | "brokerage";

function planFromMetadata(meta: Stripe.Metadata | null | undefined): Plan | null {
  if (!meta) return null;
  const v = (meta.plan ?? meta.tourly_tier ?? "").toString();
  if (v === "solo" || v === "team" || v === "brokerage" || v === "trial") return v;
  // Fall through: maybe the price ID was stored
  return null;
}

async function planFromPriceId(priceId: string | undefined): Promise<Plan | null> {
  if (!priceId) return null;
  const [solo, team, brokerage] = await Promise.all([
    getSecret("STRIPE_PRICE_ID_SOLO"),
    getSecret("STRIPE_PRICE_ID_TEAM"),
    getSecret("STRIPE_PRICE_ID_BROKERAGE"),
  ]);
  if (priceId === solo) return "solo";
  if (priceId === team) return "team";
  if (priceId === brokerage) return "brokerage";
  return null;
}

export async function POST(req: Request) {
  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const webhookSecret = await getSecret("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe-webhook] signature verify failed:", msg);
    return NextResponse.json({ error: `signature verify failed: ${msg}` }, { status: 400 });
  }

  // Dedupe via stripe_event_id unique index. If the event was already
  // recorded, return 200 without re-processing.
  const existing = await prisma.billing_events.findUnique({
    where: { stripe_event_id: event.id },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, dedup: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const teamId = session.metadata?.team_id ?? session.subscription
          ? null
          : session.metadata?.team_id ?? null;
        if (teamId) {
          await prisma.billing_events.create({
            data: {
              team_id: teamId,
              type: "checkout_completed",
              source: "webhook",
              stripe_event_id: event.id,
              stripe_object_id: typeof session.id === "string" ? session.id : null,
              metadata: {
                mode: session.mode,
                customer: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
              } as Prisma.InputJsonValue,
            },
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const teamId = sub.metadata?.team_id ?? null;
        const targetTeam = teamId
          ? teamId
          : await teamIdFromCustomer(sub.customer);
        if (!targetTeam) break;

        const status = sub.status;
        const cancel = sub.cancel_at_period_end;
        // The Stripe API moved current_period_end onto the subscription_item
        // (each item can have its own period). For our single-item subs, take
        // the first item. Fall back to top-level if SDK exposes both.
        const itemCpe = sub.items?.data?.[0]?.current_period_end;
        const cpe = itemCpe ?? (sub as unknown as { current_period_end?: number }).current_period_end;
        const currentPeriodEnd =
          typeof cpe === "number" ? new Date(cpe * 1000) : null;

        let nextPlan: Plan | null = planFromMetadata(sub.metadata);
        if (!nextPlan) {
          const priceId = sub.items.data[0]?.price.id;
          nextPlan = await planFromPriceId(priceId);
        }

        const prev = await prisma.teams.findUnique({
          where: { id: targetTeam },
          select: { plan: true },
        });

        const planUpdate: Plan =
          event.type === "customer.subscription.deleted"
            ? "trial"
            : nextPlan ?? prev?.plan ?? "trial";

        await prisma.teams.update({
          where: { id: targetTeam },
          data: {
            plan: planUpdate,
            stripe_subscription_id:
              event.type === "customer.subscription.deleted" ? null : sub.id,
            stripe_status: status,
            cancel_at_period_end: cancel,
            current_period_end: currentPeriodEnd,
          },
        });

        await prisma.billing_events.create({
          data: {
            team_id: targetTeam,
            type:
              event.type === "customer.subscription.created"
                ? "subscription_created"
                : event.type === "customer.subscription.deleted"
                  ? "subscription_deleted"
                  : "subscription_updated",
            source: "webhook",
            from_plan: prev?.plan ?? null,
            to_plan: planUpdate,
            stripe_event_id: event.id,
            stripe_object_id: sub.id,
            metadata: { status, cancel_at_period_end: cancel },
          },
        });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const teamId = await teamIdFromCustomer(invoice.customer);
        if (!teamId) break;
        await prisma.billing_events.create({
          data: {
            team_id: teamId,
            type: event.type === "invoice.paid" ? "invoice_paid" : "invoice_payment_failed",
            source: "webhook",
            amount_cents: invoice.amount_paid ?? invoice.amount_due ?? 0,
            currency: invoice.currency ?? "usd",
            stripe_event_id: event.id,
            stripe_object_id: invoice.id ?? null,
            metadata: {
              number: invoice.number,
              hosted_invoice_url: invoice.hosted_invoice_url,
              attempt_count: invoice.attempt_count,
            },
          },
        });
        break;
      }

      default:
        // Unhandled but not an error — record the event so we know it landed.
        // Keeps the audit log honest and avoids "did the webhook ever fire?"
        // mysteries.
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe-webhook] processing failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "processing failed" },
      { status: 500 },
    );
  }
}

async function teamIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (!customer) return null;
  const id = typeof customer === "string" ? customer : customer.id;
  // Cross-team lookup is intentional: the webhook is unauthenticated and
  // resolves the owning team by the Stripe customer id.
  const team = await prisma.teams.findFirst({
    where: { stripe_customer_id: id },
    select: { id: true },
  });
  return team?.id ?? null;
}
