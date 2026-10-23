import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import {
  MAX_TITLE_LENGTH,
  MAX_TITLES_PER_PLAYER,
  MIN_TITLES_PER_PLAYER,
  type ErrorCode,
  type PlayerView,
} from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { titleIntent } from '../../socket';
import { Button } from '../../ui/Button';
import { PhoneScreen, PlayHeader } from './PlayHeader';

export function PlayTitles({ view }: { view: PlayerView }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const count = view.myTitles.length;
  const missing = MIN_TITLES_PER_PLAYER - count;

  const show = (err: ErrorCode | null) => setError(err && ro.errors[err]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    haptic('tap');
    const err = await titleIntent('title:submit', text);
    show(err);
    if (!err) setText('');
  }

  if (view.titlesDone) {
    return (
      <PhoneScreen>
        <PlayHeader view={view} instruction={ro.titles.waiting} />
        <TitleList titles={view.myTitles} />
      </PhoneScreen>
    );
  }

  return (
    <PhoneScreen>
      <PlayHeader
        view={view}
        instruction={ro.titles.phoneInstruction(MIN_TITLES_PER_PLAYER, MAX_TITLES_PER_PLAYER)}
      />
      <TitleList
        titles={view.myTitles}
        onRemove={async (t) => show(await titleIntent('title:remove', t))}
      />
      <div className="mt-auto flex flex-col gap-3">
        {count < MAX_TITLES_PER_PLAYER && (
          <form onSubmit={add} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TITLE_LENGTH}
              placeholder={ro.titles.placeholder}
              enterKeyHint="send"
              className="h-14 min-w-0 flex-1 rounded-card bg-projector px-4 font-display text-lg font-bold text-ink outline-none placeholder:text-ink-soft/50 focus:ring-4 focus:ring-spotlight"
            />
            <Button type="submit" variant="secondary" className="!px-5" disabled={!text.trim()}>
              {ro.titles.add}
            </Button>
          </form>
        )}
        {error && <p className="font-semibold text-boo">{error}</p>}
        <Button
          disabled={missing > 0}
          onClick={async () => {
            haptic('tap');
            show(await titleIntent('title:done'));
          }}
        >
          {missing > 0 ? ro.titles.needMore(missing) : ro.titles.done}
        </Button>
      </div>
    </PhoneScreen>
  );
}

function TitleList({ titles, onRemove }: { titles: string[]; onRemove?: (t: string) => void }) {
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {titles.map((t) => (
          <motion.li
            key={t}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: duration.phase, ease: ease.pop }}
            className="flex items-center gap-3 rounded-card bg-projector py-3 pr-2 pl-4 text-ink"
          >
            <span className="flex-1 font-display text-lg font-bold">„{t}”</span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(t)}
                aria-label={ro.titles.remove}
                className="grid size-11 place-items-center rounded-full font-display text-2xl font-bold text-ink-soft"
              >
                ×
              </button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
