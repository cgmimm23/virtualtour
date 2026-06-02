-- 0012_view_tracking.sql — analytics groundwork. The tour_views table has
-- existed since 0001 but nothing wrote to it. This migration adds a
-- SECURITY DEFINER RPC the public viewer can call without an auth session,
-- which atomically inserts a tour_views row + increments tours.view_count.
--
-- Dedup is by viewer_session_id: the client generates a UUID, persists it
-- in localStorage, and reuses it across navigations. We count each session
-- as one view per tour per UTC day. Re-visits in later days count again
-- (the usual definition for "unique daily viewers"), which keeps the metric
-- honest while still rewarding shares.

create or replace function track_tour_view(
  p_tour_slug      text,
  p_session_id     text,
  p_referrer       text default null,
  p_country        text default null,
  p_device         text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tour_id uuid;
  v_already boolean;
begin
  if p_session_id is null or length(p_session_id) < 8 then
    return false;
  end if;

  select id into v_tour_id
    from tours
   where slug = p_tour_slug
     and status = 'published';
  if v_tour_id is null then
    return false;
  end if;

  -- Dedup per session per UTC day. A casual reload doesn't double-count,
  -- but the same person returning tomorrow does.
  select exists(
    select 1 from tour_views
     where tour_id = v_tour_id
       and viewer_session_id = p_session_id
       and created_at >= date_trunc('day', now() at time zone 'utc')
  ) into v_already;

  if v_already then
    return false;
  end if;

  insert into tour_views (tour_id, viewer_session_id, referrer, country, device)
  values (v_tour_id, p_session_id, p_referrer, p_country, p_device);

  update tours
     set view_count = coalesce(view_count, 0) + 1
   where id = v_tour_id;

  return true;
end;
$$;

revoke all on function track_tour_view(text, text, text, text, text) from public;
grant execute on function track_tour_view(text, text, text, text, text) to anon, authenticated;
