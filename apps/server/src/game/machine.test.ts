import { describe, expect, it } from 'vitest';
import { MAX_PHOTOS_PER_PLAYER, MAX_PLAYERS, type SlideContent } from '@lemne/shared';
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
    title: `titlu ${presenterId}`,
    optionSets: Array.from({ length: slides }, (_, i) => [slide(`s${i}a`), slide(`s${i}b`)]),
    prompts: Array.from({ length: slides }, (_, i) => (i === 1 ? 'Spune o poveste.' : null)),
  };
}

const NOW = 1_000_000;
const threePlayers = () => apply(initialState(), join('a'), join('b'), join('c'));
const start = (rounds = [plan('a', 'b'), plan('b', 'c')]): Action => ({
  type: 'game/start',
  rounds,
  now: NOW,
});
const expire = (now: number): Action => ({ type: 'timer/expire', now });

/** Started game, intro finished, so round 0 is PRESENTING. */
function presenting() {
  const s = apply(threePlayers(), start());
  return apply(s, expire(s.endsAt!));
}

describe('game/start', () => {
  it('needs at least three connected players', () => {
    const s = apply(initialState(), join('a'), join('b'));
    expect(reduce(s, start())).toEqual({ ok: false, error: 'NOT_ENOUGH_PLAYERS' });
  });

  it('moves to the round intro with a timer and resets scores', () => {
    const s = apply(threePlayers(), start());
    expect(s.phase).toBe('ROUND_INTRO');
    expect(s.roundIndex).toBe(0);
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

  it('opens the presentation after the intro', () => {
    expect(presenting().phase).toBe('PRESENTING');
  });

  it('cuts the presentation off when time runs out', () => {
    const s = presenting();
    expect(apply(s, expire(s.endsAt!)).phase).toBe('RATING');
  });
});

describe('slides', () => {
  it('lets only the assistant pick, once per slide', () => {
    const s = presenting();
    expect(reduce(s, { type: 'slide/pick', id: 'a', optionId: 's0a' })).toEqual({
      ok: false,
      error: 'NOT_ALLOWED',
    });
    const picked = apply(s, { type: 'slide/pick', id: 'b', optionId: 's0b' });
    expect(picked.shown.map((x) => x.id)).toEqual(['s0b']);
    expect(reduce(picked, { type: 'slide/pick', id: 'b', optionId: 's0a' })).toEqual({
      ok: false,
      error: 'WRONG_PHASE',
    });
  });

  it('rejects options that are not on offer', () => {
    expect(reduce(presenting(), { type: 'slide/pick', id: 'b', optionId: 's1a' })).toEqual({
      ok: false,
      error: 'INVALID_PAYLOAD',
    });
  });

  it('lets the presenter advance only after a pick, then goes to rating', () => {
    const s = presenting();
    const next: Action = { type: 'slide/next', id: 'a', now: NOW };
    expect(reduce(s, next)).toEqual({ ok: false, error: 'WRONG_PHASE' });
    const s1 = apply(s, { type: 'slide/pick', id: 'b', optionId: 's0a' }, next);
    expect(s1.slideIndex).toBe(1);
    const s2 = apply(s1, { type: 'slide/pick', id: 'b', optionId: 's1a' }, next);
    expect(s2.phase).toBe('RATING');
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
      s = apply(s, expire(s.endsAt!)); // intro → presenting
      s = apply(s, expire(s.endsAt!)); // presenting → rating
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
