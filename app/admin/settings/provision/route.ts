// POST /admin/settings/provision — bootstraps Stripe products + prices.
// Submitted from the "Create / sync Stripe products" button on /admin/settings.

import { NextResponse } from "next/server";
import { provisionStripeProducts } from "@/lib/stripe/billing-actions";

export async function POST() {
  const r = await provisionStripeProducts();
  if (!r.ok) {
    const url = new URL("/admin/settings", "https://virtualtour.cgmimm.com");
    url.searchParams.set("provision_error", r.error);
    return NextResponse.redirect(url, { status: 303 });
  }
  const url = new URL("/admin/settings", "https://virtualtour.cgmimm.com");
  url.searchParams.set("provision_ok", `${r.created.length}c+${r.reused.length}r`);
  return NextResponse.redirect(url, { status: 303 });
}
