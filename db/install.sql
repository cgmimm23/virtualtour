-- 0001_init.sql — Tourly multi-tenant schema.
--
-- Apply by pasting into the Supabase SQL editor (Project → SQL Editor → New
-- query) or via the supabase CLI (`supabase db push`). All migrations are
-- additive; never edit a migration that's been applied — write a new one.

create extension if not exists "pgcrypto";

-- Enums --------------------------------------------------------------------

create type plan as enum ('trial', 'solo', 'team', 'brokerage');
create type team_role as enum ('owner', 'admin', 'agent');
create type tour_status as enum ('draft', 'published');
create type scene_processing_status as enum ('pending', 'processing', 'ready', 'failed');
create type hotspot_type as enum ('scene_link', 'info', 'url', 'image', 'video', 'contact');
create type lead_source as enum ('gate', 'contact_button', 'in_scene_contact', 'schedule');

-- Helper: updated_at trigger -----------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tenancy ------------------------------------------------------------------

create table teams (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  slug                     text not null unique,
  plan                     plan not null default 'trial',
  stripe_customer_id       text,
  stripe_subscription_id   text,
  branding_config          jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger teams_updated_at before update on teams
  for each row execute function set_updated_at();

create table team_members (
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       team_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on team_members(user_id);

-- Tours --------------------------------------------------------------------

create table tours (
  id                 uuid primary key default gen_random_uuid(),
  team_id            uuid not null references teams(id) on delete cascade,
  slug               text not null unique,
  title              text not null,
  property_address   text,
  status             tour_status not null default 'draft',
  cover_scene_id     uuid,                 -- FK added below (circular dep)
  view_count         integer not null default 0,
  branding           jsonb,
  lead_gate          jsonb,
  floor_plan         jsonb,
  highlights         text[],
  details            jsonb,
  expires_at         timestamptz,
  webhook_url        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index tours_team_idx on tours(team_id);
create index tours_status_idx on tours(status);

create trigger tours_updated_at before update on tours
  for each row execute function set_updated_at();

create table scenes (
  id                  uuid primary key default gen_random_uuid(),
  tour_id             uuid not null references tours(id) on delete cascade,
  name                text not null,
  source_image_url    text not null,
  tiles_base_url      text,
  initial_yaw         double precision not null default 0,
  initial_pitch       double precision not null default 0,
  initial_fov         double precision not null default 1.745, -- ~100°
  initial_roll        double precision not null default 0,
  floor               text,
  floor_plan_position jsonb,
  order_index         integer not null default 0,
  processing_status   scene_processing_status not null default 'ready',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index scenes_tour_idx on scenes(tour_id, order_index);

create trigger scenes_updated_at before update on scenes
  for each row execute function set_updated_at();

-- The tours.cover_scene_id FK is added after both tables exist. Set NULL on
-- delete so removing the cover scene doesn't cascade-delete the tour.
alter table tours
  add constraint tours_cover_scene_fk
  foreign key (cover_scene_id) references scenes(id) on delete set null
  deferrable initially deferred;

create table hotspots (
  id         uuid primary key default gen_random_uuid(),
  scene_id   uuid not null references scenes(id) on delete cascade,
  type       hotspot_type not null,
  yaw        double precision not null,
  pitch      double precision not null,
  label      text not null default '',
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hotspots_scene_idx on hotspots(scene_id);

create trigger hotspots_updated_at before update on hotspots
  for each row execute function set_updated_at();

-- Leads + analytics --------------------------------------------------------

create table leads (
  id                 uuid primary key default gen_random_uuid(),
  tour_id            uuid not null references tours(id) on delete cascade,
  email              text not null,
  name               text,
  phone              text,
  message            text,
  preferred_time     timestamptz,
  source             lead_source not null default 'gate',
  scenes_viewed      integer not null default 0,
  duration_ms        integer not null default 0,
  captured_at        timestamptz not null default now(),
  agent_notified_at  timestamptz
);

create index leads_tour_idx on leads(tour_id, captured_at desc);

create table tour_views (
  id                 uuid primary key default gen_random_uuid(),
  tour_id            uuid not null references tours(id) on delete cascade,
  scene_id           uuid references scenes(id) on delete set null,
  viewer_session_id  text not null,
  duration_ms        integer not null default 0,
  referrer           text,
  country            text,
  device             text,
  created_at         timestamptz not null default now()
);

create index tour_views_tour_idx on tour_views(tour_id, created_at desc);

-- Auto-create a personal team on signup -----------------------------------
--
-- Without this, a freshly signed-up user has no team and the dashboard would
-- 404. The trigger creates a one-person "<email>'s tours" team and a matching
-- team_members row with role=owner. Slug is derived from email; collisions
-- are resolved by appending the user id suffix.

create or replace function handle_new_user() returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  email_local text := split_part(new.email, '@', 1);
  base_slug   text := regexp_replace(lower(email_local), '[^a-z0-9]+', '-', 'g');
  final_slug  text := base_slug;
  new_team_id uuid;
begin
  -- Disambiguate slug collisions with the user id tail.
  if exists (select 1 from teams where slug = final_slug) then
    final_slug := base_slug || '-' || substr(new.id::text, 1, 8);
  end if;

  insert into teams (name, slug)
  values (coalesce(email_local, 'My team') || '''s tours', final_slug)
  returning id into new_team_id;

  insert into team_members (team_id, user_id, role)
  values (new_team_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
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
-- 0003_public_rpcs.sql — SECURITY DEFINER RPCs for unauthed public access.
--
-- These are the ONLY surface that lets unauthenticated viewers read tours and
-- write leads. RLS still protects the underlying tables; these RPCs run with
-- elevated privileges but are scoped by what they SELECT/INSERT.

-- public_tour_by_slug ------------------------------------------------------
--
-- Returns the full tour payload as a single jsonb document so the public
-- /t/[slug] route can render in one round trip. Returns NULL if the tour
-- doesn't exist or isn't published.

create or replace function public_tour_by_slug(p_slug text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'title', t.title,
    'propertyAddress', t.property_address,
    'coverSceneId', t.cover_scene_id,
    'branding', t.branding,
    'leadGate', t.lead_gate,
    'floorPlan', t.floor_plan,
    'highlights', t.highlights,
    'details', t.details,
    'expiresAt', t.expires_at,
    'webhookUrl', t.webhook_url,
    'scenes', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'imageUrl', coalesce(s.tiles_base_url, s.source_image_url),
            'initialYaw', s.initial_yaw,
            'initialPitch', s.initial_pitch,
            'initialFov', s.initial_fov,
            'initialRoll', s.initial_roll,
            'floor', s.floor,
            'floorPlanPosition', s.floor_plan_position,
            'hotspots', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', h.id,
                    'yaw', h.yaw,
                    'pitch', h.pitch,
                    'label', h.label,
                    'payload', jsonb_build_object('type', h.type, 'data', h.payload)
                  ) order by h.created_at
                )
                from hotspots h where h.scene_id = s.id
              ),
              '[]'::jsonb
            )
          ) order by s.order_index, s.created_at
        )
        from scenes s where s.tour_id = t.id
      ),
      '[]'::jsonb
    )
  )
  from tours t
  where t.slug = p_slug
    and t.status = 'published';
$$;

grant execute on function public_tour_by_slug(text) to anon, authenticated;

-- submit_public_lead ------------------------------------------------------
--
-- Inserts a lead from the public viewer. Returns the new lead id (so the
-- caller can correlate with a webhook). Resolves tour by slug + status check
-- to make sure leads can only be submitted to live tours.

create or replace function submit_public_lead(
  p_tour_slug      text,
  p_email          text,
  p_name           text,
  p_phone          text,
  p_preferred_time timestamptz,
  p_source         lead_source,
  p_scenes_viewed  integer,
  p_duration_ms    integer
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_tour_id uuid;
  v_lead_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'invalid email';
  end if;

  select id into v_tour_id
  from tours
  where slug = p_tour_slug and status = 'published';

  if v_tour_id is null then
    raise exception 'tour not found or not published';
  end if;

  insert into leads (
    tour_id, email, name, phone, preferred_time, source,
    scenes_viewed, duration_ms
  ) values (
    v_tour_id, p_email, p_name, p_phone, p_preferred_time, p_source,
    coalesce(p_scenes_viewed, 0), coalesce(p_duration_ms, 0)
  )
  returning id into v_lead_id;

  return v_lead_id;
end;
$$;

grant execute on function submit_public_lead(text, text, text, text, timestamptz, lead_source, integer, integer)
  to anon, authenticated;
-- db/seed.sql — bootstrap the demo team + kremmen-place sample tour.
--
-- Run after 0001_init.sql + 0002_rls.sql + 0003_public_rpcs.sql. Idempotent
-- (uses ON CONFLICT) so re-running is safe. The demo team has no human
-- members — its tour is reachable only via the public viewer (RPC) at
-- /t/kremmen-place. Once a real signup happens, that user gets their own
-- team and the demo team stays as a stable showcase.

insert into teams (id, name, slug, plan)
values (
  '00000000-0000-0000-0000-0000000d0d0d',
  'Tourly Demo',
  'tourly-demo',
  'team'
)
on conflict (id) do nothing;

-- Kremmen Place tour. Same shape as the legacy lib/tour/kremmen-place.ts.
insert into tours (
  id, team_id, slug, title, property_address, status,
  branding, lead_gate, details, cover_scene_id
) values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-0000000d0d0d',
  'kremmen-place',
  'Kremmen Place',
  'Kremmen Place',
  'published',
  jsonb_build_object(
    'agentName', 'Jonathan',
    'agentEmail', 'jonathan@cgmimm.com'
  ),
  jsonb_build_object(
    'enabled', true,
    'triggerScenes', 3,
    'triggerMs', 60000,
    'headline', 'Like what you see?',
    'subhead', 'Leave your email for full access and updates on similar listings.',
    'ctaLabel', 'Continue tour',
    'collectName', true,
    'collectPhone', false,
    'consentText',
      'By submitting, you agree to be contacted about this listing. We don''t share your email with third parties.'
  ),
  jsonb_build_object('status', 'for_sale', 'propertyType', 'Single family residence'),
  null  -- cover scene set after scenes are inserted
)
on conflict (id) do nothing;

-- 29 scenes — same /tours/kremmen-place/scene-NN.jpg paths as the prototype.
-- Idempotency guard: only seed if the tour currently has zero scenes.
-- Editing the tour later (renaming scenes, adding hotspots) won't be undone
-- by re-running this script.
do $$
declare
  i integer;
  padded text;
  v_first_id uuid := null;
  v_scene_id uuid;
  v_existing integer;
begin
  select count(*) into v_existing from scenes
   where tour_id = '11111111-1111-1111-1111-111111111111';
  if v_existing > 0 then
    return;
  end if;

  for i in 1..29 loop
    padded := lpad(i::text, 2, '0');

    insert into scenes (
      tour_id, name, source_image_url,
      initial_yaw, initial_pitch, initial_fov, initial_roll,
      order_index, processing_status
    ) values (
      '11111111-1111-1111-1111-111111111111',
      'Scene ' || padded,
      '/tours/kremmen-place/scene-' || padded || '.jpg',
      0, 0, 1.745, 0,
      i - 1,
      'ready'
    )
    returning id into v_scene_id;

    if v_first_id is null then
      v_first_id := v_scene_id;
    end if;
  end loop;

  update tours
     set cover_scene_id = v_first_id
   where id = '11111111-1111-1111-1111-111111111111';
end $$;
