import {
  PROMPT_CHANCE,
  SLIDE_OPTIONS,
  SLIDES_PER_PRESENTATION,
  type Slide,
  type SlideContent,
} from '@lemne/shared';
import { Deck } from './deck';
import type { RoundPlan } from './machine';

export interface PlanInput {
  /** Presenter order; each player presents once, the next one assists. */
  playerIds: string[];
  slides: SlideContent[];
  titles: Deck<string>;
  prompts: Deck<string>;
  random?: () => number;
}

/** Draws every random thing for a whole game up front, so the reducer stays pure. */
export function planRounds({ playerIds, slides, titles, prompts, random = Math.random }: PlanInput): RoundPlan[] {
  const order = shuffled(playerIds, random);
  const slideDeck = new Deck(slides, random);
  return order.map((presenterId, i) => ({
    presenterId,
    assistantId: order[(i + 1) % order.length]!,
    title: titles.draw(1)[0] ?? '',
    optionSets: Array.from({ length: SLIDES_PER_PRESENTATION }, () =>
      // A tiny pool can reshuffle mid-draw; drop repeats within one set.
      slideDeck.draw(SLIDE_OPTIONS).filter((s, j, set) => set.findIndex((o) => o.id === s.id) === j),
    ),
    prompts: Array.from({ length: SLIDES_PER_PRESENTATION }, (_, s) =>
      s > 0 && random() < PROMPT_CHANCE ? (prompts.draw(1)[0] ?? null) : null,
    ),
  }));
}

export function toSlideContent(slide: Slide): SlideContent {
  return slide.type === 'image'
    ? { id: slide.id, kind: 'image', src: slide.src, thumb: slide.thumb, alt: slide.alt }
    : { id: slide.id, kind: 'text', text: slide.text };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  return new Deck(items, random).draw(items.length);
}
