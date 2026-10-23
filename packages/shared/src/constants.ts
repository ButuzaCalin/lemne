export const ROOM_CODE_LENGTH = 4;
// No I/O so codes can't be confused with 1/0 when read off a TV.
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 8;
export const MAX_AUDIENCE = 20;
export const MAX_NAME_LENGTH = 12;
export const AVATAR_COUNT = 8;

/** Player photos that can show up as slides. Compressed on the phone before upload. */
export const MAX_PHOTOS_PER_PLAYER = 5;
export const MAX_PHOTO_BYTES = 1_500_000;
export const PHOTO_MAX_EDGE_PX = 1280;

export const SLIDES_PER_PRESENTATION = 6;
export const SLIDE_OPTIONS = 3;
export const PRESENTATION_SECONDS = 120;
export const RATING_SECONDS = 20;

export const RECONNECT_GRACE_MS = 2 * 60_000;
export const HOST_GRACE_MS = 2 * 60_000;
export const ROOM_IDLE_TIMEOUT_MS = 15 * 60_000;

export const ROUND_INTRO_SECONDS = 7;
export const ROUND_RESULTS_SECONDS = 10;

/** End-of-presentation rating: 0 = lemn (wood), 100 = diamant (diamond). */
export const RATING_MIN = 0;
export const RATING_MAX = 100;
/** Points per rating point: average 100 gives the presenter 500 and the assistant 200. */
export const PRESENTER_POINTS_PER_RATING = 5;
export const ASSISTANT_POINTS_PER_RATING = 2;

/** Chance that the presenter gets a prompt card with a slide (never on the first one). */
export const PROMPT_CHANCE = 0.3;
