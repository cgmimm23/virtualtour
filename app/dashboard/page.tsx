import Link from "next/link";
import { requireActiveTeam, isPlatformAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { CreateTourButton } from "./create-tour-button";
import { TourCardActions } from "./tour-card-actions";

export const metadata = { title: "Tours — Tourly" };

interface PageProps {
  searchParams: Promise<{
    upgrade?: string;
    current?: string;
    limit?: string;
    plan?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { team } = await requireActiveTeam();
  const supabase = await createClient();
  const sp = await searchParams;
  // Platform admins bypass tour quotas server-side. Mirror that in the UI so
  // the dashboard doesn't lie about being "at the limit."
  const admin = await isPlatformAdmin();

  // RLS enforces team_id; we still pass the filter to keep the index hot.
  const { data: tours } = await supabase
    .from("tours")
    .select("id, slug, title, property_address, status, view_count, updated_at")
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false });

  const list = tours ?? [];
  const limit = PLAN_LIMITS[team.plan].tours;
  const atLimit =
    !admin && limit !== Number.POSITIVE_INFINITY && list.length >= limit;
  const usageLabel = admin
    ? `${list.length} ${list.length === 1 ? "tour" : "tours"} · admin (no limit)`
    : limit === Number.POSITIVE_INFINITY
      ? `${list.length} ${list.length === 1 ? "tour" : "tours"}`
      : `${list.length} / ${limit} ${list.length === 1 ? "tour" : "tours"}`;
  const planLabel = team.plan.charAt(0).toUpperCase() + team.plan.slice(1);

  // Trial countdown — only shown to non-admin trial users with a clock set.
  const trial = (() => {
    if (admin || team.plan !== "trial" || !team.trial_ends_at) return null;
    const endMs = new Date(team.trial_ends_at).getTime();
    const days = Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1000));
    const expired = days <= 0;
    const tone = expired ? "expired" : days <= 3 ? "urgent" : days <= 7 ? "warn" : "calm";
    return { days, expired, tone } as const;
  })();

  const trialClasses = !trial
    ? ""
    : trial.tone === "expired" || trial.tone === "urgent"
      ? "border-red-200 bg-red-50 text-red-900"
      : trial.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-neutral-200 bg-neutral-50 text-neutral-700";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {trial ? (
        <div
          className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 text-sm ${trialClasses}`}
        >
          <div>
            {trial.expired ? (
              <>
                <strong>Your trial ended {Math.abs(trial.days)} day{Math.abs(trial.days) === 1 ? "" : "s"} ago.</strong>{" "}
                Upgrade to keep publishing tours and capturing leads.
              </>
            ) : (
              <>
                <strong>
                  Trial: {trial.days} day{trial.days === 1 ? "" : "s"} left
                </strong>
                {trial.tone !== "calm" ? " — pick a plan before it runs out." : "."}
              </>
            )}
          </div>
          <Link
            href="/dashboard/billing"
            className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
              trial.tone === "expired" || trial.tone === "urgent"
                ? "bg-red-600 hover:bg-red-700"
                : trial.tone === "warn"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-neutral-900 hover:bg-neutral-800"
            }`}
          >
            See plans →
          </Link>
        </div>
      ) : null}

      {sp.upgrade === "tours" ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div>
            <strong>You&apos;ve hit your {sp.plan ?? team.plan} plan limit</strong>
            {sp.current && sp.limit ? (
              <> — {sp.current} / {sp.limit} tours used.</>
            ) : null}{" "}
            Upgrade to add more.
          </div>
          <Link
            href="/dashboard/billing"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            See plans →
          </Link>
        </div>
      ) : null}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your tours</h1>
          <p className="text-sm text-neutral-500">
            {usageLabel}
            {!admin ? ` on ${planLabel} plan` : ""}
            {atLimit ? (
              <>
                {" · "}
                <Link
                  href="/dashboard/billing"
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  Upgrade →
                </Link>
              </>
            ) : null}
          </p>
        </div>
        {atLimit ? (
          <Link
            href="/dashboard/billing"
            className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Upgrade plan
          </Link>
        ) : (
          <CreateTourButton />
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center">
          <p className="text-sm text-neutral-500">
            No tours yet. Create your first one to start uploading scenes.
          </p>
          <div className="mt-6 inline-block">
            <CreateTourButton />
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/editor/${t.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  {t.property_address ? (
                    <p className="truncate text-xs text-neutral-500">{t.property_address}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "published"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    {t.status}
                  </span>
                  <TourCardActions tourId={t.id} tourTitle={t.title} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                <span>{t.view_count} views</span>
                <span>·</span>
                <Link href={`/t/${t.slug}`} className="hover:underline" target="_blank" rel="noopener">
                  Public link
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
