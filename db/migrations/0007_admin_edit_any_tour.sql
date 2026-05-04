-- 0007_admin_edit_any_tour.sql
--
-- Two changes:
--   (a) Platform admins (jonathan@cgmimm.com etc.) can read/write/delete
--       every tour, scene, hotspot, lead, tour_view across all teams. The
--       existing team-scoped policies stay; this adds an admin-override.
--   (b) Seeds the marketing demo tour (kremmen-place) into the DB so the
--       admin can edit it via the regular /editor/[id] flow. Previously
--       served only via the hardcoded fallback in lib/tour/public.ts —
--       not editable.

-- (a) Platform-admin RLS overrides ─────────────────────────────────────────

-- Tours
drop policy if exists "members_read_team_tours" on tours;
create policy "tours_read"
  on tours for select
  using (
    is_platform_admin()
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );

drop policy if exists "members_insert_team_tours" on tours;
create policy "tours_insert"
  on tours for insert
  with check (
    is_platform_admin()
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );

drop policy if exists "members_update_team_tours" on tours;
create policy "tours_update"
  on tours for update
  using (
    is_platform_admin()
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );

drop policy if exists "admins_delete_team_tours" on tours;
create policy "tours_delete"
  on tours for delete
  using (
    is_platform_admin()
    or team_id in (
      select team_id from team_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Scenes
drop policy if exists "members_read_team_scenes" on scenes;
create policy "scenes_read"
  on scenes for select
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

drop policy if exists "members_write_team_scenes" on scenes;
create policy "scenes_write"
  on scenes for all
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  )
  with check (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

-- Hotspots
drop policy if exists "members_read_team_hotspots" on hotspots;
create policy "hotspots_read"
  on hotspots for select
  using (
    is_platform_admin()
    or scene_id in (
      select s.id from scenes s
      join tours t on t.id = s.tour_id
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

drop policy if exists "members_write_team_hotspots" on hotspots;
create policy "hotspots_write"
  on hotspots for all
  using (
    is_platform_admin()
    or scene_id in (
      select s.id from scenes s
      join tours t on t.id = s.tour_id
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  )
  with check (
    is_platform_admin()
    or scene_id in (
      select s.id from scenes s
      join tours t on t.id = s.tour_id
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

-- Leads
drop policy if exists "members_read_team_leads" on leads;
create policy "leads_read"
  on leads for select
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

drop policy if exists "admins_delete_team_leads" on leads;
create policy "leads_delete"
  on leads for delete
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (
        select team_id from team_members
        where user_id = auth.uid() and role in ('owner', 'admin')
      )
    )
  );

-- Tour views
drop policy if exists "members_read_team_views" on tour_views;
create policy "tour_views_read"
  on tour_views for select
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );

-- (b) Seed kremmen-place into the DB ───────────────────────────────────────

do $$
declare
  v_admin_user uuid;
  v_team_id    uuid;
  v_tour_id    uuid;
  v_first_scene_id uuid;
  i int;
begin
  select user_id into v_admin_user from platform_admins limit 1;
  if v_admin_user is null then
    raise notice 'No platform admin found — kremmen-place seed skipped. Sign up first, then re-run.';
    return;
  end if;

  select team_id into v_team_id
  from team_members
  where user_id = v_admin_user
  order by created_at
  limit 1;
  if v_team_id is null then
    raise notice 'Platform admin has no team — seed skipped.';
    return;
  end if;

  if exists(select 1 from tours where slug = 'kremmen-place') then
    raise notice 'kremmen-place already seeded.';
    return;
  end if;

  insert into tours (
    team_id, slug, title, property_address, status,
    branding, lead_gate
  ) values (
    v_team_id,
    'kremmen-place',
    'Kremmen Place',
    'Kremmen Place',
    'published',
    jsonb_build_object(
      'agentName', 'Jonathan',
      'agentEmail', 'jonathan@cgmimm.com',
      'primaryColor', '#205081'
    ),
    jsonb_build_object(
      'enabled', true,
      'triggerScenes', 3,
      'triggerMs', 60000,
      'headline', 'Like what you see?',
      'subhead', 'Leave your email for full access and updates on similar listings.',
      'ctaLabel', 'Continue tour',
      'collectName', true,
      'collectPhone', false
    )
  )
  returning id into v_tour_id;

  for i in 1..29 loop
    insert into scenes (
      tour_id, name, source_image_url, tiles_base_url,
      initial_yaw, initial_pitch, initial_fov, order_index, processing_status
    ) values (
      v_tour_id,
      'Scene ' || lpad(i::text, 2, '0'),
      '/tours/kremmen-place/scene-' || lpad(i::text, 2, '0') || '.jpg',
      '/tours/kremmen-place/scene-' || lpad(i::text, 2, '0') || '.jpg',
      0, 0, 1.745,
      i,
      'ready'
    );
  end loop;

  select id into v_first_scene_id
  from scenes where tour_id = v_tour_id order by order_index limit 1;
  update tours set cover_scene_id = v_first_scene_id where id = v_tour_id;
end $$;
