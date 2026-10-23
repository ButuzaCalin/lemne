import { z } from 'zod';
import {
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_TITLE_LENGTH,
  RATING_MAX,
  RATING_MIN,
  ROOM_CODE_LENGTH,
} from './constants';
import type { Ack, ErrorCode, HostView, PlayerView } from './types';

export const RoomCodeSchema = z.string().trim().toUpperCase().length(ROOM_CODE_LENGTH);

export const PlayerNameSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(1).max(MAX_NAME_LENGTH));

export const JoinRoomSchema = z.object({
  code: RoomCodeSchema,
  name: PlayerNameSchema,
});
export type JoinRoomPayload = z.input<typeof JoinRoomSchema>;

export const RejoinSchema = z.object({
  code: RoomCodeSchema,
  token: z.string().min(1).max(64),
});
export type RejoinPayload = z.input<typeof RejoinSchema>;

export const SlidePickSchema = z.object({ optionId: z.string().min(1).max(64) });
export type SlidePickPayload = z.input<typeof SlidePickSchema>;

export const RatingSchema = z.object({ value: z.number().int().min(RATING_MIN).max(RATING_MAX) });
export type RatingPayload = z.input<typeof RatingSchema>;

export const TitleSchema = z.object({
  text: z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim().replace(/^[„"“]+|[”"“]+$/g, ''))
    .pipe(z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH)),
});
export type TitlePayload = z.input<typeof TitleSchema>;

type SimpleAck = (res: Ack<null>) => void;

export interface ClientToServerEvents {
  'room:create': (ack: (res: Ack<{ code: string; hostToken: string }>) => void) => void;
  'room:join': (
    payload: JoinRoomPayload,
    ack: (res: Ack<{ playerId: string; playerToken: string }>) => void,
  ) => void;
  'room:rejoin': (payload: RejoinPayload, ack: (res: Ack<{ role: 'host' | 'player' }>) => void) => void;
  'game:start': (ack: SimpleAck) => void;
  'game:restart': (ack: SimpleAck) => void;
  'title:submit': (payload: TitlePayload, ack: SimpleAck) => void;
  'title:remove': (payload: TitlePayload, ack: SimpleAck) => void;
  'title:done': (ack: SimpleAck) => void;
  'title:pick': (payload: TitlePayload, ack: SimpleAck) => void;
  'slide:pick': (payload: SlidePickPayload, ack: SimpleAck) => void;
  'slide:next': (ack: SimpleAck) => void;
  'rating:submit': (payload: RatingPayload, ack: SimpleAck) => void;
}

export interface ServerToClientEvents {
  'state:host': (view: HostView) => void;
  'state:player': (view: PlayerView) => void;
  error: (payload: { code: ErrorCode }) => void;
}
