# CLAUDE.md

This file is read automatically by Claude Code at the start of every session. It is the source of truth for project context, conventions, and current state. Keep it updated as the project evolves.

For the deeper product/business spec, see `PROJECT_SPEC.md`.

---

## Project: Tourly (working name)

A SaaS platform that lets real estate agents create, host, and share interactive 360° virtual tours of properties, with built-in lead capture, branding, and analytics.

**Target customer:** Solo real estate agents and small teams (1–20 agents).

**Wedge:** Faster, cheaper, more lead-capture-focused than Matterport. Agents upload 360 photos from any camera (Insta360, Theta, iPhone), get a branded tour with hotspots and a lead-gen gate, and pipe leads into their CRM.

**Pricing tiers (planned):**
- Solo: $29/mo — 5 active tours, basic branding, 1 user
- Team: $79/mo — 25 active tours, full branding, 5 users, CRM integrations
- Brokerage: $199/mo — unlimited tours, white-label, 20 users, API access

---

## Tech stack

- **Framework:** Next.js 15 (App Router, Server Actions, RSC where it helps)
- **Language:** TypeScript strict mode, no `any` unless commented why
- **Database/Auth:** Supabase (Postgres + RLS + Auth + Realtime if needed)
- **Storage:** Cloudflare R2 (S3-compatible, zero egress fees) — critical for unit economics
- **Image processing:** `sharp` in a queued worker (Trigger.dev or Inngest) for tile generation
- **Tour viewer:** Marzipano (loaded client-side only; SSR will break)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Forms:** react-hook-form + zod
- **Payments:** Stripe Checkout + Customer Portal (do not build billing UI)
- **Email:** Resend + react-email templates
- **Rate limiting / view counting:** Upstash Redis
- **Hosting:** Vercel (app), Cloudflare R2 (assets), Supabase (DB)
- **Monitoring:** Sentry (errors), PostHog (product analytics)

### Why these choices (don't change without discussion)

- **R2 over S3:** A tour gets shared in MLS listings, agent sites, social — viewed thousands of times. S3 egress would destroy margins. R2 has free egress.
- **Supabase over Auth.js + raw Postgres:** RLS is the cleanest multi-tenant pattern for this product, and we get auth/storage/DB in one bill.
- **Marzipano over Pannellum / Three.js:** DOM-based hotspots = real React components for hotspot UI. Better mobile. Battle-tested. Unmaintained but stable.
- **Sharp over marzipano-tool CLI:** Original tool is stale Node. We control compression, naming, parallelization with sharp directly (~150 lines).

---

## Repository structure

```
/app                  # Next.js App Router
  /(marketing)        # Public pages: landing, pricing, /t/[slug] (public tour viewer)
  /(app)              # Authed app: dashboard, tour editor, settings
  /api                # API routes (webhooks, signed uploads, etc.)
/components
  /ui                 # shadcn primitives
  /tour-viewer        # Marzipano wrapper + hotspot renderer
  /tour-editor        # Hotspot editor, scene manager
  /branding           # Brand config UI
/lib
  /supabase           # Server + browser clients, typed
  /r2                 # Signed URL generation, upload helpers
  /stripe             # Checkout session creation, webhook handlers
  /tiles              # sharp-based tile generation worker
  /marzipano          # Viewer config builders
/db
  /migrations         # Supabase SQL migrations (numbered)
  /seed.sql           # Local dev seed data
/workers              # Background jobs (Trigger.dev or Inngest)
/types                # Shared TS types, generated Supabase types
/tests                # Playwright e2e + Vitest unit
```

---

## Database schema (current)

All tables have `created_at`, `updated_at` timestamps. All tenant-scoped tables enforce RLS by `team_id`.

```sql
-- Tenancy
teams (id, name, slug, plan, stripe_customer_id, stripe_subscription_id,
       branding_config jsonb, created_at, updated_at)

team_members (team_id, user_id, role: 'owner'|'admin'|'agent', created_at)
-- user_id references auth.users from Supabase

-- Tours
tours (id, team_id, slug, title, property_address, status: 'draft'|'published',
       cover_scene_id, view_count int default 0, created_at, updated_at)

scenes (id, tour_id, name, source_image_url, tiles_base_url,
        initial_yaw float, initial_pitch float, initial_fov float,
        order_index int, processing_status: 'pending'|'processing'|'ready'|'failed',
        created_at, updated_at)

hotspots (id, scene_id, type: 'scene_link'|'info'|'url'|'image'|'video',
          yaw float, pitch float, label text, payload jsonb, created_at, updated_at)

-- Leads
leads (id, tour_id, email, name, phone, message,
       source: 'gate'|'contact_button'|'schedule_tour',
       captured_at, agent_notified_at)

-- Analytics
tour_views (id, tour_id, scene_id, viewer_session_id, duration_ms,
            referrer, country, device, created_at)
```

### RLS pattern

```sql
-- Standard pattern for tenant-scoped tables:
create policy "team_members_can_read"
  on tours for select
  using (team_id in (
    select team_id from team_members where user_id = auth.uid()
  ));

create policy "team_admins_can_write"
  on tours for all
  using (team_id in (
    select team_id from team_members
    where user_id = auth.uid() and role in ('owner', 'admin')
  ));
```

Public tour viewing bypasses RLS via a Supabase RPC that takes a tour slug and returns only published-tour data.

---

## Code conventions

### General

- TypeScript strict, no `any`. Use `unknown` and narrow.
- Server Components by default. Add `"use client"` only when needed (interactivity, hooks, browser APIs).
- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utils.
- Component naming: `PascalCase`.
- Co-locate component-specific helpers in the same file or a `_lib/` sibling folder.

### Database

- Never query Supabase directly from client components. Use Server Actions or Route Handlers.
- All mutations go through Server Actions that validate input with zod first.
- Generated types live in `types/supabase.ts` (regenerate with `pnpm db:types`).

### Marzipano specifics

- **Always lazy-load:** `const Marzipano = await import('marzipano')` — touches `window` on import, breaks SSR.
- **Always destroy on unmount:** call `viewer.destroy()` in useEffect cleanup or you leak WebGL contexts.
- **Hotspot coords are radians, not degrees.** Yaw range: -π to π. Pitch range: -π/2 to π/2.
- **Click to coords:** use `viewer.view().screenToCoordinates({x, y})` — accounts for current pan/zoom.

### Image pipeline

- Uploads go to a `pending/` prefix in R2 via signed URL (client-direct, never through Next.js API).
- Worker picks up the file, generates cube tiles at 4 resolution levels (1, 2, 4, 8), writes to `tiles/{tour_id}/{scene_id}/`, then updates `scenes.processing_status = 'ready'`.
- Original equirect is kept for re-tiling if format changes; archived to cheaper storage after 30 days.

### Stripe

- Source of truth is Stripe (subscription state). DB caches `stripe_subscription_id` and current `plan` for fast access; webhook keeps it in sync.
- Never trust client-side plan info for gating. Check on server.

---

## Current state

**Status:** Greenfield. Nothing built yet.

**Next milestones:**

1. **M0 — Local dev environment** (1–2 days)
   Repo init, Next.js + TS + Tailwind + shadcn, Supabase local, R2 bucket, env vars, basic CI.

2. **M1 — Tour viewer prototype** (3–5 days)
   Single hardcoded scene rendering with Marzipano, one hardcoded hotspot, scene switching between two scenes. No DB yet. Just prove the viewer feels good.

3. **M2 — Auth + teams + DB** (1 week)
   Supabase auth flow, signup creates a team, team_members table, RLS policies, basic dashboard shell.

4. **M3 — Tour upload + tile pipeline** (1–2 weeks)
   Upload UI → R2 signed URL → worker tiles with sharp → DB updates → viewer loads from tiled URLs.

5. **M4 — Hotspot editor** (2 weeks — this is the moat, spend time here)
   Drag-to-place, click-to-link-rooms, side panel for hotspot config, live preview.

6. **M5 — Public tour viewer + branding** (1 week)
   `/t/[slug]` route, branded chrome (logo, agent card), responsive, mobile gestures dialed in.

7. **M6 — Lead capture** (3–5 days)
   Gate form before tour, contact button hotspot, leads table, agent email notification via Resend.

8. **M7 — Stripe billing** (3–5 days)
   Checkout flow, customer portal, webhook handler, plan gating, free trial logic.

9. **M8 — Analytics + polish** (1 week)
   View counting, basic analytics dashboard, onboarding flow, share/embed UX.

**Then:** ship to 10 friendly agents for free, fix the 50 things that are broken, then start charging.

---

## Working agreements

- When you (Claude Code) start a task, restate the goal and your plan before editing files.
- Prefer small commits. One feature/fix per commit. Conventional Commits style (`feat:`, `fix:`, `chore:`).
- Run `pnpm lint && pnpm typecheck` before saying a task is done.
- For DB changes: write a migration in `db/migrations/`, never edit existing migrations.
- For new dependencies: justify in the commit message. We're trying to keep the dep tree small.
- When stuck on architecture, ask before assuming. The PROJECT_SPEC.md and this file are the authority — if they conflict with what you're being asked, surface it.

---

## Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=        # custom domain pointing at the bucket

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_SOLO=
STRIPE_PRICE_ID_TEAM=
STRIPE_PRICE_ID_BROKERAGE=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Don'ts (lessons banked already)

- Don't put image upload through Next.js API routes — they'll time out on big files. Always signed-URL direct to R2.
- Don't render Marzipano server-side. Dynamic import with `ssr: false`.
- Don't trust the Stripe client SDK for entitlements. Server-check the subscription.
- Don't build a billing UI. Use Stripe Customer Portal.
- Don't skip the worker queue and tile inline. It locks up requests and you'll regret it under load.
- Don't use Supabase Storage instead of R2 for tour assets. The egress costs will surprise you.
