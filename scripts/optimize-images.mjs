// Resize all panoramas in public/tours/ to 4096px-wide max + JPEG quality 80
// progressive. Marzipano's EquirectGeometry is set to 4096 width; anything
// bigger is wasted bandwidth. Run manually whenever new tours are dropped:
//   node scripts/optimize-images.mjs

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "tours");

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.jpe?g$/i.test(entry.name)) yield full;
  }
}

const TARGET_WIDTH = 4096;

let total = 0;
let saved = 0;

for await (const file of walk(ROOT)) {
  const before = (await fs.stat(file)).size;
  const meta = await sharp(file).metadata();
  if (!meta.width) continue;

  // Skip already-small files; only resize when bigger than target.
  const needsResize = meta.width > TARGET_WIDTH;

  const tmp = file + ".tmp.jpg";
  let pipeline = sharp(file);
  if (needsResize) {
    pipeline = pipeline.resize({
      width: TARGET_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  await pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(tmp);

  const after = (await fs.stat(tmp)).size;
  // Only swap if we actually saved space — avoid making files bigger.
  if (after < before) {
    await fs.rename(tmp, file);
    saved += before - after;
    console.log(
      `${path.relative(process.cwd(), file)}: ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(1)}MB  (${meta.width}px${needsResize ? ` → ${TARGET_WIDTH}px` : ""})`,
    );
  } else {
    await fs.unlink(tmp);
    console.log(
      `${path.relative(process.cwd(), file)}: skipped (${(before / 1024 / 1024).toFixed(1)}MB already smaller)`,
    );
  }
  total++;
}

console.log(`\nProcessed ${total} files. Saved ${(saved / 1024 / 1024).toFixed(1)} MB total.`);
