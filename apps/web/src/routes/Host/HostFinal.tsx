import { motion, useReducedMotion } from 'motion/react';
import type { HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { send } from '../../socket';
import { Button } from '../../ui/Button';
import { Stage } from '../../ui/Stage';

// Podium order on screen: 2nd, 1st, 3rd.
const PODIUM = [1, 0, 2] as const;
const HEIGHTS = ['h-72', 'h-52', 'h-36'] as const;

export function HostFinal({ view }: { view: HostView }) {
  const reduced = useReducedMotion();
  const ranked = [...view.players].sort((a, b) => b.score - a.score);
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '';

  return (
    <Stage className="grid grid-cols-[1.2fr_1fr] gap-16">
      <section className="flex flex-col justify-end gap-8">
        <h1 className="text-7xl font-extrabold text-wood-pale">{ro.hostGame.final}</h1>
        <div className="flex items-end justify-center gap-6">
          {PODIUM.map((rank) => {
            const p = ranked[rank];
            if (!p) return null;
            return (
              <div key={p.id} className="flex w-56 flex-col items-center gap-3">
                <span
                  className="grid size-20 place-items-center rounded-full font-display text-4xl font-extrabold text-ink"
                  style={{ background: `var(--color-avatar-${p.avatar})` }}
                >
                  {p.name.charAt(0).toLocaleUpperCase('ro')}
                </span>
                <span className="font-display text-3xl font-bold">{p.name}</span>
                <motion.div
                  className={`flex w-full flex-col items-center justify-start rounded-t-card bg-wood pt-4 shadow-podium ${HEIGHTS[rank]} ${rank === 0 ? 'bg-wood-light' : ''}`}
                  style={{ originY: 1 }}
                  initial={{ scaleY: reduced ? 1 : 0, opacity: reduced ? 0 : 1 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: 0.3 * (2 - rank), duration: duration.celebrate, ease: ease.pop }}
                >
                  <span className="font-display text-6xl font-extrabold text-ink">{rank + 1}</span>
                  <span className="font-display text-2xl font-bold text-ink">
                    {ro.game.pointsTotal(p.score)}
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col justify-center gap-6">
        <h2 className="text-4xl font-bold text-wood-pale">{ro.hostGame.awards}</h2>
        {view.awards.map((a, i) => (
          <motion.div
            key={a.id}
            className="rounded-card bg-projector p-6 text-ink shadow-slide"
            initial={{ rotateY: reduced ? 0 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 1.5 + i * 0.6, duration: duration.phase, ease: ease.pop }}
          >
            <p className="font-display text-4xl font-extrabold">{a.title}</p>
            <p className="font-display text-3xl font-bold text-curtain">{name(a.playerId)}</p>
            <p className="mt-1 text-2xl text-ink-soft">{a.description}</p>
          </motion.div>
        ))}
        <Button variant="secondary" className="self-start" onClick={() => send('game:restart')}>
          {ro.game.playAgain}
        </Button>
      </section>
    </Stage>
  );
}
