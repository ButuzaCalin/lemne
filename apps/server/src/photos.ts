import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { MAX_PHOTO_BYTES, RoomCodeSchema, type ErrorCode } from '@lemne/shared';
import { getRoom, type Room } from './rooms';
import { broadcast, dispatch, type LemneServer } from './socket';

/**
 * Player photos travel over HTTP, not the socket: they are already resized to a JPEG on the
 * phone, so the body is the raw image. Auth is the same playerToken used for rejoining.
 */
export function registerPhotoRoutes(app: FastifyInstance, io: LemneServer): void {
  app.addContentTypeParser(
    'image/jpeg',
    { parseAs: 'buffer', bodyLimit: MAX_PHOTO_BYTES },
    (_req, body, done) => done(null, body),
  );

  app.post<{ Params: { code: string } }>('/api/rooms/:code/photos', async (req, reply) => {
    const auth = authorize(req.params.code, req.headers['x-player-token']);
    if (!auth.ok) return reply.code(auth.status).send({ error: auth.error });

    const body = req.body;
    if (!Buffer.isBuffer(body) || !isJpeg(body)) {
      return reply.code(400).send({ error: 'INVALID_PHOTO' satisfies ErrorCode });
    }

    const photoId = randomUUID();
    const res = dispatch(auth.room, {
      type: 'player/photoAdd',
      id: auth.playerId,
      photoId,
    });
    if (!res.ok) return reply.code(409).send({ error: res.error });

    auth.room.photos.set(photoId, body);
    broadcast(io, auth.room);
    return { photoId };
  });

  app.delete<{ Params: { code: string; photoId: string } }>(
    '/api/rooms/:code/photos/:photoId',
    async (req, reply) => {
      const auth = authorize(req.params.code, req.headers['x-player-token']);
      if (!auth.ok) return reply.code(auth.status).send({ error: auth.error });

      const { photoId } = req.params;
      const owner = auth.room.game.players.find((p) => p.photoIds.includes(photoId));
      if (owner?.id !== auth.playerId) return reply.code(404).send({ error: 'NOT_IN_ROOM' });

      const res = dispatch(auth.room, {
        type: 'player/photoRemove',
        id: auth.playerId,
        photoId,
      });
      if (!res.ok) return reply.code(409).send({ error: res.error });

      auth.room.photos.delete(photoId);
      broadcast(io, auth.room);
      return reply.code(204).send();
    },
  );

  // Ids are random UUIDs only handed to the owner (and later to whoever sees them as a slide).
  app.get<{ Params: { code: string; photoId: string } }>(
    '/api/rooms/:code/photos/:photoId',
    async (req, reply) => {
      const room = getRoomByParam(req.params.code);
      const photo = room?.photos.get(req.params.photoId);
      if (!photo) return reply.code(404).send();
      return reply.type('image/jpeg').header('cache-control', 'private, max-age=3600').send(photo);
    },
  );
}

type Auth =
  { ok: true; room: Room; playerId: string } | { ok: false; status: number; error: ErrorCode };

function authorize(code: string, token: unknown): Auth {
  const room = getRoomByParam(code);
  if (!room) return { ok: false, status: 404, error: 'ROOM_NOT_FOUND' };
  const playerId = typeof token === 'string' ? room.tokens.get(token) : undefined;
  if (!playerId) return { ok: false, status: 403, error: 'NOT_IN_ROOM' };
  return { ok: true, room, playerId };
}

export function photoUrl(code: string, photoId: string): string {
  return `/api/rooms/${code}/photos/${photoId}`;
}

function getRoomByParam(code: string): Room | undefined {
  const parsed = RoomCodeSchema.safeParse(code);
  return parsed.success ? getRoom(parsed.data) : undefined;
}

function isJpeg(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}
