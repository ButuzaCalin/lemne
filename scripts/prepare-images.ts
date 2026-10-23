/**
 * Image pipeline (README §5):
 *   1. read source images from the folder given as argv[2]
 *   2. sharp → 1920px WebP (host) + 480px WebP thumbnail (assistant's phone)
 *   3. write both to content/images/, served by our own server at /images/
 *   4. append new entries to content/slides.json
 *
 *   npm run content:images ~/lemne-raw
 *
 * Re-running is safe: sources already imported (matched by content hash) are skipped.
 * TODO: upload to R2 and write https URLs instead of /images/ paths.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { LOCAL_IMAGES_PATH, SlidesFileSchema, type Slide } from '@lemne/shared';

const HOST_EDGE_PX = 1920;
const THUMB_EDGE_PX = 480;
const QUALITY = 80;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.tif', '.tiff']);

const contentDir = new URL('../content/', import.meta.url);
const imagesDir = new URL('images/', contentDir);
const slidesFile = new URL('slides.json', contentDir);

const source = process.argv[2];
if (!source) {
  console.error('Usage: npm run content:images <folder-with-images>');
  process.exit(1);
}
const sourceDir = resolve(source.replace(/^~(?=$|\/)/, process.env.HOME ?? '~'));

const slides = SlidesFileSchema.parse(JSON.parse(readFileSync(slidesFile, 'utf8')));
const known = new Set(slides.flatMap((s) => (s.type === 'image' && s.sourceHash ? [s.sourceHash] : [])));
let nextNumber =
  Math.max(0, ...slides.filter((s) => s.type === 'image').map((s) => Number(s.id.slice(4)))) + 1;

const files = readdirSync(sourceDir)
  .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()) && !f.startsWith('.'))
  .sort((a, b) => a.localeCompare(b, 'ro', { numeric: true }));

mkdirSync(imagesDir, { recursive: true });

const added: Slide[] = [];
const failed: string[] = [];
let skipped = 0;

for (const file of files) {
  const bytes = readFileSync(join(sourceDir, file));
  const sourceHash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  if (known.has(sourceHash)) {
    skipped++;
    continue;
  }

  const number = String(nextNumber).padStart(3, '0');
  try {
    // .rotate() applies EXIF orientation so phone photos aren't sideways.
    const base = sharp(bytes).rotate();
    await base
      .clone()
      .resize(HOST_EDGE_PX, HOST_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(fileURLToPath(new URL(`${number}.webp`, imagesDir)));
    await base
      .clone()
      .resize(THUMB_EDGE_PX, THUMB_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(fileURLToPath(new URL(`${number}-thumb.webp`, imagesDir)));
  } catch (err) {
    failed.push(`${file}: ${(err as Error).message}`);
    continue;
  }

  known.add(sourceHash);
  nextNumber++;
  added.push({
    id: `img-${number}`,
    type: 'image',
    src: `${LOCAL_IMAGES_PATH}${number}.webp`,
    thumb: `${LOCAL_IMAGES_PATH}${number}-thumb.webp`,
    alt: altFromFileName(file),
    tags: [],
    sourceHash,
  });
  console.log(`  + img-${number}  ${file}`);
}

if (added.length > 0) {
  const all = [...slides, ...added];
  // One slide per line keeps diffs readable.
  writeFileSync(slidesFile, `[\n${all.map((s) => `  ${JSON.stringify(s)}`).join(',\n')}\n]\n`);
}

console.log(`\n✓ ${added.length} added, ${skipped} already imported, ${failed.length} failed`);
for (const f of failed) console.error(`  ✗ ${f}`);
if (added.length > 0) {
  console.log(
    '\nThe "alt" texts come from the file names. Fix them in content/slides.json (with diacritics),\n' +
      'then run: npm run content:validate',
  );
}
if (failed.length > 0) process.exit(1);

/** "capra_pe-acoperis 2.jpg" → "Capra pe acoperis 2". */
function altFromFileName(file: string): string {
  const words = parse(file).name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return words ? words.charAt(0).toLocaleUpperCase('ro') + words.slice(1) : 'Imagine';
}
