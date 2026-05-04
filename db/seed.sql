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
