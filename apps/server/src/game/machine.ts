import {
  AVATAR_COUNT,
  MAX_PHOTOS_PER_PLAYER,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PRESENTATION_SECONDS,
  RATING_SECONDS,
  ROUND_INTRO_SECONDS,
  ROUND_RESULTS_SECONDS,
  type ErrorCode,
  type Phase,
  type RoundResult,
  type SlideContent,
} from '@lemne/shared';
import { pickAwards, scoreRound, type AwardPick } from './scoring';

export interface Player {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  score: number;
  /** Uploaded photo ids; the bytes live in Room.photos. */
  photoIds: string[];
}

/** Everything random about a round, drawn by the caller before the game starts. */
export interface RoundPlan {
  presenterId: string;
  assistantId: string;
  title: string;
  /** One set of options per slide. */
  optionSets: SlideContent[][];
  /** One per slide; null means no prompt card for that slide. */
  prompts: (string | null)[];
}

export interface GameState {
  phase: Phase;
  players: Player[];
  /** First player to join; allowed to start the game from their phone. */
  vipId: string | null;
  rounds: RoundPlan[];
  roundIndex: number;
  /** Slide being picked or shown in the current round. */
  slideIndex: number;
  /** Slides the assistant picked so far this round; shown[slideIndex] is on the projector. */
  shown: SlideContent[];
  endsAt: number | null;
  /** playerId → 0…100, for the current round. */
  ratings: Record<string, number>;
  results: RoundResult[];
  awards: AwardPick[];
}

export type Action =
  | { type: 'player/join'; id: string; name: string }
  | { type: 'player/connection'; id: string; connected: boolean }
  | { type: 'player/remove'; id: string }
  | { type: 'player/photoAdd'; id: string; photoId: string }
  | { type: 'player/photoRemove'; id: string; photoId: string }
  | { type: 'game/start'; rounds: RoundPlan[]; now: number }
  | { type: 'game/restart' }
  | { type: 'slide/pick'; id: string; optionId: string }
  | { type: 'slide/next'; id: string; now: number }
  | { type: 'rating/submit'; id: string; value: number; now: number }
  | { type: 'timer/expire'; now: number };

export type Result = { ok: true; state: GameState } | { ok: false; error: ErrorCode };

const fail = (error: ErrorCode): Result => ({ ok: false, error });
const ok = (state: GameState): Result => ({ ok: true, state });

export function initialState(): GameState {
  return {
    phase: 'LOBBY',
    players: [],
    vipId: null,
    rounds: [],
    roundIndex: 0,
    slideIndex: 0,
    shown: [],
    endsAt: null,
    ratings: {},
    results: [],
    awards: [],
  };
}

export function currentRound(state: GameState): RoundPlan | null {
  if (state.phase === 'LOBBY' || state.phase === 'FINAL_RESULTS') return null;
  return state.rounds[state.roundIndex] ?? null;
}

/** Players who rate the current round: everyone except its presenter and assistant. */
export function raterIds(state: GameState): string[] {
  const round = currentRound(state);
  if (!round) return [];
  return state.players
    .filter((p) => p.id !== round.presenterId && p.id !== round.assistantId)
    .map((p) => p.id);
}

/** Pure: never mutates `state`, never reads the clock or randomness. */
export function reduce(state: GameState, action: Action): Result {
  switch (action.type) {
    case 'player/join': {
      if (state.phase !== 'LOBBY') return fail('GAME_IN_PROGRESS');
      if (state.players.length >= MAX_PLAYERS) return fail('ROOM_FULL');
      const taken = state.players.some(
        (p) => p.name.toLocaleLowerCase('ro') === action.name.toLocaleLowerCase('ro'),
      );
      if (taken) return fail('NAME_TAKEN');

      const player: Player = {
        id: action.id,
        name: action.name,
        avatar: nextAvatar(state.players),
        connected: true,
        score: 0,
        photoIds: [],
      };
      return ok({
        ...state,
        players: [...state.players, player],
        vipId: state.vipId ?? player.id,
      });
    }

    case 'player/connection':
      return ok({
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, connected: action.connected } : p,
        ),
      });

    case 'player/remove': {
      const players = state.players.filter((p) => p.id !== action.id);
      const vipId = state.vipId === action.id ? (players[0]?.id ?? null) : state.vipId;
      return ok({ ...state, players, vipId });
    }

    case 'player/photoAdd': {
      if (state.phase !== 'LOBBY') return fail('GAME_IN_PROGRESS');
      const player = state.players.find((p) => p.id === action.id);
      if (!player) return fail('NOT_IN_ROOM');
      if (player.photoIds.length >= MAX_PHOTOS_PER_PLAYER) return fail('TOO_MANY_PHOTOS');
      return ok(updatePlayer(state, action.id, { photoIds: [...player.photoIds, action.photoId] }));
    }

    case 'player/photoRemove': {
      if (state.phase !== 'LOBBY') return fail('GAME_IN_PROGRESS');
      const player = state.players.find((p) => p.id === action.id);
      if (!player) return fail('NOT_IN_ROOM');
      return ok(
        updatePlayer(state, action.id, {
          photoIds: player.photoIds.filter((id) => id !== action.photoId),
        }),
      );
    }

    case 'game/start': {
      if (state.phase !== 'LOBBY') return fail('WRONG_PHASE');
      if (state.players.filter((p) => p.connected).length < MIN_PLAYERS) {
        return fail('NOT_ENOUGH_PLAYERS');
      }
      if (action.rounds.length === 0) return fail('INVALID_PAYLOAD');
      return ok(
        startRound(
          {
            ...state,
            rounds: action.rounds,
            results: [],
            awards: [],
            players: state.players.map((p) => ({ ...p, score: 0 })),
          },
          0,
          action.now,
        ),
      );
    }

    case 'game/restart': {
      if (state.phase !== 'FINAL_RESULTS') return fail('WRONG_PHASE');
      return ok({
        ...initialState(),
        players: state.players.map((p) => ({ ...p, score: 0 })),
        vipId: state.vipId,
      });
    }

    case 'slide/pick': {
      if (state.phase !== 'PRESENTING') return fail('WRONG_PHASE');
      const round = currentRound(state)!;
      if (action.id !== round.assistantId) return fail('NOT_ALLOWED');
      if (state.shown.length > state.slideIndex) return fail('WRONG_PHASE');
      const option = round.optionSets[state.slideIndex]?.find((o) => o.id === action.optionId);
      if (!option) return fail('INVALID_PAYLOAD');
      return ok({ ...state, shown: [...state.shown, option] });
    }

    case 'slide/next': {
      if (state.phase !== 'PRESENTING') return fail('WRONG_PHASE');
      const round = currentRound(state)!;
      if (action.id !== round.presenterId) return fail('NOT_ALLOWED');
      if (state.shown.length <= state.slideIndex) return fail('WRONG_PHASE');
      if (state.slideIndex + 1 >= round.optionSets.length) return ok(startRating(state, action.now));
      return ok({ ...state, slideIndex: state.slideIndex + 1 });
    }

    case 'rating/submit': {
      if (state.phase !== 'RATING') return fail('WRONG_PHASE');
      if (!raterIds(state).includes(action.id)) return fail('NOT_ALLOWED');
      const next = { ...state, ratings: { ...state.ratings, [action.id]: action.value } };
      return ok(allRated(next) ? finishRound(next, action.now) : next);
    }

    case 'timer/expire': {
      if (state.endsAt === null || action.now < state.endsAt) return ok(state);
      switch (state.phase) {
        case 'ROUND_INTRO':
          return ok({
            ...state,
            phase: 'PRESENTING',
            endsAt: action.now + PRESENTATION_SECONDS * 1000,
          });
        case 'PRESENTING':
          return ok(startRating(state, action.now));
        case 'RATING':
          return ok(finishRound(state, action.now));
        case 'ROUND_RESULTS':
          return ok(
            state.roundIndex + 1 < state.rounds.length
              ? startRound(state, state.roundIndex + 1, action.now)
              : { ...state, phase: 'FINAL_RESULTS', endsAt: null, awards: pickAwards(state.results) },
          );
        default:
          return ok(state);
      }
    }
  }
}

function startRound(state: GameState, roundIndex: number, now: number): GameState {
  return {
    ...state,
    phase: 'ROUND_INTRO',
    roundIndex,
    slideIndex: 0,
    shown: [],
    ratings: {},
    endsAt: now + ROUND_INTRO_SECONDS * 1000,
  };
}

function startRating(state: GameState, now: number): GameState {
  const next: GameState = { ...state, phase: 'RATING', ratings: {}, endsAt: now + RATING_SECONDS * 1000 };
  return allRated(next) ? finishRound(next, now) : next;
}

/** Disconnected raters don't hold up the round; the timer covers anyone slow. */
function allRated(state: GameState): boolean {
  const connected = new Set(state.players.filter((p) => p.connected).map((p) => p.id));
  return raterIds(state)
    .filter((id) => connected.has(id))
    .every((id) => id in state.ratings);
}

function finishRound(state: GameState, now: number): GameState {
  const round = currentRound(state)!;
  const score = scoreRound(Object.values(state.ratings));
  const result: RoundResult = {
    presenterId: round.presenterId,
    assistantId: round.assistantId,
    title: round.title,
    votes: Object.keys(state.ratings).length,
    ...score,
  };
  return {
    ...state,
    phase: 'ROUND_RESULTS',
    endsAt: now + ROUND_RESULTS_SECONDS * 1000,
    results: [...state.results, result],
    players: state.players.map((p) => {
      if (p.id === round.presenterId) return { ...p, score: p.score + score.presenterPoints };
      if (p.id === round.assistantId) return { ...p, score: p.score + score.assistantPoints };
      return p;
    }),
  };
}

function updatePlayer(state: GameState, id: string, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  };
}

function nextAvatar(players: Player[]): number {
  const used = new Set(players.map((p) => p.avatar));
  for (let i = 0; i < AVATAR_COUNT; i++) if (!used.has(i)) return i;
  return players.length % AVATAR_COUNT;
}
