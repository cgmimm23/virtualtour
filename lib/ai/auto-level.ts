// Auto-level: Claude vision estimates the horizon tilt of a 360 equirectangular
// pano and returns roll (camera rotation around its optical axis) + pitch
// (camera nodding up/down) corrections in radians.
//
// This is a PARTIAL fix — it sets the scene's initial view so the OPENING
// frame looks horizontal, but the source image isn't re-projected, so
// panning will reveal the original tilt curving the horizon line. Real fix
// is server-side equirect resampling; that's a separate engineering sprint.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";
import { loadSceneImage } from "./image";

export interface LevelSuggestion {
  /** Camera roll in radians (rotation around viewing axis). Range: -π/4 to π/4 */
  roll: number;
  /** Camera pitch in radians (up/down nod). Range: -π/8 to π/8 */
  pitch: number;
  /** Model self-confidence 0-1. */
  confidence: number;
  /** Short note from the model (debug / display). */
  note: string;
}

const SYSTEM_PROMPT = `You analyze 360° equirectangular panoramas of real-estate interiors to estimate horizon tilt.

The horizon line should appear as a perfectly horizontal line at the vertical center of the panorama image. If the camera was tilted when the pano was shot, the horizon will:
- ROLL: appear as a tilted line (one side higher than the other) — needs correction by rotating the view around the camera's optical (forward) axis.
- PITCH: be shifted up (looking down) or down (looking up) from the image center — needs vertical correction.

Look at architectural cues: doorframes, window frames, kitchen counters, ceiling lines, floor lines, picture-frame edges. These are usually vertical or horizontal in the real world.

Return a JSON object with:
- roll: required rotation in radians to make verticals true-vertical. Positive = counter-clockwise when looking forward. Range -π/4 to π/4 (-45° to 45°). Usually small: ±0.05 to ±0.15 radians for typical handheld 360 shots.
- pitch: required vertical offset in radians to center the horizon. Positive = view shifts up. Range -π/8 to π/8 (-22° to 22°).
- confidence: your self-rated confidence in the estimate, 0.0 to 1.0. Be conservative.
- note: 1-sentence description of what you saw that informed the estimate.

If the pano is already level, return roll: 0, pitch: 0, confidence: 1.0.

Respond ONLY with valid JSON in this exact shape:
{"roll": number, "pitch": number, "confidence": number, "note": string}

No prose, no markdown, no explanation. Just the JSON.`;

const ROLL_MAX = Math.PI / 4;
const PITCH_MAX = Math.PI / 8;

export async function detectHorizonTilt(imageUrl: string): Promise<LevelSuggestion> {
  const client = await requireAnthropic();
  const img = await loadSceneImage(imageUrl);

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: img.mediaType, data: img.base64 },
          },
          {
            type: "text",
            text: "Estimate horizon tilt for this panorama. JSON only.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseLevelResponse(raw);
}

function parseLevelResponse(raw: string): LevelSuggestion {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { roll: 0, pitch: 0, confidence: 0, note: "Couldn't parse model response." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { roll: 0, pitch: 0, confidence: 0, note: "Couldn't parse model response." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { roll: 0, pitch: 0, confidence: 0, note: "Malformed model response." };
  }
  const r = parsed as Record<string, unknown>;
  return {
    roll: clamp(numOr(r.roll, 0), -ROLL_MAX, ROLL_MAX),
    pitch: clamp(numOr(r.pitch, 0), -PITCH_MAX, PITCH_MAX),
    confidence: clamp(numOr(r.confidence, 0), 0, 1),
    note: typeof r.note === "string" ? r.note.slice(0, 200) : "",
  };
}

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
