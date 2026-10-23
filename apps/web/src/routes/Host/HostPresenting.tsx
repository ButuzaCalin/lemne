import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useState } from 'react';
import { PRESENTATION_SECONDS, TRANSITION_TEXT_MS, type HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { Countdown } from '../../ui/Countdown';
import { SlideView } from '../../ui/SlideView';
import { Stage } from '../../ui/Stage';

export function HostPresenting({ view }: { view: HostView }) {
  const round = view.round!;
  const reduced = useReducedMotion();
  const presenter = view.players.find((p) => p.id === round.presenterId);

  // Each new slide (but the first) opens with its transition line, then the image takes over.
  // Layout effect so the image never flashes for a frame before the line.
  const [lineFor, setLineFor] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!view.transition) return setLineFor(null);
    setLineFor(round.slideIndex);
    const id = setTimeout(() => setLineFor(null), TRANSITION_TEXT_MS);
    return () => clearTimeout(id);
  }, [round.slideIndex, view.transition]);
  const line = lineFor === round.slideIndex ? view.transition : null;

  return (
    <Stage className="flex flex-col gap-6 !px-24 !pt-16 !pb-12">
      <header className="flex items-center justify-between gap-8">
        <div className="min-w-0">
          <p className="text-2xl text-wood-pale/80">
            {presenter?.name} {ro.game.presents} · {ro.game.slide(round.slideIndex, round.slideCount)}
          </p>
          <h1 className="truncate text-5xl font-extrabold">„{round.title}”</h1>
        </div>
        <Countdown endsAt={view.endsAt} total={PRESENTATION_SECONDS} />
      </header>

      <div className="relative mx-auto aspect-video min-h-0 w-full max-w-[min(100%,calc((100dvh-17rem)*16/9))] flex-1">
        <AnimatePresence mode="wait">
          {line ? (
            <motion.div
              key={`line-${round.slideIndex}`}
              className="absolute inset-0 flex flex-col justify-center gap-10 rounded-card bg-projector px-24 shadow-projector"
              initial={{ opacity: 0, x: reduced ? 0 : 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -60 }}
              transition={{ duration: duration.phase, ease: ease.outSoft }}
            >
              <motion.span
                className="h-3 w-40 origin-left rounded-button bg-curtain"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.15, duration: duration.phase, ease: ease.pop }}
              />
              <p className="font-display text-8xl leading-tight font-extrabold text-ink">{line}</p>
            </motion.div>
          ) : view.slide ? (
            <motion.div
              key={view.slide.id + round.slideIndex}
              className="absolute inset-0 rounded-card shadow-projector"
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
