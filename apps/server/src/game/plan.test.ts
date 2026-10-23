import { describe, expect, it } from 'vitest';
import { SLIDE_OPTIONS, SLIDES_PER_PRESENTATION, type SlideContent } from '@lemne/shared';
import { Deck } from './deck';
import type { RoundPlan } from './machine';
import { imagePool, planRounds } from './plan';

const image = (id: string): SlideContent => ({ id, kind: 'image', src: id, thumb: id, alt: id });
const text = (id: string): SlideContent => ({ id, kind: 'text', text: id });

describe('imagePool', () => {
  it('uses only images once there are enough of them', () => {
    const images = Array.from({ length: SLIDE_OPTIONS * 2 }, (_, i) => image(`i${i}`));
    expect(imagePool([text('t'), ...images])).toEqual(images);
  });

  it('falls back to text slides while images are scarce', () => {
    const pool = [image('i'), text('t')];
    expect(imagePool(pool)).toEqual(pool);
  });
});

describe('planRounds', () => {
  const titles = new Deck(['t1', 't2', 't3']);
  const prompts = new Deck(['p']);
  const stock = Array.from({ length: 30 }, (_, i) => image(`stock${i}`));
  const players = ['a', 'b', 'c'];
  const photoIds = (round: RoundPlan) =>
    round.optionSets.flat().filter((o) => o.id.startsWith('photo'));

  it('spreads player photos evenly across presentations', () => {
    const photos = Array.from({ length: 7 }, (_, i) => image(`photo${i}`));
    const rounds = planRounds({ playerIds: players, photos, stock, titles, prompts });
    const counts = rounds.map((r) => photoIds(r).length).sort();
    expect(counts).toEqual([2, 2, 3]);
  });

  it('uses every photo and fills the rest with stock, three options per slide', () => {
    const photos = Array.from({ length: 4 }, (_, i) => image(`photo${i}`));
    const rounds = planRounds({ playerIds: players, photos, stock, titles, prompts });
    expect(new Set(rounds.flatMap(photoIds).map((p) => p.id)).size).toBe(4);
    for (const set of rounds.flatMap((r) => r.optionSets)) {
      expect(set).toHaveLength(SLIDE_OPTIONS);
      expect(new Set(set.map((o) => o.id)).size).toBe(SLIDE_OPTIONS);
    }
  });

  it('puts at most one photo per slide until every slide has one', () => {
    const photos = Array.from({ length: 3 * SLIDES_PER_PRESENTATION }, (_, i) => image(`photo${i}`));
    const rounds = planRounds({ playerIds: players, photos, stock, titles, prompts });
    for (const set of rounds.flatMap((r) => r.optionSets)) {
      expect(set.filter((o) => o.id.startsWith('photo'))).toHaveLength(1);
    }
  });
});
