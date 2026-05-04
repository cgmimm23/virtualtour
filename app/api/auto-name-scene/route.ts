import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

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

  // Two image-source paths:
  //   - Relative path like "/tours/kremmen-place/scene-01.jpg" → read from disk
  //     under public/. Server self-fetch over HTTP deadlocks on DO App Platform.
  //   - Absolute http(s) URL → fetch (e.g. once R2 lands in M3, the imageUrl
  //     coming from the DB will be a public R2 URL).
  let imageBase64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  const pickMediaType = (
    hint: string,
  ): "image/jpeg" | "image/png" | "image/webp" | "image/gif" => {
    const h = hint.toLowerCase();
    if (h.includes("png")) return "image/png";
    if (h.includes("webp")) return "image/webp";
    if (h.includes("gif")) return "image/gif";
    return "image/jpeg";
  };

  let rawBuf: Buffer;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return NextResponse.json(
          { error: `failed to fetch image (${imgRes.status} from ${imageUrl})` },
          { status: 400 },
        );
      }
      rawBuf = Buffer.from(await imgRes.arrayBuffer());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json({ error: `image fetch failed: ${msg}` }, { status: 400 });
    }
  } else {
    // Disk read from public/. Resolve to a path strictly inside public/ to
    // block path traversal; reject anything that escapes.
    const publicDir = path.join(process.cwd(), "public");
    const requested = imageUrl.replace(/^\/+/, "");
    const resolved = path.resolve(publicDir, requested);
    if (!resolved.startsWith(publicDir + path.sep) && resolved !== publicDir) {
      return NextResponse.json({ error: "invalid image path" }, { status: 400 });
    }
    try {
      rawBuf = await readFile(resolved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json(
        { error: `disk read failed (${resolved}): ${msg}` },
        { status: 404 },
      );
    }
  }

  // Resize before sending. The original equirect panoramas are ~8 MB and
  // base64 inflates them past Anthropic's 5 MB limit. Room labeling doesn't
  // need high-res — a 768px-long-edge JPEG at quality 80 is ~80 KB, plenty
  // for "this is a kitchen" identification, and keeps our token count low.
  try {
    const resized = await sharp(rawBuf)
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    imageBase64 = resized.toString("base64");
    mediaType = "image/jpeg";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: `image resize failed: ${msg}` }, { status: 500 });
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
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
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
