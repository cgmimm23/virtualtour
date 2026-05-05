// Helpers shared across AI features for loading + resizing scene images
// before sending to Claude. We resize to ≤1024px on long edge and recompress
// to JPEG quality 80 — well under Anthropic's 5 MB base64 limit, low token
// cost, plenty of fidelity for room-recognition tasks.

import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export interface PreparedImage {
  base64: string;
  mediaType: "image/jpeg";
}

/**
 * Reads a scene image (relative path under public/ or absolute http(s) URL),
 * resizes + recompresses, returns base64 ready to drop into a Claude
 * vision message.
 */
export async function loadSceneImage(imageUrl: string): Promise<PreparedImage> {
  const raw = await loadRaw(imageUrl);
  const resized = await sharp(raw)
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
  return { base64: resized.toString("base64"), mediaType: "image/jpeg" };
}

async function loadRaw(imageUrl: string): Promise<Buffer> {
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status} ${imageUrl}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  // Public-folder path. Defend against traversal.
  const publicDir = path.join(process.cwd(), "public");
  const requested = imageUrl.replace(/^\/+/, "");
  const resolved = path.resolve(publicDir, requested);
  if (!resolved.startsWith(publicDir + path.sep) && resolved !== publicDir) {
    throw new Error(`invalid image path: ${imageUrl}`);
  }
  return readFile(resolved);
}
