"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export interface SignupResult {
  ok?: boolean;
  error?: string;
  redirectTo?: string;
}

const PAID_PLANS = new Set(["solo", "team", "brokerage"]);

// Direct signup (replaces Supabase Auth's email-confirmation flow). Creates the
// auth.users row with a bcrypt password; the on_auth_user_created trigger
// creates the personal team + team_members owner row, and
// on_auth_user_created_promote_admin mirrors the founder email into
// platform_admins. The client then signs in with NextAuth using the same
// credentials.
export async function createAccount(input: {
  email: string;
  password: string;
  plan?: string;
}): Promise<SignupResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const plan = input.plan && PAID_PLANS.has(input.plan) ? input.plan : null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.users.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const encrypted_password = await bcrypt.hash(password, 10);
  const now = new Date();
  await prisma.users.create({
    data: {
      id: randomUUID(),
      email,
      encrypted_password,
      email_confirmed_at: now,
      aud: "authenticated",
      role: "authenticated",
      created_at: now,
      updated_at: now,
      raw_app_meta_data: { provider: "email", providers: ["email"] },
      raw_user_meta_data: {},
    },
  });

  // Fire-and-forget welcome email; never block signup on Resend.
  sendWelcomeEmail({ to: email, firstName: email.split("@")[0] }).catch((err) =>
    console.error("[createAccount] welcome email failed:", err),
  );

  return {
    ok: true,
    redirectTo: plan ? `/dashboard/billing?checkout=${plan}` : "/dashboard",
  };
}
