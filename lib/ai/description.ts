// AI property description writer. Reads tour metadata + a few key panoramas
// (cover scene + a sample interior) and returns an MLS-ready 200-word
// property description.

import "server-only";
import { requireAnthropic, AI_MODEL } from "./client";
import { loadSceneImage } from "./image";

interface SceneSummary {
  name: string;
  imageUrl: string;
}

export interface DescribeTourInput {
  title: string;
  propertyAddress: string;
  details?: {
    beds?: number;
    baths?: number;
    sqft?: number;
    yearBuilt?: number;
    propertyType?: string;
    listPrice?: number;
  };
  scenes: SceneSummary[];
  /** Up to 3 image URLs to send Claude as visual context. */
  visualSampleUrls: string[];
}

const SYSTEM_PROMPT = `You write MLS-ready real-estate property descriptions for virtual-tour listings.

Style:
- 150–220 words.
- Lead with the most distinctive feature (light, layout, view, finishes, location).
- Concrete, specific, sensory. Avoid clichés like "must-see", "won't last", "dream home", "tons of natural light".
- Active voice. Short sentences. Mix of sentence lengths.
- Mention bed/bath/sqft/year if provided, woven into prose, not a bullet list.
- End with a line about what kind of buyer or use this fits ("Ideal for…").
- No emoji, no markdown, no headers. One flowing description.

Return ONLY the description text, nothing else.`;

export async function generatePropertyDescription(
  input: DescribeTourInput,
): Promise<string> {
  const client = await requireAnthropic();

  const factSheet = buildFactSheet(input);
  const sampleImages = (
    await Promise.all(input.visualSampleUrls.slice(0, 3).map((u) => loadSceneImage(u).catch(() => null)))
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  const userContent: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: "image/jpeg"; data: string };
      }
  > = [{ type: "text", text: factSheet }];
  for (const img of sampleImages) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}

function buildFactSheet(input: DescribeTourInput): string {
  const lines: string[] = [`Property: ${input.title}`];
  if (input.propertyAddress) lines.push(`Address: ${input.propertyAddress}`);
  if (input.details?.beds !== undefined) lines.push(`Bedrooms: ${input.details.beds}`);
  if (input.details?.baths !== undefined) lines.push(`Bathrooms: ${input.details.baths}`);
  if (input.details?.sqft) lines.push(`Square footage: ${input.details.sqft.toLocaleString()}`);
  if (input.details?.yearBuilt) lines.push(`Year built: ${input.details.yearBuilt}`);
  if (input.details?.propertyType) lines.push(`Type: ${input.details.propertyType}`);
  if (input.details?.listPrice)
    lines.push(`List price: $${input.details.listPrice.toLocaleString()}`);
  lines.push("");
  lines.push("Scenes in the virtual tour (room labels in walking order):");
  for (const s of input.scenes.slice(0, 30)) lines.push(`- ${s.name}`);
  lines.push("");
  lines.push("Visual context: a few representative panoramas attached.");
  lines.push("");
  lines.push(
    "Write the property description now using the style guide. Output the description text only.",
  );
  return lines.join("\n");
}
