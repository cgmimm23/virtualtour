import Link from "next/link";
import { LoginForm } from "./login-form";

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export const metadata = { title: "Sign in — Tourly" };

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold">Sign in to Tourly</h1>
        <p className="mt-1 text-sm text-neutral-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-neutral-900 underline dark:text-neutral-100">
            Create an account
          </Link>
        </p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
