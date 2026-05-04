-- 0006_app_secrets.sql — Platform-admin-managed secret store.
--
-- Lets the founder paste Stripe keys / Anthropic API key / etc. from the
-- /admin/settings UI without redeploying. Reads cascade: env var first
-- (production set via doctl / DO env), DB row second (admin override). This
-- makes prod-from-env the secure default while giving a self-serve panel
-- when env isn't set.
--
-- Stored as plaintext (not pgcrypto'd) on the assumption Supabase Postgres
-- is well-protected and RLS gates access to platform admins only. Anyone
-- with the service-role key can read these directly — same trust boundary
-- as the keys themselves. Future hardening: pgsodium encryption at rest.

create table if not exists app_secrets (
  key            text primary key,
  value          text not null,
  description    text,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

comment on table app_secrets is
  'Platform-admin-managed secret values. Read via lib/secrets.ts which checks env first.';

-- Trigger to keep updated_at fresh on every write.
create trigger app_secrets_set_updated_at
  before update on app_secrets
  for each row execute function set_updated_at();

alter table app_secrets enable row level security;

-- Only platform admins can read or write directly via authenticated client.
-- Server code uses the service-role client (bypasses RLS) for `getSecret()`.
create policy "platform_admins_read_secrets"
  on app_secrets
  for select
  using (is_platform_admin());

create policy "platform_admins_write_secrets"
  on app_secrets
  for all
  using (is_platform_admin())
  with check (is_platform_admin());
