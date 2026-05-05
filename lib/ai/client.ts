// Lazy Anthropic client backed by getSecret() — env wins, DB fallback.
// Cached per-process. Same pattern as lib/stripe/client.ts.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getSecret } from "@/lib/secrets";

let cached: Anthropic | null = null;
let cachedKey: string | null = null;

export async function getAnthropic(): Promise<Anthropic | null> {
  const key = await getSecret("ANTHROPIC_API_KEY");
  if (!key) return null;
  if (cached && cachedKey === key) return cached;
  cached = new Anthropic({ apiKey: key });
  cachedKey = key;
  return cached;
}

export async function requireAnthropic(): Promise<Anthropic> {
  const c = await getAnthropic();
  if (!c) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in env or via /admin/settings.",
    );
  }
  return c;
}

export const AI_MODEL = "claude-opus-4-7";
