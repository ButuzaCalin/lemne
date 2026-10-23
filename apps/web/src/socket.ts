import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack,
  ClientToServerEvents,
  ErrorCode,
  HostView,
  PlayerView,
  ServerToClientEvents,
} from '@lemne/shared';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

export const HOST_TOKEN_KEY = 'lemne:hostToken';
export const PLAYER_TOKEN_KEY = 'lemne:playerToken';

interface State {
  connected: boolean;
  host: HostView | null;
  player: PlayerView | null;
  /** A rejoin was refused: the room is gone or we were never in it. */
  sessionLost: boolean;
  /** serverNow - Date.now(), so countdowns match the server clock. */
  clockOffset: number;
}

let state: State = {
  connected: false,
  host: null,
  player: null,
  sessionLost: false,
  clockOffset: 0,
};
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

socket.on('connect', () => {
  set({ connected: true });
  rejoin();
});
socket.on('disconnect', () => set({ connected: false }));
socket.on('state:host', (host) => set({ host, clockOffset: host.serverNow - Date.now() }));
socket.on('state:player', (player) =>
  set({ player, clockOffset: player.serverNow - Date.now() }),
);

/** After a refresh, a screen lock or a dropped connection, take our seat back. */
function rejoin() {
  const match = location.pathname.match(/^\/(host|play)\/([A-Za-z]+)/);
  if (!match) return;
  const [, kind, code] = match;
  const token =
    kind === 'host'
      ? sessionStorage.getItem(HOST_TOKEN_KEY)
      : localStorage.getItem(PLAYER_TOKEN_KEY);
  if (!token) return set({ sessionLost: true });
  socket.emit('room:rejoin', { code: code!, token }, (res) => {
    if (!res.ok) set({ sessionLost: true });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameState<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

export function serverNow(): number {
  return Date.now() + state.clockOffset;
}

type SimpleEvent = 'game:start' | 'game:restart' | 'slide:next' | 'title:done';

/** Fire an intent that only acks ok/error. */
export function send(event: SimpleEvent): Promise<ErrorCode | null> {
  return new Promise((resolve) =>
    socket.emit(event, (res: Ack<null>) => resolve(res.ok ? null : res.error)),
  );
}

type TitleEvent = 'title:submit' | 'title:remove' | 'title:pick';

/** Title intents; 'title:done' carries no text. */
export function titleIntent(event: TitleEvent | 'title:done', text = ''): Promise<ErrorCode | null> {
  if (event === 'title:done') return send(event);
  return new Promise((resolve) =>
    socket.emit(event, { text }, (res) => resolve(res.ok ? null : res.error)),
  );
}

export function setReady(ready: boolean): Promise<ErrorCode | null> {
  return new Promise((resolve) =>
    socket.emit('player:ready', { ready }, (res) => resolve(res.ok ? null : res.error)),
  );
}

export function pickSlide(optionId: string): Promise<ErrorCode | null> {
  return new Promise((resolve) =>
    socket.emit('slide:pick', { optionId }, (res) => resolve(res.ok ? null : res.error)),
  );
}

export function submitRating(value: number): Promise<ErrorCode | null> {
  return new Promise((resolve) =>
    socket.emit('rating:submit', { value }, (res) => resolve(res.ok ? null : res.error)),
  );
}
