// Cloudflare R2 client + presign helpers.
//
// R2 speaks the S3 API, so we use AWS SDK v3 with R2's account-scoped
// endpoint. Two operations:
//   - presignPut(key) — browser uploads directly to R2 (skips Next.js timeouts).
//   - presignGet(key) — short-ish signed URL Marzipano / <img> can read from.
//
// Object keys follow `tours/{team_id}/{tour_id}/scenes/{scene_id}/source.{ext}`
// so RLS-like scope checks can happen on the server-action side.

import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export { PutObjectCommand, GetObjectCommand };

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  // Fail loud at module load — anything downstream depending on R2 is unusable
  // without these. Better than a confusing presign error mid-request.
  throw new Error(
    "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
  );
}

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

export const R2_BUCKET = bucket;

/** Presign a PUT URL the browser can upload directly to. */
export async function presignPut(key: string, contentType: string, ttlSeconds = 60 * 5): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn: ttlSeconds });
}

/** Presign a GET URL valid long enough for one tour viewing session. */
export async function presignGet(key: string, ttlSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn: ttlSeconds });
}

/** Delete an object — used when a scene gets removed. */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Build the canonical object key for a scene's source equirect. */
export function sceneSourceKey(teamId: string, tourId: string, sceneId: string, ext: string): string {
  // ext is the lowercased extension w/o the dot. Defended at the boundary.
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `tours/${teamId}/${tourId}/scenes/${sceneId}/source.${safeExt}`;
}

/**
 * Key for the WebGL-friendly version of the scene image (≤ 4096 wide).
 * Original stays at `source.<ext>` so the future tile pipeline can re-process.
 */
export function sceneDisplayKey(teamId: string, tourId: string, sceneId: string): string {
  return `tours/${teamId}/${tourId}/scenes/${sceneId}/display.jpg`;
}

/** Pull the bytes of an object into a Buffer. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 GET returned empty body for ${key}`);
  // @aws-sdk/client-s3 returns a Web stream in Node; iterate it.
  const chunks: Buffer[] = [];
  // The Body is an async iterable in Node 18+.
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Upload a Buffer to R2 at the given key with the given content type. */
export async function putObjectBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}
