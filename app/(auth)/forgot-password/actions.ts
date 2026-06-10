"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmail, esc } from "@/lib/email/client";

export interface ForgotState {
  sent?: boolean;
  error?: string;
}

// Token-based password reset (replaces Supabase Auth's recovery flow). We store
// a bcrypt hash of a random token in auth.users.recovery_token + stamp
// recovery_sent_at, then email a link to /reset-password?token=…&email=…. The
// reset action validates the token and 1-hour freshness window.
export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const user = await prisma.users.findFirst({ where: { email }, select: { id: true } });
  if (user) {
    const token = randomUUID() + randomUUID().replace(/-/g, "");
    const tokenHash = await bcrypt.hash(token, 10);
    await prisma.users.update({
      where: { id: user.id },
      data: { recovery_token: tokenHash, recovery_sent_at: new Date() },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://virtualtour.cgmimm.com";
    const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: "Reset your VITA password",
      text: `Reset your VITA password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html: `<p>Reset your VITA password:</p><p><a href="${esc(link)}">${esc(link)}</a></p><p style="color:#71717a;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      tags: [{ name: "type", value: "password-reset" }],
    }).catch((err) => console.error("[forgotPasswordAction] email failed:", err));
  }

  // Always report success — don't reveal whether the email exists.
  return { sent: true };
}
