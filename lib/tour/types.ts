// Tour data model. Mirrors the DB schema in CLAUDE.md so the in-memory shape
// here is the same shape we'll persist via Supabase later.

export type HotspotType = "scene_link" | "info" | "url" | "image" | "video" | "contact";

export interface SceneLinkPayload {
  targetSceneId: string;
  transition?: "fade" | "zoom";
  /**
   * Arrow rotation in degrees, clockwise from "→" (right).
   * 0 = right, 90 = down, 180 = left, 270 = up.
   * Defaults to 90 (down/forward — the typical floor doorway convention).
   */
  arrowRotation?: number;
}

export interface InfoPayload {
  title: string;
  bodyMarkdown: string;
}

export interface UrlPayload {
  url: string;
  label: string;
}

export interface ImagePayload {
  /** Image URL (data URL in prototype, R2 URL in production). */
  url: string;
  caption?: string;
  /** Optional second image — when present, the modal renders an A/B before/after slider. */
  beforeUrl?: string;
}

export interface VideoPayload {
  /** Direct .mp4 URL or a YouTube/Vimeo watch URL — the player picks the right embed mode. */
  url: string;
  caption?: string;
  /** Autoplay when the modal opens. */
  autoplay?: boolean;
}

export interface ContactPayload {
  /** Optional override copy for the in-scene contact button. */
  ctaLabel?: string;
}

export type HotspotPayload =
  | { type: "scene_link"; data: SceneLinkPayload }
  | { type: "info"; data: InfoPayload }
  | { type: "url"; data: UrlPayload }
  | { type: "image"; data: ImagePayload }
  | { type: "video"; data: VideoPayload }
  | { type: "contact"; data: ContactPayload };

export interface Hotspot {
  id: string;
  /** Yaw in radians, range -π to π */
  yaw: number;
  /** Pitch in radians, range -π/2 to π/2 */
  pitch: number;
  label: string;
  payload: HotspotPayload;
}

export interface Scene {
  id: string;
  name: string;
  /** URL relative to /public, e.g. "/tours/kremmen-place/scene-01.jpg" */
  imageUrl: string;
  /** Opening view orientation, radians */
  initialYaw: number;
  initialPitch: number;
  initialFov: number;
  /** Camera roll (tilt correction) in radians. 0 = level. */
  initialRoll?: number;
  /** Free-text floor label, e.g. "Ground", "Second", "Basement". Used for sidebar grouping. */
  floor?: string;
  /** 0–1 normalized position on the floor plan image. Top-left = (0,0). */
  floorPlanPosition?: { x: number; y: number };
  hotspots: Hotspot[];
}

export interface FloorPlanConfig {
  /** Image URL — base64 data URL in M1 prototype, swapped for R2 in M3. */
  imageUrl: string;
}

export interface BrandingConfig {
  agentName?: string;
  agentPhotoUrl?: string;
  agentPhone?: string;
  agentEmail?: string;
  brokerageName?: string;
  brokerageLogoUrl?: string;
  /** Hex color, e.g. "#205081" */
  primaryColor?: string;
}

export interface LeadGateConfig {
  enabled: boolean;
  /** Number of scenes viewed before the gate appears. */
  triggerScenes: number;
  /** OR — milliseconds elapsed since first load. */
  triggerMs: number;
  headline: string;
  subhead: string;
  ctaLabel: string;
  collectName: boolean;
  collectPhone: boolean;
  /** Schedule mode adds a preferred-date/time field and changes the lead source. */
  mode?: "default" | "schedule";
  collectPreferredTime?: boolean;
  /** Inline consent / privacy line shown below the submit button. */
  consentText?: string;
}

export interface ListingDetails {
  /** "For sale" / "Pending" / "Sold" — used for badges. */
  status?: "for_sale" | "pending" | "sold" | "off_market";
  listPrice?: number;
  beds?: number;
  /** Half baths counted as 0.5. */
  baths?: number;
  sqft?: number;
  lotSqft?: number;
  yearBuilt?: number;
  mlsNumber?: string;
  /** Property type — single family, condo, etc. Mostly used for structured data. */
  propertyType?: string;
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  propertyAddress: string;
  scenes: Scene[];
  /** ID of the scene loaded first */
  coverSceneId: string;
  branding?: BrandingConfig;
  leadGate?: LeadGateConfig;
  floorPlan?: FloorPlanConfig;
  /** Ordered list of scene IDs that compose the curated highlights path. */
  highlights?: string[];
  /** Listing card details overlaid on the viewer and emitted as JSON-LD. */
  details?: ListingDetails;
  /** ISO date string. After this moment, the public viewer shows an "expired" message. */
  expiresAt?: string;
  /** Outbound webhook URL fired browser-side on each new lead — Zapier-compatible. */
  webhookUrl?: string;
}

export interface Lead {
  id: string;
  tourSlug: string;
  email: string;
  name?: string;
  phone?: string;
  /** When schedule mode collected a preferred date/time. */
  preferredTime?: string;
  source: "gate" | "contact_button" | "in_scene_contact" | "schedule";
  capturedAt: string;
  scenesViewed: number;
  durationMs: number;
}
