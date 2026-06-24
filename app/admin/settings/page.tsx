import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth";
import { getSecretStatus } from "@/lib/secrets";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

const SECRET_GROUPS: Array<{
  title: string;
  blurb: string;
  keys: Array<{
    key: Parameters<typeof getSecretStatus> extends never ? never : string;
    label: string;
    placeholder?: string;
    sensitive?: boolean;
    helperText?: string;
  }>;
}> = [
  {
    title: "Stripe",
    blurb:
      "Get keys from Stripe Dashboard → Developers → API keys. Use Test keys (sk_test_...) until ready to go live. After saving the secret key, click 'Create products' to provision the 3 Tourly tiers and auto-fill the price IDs.",
    keys: [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Secret key",
        placeholder: "sk_test_... or sk_live_...",
        sensitive: true,
      },
      {
        key: "STRIPE_PUBLISHABLE_KEY",
        label: "Publishable key",
        placeholder: "pk_test_... or pk_live_...",
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook signing secret",
        placeholder: "whsec_...",
        sensitive: true,
        helperText:
          "Add a webhook in Stripe → Developers → Webhooks pointing at https://virtualtour.cgmimm.com/api/stripe/webhook. Subscribe to customer.subscription.* + invoice.* + checkout.session.completed. Paste the signing secret here.",
      },
      { key: "STRIPE_PRICE_ID_SOLO", label: "Solo price ID", placeholder: "price_..." },
      { key: "STRIPE_PRICE_ID_TEAM", label: "Team price ID", placeholder: "price_..." },
      {
        key: "STRIPE_PRICE_ID_BROKERAGE",
        label: "Brokerage price ID",
        placeholder: "price_...",
      },
    ],
  },
  {
    title: "AI",
    blurb: "Anthropic API key drives the ✨ AI auto-name room feature in the editor.",
    keys: [
      {
        key: "ANTHROPIC_API_KEY",
        label: "Anthropic API key",
        placeholder: "sk-ant-api03-...",
        sensitive: true,
      },
    ],
  },
  {
    title: "Email (Resend)",
    blurb:
      "Resend handles transactional email (lead notifications, password reset). Optional — the app falls back to Supabase's default email when not configured.",
    keys: [
      {
        key: "RESEND_API_KEY",
        label: "Resend API key",
        placeholder: "re_...",
        sensitive: true,
      },
      {
        key: "RESEND_FROM_EMAIL",
        label: "From address",
        placeholder: "tours@virtualtour.cgmimm.com",
      },
    ],
  },
];

export default async function AdminSettings({
  searchParams,
}: {
  searchParams: Promise<{ pw_ok?: string; pw_error?: string }>;
}) {
  const user = await requirePlatformAdmin("/admin/settings");
  const status = await getSecretStatus();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-neutral-500">
            App-level secrets. Env vars (set in DO) win over values saved here. Saving overrides
            them only when the env var isn&apos;t set.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
          ← Overview
        </Link>
      </div>

      {/* Change your admin password */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Update the password for your admin account ({user.email}).
        </p>
        {sp.pw_ok ? (
          <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Password updated.
          </p>
        ) : null}
        {sp.pw_error ? (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{sp.pw_error}</p>
        ) : null}
        <form
          action="/admin/settings/change-password"
          method="post"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">New password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">Confirm</span>
            <input
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Update password
          </button>
        </form>
      </section>

      <div className="space-y-8">
        {SECRET_GROUPS.map((group) => (
          <section
            key={group.title}
            className="rounded-xl border border-neutral-200 bg-white p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{group.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-500">{group.blurb}</p>
              </div>
              {group.title === "Stripe" ? (
                <div className="flex flex-col gap-1.5">
                  <ProvisionButton />
                  <ProvisionWebhookButton />
                </div>
              ) : null}
            </div>
            <div className="space-y-3">
              {group.keys.map((spec) => {
                const s = status[spec.key as keyof typeof status];
                return (
                  <SettingsForm
                    key={spec.key}
                    secretKey={spec.key}
                    label={spec.label}
                    placeholder={spec.placeholder}
                    sensitive={spec.sensitive}
                    helperText={spec.helperText}
                    fromEnv={s?.fromEnv ?? false}
                    fromDb={s?.fromDb ?? false}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProvisionButton() {
  return (
    <form action="/admin/settings/provision" method="post">
      <button
        type="submit"
        className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
      >
        Create / sync Stripe products →
      </button>
    </form>
  );
}

function ProvisionWebhookButton() {
  return (
    <form action="/admin/settings/provision-webhook" method="post">
      <button
        type="submit"
        className="rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
      >
        Create webhook + secret →
      </button>
    </form>
  );
}
