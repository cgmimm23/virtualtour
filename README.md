# Tourly — M1 prototype

Interactive 360° virtual tours for real estate agents.

This is the **M1** milestone from `CLAUDE.md`: a working Marzipano viewer + an in-browser hotspot editor against the Kremmen Place demo tour (29 equirectangular scenes). No auth, no DB, no upload pipeline yet — those come in M2 and M3.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then click **Open tour →**.

> First load is slow because the dev server is shipping ~220 MB of equirect JPGs from `public/tours/kremmen-place/` straight from disk. In M3 these get tiled by sharp into ~2 MB cube-face tiles in R2 and the viewer streams them on demand.

## What's in here

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Landing page with link to demo tour |
| `app/t/[slug]/page.tsx` | Public tour route (Server Component, hardcoded tour catalog) |
| `components/tour-viewer/tour-viewer.tsx` | Marzipano wrapper — lazy-loaded, proper WebGL cleanup |
| `components/tour-viewer/hotspot-marker.tsx` | The visual hotspot React component |
| `components/tour-editor/tour-experience.tsx` | Top-level client component that owns viewer + editor state |
| `components/tour-editor/scene-picker.tsx` | Sidebar list of scenes |
| `components/tour-editor/hotspot-panel.tsx` | Right-side panel for editing the selected hotspot |
| `components/tour-editor/info-modal.tsx` | Modal opened by `info`-type hotspots in view mode |
| `lib/tour/types.ts` | Tour / Scene / Hotspot TS types |
| `lib/tour/kremmen-place.ts` | Hardcoded tour config for the demo |
| `lib/tour/storage.ts` | localStorage persistence for hotspot edits |
| `types/marzipano.d.ts` | TS shim — Marzipano has no official types |

## Using the editor

1. Click **View mode** in the header → it flips to **Editing**.
2. Click anywhere in the panorama → a hotspot drops at that point and the side panel opens.
3. In the panel, choose a type:
   - **Doorway** — links to another scene. Pick the target room from the dropdown.
   - **Info** — opens a popup with title + body text.
   - **URL** — opens an external link in a new tab.
4. Add a label (shows on hover).
5. Click another scene in the sidebar to keep working.

In edit mode, the viewer also remembers your **resting orientation** for each scene as the "opening shot" — so frame the room how you want viewers to see it first, then leave it.

### Saving

Everything you edit is saved to `localStorage` under the key `tourly:tour:kremmen-place`. Buttons in the header:

- **Export** — downloads the current tour config as JSON.
- **Import** — load a previously exported JSON (overwrites).
- **Reset** — wipes the overrides and restores the bare 29-scene config.

## Renaming scenes

In edit mode, the scene names in the sidebar become editable inputs. Type a real room name (e.g. "Front entry", "Master bedroom") to replace the placeholder "Scene 01" labels.

## Known limits (M1)

- No tile pipeline. Full 8 MB equirect JPGs load per scene → noticeable load between scene switches.
- No auth, no team scoping, no multi-tour catalog. One hardcoded tour.
- Persistence is per-browser localStorage. Clearing site data wipes hotspots.
- No lead capture, no branding, no Stripe. Those are M6 / M5 / M7.
- Mobile gestures are vanilla Marzipano defaults — fine but not yet tuned.
- No tests, no CI, no Sentry. Add in M0/M2.

## Roadmap

See `CLAUDE.md` § "Next milestones". Next up: **M2 — Auth + teams + DB** (needs Supabase project URL + keys).

## Tech stack

Per `CLAUDE.md`: Next.js 15 App Router, TypeScript strict, Tailwind v4, Marzipano. shadcn/ui not yet wired — the few primitives we use are hand-rolled until the editor design stabilizes.
