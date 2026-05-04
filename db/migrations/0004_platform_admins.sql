-- 0004_platform_admins.sql — Tourly platform-level admin (super-admin) support.
--
-- The existing team_members.role = 'admin' is a *team* admin (manages one
-- team). This migration adds a separate concept: platform admins, who can
-- see and manage every team / tour / lead in the system. Currently used to
-- give the founder a customer-success / support / observability surface.
--
-- The /admin/* routes in the app gate on `is_platform_admin()`.

create table platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table platform_admins is
  'Platform/super-admin allowlist. Distinct from team_members.role.';

-- Helper used by app server code + RLS policies. SECURITY DEFINER so we can
-- check the membership of the current authed user without granting them
-- direct read access to the table.
create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from platform_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function is_platform_admin() from public;
grant execute on function is_platform_admin() to authenticated;

-- Auto-promote on signup. When a new auth.users row is inserted with the
-- founder's email, the row is mirrored into platform_admins. This keeps the
-- bootstrap deterministic: the *first* time jonathan@cgmimm.com confirms
-- their account, they become the platform admin without manual action.
--
-- Add more emails to the IN (...) tuple if you want additional automatic
-- admins; otherwise insert into platform_admins manually.
create or replace function handle_auto_admin_signup()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email in ('jonathan@cgmimm.com') then
    insert into platform_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_promote_admin on auth.users;
create trigger on_auth_user_created_promote_admin
after insert on auth.users
for each row execute function handle_auto_admin_signup();

-- RLS on the platform_admins table: only platform admins can see who else
-- is an admin (privacy + abuse-resistance — non-admins can't enumerate).
alter table platform_admins enable row level security;

create policy "platform_admins_self_or_admin_read"
  on platform_admins
  for select
  using (user_id = auth.uid() or is_platform_admin());

-- No public insert/update/delete — admin management is service-role only.
