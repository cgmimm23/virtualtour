"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "../login/actions";

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Email confirmation flow lands here. The handler exchanges the code for
      // a session and redirects on to /dashboard.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) {
    return { error: error.message };
  }

  // The Supabase trigger handle_new_user() (see 0001_init.sql) creates the
  // team + team_members row on insert into auth.users, so by the time we
  // redirect to the dashboard the user already has a tenant.
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
