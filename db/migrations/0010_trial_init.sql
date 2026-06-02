-- 0010_trial_init.sql — turn the dormant `trial_ends_at` column into a real
-- 14-day countdown so signup actually starts a clock and the dashboard can
-- nudge people to upgrade.
--
-- Two changes:
--   (a) Update handle_new_user so newly-created teams get trial_ends_at set
--       to now() + 14 days. Plan stays 'trial'.
--   (b) Backfill existing teams on the trial plan whose trial_ends_at is
--       null with the same 14-day window. We grant them a fresh trial
--       rather than retroactively expire — they signed up before the timer
--       existed, expiring them silently would be hostile.

-- (a) Update the trigger function.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_local text := split_part(new.email, '@', 1);
  base_slug   text := regexp_replace(lower(email_local), '[^a-z0-9]+', '-', 'g');
  final_slug  text := base_slug;
  new_team_id uuid;
begin
  if exists (select 1 from teams where slug = final_slug) then
    final_slug := base_slug || '-' || substr(new.id::text, 1, 8);
  end if;

  insert into teams (name, slug, trial_ends_at)
  values (
    coalesce(email_local, 'My team') || '''s tours',
    final_slug,
    now() + interval '14 days'
  )
  returning id into new_team_id;

  insert into team_members (team_id, user_id, role)
  values (new_team_id, new.id, 'owner');

  return new;
end;
$$;

-- (b) Backfill existing trial teams that are missing a clock.

update teams
   set trial_ends_at = now() + interval '14 days'
 where plan = 'trial'
   and trial_ends_at is null;
