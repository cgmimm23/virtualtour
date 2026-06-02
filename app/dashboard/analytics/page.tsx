import Link from "next/link";
import { requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — VITA" };

export default async function AnalyticsPage() {
  const { team } = await requireActiveTeam("/dashboard/analytics");
  const supabase = await createClient();

  // Tour list scoped to this team. RLS scopes everything else through.
  const { data: tours } = await supabase
    .from("tours")
    .select("id, slug, title, status, view_count")
    .eq("team_id", team.id)
    .order("view_count", { ascending: false });

  const tourIds = (tours ?? []).map((t) => t.id);
  if (tourIds.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />
        <p className="mt-8 rounded-md border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          No tours yet. Create one and publish it — view stats land here automatically.
        </p>
      </div>
    );
  }

  // Pull all view rows for the team's tours from the last 30 days. RLS on
  // tour_views inherits the tour's team policy, so this is team-scoped.
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await supabase
    .from("tour_views")
    .select("tour_id, viewer_session_id, device, country, referrer, created_at")
    .in("tour_id", tourIds)
    .gte("created_at", sinceIso);
  const views = rows ?? [];

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  let last7 = 0;
  let last24 = 0;
  const sessionsByTour = new Map<string, Set<string>>();
  const deviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();

  for (const v of views) {
    const t = new Date(v.created_at).getTime();
    if (t >= sevenDaysAgo) last7++;
    if (t >= oneDayAgo) last24++;
    if (!sessionsByTour.has(v.tour_id)) sessionsByTour.set(v.tour_id, new Set());
    sessionsByTour.get(v.tour_id)!.add(v.viewer_session_id);
    if (v.device) deviceCounts.set(v.device, (deviceCounts.get(v.device) ?? 0) + 1);
    if (v.country) countryCounts.set(v.country, (countryCounts.get(v.country) ?? 0) + 1);
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname.replace(/^www\./, "");
        referrerCounts.set(host, (referrerCounts.get(host) ?? 0) + 1);
      } catch {
        // ignore unparseable referrers
      }
    }
  }

  const totalUniqueViewers = new Set(views.map((v) => v.viewer_session_id)).size;
  const totalViewsAllTime = (tours ?? []).reduce((sum, t) => sum + (t.view_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Header />

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="All-time views" value={totalViewsAllTime.toLocaleString()} />
        <Stat label="Views · 30 days" value={views.length.toLocaleString()} />
        <Stat label="Views · 7 days" value={last7.toLocaleString()} />
        <Stat label="Views · 24 hours" value={last24.toLocaleString()} />
      </div>

      <section className="mt-8 rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Per-tour — last 30 days
        </h2>
        <ul className="divide-y divide-neutral-100">
          {(tours ?? []).map((t) => {
            const sessions = sessionsByTour.get(t.id);
            const recent30 = views.filter((v) => v.tour_id === t.id).length;
            const unique = sessions?.size ?? 0;
            return (
              <li key={t.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/editor/${t.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {t.title}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {t.status === "published" ? "published" : "draft"} ·{" "}
                    <Link href={`/t/${t.slug}`} target="_blank" className="hover:underline">
                      /t/{t.slug}
                    </Link>
                  </div>
                </div>
                <div className="flex shrink-0 gap-6 text-right">
                  <Mini label="30d" value={recent30.toLocaleString()} />
                  <Mini label="Unique" value={unique.toLocaleString()} />
                  <Mini label="All-time" value={(t.view_count ?? 0).toLocaleString()} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Breakdown title="Devices" rows={topN(deviceCounts, 5)} />
        <Breakdown title="Countries" rows={topN(countryCounts, 5)} />
        <Breakdown title="Referrers" rows={topN(referrerCounts, 5)} />
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        {totalUniqueViewers.toLocaleString()} unique viewer{totalUniqueViewers === 1 ? "" : "s"}{" "}
        across all tours in the last 30 days. Dedup is per session per UTC day.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-neutral-500">
        How your published tours are performing — last 30 days.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function topN(m: Map<string, number>, n: number): Array<{ key: string; count: number }> {
  return Array.from(m.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <h3 className="border-b border-neutral-100 p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="p-4 text-xs text-neutral-500">No data yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="truncate">{r.key}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-neutral-600">
                {r.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
