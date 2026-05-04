-- 0005_billing.sql — Billing audit log + Stripe-state columns on teams.
--
-- Stripe is the source of truth for subscription state; this migration adds
-- (1) a few cached fields on `teams` so we don't round-trip Stripe on every
-- request, and (2) a billing_events audit log so admins can see who changed
-- what plan when, whether by webhook (Stripe-driven), admin override, or
-- self-serve checkout.
--
-- Apply: paste into Supabase SQL Editor or run via scripts/apply-migrations.mjs.

-- Cached Stripe state on teams. The webhook keeps these in sync; admin
-- overrides write through to both these columns and a billing_events row.
alter table teams
  add column if not exists stripe_status            text,
  add column if not exists current_period_end       timestamptz,
  add column if not exists cancel_at_period_end     boolean not null default false,
  add column if not exists trial_ends_at            timestamptz;

comment on column teams.stripe_status is
  'Mirror of stripe.subscription.status: trialing | active | past_due | canceled | incomplete | unpaid. Authoritative source is Stripe.';

-- Audit log of every plan change. Insert-only — never update or delete.
create table if not exists billing_events (
  id                uuid primary key default gen_random_uuid(),
  team_id           uuid not null references teams(id) on delete cascade,
  -- Type: what happened. Free-form text so we can add new event types from
  -- Stripe webhooks without a migration. Common values:
  --   'plan_changed'        — admin override or self-serve switch
  --   'subscription_created'
  --   'subscription_updated'
  --   'subscription_deleted'
  --   'invoice_paid'
  --   'invoice_payment_failed'
  --   'trial_started'
  --   'trial_ended'
  --   'team_deleted'        — admin destructive action audit
  type              text not null,
  -- Source of the event. 'webhook' = Stripe pushed it. 'admin' = platform
  -- admin override via /admin/teams/[id]/billing. 'system' = trigger or
  -- background job. 'self_serve' = team member changed their own plan.
  source            text not null check (source in ('webhook', 'admin', 'system', 'self_serve')),
  -- The auth.users row of whoever triggered this, when applicable. Null for
  -- webhook-sourced events.
  actor_user_id     uuid references auth.users(id) on delete set null,
  -- Plan transition, if applicable. Both null for non-plan events (e.g.
  -- invoice_paid).
  from_plan         plan,
  to_plan           plan,
  -- Cents. Used for invoice events; null otherwise.
  amount_cents      integer,
  currency          text default 'usd',
  -- Stripe event ID for dedupe. Webhook handler upserts on this.
  stripe_event_id   text unique,
  stripe_object_id  text,
  -- Free-form details — full Stripe event JSON, admin reason, etc.
  metadata          jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists billing_events_team_id_created_at_idx
  on billing_events (team_id, created_at desc);
create index if not exists billing_events_type_idx on billing_events (type);

alter table billing_events enable row level security;

-- Team members can read their own team's billing events. Platform admins
-- can read everything (via is_platform_admin() from migration 0004).
create policy "members_read_team_billing_events"
  on billing_events
  for select
  using (
    is_platform_admin()
    or team_id in (
      select team_id from team_members where user_id = auth.uid()
    )
  );

-- Only service-role inserts (webhook handler + admin server actions).
-- No direct insert/update from authenticated users.

-- Convenience: timestamped MRR snapshot per team. Computed from teams.plan
-- since we don't store per-period prices on the team. Used by /admin/billing.
create or replace function team_monthly_revenue_cents(p_plan plan)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'solo' then 2900
    when 'team' then 7900
    when 'brokerage' then 19900
    else 0
  end;
$$;
