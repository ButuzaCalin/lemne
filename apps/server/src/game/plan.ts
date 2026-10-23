import {
  PROMPT_CHANCE,
  SLIDE_OPTIONS,
  SLIDES_PER_PRESENTATION,
  TITLE_CHOICES,
  type Slide,
  type SlideContent,
} from '@lemne/shared';
import { Deck } from './deck';
import type { RoundPlan } from './machine';

export interface PlanInput {
  /** Presenter order; each player presents once, the next one assists. */
  playerIds: string[];
  /** Photos the players uploaded. They take priority over stock slides. */
  photos: SlideContent[];
  stock: SlideContent[];
  titles: Deck<string>;
  prompts: Deck<string>;
  random?: () => number;
}

/** Draws every random thing for a whole game up front, so the reducer stays pure. */
export function planRounds({
  playerIds,
  photos,
  stock,
  titles,
  prompts,
  random = Math.random,
}: PlanInput): RoundPlan[] {
  const order = shuffled(playerIds, random);
  const stockDeck = new Deck(stock, random);
  // Deal photos like cards so every presentation gets an equal share (±1).
  const dealt: SlideContent[][] = order.map(() => []);
  shuffled(photos, random).forEach((photo, i) => dealt[i % order.length]!.push(photo));

  return order.map((presenterId, i) => ({
    presenterId,
    assistantId: order[(i + 1) % order.length]!,
    fallbackTitles: titles.draw(TITLE_CHOICES),
    optionSets: buildOptionSets(dealt[i]!, stockDeck, random),
    prompts: Array.from({ length: SLIDES_PER_PRESENTATION }, (_, s) =>
      s > 0 && random() < PROMPT_CHANCE ? (prompts.draw(1)[0] ?? null) : null,
    ),
  }));
}

/**
 * Spreads this round's photos across its slides (at most SLIDE_OPTIONS per slide), then tops
 * every set up with stock. Options are shuffled so a photo isn't always in the same spot.
 */
function buildOptionSets(
  photos: SlideContent[],
  stockDeck: Deck<SlideContent>,
  random: () => number,
): SlideContent[][] {
  const sets: SlideContent[][] = Array.from({ length: SLIDES_PER_PRESENTATION }, () => []);
  photos.slice(0, SLIDES_PER_PRESENTATION * SLIDE_OPTIONS).forEach((photo, i) => {
    sets[i % SLIDES_PER_PRESENTATION]!.push(photo);
  });
  return sets.map((set) => {
    // A small stock pool can reshuffle mid-draw; skip repeats within one set.
    for (let tries = 0; set.length < SLIDE_OPTIONS && tries < SLIDE_OPTIONS * 4; tries++) {
      const next = stockDeck.draw(1)[0];
      if (!next) break;
      if (!set.some((o) => o.id === next.id)) set.push(next);
    }
    return shuffled(set, random);
  });
}

/**
 * Slides are images. Text slides only fill in while there are too few images to offer a
 * full set of options, so a room with no images yet still plays.
 */
export function imagePool(slides: SlideContent[]): SlideContent[] {
  const images = slides.filter((s) => s.kind === 'image');
  return images.length >= SLIDE_OPTIONS * 2 ? images : slides;
}

export function toSlideContent(slide: Slide): SlideContent {
  return slide.type === 'image'
    ? { id: slide.id, kind: 'image', src: slide.src, thumb: slide.thumb, alt: slide.alt }
    : { id: slide.id, kind: 'text', text: slide.text };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  return new Deck(items, random).draw(items.length);
}
