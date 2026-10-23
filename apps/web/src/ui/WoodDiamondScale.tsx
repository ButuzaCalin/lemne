import { motion, useReducedMotion } from 'motion/react';
import { RATING_MAX } from '@lemne/shared';
import { ro } from '../i18n/ro';
import { duration, ease } from '../motion';

/** Read-only wood → diamond bar with a marker at `value` (0…100). Host results screen. */
export function WoodDiamondScale({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const pct = (value / RATING_MAX) * 100;
  return (
    <div className="w-full">
      <div className="relative h-10 rounded-button bg-[linear-gradient(90deg,var(--color-wood),var(--color-wood-light)_40%,var(--color-diamond))] shadow-slide">
        <motion.div
          className="absolute top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-projector font-display text-3xl font-extrabold text-ink shadow-podium"
          initial={reduced ? { left: `${pct}%`, opacity: 0 } : { left: '0%' }}
          animate={{ left: `${pct}%`, opacity: 1 }}
          transition={{ duration: duration.celebrate, ease: ease.outSoft }}
        >
          {value}
        </motion.div>
      </div>
      <div className="mt-6 flex justify-between font-display text-3xl font-bold">
        <span className="text-wood-light">🪵 {ro.scale.wood}</span>
        <span className="text-diamond">{ro.scale.diamond} 💎</span>
      </div>
    </div>
  );
}
