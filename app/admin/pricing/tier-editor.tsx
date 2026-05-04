"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePricingTier, syncTierToStripe } from "@/lib/stripe/billing-actions";
import type { PricingTier } from "@/lib/pricing";

interface TierEditorProps {
  tier: PricingTier;
}

export function TierEditor({ tier }: TierEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(tier.displayName);
  const [priceDollars, setPriceDollars] = useState((tier.priceCents / 100).toFixed(2));
  const [blurb, setBlurb] = useState(tier.blurb);
  const [ctaLabel, setCtaLabel] = useState(tier.ctaLabel);
  const [highlight, setHighlight] = useState(tier.highlight);
  const [active, setActive] = useState(tier.active);
  const [features, setFeatures] = useState(tier.features);

  const dirty =
    displayName !== tier.displayName ||
    Number(priceDollars) * 100 !== tier.priceCents ||
    blurb !== tier.blurb ||
    ctaLabel !== tier.ctaLabel ||
    highlight !== tier.highlight ||
    active !== tier.active ||
    JSON.stringify(features) !== JSON.stringify(tier.features);

  const priceChangedSinceStripeSync =
    Number(priceDollars) * 100 !== tier.priceCents;

  const onSave = () => {
    const cents = Math.round(Number(priceDollars) * 100);
    if (Number.isNaN(cents) || cents < 0) {
      setMessage("Invalid price.");
      return;
    }
    startTransition(async () => {
      const r = await savePricingTier({
        plan: tier.plan,
        displayName,
        priceCents: cents,
        blurb,
        ctaLabel,
        highlight,
        active,
        features,
      });
      if (r.ok) {
        setMessage("Saved. Click 'Sync to Stripe' to push the new price.");
        router.refresh();
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  const onSync = () => {
    if (
      !confirm(
        `Sync ${tier.displayName} to Stripe? This archives the old Stripe price and creates a new one at $${priceDollars}/mo. Existing subscribers stay on their old price until they change plans.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await syncTierToStripe({ plan: tier.plan });
      if (r.ok) {
        setMessage(
          r.createdNew
            ? `New Stripe price created: ${r.priceId}`
            : `In sync — no change.`,
        );
        router.refresh();
      } else {
        setMessage(`Error: ${r.error}`);
      }
    });
  };

  const updateFeature = (i: number, patch: Partial<typeof features[number]>) => {
    setFeatures(features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  };
  const addFeature = () =>
    setFeatures([...features, { label: "New feature", included: true }]);
  const removeFeature = (i: number) =>
    setFeatures(features.filter((_, idx) => idx !== i));
  const moveFeature = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= features.length) return;
    const next = [...features];
    [next[i], next[j]] = [next[j], next[i]];
    setFeatures(next);
  };

  return (
    <section
      className={`rounded-xl border bg-white ${
        highlight ? "border-amber-400 ring-1 ring-amber-300" : "border-neutral-200"
      }`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-neutral-100 p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold capitalize">{tier.plan}</h2>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
            ${(tier.priceCents / 100).toFixed(0)}/mo
          </span>
          {tier.stripePriceId ? (
            <a
              href={`https://dashboard.stripe.com/prices/${tier.stripePriceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-brand-600 hover:underline"
              title="View on Stripe"
            >
              {tier.stripePriceId.slice(0, 14)}…
            </a>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-amber-700">
              not synced
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {priceChangedSinceStripeSync ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
              price drift
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            disabled={pending}
            className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-40"
          >
            {pending ? "…" : "Sync to Stripe →"}
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Price (USD/mo)">
          <div className="flex items-center gap-1">
            <span className="text-sm text-neutral-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              className={inputCls}
            />
          </div>
        </Field>
        <Field label="Blurb">
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="CTA label">
          <input
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="md:col-span-2 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
            />
            Highlight (Most popular ring)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active (visible to customers)
          </label>
        </div>
      </div>

      <div className="border-t border-neutral-100 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Features
          </h3>
          <button
            type="button"
            onClick={addFeature}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            + Add row
          </button>
        </div>
        <ul className="space-y-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={f.included}
                onChange={(e) => updateFeature(i, { included: e.target.checked })}
                title={f.included ? "Included" : "Excluded (shown crossed out)"}
              />
              <input
                value={f.label}
                onChange={(e) => updateFeature(i, { label: e.target.value })}
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => moveFeature(i, -1)}
                disabled={i === 0}
                className="rounded px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveFeature(i, 1)}
                disabled={i === features.length - 1}
                className="rounded px-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeFeature(i)}
                className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-100 p-4">
        {message ? (
          <p
            className={`text-xs ${
              message.startsWith("Error") ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {message}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !dirty}
          className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {pending ? "…" : dirty ? "Save changes" : "No changes"}
        </button>
      </footer>
    </section>
  );
}

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}
