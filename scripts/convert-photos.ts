/**
 * Converts every photo in source_photos/ to WebP in resulted_photos/, then deletes the
 * source. Each photo gives a 1920px image for the TV and a 480px "-thumb" for phones.
 *
 *   npm run photos:convert
 *
 * A source is only deleted after both of its WebPs were written, so a failed file stays put.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { extname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HOST_EDGE_PX = 1920;
const THUMB_EDGE_PX = 480;
const QUALITY = 80;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.tif', '.tiff']);

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDir = join(root, 'source_photos');
const resultDir = join(root, 'resulted_photos');

const files = readdirSync(sourceDir).filter(
  (f) => !f.startsWith('.') && EXTENSIONS.has(extname(f).toLowerCase()),
);
if (files.length === 0) {
  console.log('Nothing to convert: source_photos/ is empty.');
  process.exit(0);
}

let converted = 0;
const failed: string[] = [];

for (const file of files) {
  const name = uniqueName(slug(parse(file).name));
  const src = join(sourceDir, file);
  try {
    // .rotate() applies EXIF orientation so phone photos aren't sideways.
    const base = sharp(src).rotate();
    await base
      .clone()
      .resize(HOST_EDGE_PX, HOST_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(resultDir, `${name}.webp`));
    await base
      .clone()
      .resize(THUMB_EDGE_PX, THUMB_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(join(resultDir, `${name}-thumb.webp`));
    rmSync(src);
    converted++;
    console.log(`  ✓ ${file} → ${name}.webp`);
  } catch (err) {
    failed.push(`${file}: ${(err as Error).message}`);
  }
}

console.log(`\n${converted} converted, ${failed.length} failed`);
for (const f of failed) console.error(`  ✗ ${f}`);
if (failed.length > 0) process.exit(1);

/** "Capră pe Acoperiș (2).JPG" → "capra-pe-acoperis-2": safe for URLs and the /images/ pattern. */
function slug(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'poza';
}

/** Never overwrite an earlier result: add -2, -3… when the name is taken. */
function uniqueName(name: string): string {
  let candidate = name;
  for (let i = 2; existsSync(join(resultDir, `${candidate}.webp`)); i++) candidate = `${name}-${i}`;
  return candidate;
}
