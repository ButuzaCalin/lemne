import { motion, useReducedMotion } from 'motion/react';
import type { HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { PlayerChip } from '../../ui/PlayerChip';
import { Stage } from '../../ui/Stage';

export function HostIntro({ view }: { view: HostView }) {
  const round = view.round!;
  const reduced = useReducedMotion();
  const presenter = view.players.find((p) => p.id === round.presenterId);
  const assistant = view.players.find((p) => p.id === round.assistantId);
  const words = round.title?.split(' ') ?? [];

  return (
    <Stage className="relative flex flex-col items-center justify-center gap-12 text-center">
      {/* Curtain opens: two panels slide out to the sides. */}
      {!reduced &&
        (['left-0 origin-left', 'right-0 origin-right'] as const).map((side, i) => (
          <motion.div
            key={side}
            className={`absolute inset-y-0 z-10 w-1/2 bg-curtain ${side}`}
            initial={{ x: 0 }}
            animate={{ x: i === 0 ? '-100%' : '100%' }}
            transition={{ duration: duration.celebrate, ease: ease.outSoft }}
          />
        ))}
      <p className="text-3xl font-semibold text-wood-pale/80">
        {ro.game.round(round.index, round.total)}
      </p>
      {round.title === null ? (
        <h1 className="animate-pulse text-7xl font-extrabold text-wood-pale">
          {ro.titles.picking(presenter?.name ?? '')}
        </h1>
      ) : (
        <h1 className="max-w-6xl text-8xl leading-tight font-extrabold text-projector">
          „
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: reduced ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: duration.phase, ease: ease.pop }}
            >
              {w}
              {i < words.length - 1 && '\u00a0'}
            </motion.span>
          ))}
          ”
        </h1>
      )}
      <div className="flex items-center gap-8 text-3xl">
        {presenter && <PlayerChip player={presenter} badge={ro.roles.presenter} />}
        <span className="text-wood-pale/70">{ro.game.helpedBy}</span>
        {assistant && <PlayerChip player={assistant} badge={ro.roles.assistant} />}
      </div>
    </Stage>
  );
}
