import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const { token, email } = await searchParams;
  // The recovery email links here with ?token=…&email=…. Without them the user
  // typed this URL directly — bounce them to forgot.
  if (!token || !email) {
    redirect("/forgot-password?expired=1");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Resetting the password for <strong>{email}</strong>
        </p>
      </div>
      <ResetPasswordForm token={token} email={email} />
      <p className="mt-6 text-center text-xs text-neutral-500">
        Need a fresh link?{" "}
        <Link href="/forgot-password" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Start over
        </Link>
      </p>
    </div>
  );
}
