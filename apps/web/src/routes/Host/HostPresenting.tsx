import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PRESENTATION_SECONDS, type HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { Countdown } from '../../ui/Countdown';
import { SlideView } from '../../ui/SlideView';
import { Stage } from '../../ui/Stage';

export function HostPresenting({ view }: { view: HostView }) {
  const round = view.round!;
  const reduced = useReducedMotion();
  const presenter = view.players.find((p) => p.id === round.presenterId);

  return (
    <Stage className="flex flex-col gap-8 !p-10">
      <header className="flex items-center justify-between gap-8">
        <div className="min-w-0">
          <p className="text-2xl text-wood-pale/80">
            {presenter?.name} {ro.game.presents} · {ro.game.slide(round.slideIndex, round.slideCount)}
          </p>
          <h1 className="truncate text-5xl font-extrabold">„{round.title}”</h1>
        </div>
        <Countdown endsAt={view.endsAt} total={PRESENTATION_SECONDS} />
      </header>

      <div className="relative mx-auto aspect-video min-h-0 w-full max-w-[min(100%,calc((100dvh-14rem)*16/9))] flex-1">
        <AnimatePresence mode="wait">
          {view.slide ? (
            <motion.div
              key={view.slide.id + round.slideIndex}
              className="absolute inset-0 shadow-slide"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -80, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : 40 }}
              transition={{ duration: duration.phase, ease: ease.pop }}
            >
              <SlideView slide={view.slide} />
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              className="absolute inset-0 grid place-items-center rounded-card border-4 border-dashed border-wood-light/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="animate-pulse font-display text-5xl font-bold text-wood-pale/80">
                {ro.hostGame.assistantPicking}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Stage>
  );
}
