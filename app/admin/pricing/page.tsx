import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";
import { getPricingTiers } from "@/lib/pricing";
import { TierEditor } from "./tier-editor";

export const dynamic = "force-dynamic";

export default async function AdminPricing() {
  await requirePlatformAdmin("/admin/pricing");
  const tiers = await getPricingTiers();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
          <p className="text-sm text-neutral-500">
            Single source of truth. Marketing page, customer billing dashboard, admin MRR — all
            read from this table.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
          ← Overview
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
        <strong>How Stripe sync works:</strong> Stripe prices are immutable. When you change a
        price and click <em>Sync to Stripe</em>, the old Stripe price is archived and a new one
        is created. <strong>Existing subscribers stay on their original price</strong> until
        they next change plans — Stripe doesn&apos;t force-migrate active subscriptions.
      </div>

      <div className="space-y-6">
        {tiers.map((t) => (
          <TierEditor key={t.plan} tier={t} />
        ))}
      </div>
    </div>
  );
}
