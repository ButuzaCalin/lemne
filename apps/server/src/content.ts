import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  AwardsFileSchema,
  PromptsFileSchema,
  SlidesFileSchema,
  TitlesFileSchema,
} from '@lemne/shared';
import type { z } from 'zod';

const contentDir = fileURLToPath(new URL('../../../content/', import.meta.url));

function load<S extends z.ZodType>(file: string, schema: S): z.infer<S> {
  const raw = JSON.parse(readFileSync(contentDir + file, 'utf8'));
  return schema.parse(raw);
}

export const content = {
  slides: load('slides.json', SlidesFileSchema),
  titles: load('titles.json', TitlesFileSchema),
  prompts: load('prompts.json', PromptsFileSchema),
  awards: load('awards.json', AwardsFileSchema),
};
