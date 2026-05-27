import Link from "next/link";
import { SignupForm } from "./signup-form";
import { getPricingTierByPlan } from "@/lib/pricing";
import type { Plan } from "@/types/supabase";

export const metadata = {
  title: "Start your free virtual tour trial",
  description:
    "Create a VITA account and ship your first AI-powered virtual tour in under 10 minutes. Free 14-day trial, no card required.",
  alternates: { canonical: "/signup" },
};

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

const PAID_PLANS: ReadonlyArray<Plan> = ["solo", "team", "brokerage"];

function normalizePlan(input: string | undefined): Plan | null {
  if (!input) return null;
  return PAID_PLANS.includes(input as Plan) ? (input as Plan) : null;
}

export default async function SignupPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const plan = normalizePlan(sp.plan);
  const tier = plan ? await getPricingTierByPlan(plan) : null;

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

      {tier ? (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                You picked
              </div>
              <div className="mt-0.5 text-base font-semibold text-brand-900">
                {tier.displayName} plan
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold tabular-nums text-brand-900">
                ${Math.round(tier.priceCents / 100)}
                <span className="text-xs font-normal text-brand-700">/mo</span>
              </div>
              <Link
                href="/pricing"
                className="text-[11px] text-brand-700 underline hover:text-brand-900"
              >
                change
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-brand-800">
            Create your account first — we&apos;ll take you to checkout right after.
            Cancel anytime.
          </p>
        </div>
      ) : null}

      <SignupForm plan={plan ?? undefined} />

      {!tier ? (
        <p className="mt-6 text-center text-xs text-neutral-500">
          14-day free trial. No card required. You can pick a plan from your
          dashboard whenever you&apos;re ready.
        </p>
      ) : null}
    </div>
  );
}
