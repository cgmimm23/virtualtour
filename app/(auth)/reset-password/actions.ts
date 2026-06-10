"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export interface ResetState {
  error?: string;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };
  if (!token || !email) return { error: "Invalid or expired reset link." };

  const user = await prisma.users.findFirst({
    where: { email },
    select: { id: true, recovery_token: true, recovery_sent_at: true },
  });
  if (!user?.recovery_token || !user.recovery_sent_at) {
    return { error: "Invalid or expired reset link." };
  }

  const fresh = Date.now() - user.recovery_sent_at.getTime() < ONE_HOUR_MS;
  const match = await bcrypt.compare(token, user.recovery_token);
  if (!fresh || !match) {
    return { error: "Invalid or expired reset link. Request a new one." };
  }

  const encrypted_password = await bcrypt.hash(password, 10);
  await prisma.users.update({
    where: { id: user.id },
    data: { encrypted_password, recovery_token: "", recovery_sent_at: null },
  });

  // Password changed — send them to log in with the new credentials.
  redirect("/login?reset=1");
}
