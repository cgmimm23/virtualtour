import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Start your free virtual tour trial",
  description:
    "Create a VITA account and ship your first AI-powered virtual tour in under 10 minutes. Free 14-day trial, no card required.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Create your VITA account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Already have one?{" "}
          <Link href="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
            Sign in
          </Link>
        </p>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-xs text-neutral-500">
        We&apos;ll create a personal team for you. You can invite teammates from settings.
      </p>
    </div>
  );
}
