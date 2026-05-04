import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

/**
 * POST /api/auto-name-scene
 *
 * Body: { imageUrl: string }
 * Returns: { name: string }
 *
 * Sends a 360 panorama to Claude vision and asks for a 2–4-word room name.
 * The system prompt is identical across requests so we mark it cacheable —
 * naming all 29 scenes in one batch hits the cache on requests 2–29.
 */

const SYSTEM_PROMPT = `You are a real estate expert who labels rooms in 360 panorama photos of homes for a virtual tour.

Given a panorama image, return ONLY the room or area name, in 2 to 4 words. Use natural English a buyer would understand. No punctuation. No quotes. No explanation.

Common labels:
- Front Yard, Backyard, Side Yard, Driveway, Garage, Front Entry
- Living Room, Family Room, Dining Room, Kitchen, Pantry, Breakfast Nook, Foyer, Hallway, Stairs, Landing
- Master Bedroom, Bedroom, Guest Bedroom, Office, Nursery, Closet, Walk-in Closet
- Master Bathroom, Bathroom, Half Bath, Laundry Room, Mudroom
- Basement, Attic, Bonus Room, Game Room, Media Room, Gym

If you genuinely cannot tell, return "Interior" or "Exterior". Never refuse.

Output format: just the label, nothing else.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  let imageUrl: string;
  try {
    const body = (await req.json()) as { imageUrl?: unknown };
    if (typeof body.imageUrl !== "string" || !body.imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }
    imageUrl = body.imageUrl;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Resolve relative paths (e.g. "/tours/kremmen-place/scene-01.jpg") to absolute URLs
  // so Claude can fetch them. Use the request's host so this works in dev + DO + custom domain.
  let absoluteUrl: string;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    absoluteUrl = imageUrl;
  } else {
    const origin = new URL(req.url).origin;
    absoluteUrl = `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 32,
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
            { type: "image", source: { type: "url", url: absoluteUrl } },
            { type: "text", text: "What room or area is this?" },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const name = raw.trim().replace(/^["']|["']$/g, "").slice(0, 64);

    return NextResponse.json({
      name: name || "Interior",
      cached: response.usage.cache_read_input_tokens ?? 0,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error ${err.status}: ${err.message}` },
        { status: err.status >= 500 ? 502 : 400 },
      );
    }
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
