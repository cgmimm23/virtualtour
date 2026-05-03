// localStorage persistence for tour edits (M1 only — replaced by Supabase in M2+).
// Keyed per tour slug. Stores the full Tour object so we get hotspots + initial
// view tweaks for free.

import type { Tour } from "./types";

const KEY_PREFIX = "tourly:tour:";

export function loadTourOverrides(slug: string): Tour | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + slug);
    return raw ? (JSON.parse(raw) as Tour) : null;
  } catch {
    return null;
  }
}

export function saveTourOverrides(tour: Tour): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + tour.slug, JSON.stringify(tour));
  } catch {
    // localStorage quota or disabled — silently ignore for the prototype.
  }
}

export function clearTourOverrides(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_PREFIX + slug);
  } catch {
    // ignore
  }
}

/** Merge persisted overrides on top of the hardcoded base tour. */
export function applyOverrides(base: Tour): Tour {
  const overrides = loadTourOverrides(base.slug);
  if (!overrides) return base;

  const baseById = new Map(base.scenes.map((s) => [s.id, s]));

  // Honor the stored scene order, drop any scene IDs that no longer exist in
  // base (renamed/removed), and append any new base scenes the overrides don't
  // know about so future content additions aren't hidden by stale storage.
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const s of overrides.scenes) {
    if (baseById.has(s.id) && !seen.has(s.id)) {
      orderedIds.push(s.id);
      seen.add(s.id);
    }
  }
  for (const s of base.scenes) {
    if (!seen.has(s.id)) orderedIds.push(s.id);
  }

  const overridesById = new Map(overrides.scenes.map((s) => [s.id, s]));

  return {
    ...base,
    coverSceneId: overrides.coverSceneId ?? base.coverSceneId,
    branding: { ...(base.branding ?? {}), ...(overrides.branding ?? {}) },
    leadGate: overrides.leadGate ?? base.leadGate,
    floorPlan: overrides.floorPlan ?? base.floorPlan,
    highlights: overrides.highlights ?? base.highlights,
    details: { ...(base.details ?? {}), ...(overrides.details ?? {}) },
    expiresAt: overrides.expiresAt ?? base.expiresAt,
    webhookUrl: overrides.webhookUrl ?? base.webhookUrl,
    scenes: orderedIds.map((id) => {
      const baseScene = baseById.get(id)!;
      const o = overridesById.get(id);
      if (!o) return baseScene;
      return {
        ...baseScene,
        name: o.name ?? baseScene.name,
        initialYaw: o.initialYaw ?? baseScene.initialYaw,
        initialPitch: o.initialPitch ?? baseScene.initialPitch,
        initialFov: o.initialFov ?? baseScene.initialFov,
        initialRoll: o.initialRoll ?? baseScene.initialRoll,
        floor: o.floor ?? baseScene.floor,
        floorPlanPosition: o.floorPlanPosition ?? baseScene.floorPlanPosition,
        hotspots: o.hotspots ?? [],
      };
    }),
  };
}
