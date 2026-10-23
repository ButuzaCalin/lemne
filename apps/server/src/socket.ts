import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import {
  JoinRoomSchema,
  RatingSchema,
  RejoinSchema,
  SlidePickSchema,
  TitleSchema,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SlideContent,
} from '@lemne/shared';
import { content } from './content';
import { reduce, type Action } from './game/machine';
import { imagePool, planRounds, toSlideContent } from './game/plan';
import { photoUrl } from './photos';
import { createRoom, getRoom, touch, type Room } from './rooms';
import { toHostView, toPlayerView } from './views';

interface SocketData {
  code?: string;
  playerId?: string;
  isHost?: boolean;
}

export type LemneServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type LemneSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

export function registerSocketHandlers(io: LemneServer): void {
  io.on('connection', (socket) => {
    socket.on('room:create', (ack) => {
      if (typeof ack !== 'function') return;
      const room = createRoom(socket.id);
      socket.data = { code: room.code, isHost: true };
      ack({ ok: true, data: { code: room.code, hostToken: room.hostToken } });
      broadcast(io, room);
    });

    socket.on('room:join', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = JoinRoomSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });

      const room = getRoom(parsed.data.code);
      if (!room) return ack({ ok: false, error: 'ROOM_NOT_FOUND' });

      const playerId = randomUUID();
      const res = dispatch(room, { type: 'player/join', id: playerId, name: parsed.data.name });
      if (!res.ok) return ack(res);

      const playerToken = randomUUID();
      room.tokens.set(playerToken, playerId);
      room.sockets.set(playerId, socket.id);
      socket.data = { code: room.code, playerId };
      ack({ ok: true, data: { playerId, playerToken } });
      broadcast(io, room);
    });

    socket.on('room:rejoin', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = RejoinSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const room = getRoom(parsed.data.code);
      if (!room) return ack({ ok: false, error: 'ROOM_NOT_FOUND' });

      if (parsed.data.token === room.hostToken) {
        room.hostSocketId = socket.id;
        room.hostLeftAt = null;
        socket.data = { code: room.code, isHost: true };
        touch(room);
        ack({ ok: true, data: { role: 'host' } });
        return broadcast(io, room);
      }

      const playerId = room.tokens.get(parsed.data.token);
      if (!playerId || !room.game.players.some((p) => p.id === playerId)) {
        return ack({ ok: false, error: 'NOT_IN_ROOM' });
      }
      room.sockets.set(playerId, socket.id);
      socket.data = { code: room.code, playerId };
      commit(io, room, { type: 'player/connection', id: playerId, connected: true });
      ack({ ok: true, data: { role: 'player' } });
    });

    // The host screen or the VIP's phone can start; anyone else is refused.
    socket.on('game:start', (ack) => {
      if (typeof ack !== 'function') return;
      const room = roomOf(socket);
      if (!room) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      if (!socket.data.isHost && socket.data.playerId !== room.game.vipId) {
        return ack({ ok: false, error: 'NOT_ALLOWED' });
      }
      const rounds = planRounds({
        playerIds: room.game.players.filter((p) => p.connected).map((p) => p.id),
        ...slidePool(room),
        titles: room.titles,
        prompts: room.prompts,
      });
      const seed = Math.floor(Math.random() * 2 ** 32);
      ack(commit(io, room, { type: 'game/start', rounds, seed, now: Date.now() }));
    });

    socket.on('title:submit', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = TitleSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(commit(io, room, { type: 'title/submit', id: playerId, text: parsed.data.text }));
    });

    socket.on('title:remove', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = TitleSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(commit(io, room, { type: 'title/remove', id: playerId, text: parsed.data.text }));
    });

    socket.on('title:done', (ack) => {
      if (typeof ack !== 'function') return;
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(commit(io, room, { type: 'title/done', id: playerId, now: Date.now() }));
    });

    socket.on('title:pick', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = TitleSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(
        commit(io, room, { type: 'title/pick', id: playerId, text: parsed.data.text, now: Date.now() }),
      );
    });

    socket.on('game:restart', (ack) => {
      if (typeof ack !== 'function') return;
      const room = roomOf(socket);
      if (!room) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      if (!socket.data.isHost && socket.data.playerId !== room.game.vipId) {
        return ack({ ok: false, error: 'NOT_ALLOWED' });
      }
      ack(commit(io, room, { type: 'game/restart' }));
    });

    socket.on('slide:pick', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = SlidePickSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(commit(io, room, { type: 'slide/pick', id: playerId, optionId: parsed.data.optionId }));
    });

    socket.on('slide:next', (ack) => {
      if (typeof ack !== 'function') return;
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(commit(io, room, { type: 'slide/next', id: playerId, now: Date.now() }));
    });

    socket.on('rating:submit', (payload, ack) => {
      if (typeof ack !== 'function') return;
      const parsed = RatingSchema.safeParse(payload);
      if (!parsed.success) return ack({ ok: false, error: 'INVALID_PAYLOAD' });
      const { room, playerId } = playerOf(socket);
      if (!room || !playerId) return ack({ ok: false, error: 'NOT_IN_ROOM' });
      ack(
        commit(io, room, {
          type: 'rating/submit',
          id: playerId,
          value: parsed.data.value,
          now: Date.now(),
        }),
      );
    });

    socket.on('disconnect', () => {
      const { code, playerId, isHost } = socket.data;
      const room = code ? getRoom(code) : undefined;
      if (!room) return;
      if (isHost) {
        if (room.hostSocketId !== socket.id) return;
        room.hostSocketId = null;
        room.hostLeftAt = Date.now();
      } else if (playerId && room.sockets.get(playerId) === socket.id) {
        room.sockets.delete(playerId);
        commit(io, room, { type: 'player/connection', id: playerId, connected: false });
      }
    });
  });
}

function roomOf(socket: LemneSocket): Room | undefined {
  return socket.data.code ? getRoom(socket.data.code) : undefined;
}

function playerOf(socket: LemneSocket): { room?: Room; playerId?: string } {
  return { room: roomOf(socket), playerId: socket.data.playerId };
}

/** Every photo the players brought, and the hand-made stock slides. */
function slidePool(room: Room): { photos: SlideContent[]; stock: SlideContent[] } {
  const photos: SlideContent[] = room.game.players.flatMap((p) =>
    p.photoIds.map((id) => {
      const url = photoUrl(room.code, id);
      return { id, kind: 'image' as const, src: url, thumb: url, alt: p.name };
    }),
  );
  return { photos, stock: imagePool(content.slides.map(toSlideContent)) };
}

/** Runs an action through the reducer and stores the new state. Does not broadcast. */
export function dispatch(room: Room, action: Action) {
  const res = reduce(room.game, action);
  if (res.ok) {
    room.game = res.state;
    touch(room);
  }
  return res;
}

/** Dispatch, then broadcast and re-arm the phase timer when the state changed. */
function commit(io: LemneServer, room: Room, action: Action): Ack<null> {
  const before = room.game;
  const res = dispatch(room, action);
  if (!res.ok) return res;
  if (room.game !== before) {
    broadcast(io, room);
    schedule(io, room);
  }
  return { ok: true, data: null };
}

function schedule(io: LemneServer, room: Room): void {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  const { endsAt } = room.game;
  if (endsAt === null) return;
  room.timer = setTimeout(
    () => commit(io, room, { type: 'timer/expire', now: Date.now() }),
    // Small margin so the reducer never sees `now` a hair before endsAt.
    Math.max(0, endsAt - Date.now()) + 25,
  );
}

export function broadcast(io: LemneServer, room: Room): void {
  if (room.hostSocketId) io.to(room.hostSocketId).emit('state:host', toHostView(room));
  for (const [playerId, socketId] of room.sockets) {
    const view = toPlayerView(room, playerId);
    if (view) io.to(socketId).emit('state:player', view);
  }
}
