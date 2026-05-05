-- 0009_ai_features.sql — columns + chat_messages table for the AI features.

-- Tours: Claude-generated property description (MLS-ready). Cached so we
-- don't regenerate on every dashboard render.
alter table tours
  add column if not exists ai_description           text,
  add column if not exists ai_description_generated_at timestamptz;

-- Hotspots: tracks whether AI placed it (vs. human). Lets us show "AI"
-- badges in the editor and lets admins filter for AI-generated to review.
alter table hotspots
  add column if not exists ai_generated boolean not null default false;

-- Leads: AI-derived qualification score + reason. Score 0–100. Reason is a
-- 1-sentence rationale Claude returns alongside the score.
alter table leads
  add column if not exists ai_score    integer check (ai_score is null or (ai_score >= 0 and ai_score <= 100)),
  add column if not exists ai_reason   text,
  add column if not exists ai_scored_at timestamptz;

-- Buyer-chat conversations on the public tour. One row per chat session
-- (anonymous or email-captured). messages is a jsonb array of {role, content, ts}
-- so we don't have to read multiple rows per turn.
create table if not exists tour_chats (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references tours(id) on delete cascade,
  -- session_id: client-side cookie so reconnects in the same browser
  -- continue the thread. Not auth — public tours have no user.
  session_id      text not null,
  -- Captured email (if buyer left one in chat). Null until they do.
  email           text,
  name            text,
  -- Full conversation as a jsonb array.
  messages        jsonb not null default '[]'::jsonb,
  -- Tracking
  message_count   integer not null default 0,
  user_agent      text,
  referrer        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tour_id, session_id)
);

create index if not exists tour_chats_tour_idx on tour_chats(tour_id, updated_at desc);
create index if not exists tour_chats_email_idx on tour_chats(email) where email is not null;

create trigger tour_chats_set_updated_at
  before update on tour_chats
  for each row execute function set_updated_at();

alter table tour_chats enable row level security;

-- Team members + platform admins can read their own team's chats. No
-- public read — service-role-only for the chat API endpoint to upsert.
create policy "tour_chats_read"
  on tour_chats for select
  using (
    is_platform_admin()
    or tour_id in (
      select t.id from tours t
      where t.team_id in (select team_id from team_members where user_id = auth.uid())
    )
  );
