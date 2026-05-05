// Smart doorway detection. Claude vision looks at a single scene panorama
// and returns the visible doorways/passages with approximate yaw + pitch
// in radians, plus a short label. The editor uses this to place real
// scene_link hotspots on actual doorways instead of the dumb sequential
// "next-arrow-at-yaw-0" placement.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";
import { loadSceneImage } from "./image";

export interface DetectedDoorway {
  // Yaw in radians, -π to π. 0 = "front" of the panorama (where the camera
  // was facing when stitched, typically the entrance).
  yaw: number;
  // Pitch in radians, -π/2 to π/2. Doorways usually sit just below horizon (~ -0.3).
  pitch: number;
  // Short human label for the destination, e.g. "Kitchen", "Hallway", "Backyard".
  label: string;
  // Confidence the model assigns 0–1 (best-effort, not calibrated).
  confidence: number;
}

const SYSTEM_PROMPT = `You analyze 360° equirectangular panoramas of real-estate interiors and identify visible doorways, openings, hallways, and exterior passages that a buyer could walk through to reach another room.

For each visible passage, return:
- yaw: horizontal angle in radians, where 0 is the center of the panorama image (which is the camera's "front" when stitched). Range: -π to π. Negative = left of center, positive = right of center. The image wraps: yaw of π and -π are the same back-of-camera direction.
- pitch: vertical angle in radians. Floor-level doorways sit slightly below the horizon at roughly -0.3 to -0.5. Range: -π/2 to π/2.
- label: 1-3 word description of where it leads, inferred from what's visible through the opening (e.g. "Kitchen", "Hallway", "Backyard", "Bathroom", "Closet", "Outside"). If unclear, use "Adjacent room".
- confidence: 0.0 to 1.0.

Equirectangular geometry: the image is 2:1 (width = 2× height). Pixel x of the image maps to yaw = (x / width - 0.5) × 2π. Pixel y maps to pitch = (0.5 - y / height) × π. So a doorway centered horizontally at the middle of the image is yaw=0; a doorway in the rightmost quarter of the image is around yaw=π/2.

Return only doorways/openings the buyer could realistically walk through. Skip windows, mirrors, picture frames, decorative arches that don't lead anywhere. Maximum 6 results per panorama.

Respond ONLY with valid JSON in this exact shape:
{"doorways": [{"yaw": number, "pitch": number, "label": string, "confidence": number}]}

No prose, no markdown, no explanation. Just the JSON.`;

export async function detectDoorways(
  imageUrl: string,
): Promise<DetectedDoorway[]> {
  const client = await requireAnthropic();
  const img = await loadSceneImage(imageUrl);

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
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
            text: "Identify every doorway / passage in this panorama. JSON only.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseDoorways(raw);
}

function parseDoorways(raw: string): DetectedDoorway[] {
  // Tolerate fenced code blocks / leading prose that some models occasionally
  // add despite the instruction.
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return [];
  const slice = raw.slice(jsonStart, jsonEnd + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const list = (parsed as { doorways?: unknown }).doorways;
  if (!Array.isArray(list)) return [];

  const valid: DetectedDoorway[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const yaw = numberInRange(r.yaw, -Math.PI, Math.PI);
    const pitch = numberInRange(r.pitch, -Math.PI / 2, Math.PI / 2);
    if (yaw === null || pitch === null) continue;
    valid.push({
      yaw,
      pitch,
      label:
        typeof r.label === "string" && r.label.trim()
          ? r.label.trim().slice(0, 60)
          : "Adjacent room",
      confidence:
        typeof r.confidence === "number"
          ? Math.max(0, Math.min(1, r.confidence))
          : 0.5,
    });
  }
  return valid.slice(0, 6);
}

function numberInRange(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < min - 0.01 || v > max + 0.01) return null;
  return Math.max(min, Math.min(max, v));
}
