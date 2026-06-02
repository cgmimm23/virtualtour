-- 0013_chatbot_context.sql — give the buyer chatbot more to work with.
-- Three new columns on tours:
--   mls_description    text             — long-form listing copy
--   q_and_a            jsonb default[]  — agent-curated Q/A pairs
--   external_sources   jsonb default[]  — array of {url, fetched_at, content}
-- Plus a small index on tours.id for the chatbot route to look up by id
-- when the slug lookup isn't needed.

alter table tours
  add column if not exists mls_description  text,
  add column if not exists q_and_a          jsonb not null default '[]'::jsonb,
  add column if not exists external_sources jsonb not null default '[]'::jsonb;

-- Index on tours.id already exists (PK). No new index needed.

comment on column tours.mls_description is
  'Long-form listing description (agent-authored, MLS-style). Fed to the buyer chatbot.';
comment on column tours.q_and_a is
  'Array of {q: text, a: text} pairs. Agent-curated FAQ for the chatbot.';
comment on column tours.external_sources is
  'Array of {url: text, fetched_at: timestamptz, content: text}. Server-fetched listing pages cached per tour.';
