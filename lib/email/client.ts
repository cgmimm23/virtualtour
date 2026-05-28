// Thin Resend client, lazy + secret-cascade aware so admin can paste the
// API key in /admin/settings instead of redeploying. Returns null when the
// key isn't set yet — callers degrade gracefully (logs + continues) instead
// of crashing the request that triggered the email.

import "server-only";
import { Resend } from "resend";
import { getSecret } from "@/lib/secrets";

let cached: { key: string; client: Resend } | null = null;

export async function getResend(): Promise<Resend | null> {
  const key = await getSecret("RESEND_API_KEY");
  if (!key) return null;
  if (cached?.key === key) return cached.client;
  const client = new Resend(key);
  cached = { key, client };
  return client;
}

export async function getFromAddress(): Promise<string> {
  return (
    (await getSecret("RESEND_FROM_EMAIL")) ?? "VITA tours <no-reply@virtualtour.cgmimm.com>"
  );
}

/**
 * Best-effort email send. Logs and returns false if Resend isn't configured
 * or the API rejects — never throws, because the caller is usually inside a
 * user-facing flow we don't want to break over a missing notification.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<boolean> {
  const resend = await getResend();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${params.subject}"`);
    return false;
  }
  const from = await getFromAddress();
  try {
    const { error } = await resend.emails.send({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });
    if (error) {
      console.error("[email] Resend rejected:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend threw:", err);
    return false;
  }
}

/** Trivial HTML escape for interpolating user-controlled values. */
export function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
