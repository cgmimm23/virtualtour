"use server";

// Scene upload flow:
//   1. Browser → requestSceneUpload({ tourId, filename, contentType })
//      Server creates a scene row in `processing_status: 'pending'` and returns
//      { sceneId, putUrl, key }. Key is the R2 object key under
//      tours/{team_id}/{tour_id}/scenes/{scene_id}/source.{ext}.
//   2. Browser PUTs the file to putUrl (direct to R2, bypassing Next.js limits).
//   3. Browser → completeSceneUpload({ sceneId })
//      Server flips processing_status to 'ready'. Image is now visible in the
//      editor. (Tile generation lives at processing_status: 'processing' for
//      when a worker is wired up later.)
//
// We store the bare R2 key in `source_image_url` with an "r2:" scheme prefix
// so downstream readers know to presign it. Legacy seed rows with full URLs
// (e.g. /public/... or absolute https) stay valid — see resolveSceneImageUrl
// in lib/r2/resolve.ts.

import { revalidatePath } from "next/cache";
import { requireActiveTeam } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  presignPut,
  sceneSourceKey,
  sceneDisplayKey,
  deleteObject,
  getObjectBuffer,
  putObjectBuffer,
} from "@/lib/r2/client";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

// WebGL MAX_TEXTURE_SIZE is 4096 on most phones and many laptops. Equirects
// wider than this render as a black canvas. We resize on completion so the
// browser always gets a GPU-safe image. Original stays in R2 at source.<ext>
// for future re-processing (cube-face tiles).
const DISPLAY_MAX_WIDTH = 4096;
const DISPLAY_JPEG_QUALITY = 85;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — Insta360 5.7K equirect is ~15-25 MB

export interface RequestUploadResult {
  ok: true;
  sceneId: string;
  putUrl: string;
  key: string;
}
export interface RequestUploadError {
  ok: false;
  error: string;
}

function extFromContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

function sceneNameFromFilename(name: string, fallbackIndex: number): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  if (!base) return `Scene ${fallbackIndex}`;
  // Replace separators with spaces and title-case loosely.
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function requestSceneUpload(params: {
  tourId: string;
  filename: string;
  contentType: string;
  size: number;
  orderIndex?: number;
}): Promise<RequestUploadResult | RequestUploadError> {
  const { tourId, filename, contentType, size } = params;

  if (!ALLOWED_TYPES.has(contentType)) {
    return { ok: false, error: `Unsupported file type: ${contentType}. Use JPEG, PNG, or WebP.` };
  }
  if (size > MAX_BYTES) {
    return { ok: false, error: `File too large (${Math.round(size / 1024 / 1024)} MB). Max 50 MB.` };
  }

  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  // Scope check — RLS would also catch this, but a clear error is friendlier.
  const { data: tour, error: tourErr } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tourId)
    .maybeSingle();
  if (tourErr) return { ok: false, error: tourErr.message };
  if (!tour) return { ok: false, error: "Tour not found." };
  if (tour.team_id !== team.id) return { ok: false, error: "Forbidden." };

  const sceneId = randomUUID();
  const ext = extFromContentType(contentType);
  const key = sceneSourceKey(team.id, tourId, sceneId, ext);

  // Compute the next order_index so scenes stack in the order they're uploaded.
  let orderIndex = params.orderIndex;
  if (typeof orderIndex !== "number") {
    const { data: existing } = await supabase
      .from("scenes")
      .select("order_index")
      .eq("tour_id", tourId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    orderIndex = (existing?.order_index ?? -1) + 1;
  }

  const { error: insertErr } = await supabase.from("scenes").insert({
    id: sceneId,
    tour_id: tourId,
    name: sceneNameFromFilename(filename, orderIndex + 1),
    // Store the R2 key with a scheme prefix so resolveSceneImageUrl knows to presign.
    source_image_url: `r2:${key}`,
    initial_yaw: 0,
    initial_pitch: 0,
    initial_fov: Math.PI / 2,
    initial_roll: 0,
    order_index: orderIndex,
    processing_status: "pending",
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  const putUrl = await presignPut(key, contentType);
  return { ok: true, sceneId, putUrl, key };
}

export async function completeSceneUpload(params: {
  tourId: string;
  sceneId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tourId, sceneId } = params;
  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  // Scope check (tour → team).
  const { data: tour } = await supabase
    .from("tours")
    .select("id, team_id, cover_scene_id")
    .eq("id", tourId)
    .maybeSingle();
  if (!tour || tour.team_id !== team.id) return { ok: false, error: "Forbidden." };

  // Fetch the current scene row so we know the source key.
  const { data: scene } = await supabase
    .from("scenes")
    .select("id, source_image_url")
    .eq("id", sceneId)
    .eq("tour_id", tourId)
    .maybeSingle();
  if (!scene) return { ok: false, error: "Scene not found." };

  // Mark processing while we generate the WebGL-friendly version.
  await supabase
    .from("scenes")
    .update({ processing_status: "processing" })
    .eq("id", sceneId)
    .eq("tour_id", tourId);

  // Resize: cap width at DISPLAY_MAX_WIDTH so WebGL textures load on all GPUs.
  // We only do this for r2:-stored uploads; legacy seed scenes (pointing at
  // /public paths) are left alone.
  const sourceUrl = scene.source_image_url;
  const isR2 = typeof sourceUrl === "string" && sourceUrl.startsWith("r2:");
  let displayRef = sourceUrl;
  if (isR2) {
    const sourceKey = sourceUrl.slice("r2:".length);
    try {
      const buf = await getObjectBuffer(sourceKey);
      const resized = await sharp(buf)
        .rotate() // honor EXIF orientation
        .resize({ width: DISPLAY_MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: DISPLAY_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      const displayKey = sceneDisplayKey(team.id, tourId, sceneId);
      await putObjectBuffer(displayKey, resized, "image/jpeg");
      displayRef = `r2:${displayKey}`;
    } catch (err) {
      // Resize failed — fall back to serving the source directly. WebGL may
      // still struggle, but a "won't render" is friendlier than a 500.
      console.error("[completeSceneUpload] resize failed", err);
    }
  }

  const { error: updErr } = await supabase
    .from("scenes")
    .update({ processing_status: "ready", source_image_url: displayRef })
    .eq("id", sceneId)
    .eq("tour_id", tourId);
  if (updErr) return { ok: false, error: updErr.message };

  // If this is the first scene on the tour, set it as the cover.
  if (!tour.cover_scene_id) {
    await supabase.from("tours").update({ cover_scene_id: sceneId }).eq("id", tourId);
  }

  revalidatePath(`/editor/${tourId}`);
  return { ok: true };
}

/**
 * Rename a scene. Direct DB write — bypasses the TourExperience auto-save
 * flow, so the next page render will reconcile. Used by the Manage scenes
 * modal where the user is editing names away from the viewer state.
 */
export async function renameScene(params: {
  tourId: string;
  sceneId: string;
  name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tourId, sceneId, name } = params;
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Name can't be empty." };

  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  const { data: tour } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tourId)
    .maybeSingle();
  if (!tour || tour.team_id !== team.id) return { ok: false, error: "Forbidden." };

  const { error } = await supabase
    .from("scenes")
    .update({ name: trimmed })
    .eq("id", sceneId)
    .eq("tour_id", tourId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/editor/${tourId}`);
  return { ok: true };
}

/**
 * Permanently delete a scene: the DB row (which cascades to hotspots) AND
 * the underlying R2 objects (source.<ext> + display.jpg if present).
 *
 * The caller is responsible for removing the scene from any in-memory tour
 * state — TourExperience does this via commitTour before invoking the action
 * so the auto-save debounce doesn't recreate the row.
 */
export async function deleteScene(params: {
  tourId: string;
  sceneId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tourId, sceneId } = params;
  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  const { data: tour } = await supabase
    .from("tours")
    .select("id, team_id, cover_scene_id")
    .eq("id", tourId)
    .maybeSingle();
  if (!tour || tour.team_id !== team.id) return { ok: false, error: "Forbidden." };

  // Pull the scene to learn its R2 key, then delete the row.
  const { data: scene } = await supabase
    .from("scenes")
    .select("id, source_image_url")
    .eq("id", sceneId)
    .eq("tour_id", tourId)
    .maybeSingle();

  if (scene) {
    // Delete R2 objects best-effort. Failures here shouldn't block the DB
    // delete — orphaned R2 objects are cheaper than orphaned DB rows.
    const candidates: string[] = [];
    const url = scene.source_image_url;
    if (typeof url === "string" && url.startsWith("r2:")) {
      const key = url.slice("r2:".length);
      candidates.push(key);
      // If we're pointed at display.jpg, also try to remove the source.<ext>
      // sibling so the upload pair doesn't leak.
      if (key.endsWith("/display.jpg")) {
        const prefix = key.slice(0, -"display.jpg".length);
        candidates.push(`${prefix}source.jpg`);
        candidates.push(`${prefix}source.jpeg`);
        candidates.push(`${prefix}source.png`);
        candidates.push(`${prefix}source.webp`);
      }
    }
    for (const k of candidates) {
      try {
        await deleteObject(k);
      } catch {
        // ignore — R2 cleanup is best effort
      }
    }
  }

  const { error: delErr } = await supabase
    .from("scenes")
    .delete()
    .eq("id", sceneId)
    .eq("tour_id", tourId);
  if (delErr) return { ok: false, error: delErr.message };

  // If the deleted scene was the cover, clear it so a future load picks a
  // different first scene via rowToTour's fallback.
  if (tour.cover_scene_id === sceneId) {
    await supabase.from("tours").update({ cover_scene_id: null }).eq("id", tourId);
  }

  revalidatePath(`/editor/${tourId}`);
  return { ok: true };
}

export async function abortSceneUpload(params: {
  tourId: string;
  sceneId: string;
  key: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tourId, sceneId, key } = params;
  const { team } = await requireActiveTeam();
  const supabase = await createClient();

  const { data: tour } = await supabase
    .from("tours")
    .select("id, team_id")
    .eq("id", tourId)
    .maybeSingle();
  if (!tour || tour.team_id !== team.id) return { ok: false, error: "Forbidden." };

  // Best-effort delete from R2; even if it fails, we still drop the DB row so
  // we don't leave an orphan pending scene in the editor.
  try {
    await deleteObject(key);
  } catch {
    // ignore
  }

  await supabase.from("scenes").delete().eq("id", sceneId).eq("tour_id", tourId);
  revalidatePath(`/editor/${tourId}`);
  return { ok: true };
}
