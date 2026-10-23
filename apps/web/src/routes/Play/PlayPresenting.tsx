import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PlayerView } from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { pickSlide, send } from '../../socket';
import { Button } from '../../ui/Button';
import { SlideView } from '../../ui/SlideView';
import { PhoneScreen, PlayHeader } from './PlayHeader';

export function PlayPresenting({ view }: { view: PlayerView }) {
  if (view.role === 'assistant') return <Assistant view={view} />;
  if (view.role === 'presenter') return <Presenter view={view} />;
  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={ro.phone.audienceWatch} />
    </PhoneScreen>
  );
}

function Assistant({ view }: { view: PlayerView }) {
  const reduced = useReducedMotion();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New options → forget the old choice.
  const pickIndex = view.pickIndex;
  useEffect(() => setChosen(null), [pickIndex]);

  async function pick(id: string) {
    if (chosen) return;
    haptic('tap');
    setChosen(id);
    const err = await pickSlide(id);
    if (err) {
      setChosen(null);
      setError(ro.errors[err]);
    }
  }

  const options = view.options;
  const round = view.round!;
  // Slide 1 is picked before anything is up; after that the assistant works one ahead.
  const instruction = options
    ? pickIndex === 0
      ? ro.phone.pick
      : ro.phone.pickNext
    : round.slideIndex + 1 >= round.slideCount
      ? ro.phone.pickedWait
      : ro.phone.pickedNextWait;
  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={instruction} />
      {pickIndex !== null && (
        <p className="text-wood-pale/70">{ro.game.slide(pickIndex, round.slideCount)}</p>
      )}
      <ul className="flex flex-col gap-4">
        <AnimatePresence>
          {options?.map((o) => (
            <motion.li
              key={o.id}
              exit={
                o.id === chosen && !reduced ? { y: -300, opacity: 0, scale: 1.05 } : { opacity: 0 }
              }
              transition={{ duration: duration.phase, ease: ease.outSoft }}
            >
              <button
                type="button"
                onClick={() => pick(o.id)}
                disabled={chosen !== null}
                className="aspect-video w-full rounded-card ring-wood-light/60 transition-transform duration-(--duration-tap) active:scale-[0.97] disabled:opacity-60"
              >
                <SlideView slide={o} compact />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {error && <p className="font-semibold text-boo">{error}</p>}
    </PhoneScreen>
  );
}

function Presenter({ view }: { view: PlayerView }) {
  const round = view.round!;
  const last = round.slideIndex + 1 >= round.slideCount;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (view.canAdvance) haptic('turn');
  }, [view.canAdvance, round.slideIndex]);

  async function next() {
    haptic('tap');
    setBusy(true);
    await send('slide:next');
    setBusy(false);
  }

  return (
    <PhoneScreen>
      <PlayHeader
        view={view}
        instruction={
          !view.slideUp
            ? ro.phone.presenterWait
            : view.canAdvance
              ? ro.phone.presenterTalk
              : ro.phone.presenterTalkWaitNext
        }
      />
      <p className="text-wood-pale/70">{ro.game.slide(round.slideIndex, round.slideCount)}</p>
      <div className="flex-1">
        {view.prompt && (
          <motion.div
            key={view.prompt}
            className="rounded-card bg-curtain p-5"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: duration.phase, ease: ease.pop }}
          >
            <p className="text-wood-pale">{ro.phone.promptLabel}</p>
            <p className="font-display text-2xl font-bold">{view.prompt}</p>
          </motion.div>
        )}
      </div>
      <Button onClick={next} disabled={!view.canAdvance || busy} className="min-h-20 text-2xl">
        {last ? ro.phone.finish : view.canAdvance || !view.slideUp ? ro.phone.next : ro.phone.nextPreparing}
      </Button>
    </PhoneScreen>
  );
}
