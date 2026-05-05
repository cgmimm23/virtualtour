// AI scene-order suggester. Looks at the existing scene names + thumbnails
// and proposes a logical walking order (entry → living → kitchen → bedrooms
// → outside, etc.). Returns the ordered list of scene IDs.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";

export interface SceneForOrdering {
  id: string;
  name: string;
  floor?: string;
}

const SYSTEM_PROMPT = `You order rooms in a real-estate virtual tour for the natural buyer walkthrough sequence.

Buyers typically walk a tour in this order:
1. Exterior front (street view, front yard, driveway)
2. Front entry / foyer
3. Public living areas (living room, dining, kitchen, family room) on the entry floor
4. Half bath / guest bath on entry floor
5. Bedrooms (primary first, then secondary), grouped by floor
6. Full bathrooms attached to each bedroom group
7. Office / bonus / game / media rooms
8. Basement / attic
9. Garage / utility / laundry
10. Outdoor (backyard, deck, pool, side yard) last so the buyer ends with a view of the property's outdoor potential

If the input has floor labels (Ground, Second, Basement, Outside), keep all rooms on the same floor adjacent in the order. Never interleave floors.

Return ONLY a JSON array of the scene IDs in the new order, e.g. ["scene-id-1", "scene-id-2"]. No prose, no markdown.`;

export async function suggestSceneOrder(
  scenes: SceneForOrdering[],
): Promise<string[]> {
  if (scenes.length < 2) return scenes.map((s) => s.id);
  const client = await requireAnthropic();

  const fact = scenes
    .map((s) => `- ${s.id}: "${s.name}"${s.floor ? ` (floor: ${s.floor})` : ""}`)
    .join("\n");

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Order these ${scenes.length} rooms for the buyer walkthrough. Return JSON array of IDs only.\n\n${fact}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
  return parseOrder(raw, scenes);
}

function parseOrder(raw: string, scenes: SceneForOrdering[]): string[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) return scenes.map((s) => s.id);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return scenes.map((s) => s.id);
  }
  if (!Array.isArray(parsed)) return scenes.map((s) => s.id);
  const ids = new Set(scenes.map((s) => s.id));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of parsed) {
    if (typeof v === "string" && ids.has(v) && !seen.has(v)) {
      out.push(v);
      seen.add(v);
    }
  }
  // Append any scenes the model didn't return so we don't lose any.
  for (const s of scenes) if (!seen.has(s.id)) out.push(s.id);
  return out;
}
