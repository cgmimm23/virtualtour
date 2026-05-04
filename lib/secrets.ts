// Cascading secret loader. Reads order:
//   1. process.env.<KEY>   ← production / CI sets here via DO env vars
//   2. app_secrets table   ← admin pasted via /admin/settings UI
//
// This keeps env-as-default for security (env vars are never exposed to
// queries, never end up in DB backups), with a self-serve override path for
// when the founder wants to rotate a key without redeploying.
//
// Server-only — the service-role client reads app_secrets, bypassing RLS.

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SecretKey =
  | "STRIPE_SECRET_KEY"
  | "STRIPE_PUBLISHABLE_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRICE_ID_SOLO"
  | "STRIPE_PRICE_ID_TEAM"
  | "STRIPE_PRICE_ID_BROKERAGE"
  | "ANTHROPIC_API_KEY"
  | "RESEND_API_KEY"
  | "RESEND_FROM_EMAIL";

const cache = new Map<SecretKey, string | null>();

/**
 * Resolve a secret. Env wins. DB fallback. null if unset everywhere.
 *
 * Cached per-process for the lifetime of the request — Next routes are usually
 * short-lived so we don't bother with TTL invalidation. If you change a secret
 * via /admin/settings, the change applies on the next cold start (or when an
 * admin clicks "reload secrets"). For Stripe webhooks we re-fetch on each
 * request to avoid stale-secret bugs after rotation.
 */
export async function getSecret(key: SecretKey): Promise<string | null> {
  if (cache.has(key)) return cache.get(key) ?? null;

  // 1. Env first
  const envValue = process.env[key];
  if (envValue) {
    cache.set(key, envValue);
    return envValue;
  }

  // 2. DB second
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      console.error(`[secrets] DB lookup failed for ${key}:`, error.message);
      cache.set(key, null);
      return null;
    }
    const value = data?.value ?? null;
    cache.set(key, value);
    return value;
  } catch (err) {
    console.error(`[secrets] DB lookup threw for ${key}:`, err);
    cache.set(key, null);
    return null;
  }
}

/** Force a re-read on next getSecret() call. */
export function invalidateSecret(key?: SecretKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}

/** Helper for routes that absolutely need a secret — throws clean message. */
export async function requireSecret(key: SecretKey): Promise<string> {
  const value = await getSecret(key);
  if (!value) {
    throw new Error(
      `Missing secret '${key}'. Set the env var or paste the value in /admin/settings.`,
    );
  }
  return value;
}

/**
 * Returns presence of each known secret without exposing values. Used by
 * /admin/settings to show "configured / not configured" badges next to each
 * secret entry without round-tripping the key through the client.
 */
export async function getSecretStatus(): Promise<
  Record<SecretKey, { fromEnv: boolean; fromDb: boolean }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("app_secrets").select("key");
  const dbKeys = new Set((data ?? []).map((r) => r.key as SecretKey));

  const keys: SecretKey[] = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_ID_SOLO",
    "STRIPE_PRICE_ID_TEAM",
    "STRIPE_PRICE_ID_BROKERAGE",
    "ANTHROPIC_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
  ];

  return Object.fromEntries(
    keys.map((k) => [
      k,
      {
        fromEnv: Boolean(process.env[k]),
        fromDb: dbKeys.has(k),
      },
    ]),
  ) as Record<SecretKey, { fromEnv: boolean; fromDb: boolean }>;
}
