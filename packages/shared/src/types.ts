export type Phase =
  | 'LOBBY'
  | 'TITLE_WRITING'
  | 'ROUND_INTRO'
  | 'PRESENTING'
  | 'RATING'
  | 'ROUND_RESULTS'
  | 'FINAL_RESULTS';

export type Role = 'presenter' | 'assistant' | 'audience';

/** A slide as the game uses it: hand-made content or a player photo. */
export type SlideContent =
  | { id: string; kind: 'image'; src: string; thumb: string; alt: string }
  | { id: string; kind: 'text'; text: string };

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  score: number;
  photoCount: number;
}

export interface RoundInfo {
  /** 0-based. */
  index: number;
  total: number;
  presenterId: string;
  assistantId: string;
  title: string;
  /** 0-based index of the slide being picked or shown. */
  slideIndex: number;
  slideCount: number;
}

export interface RoundResult {
  presenterId: string;
  assistantId: string;
  title: string;
  /** 0 (lemn) … 100 (diamant), null when nobody rated. */
  average: number | null;
  votes: number;
  presenterPoints: number;
  assistantPoints: number;
}

export interface AwardWinner {
  id: string;
  title: string;
  description: string;
  playerId: string;
}

interface CommonView {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  vipId: string | null;
  round: RoundInfo | null;
  /** Server timestamp when the current phase ends; clients only render a countdown. */
  endsAt: number | null;
  serverNow: number;
  lastResult: RoundResult | null;
  awards: AwardWinner[];
}

/** What the big screen sees. */
export interface HostView extends CommonView {
  /** Full-size slide currently on the projector. */
  slide: SlideContent | null;
  ratedCount: number;
  raterCount: number;
}

/** What one phone sees. Filtered per player so nothing leaks between roles. */
export interface PlayerView extends CommonView {
  me: PublicPlayer;
  isVip: boolean;
  role: Role | null;
  /** Only this player's own photos; served from /api/rooms/:code/photos/:id. */
  photoIds: string[];
  /** Assistant only, while the current slide is not picked yet. Thumbnails only. */
  options: SlideContent[] | null;
  /** Presenter only: the current slide was picked, so "next" is allowed. */
  canAdvance: boolean;
  /** Presenter only. */
  prompt: string | null;
  /** Audience only, during RATING. */
  myRating: number | null;
}

export type ErrorCode =
  | 'INVALID_PAYLOAD'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NAME_TAKEN'
  | 'GAME_IN_PROGRESS'
  | 'NOT_IN_ROOM'
  | 'TOO_MANY_PHOTOS'
  | 'INVALID_PHOTO'
  | 'NOT_ENOUGH_PLAYERS'
  | 'NOT_ALLOWED'
  | 'WRONG_PHASE';

export type Ack<T> = { ok: true; data: T } | { ok: false; error: ErrorCode };
