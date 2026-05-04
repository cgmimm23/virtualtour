// POST /admin/settings/provision-webhook — creates the Stripe webhook
// endpoint pointing at this app + saves the signing secret to app_secrets.

import { NextResponse } from "next/server";
import { provisionStripeWebhook } from "@/lib/stripe/billing-actions";

export async function POST() {
  const r = await provisionStripeWebhook();
  const url = new URL("/admin/settings", "https://virtualtour.cgmimm.com");
  if (!r.ok) {
    url.searchParams.set("webhook_error", r.error);
  } else {
    url.searchParams.set(
      "webhook_ok",
      r.rotated ? "rotated" : r.secretSaved ? "saved" : "exists",
    );
  }
  return NextResponse.redirect(url, { status: 303 });
}
