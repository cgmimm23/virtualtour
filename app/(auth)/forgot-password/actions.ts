"use server";

import { createClient } from "@/lib/supabase/server";

export interface ForgotState {
  sent?: boolean;
  error?: string;
}

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  // Supabase appends ?code=... to redirectTo. Our /auth/callback exchanges
  // the code for a session and then follows ?next= to land on the reset
  // form (where the user is signed in and can call updateUser).
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error) {
    // Don't reveal whether the email exists (anti-enumeration). Show a
    // generic "if it exists, we sent one" message either way.
    console.error("[forgotPasswordAction]", error.message);
  }
  return { sent: true };
}
