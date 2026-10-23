import {
  AVATAR_COUNT,
  MAX_PHOTOS_PER_PLAYER,
  MAX_TITLES_PER_PLAYER,
  MIN_TITLES_PER_PLAYER,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PRESENTATION_SECONDS,
  RATING_SECONDS,
  ROUND_INTRO_SECONDS,
  ROUND_RESULTS_SECONDS,
  TITLE_CHOICES,
  TITLE_PICK_SECONDS,
  TITLE_WRITING_SECONDS,
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
  /** Tapped „Sunt gata” in the lobby. The VIP doesn't need to: starting is their yes. */
  ready: boolean;
}

/** Everything random about a round, drawn by the caller before the game starts. */
export interface RoundPlan {
  presenterId: string;
  assistantId: string;
  /** Hand-made titles, only used when players wrote too few to offer a full choice. */
  fallbackTitles: string[];
  /** One set of options per slide. */
  optionSets: SlideContent[][];
  /** One per slide: the line the TV shows before it. Null for the first slide. */
  transitions: (string | null)[];
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
  /** Titles the players wrote in TITLE_WRITING. Each is used at most once. */
  titles: WrittenTitle[];
  /** Players who said they are done writing. */
  titlesDone: string[];
  /** Seeds the deterministic shuffle of title choices, so the reducer stays pure. */
  titleSeed: number;
  /** What the presenter may pick from this round. */
  titleChoices: string[];
  /** The presenter's pick; null while they are still choosing. */
  roundTitle: string | null;
}

export interface WrittenTitle {
  authorId: string;
  text: string;
  used: boolean;
}

export type Action =
  | { type: 'player/join'; id: string; name: string }
  | { type: 'player/connection'; id: string; connected: boolean }
  | { type: 'player/remove'; id: string }
  | { type: 'player/ready'; id: string; ready: boolean }
  | { type: 'player/photoAdd'; id: string; photoId: string }
  | { type: 'player/photoRemove'; id: string; photoId: string }
  | { type: 'game/start'; rounds: RoundPlan[]; seed: number; now: number }
  | { type: 'title/submit'; id: string; text: string }
  | { type: 'title/remove'; id: string; text: string }
  | { type: 'title/done'; id: string; now: number }
  | { type: 'title/pick'; id: string; text: string; now: number }
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
    titles: [],
    titlesDone: [],
    titleSeed: 0,
    titleChoices: [],
    roundTitle: null,
  };
}

export function currentRound(state: GameState): RoundPlan | null {
  if (state.phase === 'LOBBY' || state.phase === 'TITLE_WRITING' || state.phase === 'FINAL_RESULTS') {
    return null;
  }
  return state.rounds[state.roundIndex] ?? null;
}

/** Every connected player except the VIP has said they're ready. */
export function everyoneReady(state: GameState): boolean {
  return state.players.every((p) => !p.connected || p.id === state.vipId || p.ready);
}

/** Players who rate the current round: everyone except its presenter and assistant. */
export function raterIds(state: GameState): string[] {
  const round = currentRound(state);
  if (!round) return [];
  return state.players
    .filter((p) => p.id !== round.presenterId && p.id !== round.assistantId)
    .map((p) => p.id);
}

/**
 * Which slide the assistant is choosing now, or null when they are waiting. The assistant
 * works one slide ahead: while the presenter talks over slide N, they pick slide N+1.
 */
export function nextPickIndex(state: GameState): number | null {
  const round = currentRound(state);
  if (state.phase !== 'PRESENTING' || !round) return null;
  const index = state.shown.length;
  if (index >= round.optionSets.length || index > state.slideIndex + 1) return null;
  return index;
}

/** The presenter may move on once the current slide is up and the next one is ready. */
export function canAdvance(state: GameState): boolean {
  const round = currentRound(state);
  if (state.phase !== 'PRESENTING' || !round) return false;
  const last = state.slideIndex + 1 >= round.optionSets.length;
  return state.shown.length > (last ? state.slideIndex : state.slideIndex + 1);
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
        ready: false,
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

    case 'player/ready': {
      if (state.phase !== 'LOBBY') return fail('GAME_IN_PROGRESS');
      if (!state.players.some((p) => p.id === action.id)) return fail('NOT_IN_ROOM');
      return ok(updatePlayer(state, action.id, { ready: action.ready }));
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
      if (!everyoneReady(state)) return fail('PLAYERS_NOT_READY');
      if (action.rounds.length === 0) return fail('INVALID_PAYLOAD');
      return ok({
        ...state,
        phase: 'TITLE_WRITING',
        rounds: action.rounds,
        results: [],
        awards: [],
        titles: [],
        titlesDone: [],
        titleSeed: action.seed,
        players: state.players.map((p) => ({ ...p, score: 0 })),
        endsAt: action.now + TITLE_WRITING_SECONDS * 1000,
      });
    }

    case 'title/submit': {
      if (state.phase !== 'TITLE_WRITING') return fail('WRONG_PHASE');
      if (!state.players.some((p) => p.id === action.id)) return fail('NOT_IN_ROOM');
      if (state.titlesDone.includes(action.id)) return fail('WRONG_PHASE');
      const mine = state.titles.filter((t) => t.authorId === action.id);
      if (mine.length >= MAX_TITLES_PER_PLAYER) return fail('TOO_MANY_TITLES');
      const key = titleKey(action.text);
      if (state.titles.some((t) => titleKey(t.text) === key)) return fail('DUPLICATE_TITLE');
      return ok({
        ...state,
        titles: [...state.titles, { authorId: action.id, text: action.text, used: false }],
      });
    }

    case 'title/remove': {
      if (state.phase !== 'TITLE_WRITING') return fail('WRONG_PHASE');
      if (state.titlesDone.includes(action.id)) return fail('WRONG_PHASE');
      return ok({
        ...state,
        titles: state.titles.filter((t) => !(t.authorId === action.id && t.text === action.text)),
      });
    }

    case 'title/done': {
      if (state.phase !== 'TITLE_WRITING') return fail('WRONG_PHASE');
      const mine = state.titles.filter((t) => t.authorId === action.id).length;
      if (mine < MIN_TITLES_PER_PLAYER) return fail('NOT_ENOUGH_TITLES');
      if (state.titlesDone.includes(action.id)) return ok(state);
      const next = { ...state, titlesDone: [...state.titlesDone, action.id] };
      const everyone = next.players
        .filter((p) => p.connected)
        .every((p) => next.titlesDone.includes(p.id));
      return ok(everyone ? startRound(next, 0, action.now) : next);
    }

    case 'title/pick': {
      if (state.phase !== 'ROUND_INTRO') return fail('WRONG_PHASE');
      if (action.id !== currentRound(state)!.presenterId) return fail('NOT_ALLOWED');
      if (state.roundTitle !== null) return fail('WRONG_PHASE');
      if (!state.titleChoices.includes(action.text)) return fail('INVALID_PAYLOAD');
      return ok(chooseTitle(state, action.text, action.now));
    }

    case 'game/restart': {
      if (state.phase !== 'FINAL_RESULTS') return fail('WRONG_PHASE');
      return ok({
        ...initialState(),
        players: state.players.map((p) => ({ ...p, score: 0, ready: false })),
        vipId: state.vipId,
      });
    }

    case 'slide/pick': {
      if (state.phase !== 'PRESENTING') return fail('WRONG_PHASE');
      const round = currentRound(state)!;
      if (action.id !== round.assistantId) return fail('NOT_ALLOWED');
      const pickIndex = nextPickIndex(state);
      if (pickIndex === null) return fail('WRONG_PHASE');
      const option = round.optionSets[pickIndex]?.find((o) => o.id === action.optionId);
      if (!option) return fail('INVALID_PAYLOAD');
      return ok({ ...state, shown: [...state.shown, option] });
    }

    case 'slide/next': {
      if (state.phase !== 'PRESENTING') return fail('WRONG_PHASE');
      const round = currentRound(state)!;
      if (action.id !== round.presenterId) return fail('NOT_ALLOWED');
      if (!canAdvance(state)) return fail('WRONG_PHASE');
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
        case 'TITLE_WRITING':
          return ok(startRound(state, 0, action.now));
        case 'ROUND_INTRO':
          // A presenter who doesn't choose in time gets the first option.
          if (state.roundTitle === null) {
            return ok(chooseTitle(state, state.titleChoices[0] ?? '', action.now));
          }
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
    roundTitle: null,
    titleChoices: titleChoicesFor(state, roundIndex),
    endsAt: now + TITLE_PICK_SECONDS * 1000,
  };
}

/**
 * Unused titles written by anyone but the presenter, in a seeded order. Hand-made titles
 * only fill the gaps when the players wrote too few.
 */
function titleChoicesFor(state: GameState, roundIndex: number): string[] {
  const round = state.rounds[roundIndex]!;
  const written = state.titles
    .filter((t) => !t.used && t.authorId !== round.presenterId)
    .map((t) => t.text);
  const choices = seededShuffle(written, state.titleSeed + roundIndex).slice(0, TITLE_CHOICES);
  for (const fallback of round.fallbackTitles) {
    if (choices.length >= TITLE_CHOICES) break;
    if (!choices.some((c) => titleKey(c) === titleKey(fallback))) choices.push(fallback);
  }
  return choices;
}

/** Locks the title in, marks it used, and gives the TV time to reveal it. */
function chooseTitle(state: GameState, text: string, now: number): GameState {
  return {
    ...state,
    roundTitle: text,
    titles: state.titles.map((t) => (t.text === text ? { ...t, used: true } : t)),
    endsAt: now + ROUND_INTRO_SECONDS * 1000,
  };
}

function titleKey(text: string): string {
  return text.toLocaleLowerCase('ro').replace(/\s+/g, ' ').trim();
}

/** Fisher–Yates driven by mulberry32, so the same seed always gives the same order. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  let a = seed >>> 0;
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
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
    title: state.roundTitle ?? '',
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
