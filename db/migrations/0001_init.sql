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
