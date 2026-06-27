// Thin Resend client, lazy + secret-cascade aware so admin can paste the
// API key in /admin/settings instead of redeploying. Returns null when the
// key isn't set yet — callers degrade gracefully (logs + continues) instead
// of crashing the request that triggered the email.

import "server-only";
import { spawn } from "child_process";

// Self-hosted Postfix on this box (DKIM-signed for cgmimm.com). Replaces Resend.
const FROM = "VITA tours <no-reply@cgmimm.com>";

export async function getFromAddress(): Promise<string> {
  return FROM;
}

/**
 * Best-effort email send via the local Postfix (DKIM-signed). Never throws —
 * the caller is usually inside a user-facing flow we don't want to break.
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}): Promise<boolean> {
  const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;
  const headers = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
  ];
  if (params.replyTo) headers.push(`Reply-To: ${params.replyTo}`);
  const msg = [...headers, "", params.html].join("\r\n");
  return new Promise<boolean>((resolve) => {
    try {
      const sm = spawn("/usr/sbin/sendmail", ["-t", "-i", "-f", "no-reply@cgmimm.com"]);
      sm.on("error", (e) => {
        console.error("[email] sendmail error:", e);
        resolve(false);
      });
      sm.on("close", (code) => resolve(code === 0));
      sm.stdin.end(msg);
    } catch (err) {
      console.error("[email] sendmail threw:", err);
      resolve(false);
    }
  });
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
