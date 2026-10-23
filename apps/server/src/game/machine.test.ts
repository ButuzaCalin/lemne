import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTOS_PER_PLAYER,
  MAX_PLAYERS,
  MAX_TITLES_PER_PLAYER,
  type SlideContent,
} from '@lemne/shared';
import { initialState, reduce, type Action, type GameState, type RoundPlan } from './machine';

function apply(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => {
    const res = reduce(s, a);
    if (!res.ok) throw new Error(res.error);
    return res.state;
  }, state);
}

const join = (id: string, name = id): Action => ({
  type: 'player/join',
  id,
  name,
});

describe('lobby', () => {
  it('adds players and makes the first one VIP', () => {
    const s = apply(initialState(), join('a'), join('b'));
    expect(s.players.map((p) => p.id)).toEqual(['a', 'b']);
    expect(s.vipId).toBe('a');
  });

  it('gives each player a different avatar', () => {
    const s = apply(initialState(), join('a'), join('b'), join('c'));
    expect(new Set(s.players.map((p) => p.avatar)).size).toBe(3);
  });

  it('rejects duplicate names, ignoring case and diacritics casing', () => {
    const s = apply(initialState(), join('a', 'Ștefan'));
    expect(reduce(s, join('b', 'ștefan'))).toEqual({
      ok: false,
      error: 'NAME_TAKEN',
    });
  });

  it('rejects joins past the player limit', () => {
    const ids = Array.from({ length: MAX_PLAYERS }, (_, i) => `p${i}`);
    const s = apply(initialState(), ...ids.map((id) => join(id)));
    expect(reduce(s, join('extra'))).toEqual({ ok: false, error: 'ROOM_FULL' });
  });

  it('hands VIP to the next player when the VIP is removed', () => {
    const s = apply(initialState(), join('a'), join('b'), {
      type: 'player/remove',
      id: 'a',
    });
    expect(s.vipId).toBe('b');
  });

  it('does not mutate the previous state', () => {
    const before = initialState();
    apply(before, join('a'));
    expect(before.players).toEqual([]);
  });
});

describe('photos', () => {
  const add = (id: string, photoId: string): Action => ({
    type: 'player/photoAdd',
    id,
    photoId,
  });

  it('adds photos to the right player', () => {
    const s = apply(initialState(), join('a'), join('b'), add('a', 'x'), add('a', 'y'));
    expect(s.players[0]!.photoIds).toEqual(['x', 'y']);
    expect(s.players[1]!.photoIds).toEqual([]);
  });

  it('caps photos per player', () => {
    const ids = Array.from({ length: MAX_PHOTOS_PER_PLAYER }, (_, i) => add('a', `p${i}`));
    const s = apply(initialState(), join('a'), ...ids);
    expect(reduce(s, add('a', 'extra'))).toEqual({
      ok: false,
      error: 'TOO_MANY_PHOTOS',
    });
  });

  it('rejects photos from unknown players', () => {
    expect(reduce(initialState(), add('ghost', 'x'))).toEqual({
      ok: false,
      error: 'NOT_IN_ROOM',
    });
  });

  it('removes a photo', () => {
    const s = apply(initialState(), join('a'), add('a', 'x'), add('a', 'y'), {
      type: 'player/photoRemove',
      id: 'a',
      photoId: 'x',
    });
    expect(s.players[0]!.photoIds).toEqual(['y']);
  });

  it('only accepts photo changes in the lobby', () => {
    const s = {
      ...apply(initialState(), join('a')),
      phase: 'PRESENTING' as const,
    };
    expect(reduce(s, add('a', 'x'))).toEqual({
      ok: false,
      error: 'GAME_IN_PROGRESS',
    });
  });
});

const slide = (id: string): SlideContent => ({ id, kind: 'text', text: id });

function plan(presenterId: string, assistantId: string, slides = 2): RoundPlan {
  return {
    presenterId,
    assistantId,
    fallbackTitles: [`rezervă ${presenterId}`],
    optionSets: Array.from({ length: slides }, (_, i) => [slide(`s${i}a`), slide(`s${i}b`)]),
    prompts: Array.from({ length: slides }, (_, i) => (i === 1 ? 'Spune o poveste.' : null)),
    transitions: Array.from({ length: slides }, (_, i) => (i > 0 ? 'Și acum…' : null)),
  };
}

const NOW = 1_000_000;
const threePlayers = () => apply(initialState(), join('a'), join('b'), join('c'));
const start = (rounds = [plan('a', 'b'), plan('b', 'c')]): Action => ({
  type: 'game/start',
  rounds,
  seed: 42,
  now: NOW,
});
const expire = (now: number): Action => ({ type: 'timer/expire', now });

/** Runs timers until the phase changes away from `from`. */
function until(s: GameState, phase: GameState['phase']): GameState {
  for (let i = 0; i < 10 && s.phase !== phase; i++) s = apply(s, expire(s.endsAt!));
  return s;
}

/** Started game, titles and intro skipped by timers, so round 0 is PRESENTING. */
function presenting() {
  return until(apply(threePlayers(), start()), 'PRESENTING');
}

describe('game/start', () => {
  it('needs at least three connected players', () => {
    const s = apply(initialState(), join('a'), join('b'));
    expect(reduce(s, start())).toEqual({ ok: false, error: 'NOT_ENOUGH_PLAYERS' });
  });

  it('moves to title writing with a timer', () => {
    const s = apply(threePlayers(), start());
    expect(s.phase).toBe('TITLE_WRITING');
    expect(s.endsAt).toBeGreaterThan(NOW);
  });

  it('only starts from the lobby', () => {
    const s = apply(threePlayers(), start());
    expect(reduce(s, start())).toEqual({ ok: false, error: 'WRONG_PHASE' });
  });
});

describe('timer/expire', () => {
  it('ignores early ticks', () => {
    const s = apply(threePlayers(), start());
    expect(reduce(s, expire(s.endsAt! - 1))).toEqual({ ok: true, state: s });
  });

  it('opens the presentation after titles and the intro', () => {
    expect(presenting().phase).toBe('PRESENTING');
  });

  it('cuts the presentation off when time runs out', () => {
    const s = presenting();
    expect(apply(s, expire(s.endsAt!)).phase).toBe('RATING');
  });
});

describe('slides', () => {
  const pick = (optionId: string): Action => ({ type: 'slide/pick', id: 'b', optionId });
  const next: Action = { type: 'slide/next', id: 'a', now: NOW };

  it('lets only the assistant pick', () => {
    expect(reduce(presenting(), { type: 'slide/pick', id: 'a', optionId: 's0a' })).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    });
  });

  it('lets the assistant pick the next slide while the current one is up, but no further', () => {
    const s = apply(presenting(), pick('s0b'), pick('s1a'));
    expect(s.shown.map((x) => x.id)).toEqual(['s0b', 's1a']);
    expect(s.slideIndex).toBe(0);
    expect(reduce(s, pick('s2a'))).toEqual({ ok: false, error: 'WRONG_PHASE' });
  });

  it('rejects options that are not on offer for the slide being picked', () => {
    expect(reduce(presenting(), pick('s1a'))).toEqual({ ok: false, error: 'INVALID_PAYLOAD' });
  });

  it('only lets the presenter advance once the next slide is ready', () => {
    const s = apply(presenting(), pick('s0a'));
    expect(reduce(s, next)).toEqual({ ok: false, error: 'WRONG_PHASE' });
    const s1 = apply(s, pick('s1a'), next);
    expect(s1.slideIndex).toBe(1);
  });

  it('finishes from the last slide without anything queued', () => {
    const s = apply(presenting(), pick('s0a'), pick('s1a'), next, next);
    expect(s.phase).toBe('RATING');
  });
});

describe('rating', () => {
  function rating() {
    const s = presenting();
    return apply(s, expire(s.endsAt!));
  }

  it('only lets the audience rate', () => {
    expect(reduce(rating(), { type: 'rating/submit', id: 'a', value: 50, now: NOW })).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    });
  });

  it('scores the round once everyone rated', () => {
    const s = apply(rating(), { type: 'rating/submit', id: 'c', value: 80, now: NOW });
    expect(s.phase).toBe('ROUND_RESULTS');
    expect(s.results[0]).toMatchObject({ average: 80, votes: 1, presenterPoints: 400, assistantPoints: 160 });
    expect(s.players.find((p) => p.id === 'a')!.score).toBe(400);
    expect(s.players.find((p) => p.id === 'b')!.score).toBe(160);
  });

  it('gives no points when nobody rated in time', () => {
    const s = rating();
    const done = apply(s, expire(s.endsAt!));
    expect(done.results[0]).toMatchObject({ average: null, presenterPoints: 0 });
  });
});

describe('end of game', () => {
  function finished() {
    let s = apply(threePlayers(), start());
    const ratings = [90, 10];
    const raters = ['c', 'a'];
    for (let r = 0; r < 2; r++) {
      s = until(s, 'RATING');
      s = apply(s, { type: 'rating/submit', id: raters[r]!, value: ratings[r]!, now: NOW });
      s = apply(s, expire(s.endsAt!)); // results → next
    }
    return s;
  }

  it('ends with awards for best and worst presentations', () => {
    const s = finished();
    expect(s.phase).toBe('FINAL_RESULTS');
    expect(s.awards).toEqual([
      { awardId: 'diamantul-serii', playerId: 'a' },
      { awardId: 'cel-mai-lemn', playerId: 'b' },
      { awardId: 'asistentul-tradator', playerId: 'c' },
    ]);
  });

  it('restarts into the lobby with the same players and zero scores', () => {
    const s = apply(finished(), { type: 'game/restart' });
    expect(s.phase).toBe('LOBBY');
    expect(s.players.map((p) => p.score)).toEqual([0, 0, 0]);
    expect(s.results).toEqual([]);
  });
});

describe('titles', () => {
  const write = (id: string, text: string): Action => ({ type: 'title/submit', id, text });
  const done = (id: string): Action => ({ type: 'title/done', id, now: NOW });
  const writing = () => apply(threePlayers(), start());
  const allWrote = () =>
    apply(
      writing(),
      write('a', 'A unu'),
      write('a', 'A doi'),
      write('b', 'B unu'),
      write('b', 'B doi'),
      write('c', 'C unu'),
      write('c', 'C doi'),
    );

  it('caps titles per player and rejects duplicates across players', () => {
    let s = writing();
    for (let i = 0; i < MAX_TITLES_PER_PLAYER; i++) s = apply(s, write('a', `titlu ${i}`));
    expect(reduce(s, write('a', 'încă unul'))).toEqual({ ok: false, error: 'TOO_MANY_TITLES' });
    expect(reduce(s, write('b', 'TITLU 0'))).toEqual({ ok: false, error: 'DUPLICATE_TITLE' });
  });

  it('lets a player remove their own title', () => {
    const s = apply(writing(), write('a', 'X'), { type: 'title/remove', id: 'a', text: 'X' });
    expect(s.titles).toEqual([]);
  });

  it('needs the minimum before a player can say they are done', () => {
    const s = apply(writing(), write('a', 'Doar unul'));
    expect(reduce(s, done('a'))).toEqual({ ok: false, error: 'NOT_ENOUGH_TITLES' });
  });

  it('starts the first round once everyone is done, offering only titles by others', () => {
    const s = apply(allWrote(), done('a'), done('b'), done('c'));
    expect(s.phase).toBe('ROUND_INTRO');
    expect(s.roundTitle).toBeNull();
    expect(s.titleChoices).toHaveLength(3);
    expect(s.titleChoices.some((t) => t.startsWith('A '))).toBe(false);
  });

  it('fills missing choices with hand-made titles', () => {
    const s = until(apply(writing(), write('b', 'B unu')), 'ROUND_INTRO');
    expect(s.titleChoices).toEqual(['B unu', 'rezervă a']);
  });

  it('lets only the presenter pick, marks the title used and never offers it again', () => {
    const s = until(allWrote(), 'ROUND_INTRO');
    const choice = s.titleChoices[0]!;
    expect(reduce(s, { type: 'title/pick', id: 'b', text: choice, now: NOW })).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    });
    const picked = apply(s, { type: 'title/pick', id: 'a', text: choice, now: NOW });
    expect(picked.roundTitle).toBe(choice);
    const next = until(until(picked, 'ROUND_RESULTS'), 'ROUND_INTRO');
    expect(next.titleChoices).not.toContain(choice);
  });

  it('gives the first choice to a presenter who does not pick in time', () => {
    const s = until(allWrote(), 'ROUND_INTRO');
    expect(apply(s, expire(s.endsAt!)).roundTitle).toBe(s.titleChoices[0]);
  });
});
