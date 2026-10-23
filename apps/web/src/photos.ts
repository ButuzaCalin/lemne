import { PHOTO_MAX_EDGE_PX, type ErrorCode } from '@lemne/shared';
import { PLAYER_TOKEN_KEY } from './socket';

export function photoUrl(code: string, photoId: string): string {
  return `/api/rooms/${code}/photos/${photoId}`;
}

/** Resizes on the phone so we upload ~200KB JPEGs instead of 5MB camera originals. */
export async function compressPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  const scale = Math.min(1, PHOTO_MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.8),
  );
}

export async function uploadPhoto(code: string, photo: Blob): Promise<void> {
  const res = await fetch(`/api/rooms/${code}/photos`, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg', 'x-player-token': playerToken() },
    body: photo,
  });
  if (!res.ok) throw await toError(res);
}

export async function deletePhoto(code: string, photoId: string): Promise<void> {
  const res = await fetch(photoUrl(code, photoId), {
    method: 'DELETE',
    headers: { 'x-player-token': playerToken() },
  });
  if (!res.ok) throw await toError(res);
}

export class PhotoError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

async function toError(res: Response): Promise<PhotoError> {
  const body = (await res.json().catch(() => null)) as {
    error?: ErrorCode;
  } | null;
  // 413 comes from Fastify's body limit, before our handler runs.
  return new PhotoError(body?.error ?? (res.status === 413 ? 'INVALID_PHOTO' : 'INVALID_PAYLOAD'));
}

function playerToken(): string {
  return localStorage.getItem(PLAYER_TOKEN_KEY) ?? '';
}
