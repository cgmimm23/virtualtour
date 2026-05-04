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
