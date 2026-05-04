import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPricingTiers } from "@/lib/pricing";
import { TeamPlanControls } from "./controls";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function fmtMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default async function TeamDetail({ params }: PageProps) {
  await requirePlatformAdmin();
  const { id } = await params;

  const supabase = createAdminClient();
  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!team) notFound();

  const [{ data: members }, { data: tours }, { data: events }] = await Promise.all([
    supabase
      .from("team_members")
      .select("user_id, role, created_at")
      .eq("team_id", id)
      .order("created_at"),
    supabase.from("tours").select("id, slug, title, status, created_at").eq("team_id", id),
    supabase
      .from("billing_events")
      .select("*")
      .eq("team_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Hydrate member emails via auth.admin
  const memberEmails: Record<string, string> = {};
  for (const m of members ?? []) {
    const { data: u } = await supabase.auth.admin.getUserById(m.user_id);
    if (u?.user?.email) memberEmails[m.user_id] = u.user.email;
  }

  const tiers = await getPricingTiers();
  const planMrr: Record<string, number> = { trial: 0 };
  for (const t of tiers) planMrr[t.plan] = t.priceCents;
  const mrrCents = team.stripe_status === "active" ? planMrr[team.plan] ?? 0 : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/billing" className="text-xs text-brand-600 hover:text-brand-700">
            ← Billing
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{team.name}</h1>
          <p className="text-sm text-neutral-500">
            /{team.slug} · created {new Date(team.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Plan + Stripe state */}
      <section className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Plan</h2>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-brand-700">
              {team.plan}
            </span>
            <span className="text-sm text-neutral-500">
              {team.plan === "trial" ? "no charge" : `${fmtMoney(mrrCents)}/mo`}
            </span>
          </div>
          <TeamPlanControls teamId={team.id} currentPlan={team.plan} teamName={team.name} />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Stripe state
          </h2>
          <dl className="mt-2 space-y-1 text-sm">
            <Row label="Status" value={team.stripe_status ?? "—"} />
            <Row
              label="Customer ID"
              value={team.stripe_customer_id ?? "—"}
              mono
              link={
                team.stripe_customer_id
                  ? `https://dashboard.stripe.com/customers/${team.stripe_customer_id}`
                  : undefined
              }
            />
            <Row
              label="Subscription ID"
              value={team.stripe_subscription_id ?? "—"}
              mono
              link={
                team.stripe_subscription_id
                  ? `https://dashboard.stripe.com/subscriptions/${team.stripe_subscription_id}`
                  : undefined
              }
            />
            <Row
              label="Period ends"
              value={
                team.current_period_end
                  ? new Date(team.current_period_end).toLocaleString()
                  : "—"
              }
            />
            <Row
              label="Cancel at period end"
              value={team.cancel_at_period_end ? "yes" : "no"}
            />
          </dl>
        </div>
      </section>

      {/* Members */}
      <section className="mb-6 rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Members ({members?.length ?? 0})
        </h2>
        {(members?.length ?? 0) === 0 ? (
          <div className="p-5 text-sm text-neutral-500">No members.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {members!.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-medium">{memberEmails[m.user_id] ?? m.user_id}</div>
                  <div className="text-xs text-neutral-500">
                    Joined {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tours */}
      <section className="mb-6 rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Tours ({tours?.length ?? 0})
        </h2>
        {(tours?.length ?? 0) === 0 ? (
          <div className="p-5 text-sm text-neutral-500">No tours.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {tours!.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.title}</div>
                  <div className="text-xs text-neutral-500">/{t.slug}</div>
                </div>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Billing events */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Billing audit log
        </h2>
        {(events?.length ?? 0) === 0 ? (
          <div className="p-5 text-sm text-neutral-500">No events yet.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {events!.map((e) => (
              <li key={e.id} className="grid grid-cols-12 gap-2 p-4 text-sm">
                <div className="col-span-3 text-xs text-neutral-500 tabular-nums">
                  {new Date(e.created_at).toLocaleString()}
                </div>
                <div className="col-span-3 font-medium">{e.type}</div>
                <div className="col-span-2 text-xs">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 uppercase tracking-wider text-neutral-600">
                    {e.source}
                  </span>
                </div>
                <div className="col-span-4 text-xs text-neutral-500">
                  {e.from_plan && e.to_plan ? `${e.from_plan} → ${e.to_plan}` : ""}
                  {e.amount_cents
                    ? ` ${fmtMoney(e.amount_cents, e.currency ?? "usd")}`
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className={`col-span-2 ${mono ? "font-mono text-xs" : ""} truncate`}>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
