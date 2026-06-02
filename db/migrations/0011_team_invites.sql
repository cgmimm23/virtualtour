-- 0011_team_invites.sql — invite-by-email flow for adding teammates.
--
-- Owners + admins create rows in team_invites with a random token. The
-- invitee receives the token via email, lands on /invite/<token>, and
-- (after auth) calls the accept_team_invite RPC which atomically:
--   - validates token + expiry + email match against auth.uid()
--   - inserts a team_members row
--   - marks the invite accepted_at
-- RLS scopes reads/writes to the inviting team's members; the accept
-- step bypasses RLS via SECURITY DEFINER because the invitee may not be
-- a team member yet.

create table if not exists team_invites (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  email         text not null,
  role          team_role not null default 'agent',
  token         text not null unique,
  invited_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  accepted_at   timestamptz,
  accepted_by   uuid references auth.users(id) on delete set null
);

create index if not exists team_invites_team_idx on team_invites(team_id, created_at desc);
create index if not exists team_invites_email_pending_idx
  on team_invites(email) where accepted_at is null;
create index if not exists team_invites_token_idx on team_invites(token);

alter table team_invites enable row level security;

-- Members of the team can see their own invites. Platform admins see all.
create policy "team_invites_read"
  on team_invites for select
  using (
    is_platform_admin()
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );

-- Only owners + admins of the inviting team can create / delete invites.
create policy "team_invites_write"
  on team_invites for all
  using (
    is_platform_admin()
    or team_id in (
      select team_id from team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    is_platform_admin()
    or team_id in (
      select team_id from team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- accept_team_invite — invitee-facing RPC. Runs as definer so it can
-- (a) read the invite row even before the user is on the team, and
-- (b) insert into team_members without RLS gymnastics.
create or replace function accept_team_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite team_invites%rowtype;
  v_already_member boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'sign in to accept this invite');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invite from team_invites where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invite not found');
  end if;
  if v_invite.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'invite already used');
  end if;
  if v_invite.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invite has expired');
  end if;
  if lower(v_invite.email) <> lower(v_user_email) then
    return jsonb_build_object(
      'ok', false,
      'error', 'invite was sent to ' || v_invite.email || ' — sign in with that email to accept'
    );
  end if;

  select exists(
    select 1 from team_members
    where team_id = v_invite.team_id and user_id = v_user_id
  ) into v_already_member;

  if not v_already_member then
    insert into team_members (team_id, user_id, role)
    values (v_invite.team_id, v_user_id, v_invite.role);
  end if;

  update team_invites
     set accepted_at = now(), accepted_by = v_user_id
   where id = v_invite.id;

  return jsonb_build_object('ok', true, 'team_id', v_invite.team_id);
end;
$$;

revoke all on function accept_team_invite(text) from public;
grant execute on function accept_team_invite(text) to authenticated;
