import { motion } from 'motion/react';
import type { PublicPlayer } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { CountUp } from '../../ui/CountUp';

/** Re-sorts with a layout animation; scores count up rather than jump. */
export function Leaderboard({ players, highlight }: { players: PublicPlayer[]; highlight: string[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <ol className="flex flex-col gap-3">
      {sorted.map((p, i) => (
        <motion.li
          key={p.id}
          layout
          transition={{ duration: duration.phase, ease: ease.outSoft }}
          className={`flex items-center gap-4 rounded-card px-5 py-3 ${highlight.includes(p.id) ? 'bg-curtain' : 'bg-stage-raised'}`}
        >
          <span className="w-10 font-display text-3xl font-extrabold text-wood-pale/70">{i + 1}</span>
          <span
            className="grid size-12 place-items-center rounded-full font-display text-2xl font-extrabold text-ink"
            style={{ background: `var(--color-avatar-${p.avatar})` }}
          >
            {p.name.charAt(0).toLocaleUpperCase('ro')}
          </span>
          <span className="font-display text-3xl font-bold">{p.name}</span>
          <span className="ml-auto font-display text-3xl font-extrabold tabular-nums">
            <CountUp value={p.score} format={ro.game.pointsTotal} />
          </span>
        </motion.li>
      ))}
    </ol>
  );
}
