import { useRef, useState, type ChangeEvent } from 'react';
import { MAX_PHOTOS_PER_PLAYER, type PlayerView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { compressPhoto, deletePhoto, PhotoError, photoUrl, uploadPhoto } from '../../photos';

export function PhotoPicker({ view }: { view: PlayerView }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const free = MAX_PHOTOS_PER_PLAYER - view.photoIds.length - uploading;

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, free);
    e.target.value = '';
    if (files.length === 0) return;
    setError(null);
    setUploading((n) => n + files.length);
    await Promise.all(
      files.map(async (file) => {
        try {
          await uploadPhoto(view.code, await compressPhoto(file));
        } catch (err) {
          setError(ro.errors[err instanceof PhotoError ? err.code : 'INVALID_PHOTO']);
        } finally {
          setUploading((n) => n - 1);
        }
      }),
    );
  }

  async function remove(photoId: string) {
    setError(null);
    try {
      await deletePhoto(view.code, photoId);
    } catch (err) {
      setError(ro.errors[err instanceof PhotoError ? err.code : 'INVALID_PAYLOAD']);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-wood-pale">{ro.play.photos.title}</h2>
        <p className="text-wood-pale/80">{ro.play.photos.hint(MAX_PHOTOS_PER_PLAYER)}</p>
      </div>

      <ul className="grid grid-cols-3 gap-3">
        {view.photoIds.map((id) => (
          <li key={id} className="relative aspect-square">
            <img
              src={photoUrl(view.code, id)}
              alt=""
              className="size-full rounded-card bg-projector object-cover"
            />
            <button
              type="button"
              onClick={() => remove(id)}
              aria-label={ro.play.photos.remove}
              className="absolute -top-2 -right-2 grid size-10 place-items-center rounded-full bg-stage-raised font-display text-xl font-bold ring-2 ring-wood-light/60"
            >
              ×
            </button>
          </li>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <li
            key={`up-${i}`}
            className="grid aspect-square animate-pulse place-items-center rounded-card bg-stage-raised text-sm text-wood-pale/70"
          >
            {ro.play.photos.uploading}
          </li>
        ))}
        {free > 0 && (
          <li className="aspect-square">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex size-full flex-col items-center justify-center rounded-card font-display font-bold text-wood-pale ring-2 ring-wood-light/60 ring-inset"
            >
              <span className="text-4xl leading-none">+</span>
              <span>{ro.play.photos.add}</span>
            </button>
          </li>
        )}
      </ul>

      <input ref={input} type="file" accept="image/*" multiple hidden onChange={onPick} />
      {error && <p className="font-semibold text-boo">{error}</p>}
    </section>
  );
}
