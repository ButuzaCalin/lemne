import { readFileSync } from 'node:fs';
import {
  AwardsFileSchema,
  PromptsFileSchema,
  SlidesFileSchema,
  TitlesFileSchema,
  TransitionsFileSchema,
} from '@lemne/shared';
import type { z } from 'zod';
import { contentDir } from './paths';

function load<S extends z.ZodType>(file: string, schema: S): z.infer<S> {
  const raw = JSON.parse(readFileSync(contentDir + file, 'utf8'));
  return schema.parse(raw);
}

export const content = {
  slides: load('slides.json', SlidesFileSchema),
  titles: load('titles.json', TitlesFileSchema),
  prompts: load('prompts.json', PromptsFileSchema),
  transitions: load('transitions.json', TransitionsFileSchema),
  awards: load('awards.json', AwardsFileSchema),
};
