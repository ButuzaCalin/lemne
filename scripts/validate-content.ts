/**
 * Checks content/*.json: schema, duplicate ids/texts, cedilla diacritics, and
 * (with --check-urls) that every image URL actually loads.
 *
 *   npm run content:validate
 *   npm run content:validate -- --check-urls
 */
import { existsSync, readFileSync } from 'node:fs';
import {
  AwardsFileSchema,
  PromptsFileSchema,
  SlidesFileSchema,
  TitlesFileSchema,
  TransitionsFileSchema,
  LOCAL_IMAGES_PATH,
} from '@lemne/shared';
import type { z } from 'zod';

const dir = new URL('../content/', import.meta.url);
const errors: string[] = [];

function load<S extends z.ZodType>(file: string, schema: S): z.infer<S> | null {
  const raw = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const issue of res.error.issues) {
      errors.push(`${file} [${issue.path.join('.')}]: ${issue.message}`);
    }
    return null;
  }
  return res.data;
}

// ş ţ Ş Ţ (cedilla) instead of ș ț Ș Ț (comma below).
const CEDILLA = /[şţŞŢ]/;

function checkText(file: string, where: string, text: string) {
  if (CEDILLA.test(text)) errors.push(`${file} [${where}]: uses ş/ţ with cedilla, use ș/ț: "${text}"`);
}

function checkDuplicates(file: string, values: string[]) {
  const seen = new Set<string>();
  for (const v of values) {
    const key = v.toLocaleLowerCase('ro');
    if (seen.has(key)) errors.push(`${file}: duplicate "${v}"`);
    seen.add(key);
  }
}

const slides = load('slides.json', SlidesFileSchema);
const titles = load('titles.json', TitlesFileSchema);
const prompts = load('prompts.json', PromptsFileSchema);
const awards = load('awards.json', AwardsFileSchema);
const transitions = load('transitions.json', TransitionsFileSchema);

if (slides) {
  checkDuplicates('slides.json', slides.map((s) => s.id));
  for (const s of slides) checkText('slides.json', s.id, s.type === 'text' ? s.text : s.alt);
  // Local images must exist on disk; remote ones are only checked with --check-urls.
  for (const s of slides) {
    if (s.type !== 'image') continue;
    for (const src of [s.src, s.thumb]) {
      if (!src.startsWith(LOCAL_IMAGES_PATH)) continue;
      const file = new URL(`images/${src.slice(LOCAL_IMAGES_PATH.length)}`, dir);
      if (!existsSync(file)) errors.push(`slides.json [${s.id}]: missing file content${src}`);
    }
  }
}
if (titles) {
  checkDuplicates('titles.json', titles);
  titles.forEach((t, i) => checkText('titles.json', String(i), t));
}
if (prompts) {
  checkDuplicates('prompts.json', prompts);
  prompts.forEach((p, i) => checkText('prompts.json', String(i), p));
}
if (transitions) {
  checkDuplicates('transitions.json', transitions);
  transitions.forEach((t, i) => checkText('transitions.json', String(i), t));
}
if (awards) {
  checkDuplicates('awards.json', awards.map((a) => a.id));
  for (const a of awards) checkText('awards.json', a.id, `${a.title} ${a.description}`);
}

if (slides && process.argv.includes('--check-urls')) {
  const urls = slides
    .flatMap((s) => (s.type === 'image' ? [s.src, s.thumb] : []))
    .filter((url) => !url.startsWith(LOCAL_IMAGES_PATH));
  await Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
      if (!res?.ok) errors.push(`slides.json: ${url} → ${res?.status ?? 'network error'}`);
    }),
  );
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

const images = slides?.filter((s) => s.type === 'image').length ?? 0;
console.log(
  `✓ content OK: ${slides?.length} slides (${images} images), ${titles?.length} titles, ` +
    `${prompts?.length} prompts, ${transitions?.length} transitions, ${awards?.length} awards`,
);
