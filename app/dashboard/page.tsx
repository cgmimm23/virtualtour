import Link from "next/link";
import { requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS } from "@/lib/plan-limits";
import { CreateTourButton } from "./create-tour-button";

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

  // RLS enforces team_id; we still pass the filter to keep the index hot.
  const { data: tours } = await supabase
    .from("tours")
    .select("id, slug, title, property_address, status, view_count, updated_at")
    .eq("team_id", team.id)
    .order("updated_at", { ascending: false });

  const list = tours ?? [];
  const limit = PLAN_LIMITS[team.plan].tours;
  const atLimit = limit !== Number.POSITIVE_INFINITY && list.length >= limit;
  const usageLabel =
    limit === Number.POSITIVE_INFINITY
      ? `${list.length} ${list.length === 1 ? "tour" : "tours"}`
      : `${list.length} / ${limit} ${list.length === 1 ? "tour" : "tours"}`;
  const planLabel = team.plan.charAt(0).toUpperCase() + team.plan.slice(1);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
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
            {usageLabel} on {planLabel} plan
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
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    t.status === "published"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {t.status}
                </span>
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
