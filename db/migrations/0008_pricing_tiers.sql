-- 0008_pricing_tiers.sql — single source of truth for plan pricing.
--
-- Before this migration, prices were hardcoded across (a) the marketing
-- pricing page, (b) the customer billing plan-grid, (c) admin MRR calc,
-- and (d) lib/stripe/products.ts bootstrap. They drifted easily.
--
-- After: every surface reads from `pricing_tiers`. Admin edits via
-- /admin/pricing → Save updates DB → "Sync to Stripe" mints a new
-- Stripe price, archives the old one, and updates app_secrets.

create table if not exists pricing_tiers (
  -- Plan enum is the natural key. trial isn't in this table — it's the
  -- implicit free tier with $0 forever.
  plan              plan primary key,
  display_name      text not null,
  price_cents       integer not null check (price_cents >= 0),
  currency          text not null default 'usd',
  blurb             text not null default '',
  -- features: JSON array of { label: text, included: boolean } objects.
  -- Rendered as the bullet list under each plan.
  features          jsonb not null default '[]'::jsonb,
  cta_label         text not null default 'Start free trial',
  highlight         boolean not null default false,
  active            boolean not null default true,
  sort_order        integer not null default 0,
  -- Cached Stripe linkage. stripe_price_id rotates whenever the admin
  -- changes the price (Stripe prices are immutable; we create a new one
  -- and archive the old).
  stripe_product_id text,
  stripe_price_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger pricing_tiers_set_updated_at
  before update on pricing_tiers
  for each row execute function set_updated_at();

alter table pricing_tiers enable row level security;

-- Anyone can read pricing (for the public marketing page + customer
-- dashboard). Only platform admins can write.
create policy "pricing_tiers_read"
  on pricing_tiers for select
  using (true);

create policy "pricing_tiers_write"
  on pricing_tiers for all
  using (is_platform_admin())
  with check (is_platform_admin());

-- Seed with the three current tiers. Pulls existing Stripe IDs from
-- app_secrets if they're already there (i.e. user already clicked
-- "Create / sync Stripe products"). Otherwise leaves stripe_price_id null
-- and the next products-bootstrap pass fills it in.
insert into pricing_tiers (plan, display_name, price_cents, blurb, features, cta_label, highlight, sort_order, stripe_price_id)
values
  (
    'solo',
    'Solo',
    2900,
    'For the solo agent shipping a few tours a month.',
    '[
      {"label": "5 active tours", "included": true},
      {"label": "1 user", "included": true},
      {"label": "25 GB storage", "included": true},
      {"label": "Unlimited tour views", "included": true},
      {"label": "Email lead capture", "included": true},
      {"label": "CSV export", "included": true},
      {"label": "Zapier integration", "included": true},
      {"label": "Native CRM (FUB, kvCORE, Sierra)", "included": false},
      {"label": "White-label / custom domain", "included": false},
      {"label": "API access", "included": false}
    ]'::jsonb,
    'Start free trial',
    false,
    1,
    (select value from app_secrets where key = 'STRIPE_PRICE_ID_SOLO')
  ),
  (
    'team',
    'Team',
    7900,
    'For small teams that pipe leads to a CRM.',
    '[
      {"label": "25 active tours", "included": true},
      {"label": "5 users", "included": true},
      {"label": "100 GB storage", "included": true},
      {"label": "Unlimited tour views", "included": true},
      {"label": "Email lead capture", "included": true},
      {"label": "CSV export", "included": true},
      {"label": "Zapier integration", "included": true},
      {"label": "Native CRM (FUB, kvCORE, Sierra)", "included": true},
      {"label": "Custom branding + colors", "included": true},
      {"label": "White-label / custom domain", "included": false},
      {"label": "API access", "included": false}
    ]'::jsonb,
    'Start free trial',
    true,
    2,
    (select value from app_secrets where key = 'STRIPE_PRICE_ID_TEAM')
  ),
  (
    'brokerage',
    'Brokerage',
    19900,
    'For brokerages with custom domains and integrations.',
    '[
      {"label": "Unlimited active tours", "included": true},
      {"label": "20 users", "included": true},
      {"label": "500 GB storage", "included": true},
      {"label": "Unlimited tour views", "included": true},
      {"label": "Email lead capture", "included": true},
      {"label": "CSV export", "included": true},
      {"label": "Zapier integration", "included": true},
      {"label": "Native CRM (FUB, kvCORE, Sierra)", "included": true},
      {"label": "Custom branding + colors", "included": true},
      {"label": "Remove \"Powered by Tourly\"", "included": true},
      {"label": "Custom domain (CNAME)", "included": true},
      {"label": "API access", "included": true}
    ]'::jsonb,
    'Contact sales',
    false,
    3,
    (select value from app_secrets where key = 'STRIPE_PRICE_ID_BROKERAGE')
  )
on conflict (plan) do nothing;

-- Update the team_monthly_revenue_cents helper to read from pricing_tiers
-- instead of hardcoded values.
create or replace function team_monthly_revenue_cents(p_plan plan)
returns integer
language sql
stable
as $$
  select coalesce((select price_cents from pricing_tiers where plan = p_plan), 0);
$$;
