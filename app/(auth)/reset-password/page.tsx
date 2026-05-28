import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  // The recovery email links to /auth/callback?next=/reset-password, which
  // exchanges the code for a session before landing here. If there's no
  // session, the user typed this URL directly — bounce them to forgot.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/forgot-password?expired=1");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as <strong>{data.user.email}</strong>
        </p>
      </div>
      <ResetPasswordForm />
      <p className="mt-6 text-center text-xs text-neutral-500">
        Need a fresh link?{" "}
        <Link href="/forgot-password" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Start over
        </Link>
      </p>
    </div>
  );
}
