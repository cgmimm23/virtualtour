-- 0002_rls.sql — Row-level security for tenant isolation.
--
-- All authed access goes through the standard Supabase client which sets
-- auth.uid() from the JWT. Public viewer access goes through SECURITY DEFINER
-- RPCs (see 0003_public_rpcs.sql) that explicitly return only published-tour
-- data — RLS is bypassed inside those functions, so they're the only safe
-- public surface.

-- Helper: is the calling user a member of <team_id>? -----------------------

create or replace function is_team_member(p_team_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function is_team_admin(p_team_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Enable RLS on every tenant-scoped table ----------------------------------

alter table teams         enable row level security;
alter table team_members  enable row level security;
alter table tours         enable row level security;
alter table scenes        enable row level security;
alter table hotspots      enable row level security;
alter table leads         enable row level security;
alter table tour_views    enable row level security;

-- Teams --------------------------------------------------------------------

create policy "team_members_can_read_team" on teams
  for select using (is_team_member(id));

create policy "team_admins_can_update_team" on teams
  for update using (is_team_admin(id))
  with check (is_team_admin(id));

-- Inserts come from the on_auth_user_created trigger (security definer);
-- direct INSERT from clients is not allowed.

-- Team members -------------------------------------------------------------

create policy "members_can_read_own_team_members" on team_members
  for select using (is_team_member(team_id));

create policy "admins_can_manage_team_members" on team_members
  for all using (is_team_admin(team_id))
  with check (is_team_admin(team_id));

-- Tours --------------------------------------------------------------------

create policy "members_read_team_tours" on tours
  for select using (is_team_member(team_id));

create policy "members_insert_team_tours" on tours
  for insert with check (is_team_member(team_id));

create policy "members_update_team_tours" on tours
  for update using (is_team_member(team_id))
  with check (is_team_member(team_id));

create policy "admins_delete_team_tours" on tours
  for delete using (is_team_admin(team_id));

-- Scenes (inherit tour's team) --------------------------------------------

create policy "members_read_team_scenes" on scenes
  for select using (
    exists (select 1 from tours t where t.id = scenes.tour_id and is_team_member(t.team_id))
  );

create policy "members_write_team_scenes" on scenes
  for all using (
    exists (select 1 from tours t where t.id = scenes.tour_id and is_team_member(t.team_id))
  )
  with check (
    exists (select 1 from tours t where t.id = scenes.tour_id and is_team_member(t.team_id))
  );

-- Hotspots (inherit scene → tour → team) -----------------------------------

create policy "members_read_team_hotspots" on hotspots
  for select using (
    exists (
      select 1 from scenes s
      join tours t on t.id = s.tour_id
      where s.id = hotspots.scene_id and is_team_member(t.team_id)
    )
  );

create policy "members_write_team_hotspots" on hotspots
  for all using (
    exists (
      select 1 from scenes s
      join tours t on t.id = s.tour_id
      where s.id = hotspots.scene_id and is_team_member(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from scenes s
      join tours t on t.id = s.tour_id
      where s.id = hotspots.scene_id and is_team_member(t.team_id)
    )
  );

-- Leads (read only by team; writes from public viewer go through RPC) -----

create policy "members_read_team_leads" on leads
  for select using (
    exists (select 1 from tours t where t.id = leads.tour_id and is_team_member(t.team_id))
  );

create policy "admins_delete_team_leads" on leads
  for delete using (
    exists (select 1 from tours t where t.id = leads.tour_id and is_team_admin(t.team_id))
  );

-- Tour views (analytics) ---------------------------------------------------

create policy "members_read_team_views" on tour_views
  for select using (
    exists (select 1 from tours t where t.id = tour_views.tour_id and is_team_member(t.team_id))
  );
