import { randomInt, randomUUID } from 'node:crypto';
import {
  HOST_GRACE_MS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_IDLE_TIMEOUT_MS,
} from '@lemne/shared';
import { Deck } from './game/deck';
import { initialState, type GameState } from './game/machine';
import { content } from './content';

export interface Room {
  code: string;
  hostToken: string;
  hostSocketId: string | null;
  hostLeftAt: number | null;
  game: GameState;
  /** playerToken → playerId, for reconnects. */
  tokens: Map<string, string>;
  /** playerId → current socket id. */
  sockets: Map<string, string>;
  lastActivity: number;
  /** photoId → JPEG bytes. Memory only, gone when the room is swept. */
  photos: Map<string, Buffer>;
  /** Titles and prompts don't repeat within a room's session. */
  titles: Deck<string>;
  prompts: Deck<string>;
  transitions: Deck<string>;
  /** Fires `timer/expire` when game.endsAt passes. */
  timer: NodeJS.Timeout | null;
}

// Codes that spell something rude in Romanian.
const BLOCKED_CODES = new Set(['PULA', 'PULE', 'CACA', 'FUTE', 'CURU', 'MUSU']);

const rooms = new Map<string, Room>();

export function createRoom(hostSocketId: string): Room {
  const room: Room = {
    code: generateCode(),
    hostToken: randomUUID(),
    hostSocketId,
    hostLeftAt: null,
    game: initialState(),
    tokens: new Map(),
    sockets: new Map(),
    lastActivity: Date.now(),
    photos: new Map(),
    titles: new Deck(content.titles),
    prompts: new Deck(content.prompts),
    transitions: new Deck(content.transitions),
    timer: null,
  };
  rooms.set(room.code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function touch(room: Room): void {
  room.lastActivity = Date.now();
}

export function sweepRooms(now: number): void {
  for (const [code, room] of rooms) {
    const idle = now - room.lastActivity > ROOM_IDLE_TIMEOUT_MS;
    const hostGone = room.hostLeftAt !== null && now - room.hostLeftAt > HOST_GRACE_MS;
    if (idle || hostGone) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(code);
    }
  }
}

function generateCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code) && !BLOCKED_CODES.has(code)) return code;
  }
}
