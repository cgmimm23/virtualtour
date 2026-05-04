import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Stat {
  label: string;
  value: string | number;
  href?: string;
}

async function loadStats(): Promise<Stat[]> {
  const supabase = createAdminClient();
  // count: "exact" + head: true + select shape — these are HEAD requests
  // that return only a count, no rows. Cheap.
  const [
    { count: userCount },
    { count: teamCount },
    { count: tourCount },
    { count: publishedCount },
    { count: leadCount },
    { count: viewCount },
  ] = await Promise.all([
    supabase.from("team_members").select("user_id", { count: "exact", head: true }),
    supabase.from("teams").select("id", { count: "exact", head: true }),
    supabase.from("tours").select("id", { count: "exact", head: true }),
    supabase
      .from("tours")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("tour_views").select("id", { count: "exact", head: true }),
  ]);

  return [
    { label: "Users", value: userCount ?? 0, href: "/admin/users" },
    { label: "Teams", value: teamCount ?? 0, href: "/admin/teams" },
    { label: "Tours", value: tourCount ?? 0, href: "/admin/tours" },
    { label: "Published", value: publishedCount ?? 0 },
    { label: "Leads", value: leadCount ?? 0, href: "/admin/leads" },
    { label: "Tour views", value: viewCount ?? 0 },
  ];
}

async function loadRecentSignups(): Promise<Array<{ email: string; createdAt: string }>> {
  const supabase = createAdminClient();
  // auth.admin.listUsers requires service role — the admin client has it.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 8 });
  if (error || !data) return [];
  return data.users.map((u) => ({
    email: u.email ?? "(no email)",
    createdAt: u.created_at,
  }));
}

async function loadRecentLeads(): Promise<
  Array<{ email: string; tourSlug: string; capturedAt: string; source: string }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select("email, source, captured_at, tour:tours(slug)")
    .order("captured_at", { ascending: false })
    .limit(8);
  if (!data) return [];
  return data.map((l) => {
    const tour = Array.isArray(l.tour) ? l.tour[0] : l.tour;
    return {
      email: l.email,
      source: l.source,
      capturedAt: l.captured_at,
      tourSlug: tour?.slug ?? "(unknown)",
    };
  });
}

export default async function AdminOverview() {
  const [stats, signups, leads] = await Promise.all([
    loadStats(),
    loadRecentSignups(),
    loadRecentLeads(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-neutral-500">
          Platform-wide metrics. RLS bypassed via service role.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const inner = (
            <>
              <div className="text-xs uppercase tracking-wider text-neutral-500">{s.label}</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-brand-700">
                {s.value}
              </div>
            </>
          );
          return s.href ? (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={s.label}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Recent signups" href="/admin/users">
          {signups.length === 0 ? (
            <Empty>No signups yet.</Empty>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {signups.map((s) => (
                <li key={s.email} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate font-medium">{s.email}</span>
                  <span className="flex-shrink-0 text-xs text-neutral-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent leads" href="/admin/leads">
          {leads.length === 0 ? (
            <Empty>No leads captured yet.</Empty>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {leads.map((l, i) => (
                <li key={`${l.email}-${i}`} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{l.email}</span>
                    <span className="ml-2 text-xs text-neutral-500">/{l.tourSlug}</span>
                  </div>
                  <span className="ml-2 flex-shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
                    {l.source}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs font-medium text-brand-600 hover:text-brand-700">
            See all →
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-6 text-center text-sm text-neutral-500">{children}</div>;
}
