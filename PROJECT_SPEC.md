# PROJECT_SPEC.md

The deep spec for the platform. `CLAUDE.md` is the operational source of truth Claude Code reads each session — this file is the *why* behind it. Reference it when making product decisions.

---

## 1. Vision

A virtual tour platform that lets real estate agents create immersive, shareable, lead-generating 360° tours in under 10 minutes — using whatever camera they already own. Not a Matterport competitor on tech; a Matterport replacement on workflow, price, and lead conversion.

**One-line pitch:** "Matterport tours without the Matterport tax — and every tour captures buyer leads automatically."

---

## 2. Why this can work

### Market

- US real estate has ~1.5M licensed agents; ~600K are NAR members and active.
- Virtual tour adoption surged post-2020 and didn't recede. Most active listings now have *some* tour or 3D walkthrough.
- Matterport is the category leader but expensive ($10–300/mo plus $3,500+ camera) and locked into their hardware ecosystem.
- Kuula, CloudPano, EyeSpy360 are cheaper but feel like generic tour tools, not real-estate-specific.
- Zillow 3D Home is free but requires their app, generates basic tours, and the leads go to Zillow, not the agent.

### Wedge

We don't try to beat Matterport on visual quality. We win on:

1. **Camera-agnostic.** Any 360 camera works. Insta360 X3, Ricoh Theta, Labpano, even iPhone with a 360 attachment or stitched panoramic.
2. **Lead capture is first-class.** Email gate before tour, contact-agent hotspots, "schedule showing" CTAs, CRM piping. Agents don't pay for tours; they pay for leads. Make this obvious.
3. **Speed to publish.** Upload → tile → publish in under 10 minutes from first login. Most competitors take 30+ minutes for a first tour.
4. **Price.** $29/mo solo tier undercuts Matterport's $69/mo Starter plan and matches Kuula on price while being more real-estate-specific.

### Defensibility

- **Network effects (weak):** Tours embed agent branding; viewers see "Powered by Tourly" → leak channel for sign-ups. Convert ~0.5% of viewers, but viewer counts are huge.
- **Workflow lock-in (medium):** Agents wire CRM integrations, build branded templates, accumulate tour history. Switching cost grows with usage.
- **Data moat (long-term):** Tour view analytics + lead conversion data → benchmarks agents pay for.

The real defensibility is being **the most loved tool in a small niche**, not technical. Real estate is relationship-driven; agents recommend tools to other agents.

---

## 3. Core user flows

### Flow A — Agent creates first tour (the activation flow)

1. Sign up → confirms email → lands in dashboard
2. CTA: "Create your first tour" → tour title + property address
3. Upload screen: drop 360 JPGs (or pick from camera roll on mobile)
4. While files upload, agent names each room and reorders them
5. Tile pipeline runs in background; viewer placeholder shows progress
6. When ready: editor opens with first scene rendered, prompt to "place doorways" (tutorial overlay walks through hotspot placement for first scene)
7. Agent links scenes via doorway hotspots
8. "Publish" → assigns slug, opens shareable URL, pre-fills email/SMS/social share
9. Agent emails the link to their MLS / pastes into Zillow / shares on Facebook

**Activation metric:** % of new signups who publish a tour within 7 days. Target: 50%+.

### Flow B — Buyer views a tour (the lead flow)

1. Buyer lands on `/t/{tour-slug}` from MLS / agent website / social
2. Hero shot: cover scene + property address + agent card
3. After 3 scenes viewed OR 60 seconds: gentle email gate ("Leave your email for full access + new listings like this")
4. Email submitted → unlocked + agent notified by email + lead written to leads table + CRM webhook fired
5. Throughout tour: floating "Schedule showing" button → captures phone too
6. Tour exit: "Save this property" + "See similar listings" CTAs

**Conversion metric:** % of unique tour viewers who submit at least an email. Target: 8–15%.

### Flow C — Agent reviews leads

1. Lead notification email arrives within seconds
2. Agent dashboard shows new leads with tour context (which property, how long they viewed, which scenes)
3. One-click export to CSV; native push to Follow Up Boss / kvCORE / Sierra; Zapier for the rest

---

## 4. Architecture

### High-level

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Browser       │     │   Vercel (NEXT)  │     │   Supabase       │
│  - Marzipano    │←───→│  - App Router    │←───→│  - Postgres+RLS  │
│  - Editor UI    │     │  - Server Actions│     │  - Auth          │
│  - Direct upload│     │  - Webhooks      │     │  - Realtime      │
└────────┬────────┘     └────────┬─────────┘     └──────────────────┘
         │ signed URL            │ enqueue
         ↓                       ↓
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Cloudflare R2 │     │  Trigger.dev     │     │   Stripe         │
│  - originals/   │←───→│  - tile worker   │     │  - subscriptions │
│  - tiles/       │     │  - sharp + cube  │     │  - webhooks      │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                                                          ↓
                                                 ┌──────────────────┐
                                                 │   Resend         │
                                                 │  - lead emails   │
                                                 │  - transactional │
                                                 └──────────────────┘
```

### The tile pipeline (the most important worker)

1. Client uploads equirectangular JPG → signed URL → R2 `originals/{tour_id}/{scene_id}.jpg`
2. Upload completion webhook (or polling) → enqueue tile job in Trigger.dev
3. Worker:
   a. Downloads original from R2
   b. Validates: must be 2:1 aspect ratio, ≥4096px wide, ≤24000px wide
   c. Uses `sharp` to project equirect → 6 cube faces
   d. For each face, generates 4 resolution levels (1×1, 2×2, 4×4, 8×8 tile grids)
   e. Writes to R2: `tiles/{tour_id}/{scene_id}/{level}/{face}/{x}/{y}.jpg`
   f. Generates 512×256 preview JPG for thumbnails
   g. Updates `scenes.processing_status = 'ready'`, sets `tiles_base_url`
4. Realtime channel notifies the editor that the scene is ready

**Performance targets:**
- Tile generation: <60s for a 12000×6000 source on a standard worker
- Tile delivery: <100ms TTFB from R2 via Cloudflare edge
- Initial scene load: <1.5s on 4G mobile

### Multi-tenancy

- One `team` per signup. Teams scale up to brokerage with multiple users.
- Every tenant-scoped table has `team_id`. RLS policies enforce. Public views go through `SECURITY DEFINER` RPCs that take a slug and return only published-tour data.
- Stripe customer ID is on the team, not the user. Subscription is at the team level.

### File serving

- Tile JPGs are public, cacheable forever (URLs include immutable IDs). `Cache-Control: public, max-age=31536000, immutable`.
- Originals are private, accessed only by signed URL when the agent re-edits.
- Custom domain on R2 bucket so URLs look like `https://cdn.tourly.app/tiles/...` not `https://account-id.r2.cloudflarestorage.com/...`.

---

## 5. Hotspot system (the moat)

This is where competitors are weakest. Spend disproportionate effort here.

### Hotspot types (v1)

| Type | What it does | Payload |
|------|--------------|---------|
| `scene_link` | Click → transition to another scene | `{ target_scene_id, transition: 'fade' \| 'zoom' }` |
| `info` | Click → popup with rich text | `{ title, body_markdown }` |
| `url` | Click → open external URL in new tab | `{ url, label }` |
| `image` | Click → lightbox with photo | `{ image_url, caption }` |
| `video` | Click → embedded video player | `{ video_url, autoplay: bool }` |
| `contact` | Click → open lead capture form | `{ form_id, button_label }` |

### Editor UX

- Click anywhere in the viewer → ghost hotspot appears at click point
- Hotspot panel slides in from right with type picker
- Drag the placed hotspot to refine position; Marzipano updates yaw/pitch live
- "Test" mode to verify clicks/transitions feel right
- Keyboard shortcuts: `H` for new hotspot, arrow keys to nudge, `delete` to remove
- Bulk operations: copy hotspot from one scene, paste into another (useful for "Contact agent" hotspots that go on every scene)

### Visual style

- Hotspots are React components with full CSS control
- Default style: animated pulse circle with icon (Lucide). Customizable per team via branding config.
- Accessibility: keyboard-navigable, ARIA-labeled, focus rings.

---

## 6. Branding & white-label

| Feature | Solo | Team | Brokerage |
|---------|:----:|:----:|:---------:|
| Agent name + photo | ✓ | ✓ | ✓ |
| Agent contact links | ✓ | ✓ | ✓ |
| Brokerage logo | – | ✓ | ✓ |
| Custom colors | – | ✓ | ✓ |
| Remove "Powered by Tourly" | – | – | ✓ |
| Custom domain (CNAME) | – | – | ✓ |

Branding is stored as JSON on `teams.branding_config`. Public viewer reads it via the public RPC and renders.

---

## 7. Pricing & business model

| Tier | Price/mo | Active tours | Users | Storage | Lead capture | CRM | White-label |
|------|---------|--------------|-------|---------|--------------|-----|-------------|
| Solo | $29 | 5 | 1 | 25 GB | ✓ | Zapier | – |
| Team | $79 | 25 | 5 | 100 GB | ✓ | Native | – |
| Brokerage | $199 | Unlimited | 20 | 500 GB | ✓ | Native + API | ✓ |

- 14-day free trial, no card required. Card required to publish first tour.
- Annual billing: 2 months free (industry standard).
- Free tier: 1 tour, Tourly branding required, lead capture disabled. Used as a viral/onboarding hook, not a permanent tier.

### Unit economics (rough)

Per-tour costs at scale:
- Storage: ~50 MB tiles × $0.015/GB/mo = $0.0008/mo per tour
- Bandwidth: free on R2 (the whole reason we picked it)
- Tile gen: one-time ~$0.01/tour in worker compute
- DB/auth/email: negligible per tour

A Solo plan ($29/mo) covering 5 tours costs us <$0.50/mo to serve. Margins are great if we can solve acquisition.

### Acquisition (the real problem)

- Content/SEO: long-tail real estate marketing keywords. Slow but compounding.
- Direct outreach: cold email + DM to agents in target metros. Hard but high-intent.
- Partnerships: photographers who shoot real estate, MLS integrations, RE coaching programs.
- Referrals: paid referral ($50 cash for any agent who refers a paying customer).
- Free tier as viral channel: every public tour links back to Tourly.

CAC target: $80. LTV target (3-year): $700+. LTV:CAC > 8 needed to grow on paid.

---

## 8. What we're explicitly NOT building (v1)

- Native mobile apps (PWA-first; native later)
- AR/VR headset support beyond what Marzipano gives free
- AI-generated tours from photos (cool but adds 6 months and dilutes the wedge)
- Floor plan generation (manually upload an image for v1; generation later)
- 3D walkthrough / Matterport-style mesh (different tech stack, different price tier)
- Multi-language tours (English-only for v1; agents can write any language but UI is EN)
- A mobile capture app (use existing 360 camera apps; we just import)

---

## 9. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Marzipano abandoned, breaks on a future browser | Low-med | High | Pinned version, monitor breakage, fork if needed (license allows) |
| Real estate agents don't pay for tools | Med | Killer | Pre-sell to 10 agents before building; if they won't commit, pivot |
| Storage/bandwidth costs spiral | Low | High | R2 + CDN-only delivery + per-plan storage caps + tile compression tuning |
| Matterport drops prices to compete | Low | Med | Doubt they will; if so, lean harder into lead-capture wedge |
| Compliance: leads + email = CAN-SPAM/GDPR | Med | Med | Double opt-in, unsubscribe in every email, GDPR data export by month 6 |
| Solo founder burnout | High | Killer | 6-month runway, weekly written reviews, pace milestones |

---

## 10. Open questions to resolve before/during build

1. **Initial CRM integrations:** Follow Up Boss + kvCORE + Sierra is the right starting set. Confirm with first 10 customer interviews.
2. **Tile resolution levels:** 4 levels (1, 2, 4, 8) is the default. Should "Brokerage" tier get 16 for ultra-high-res? Decide after first usability tests on mobile.
3. **Free tier or no free tier:** strong arguments both ways. Lean toward yes for virality, but watch for abuse.
4. **MLS integration:** is there a viable path to direct MLS embedding? Unlikely in v1, but research the top 5 MLSes' embedding policies.
5. **Photographer partnerships:** real estate photographers already shoot 360. Could be a distribution channel. Worth a partnership program in v2.

---

## 11. Decision log

Append-only. Date, decision, reasoning. Update as you make architectural calls.

| Date | Decision | Reasoning |
|------|----------|-----------|
| Day 0 | Marzipano over Pannellum | DOM hotspots = React component freedom; better mobile/VR; battle-tested |
| Day 0 | Cloudflare R2 over S3 | Free egress is non-negotiable for a sharing-heavy product |
| Day 0 | Supabase over Auth.js + raw Postgres | RLS is the cleanest multi-tenant pattern; one bill |
| Day 0 | Sharp tile pipeline over marzipano-tool CLI | Stale dep, less control; ~150 LOC to reimplement |
| Day 0 | Real estate agents only for v1 | Wider focus = no wedge; can expand to Airbnb/hotels later |
