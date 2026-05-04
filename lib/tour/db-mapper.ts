// Translates between the in-memory `Tour` shape (used by the viewer/editor)
// and the relational rows returned by Supabase (tours + scenes + hotspots).
//
// Keeping the on-the-wire shape identical to the legacy localStorage shape
// means we don't need to touch `TourExperience` rendering code — only the
// load/save plumbing changes.

import type {
  Hotspot,
  HotspotPayload,
  Scene,
  Tour,
  HotspotType,
  BrandingConfig,
  LeadGateConfig,
  FloorPlanConfig,
  ListingDetails,
} from "./types";
import type { Database } from "@/types/supabase";

type TourRow = Database["public"]["Tables"]["tours"]["Row"];
type SceneRow = Database["public"]["Tables"]["scenes"]["Row"];
type HotspotRow = Database["public"]["Tables"]["hotspots"]["Row"];

export interface TourWithRelations extends TourRow {
  scenes: (SceneRow & { hotspots: HotspotRow[] })[];
}

// Casting through `unknown` keeps the strict-mode rule happy. The shape
// guarantees come from the migration + the writers in this file — anything
// else hitting these jsonb columns is a bug we want to find loud.
function castJson<T>(value: unknown): T | undefined {
  return (value ?? undefined) as T | undefined;
}

export function rowToHotspot(row: HotspotRow): Hotspot {
  return {
    id: row.id,
    yaw: row.yaw,
    pitch: row.pitch,
    label: row.label,
    payload: { type: row.type, data: castJson(row.payload) ?? {} } as HotspotPayload,
  };
}

export function rowToScene(row: SceneRow & { hotspots: HotspotRow[] }): Scene {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.tiles_base_url ?? row.source_image_url,
    initialYaw: row.initial_yaw,
    initialPitch: row.initial_pitch,
    initialFov: row.initial_fov,
    initialRoll: row.initial_roll,
    floor: row.floor ?? undefined,
    floorPlanPosition:
      castJson<{ x: number; y: number }>(row.floor_plan_position) ?? undefined,
    hotspots: (row.hotspots ?? []).map(rowToHotspot),
  };
}

export function rowToTour(row: TourWithRelations): Tour {
  const scenes = [...(row.scenes ?? [])]
    .sort((a, b) => a.order_index - b.order_index)
    .map(rowToScene);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    propertyAddress: row.property_address ?? "",
    coverSceneId: row.cover_scene_id ?? scenes[0]?.id ?? "",
    branding: castJson<BrandingConfig>(row.branding),
    leadGate: castJson<LeadGateConfig>(row.lead_gate),
    floorPlan: castJson<FloorPlanConfig>(row.floor_plan),
    highlights: row.highlights ?? undefined,
    details: castJson<ListingDetails>(row.details),
    expiresAt: row.expires_at ?? undefined,
    webhookUrl: row.webhook_url ?? undefined,
    scenes,
  };
}

export interface SceneUpsert {
  id: string;
  name: string;
  source_image_url: string;
  initial_yaw: number;
  initial_pitch: number;
  initial_fov: number;
  initial_roll: number;
  floor: string | null;
  floor_plan_position: unknown;
  order_index: number;
}

export interface HotspotUpsert {
  id: string;
  scene_id: string;
  type: HotspotType;
  yaw: number;
  pitch: number;
  label: string;
  payload: unknown;
}

/** Split the in-memory tour into the rows we'd persist. */
export function tourToRows(tour: Tour, teamId: string) {
  const tourRow: Database["public"]["Tables"]["tours"]["Update"] = {
    title: tour.title,
    property_address: tour.propertyAddress || null,
    cover_scene_id: tour.coverSceneId || null,
    branding: tour.branding ?? null,
    lead_gate: tour.leadGate ?? null,
    floor_plan: tour.floorPlan ?? null,
    highlights: tour.highlights ?? null,
    details: tour.details ?? null,
    expires_at: tour.expiresAt ?? null,
    webhook_url: tour.webhookUrl ?? null,
  };

  const scenes: SceneUpsert[] = tour.scenes.map((s, i) => ({
    id: s.id,
    name: s.name,
    source_image_url: s.imageUrl,
    initial_yaw: s.initialYaw,
    initial_pitch: s.initialPitch,
    initial_fov: s.initialFov,
    initial_roll: s.initialRoll ?? 0,
    floor: s.floor ?? null,
    floor_plan_position: s.floorPlanPosition ?? null,
    order_index: i,
  }));

  const hotspots: HotspotUpsert[] = [];
  for (const scene of tour.scenes) {
    for (const h of scene.hotspots) {
      hotspots.push({
        id: h.id,
        scene_id: scene.id,
        type: h.payload.type,
        yaw: h.yaw,
        pitch: h.pitch,
        label: h.label,
        payload: h.payload.data,
      });
    }
  }

  // Mark teamId so the caller can do a defensive scope check.
  return { tourRow, scenes, hotspots, teamId };
}
