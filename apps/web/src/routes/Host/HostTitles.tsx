import { motion } from 'motion/react';
import { TITLE_WRITING_SECONDS, type HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { Countdown } from '../../ui/Countdown';
import { PlayerChip } from '../../ui/PlayerChip';
import { Stage } from '../../ui/Stage';

/** Shows who is writing and how many titles they have, never the titles themselves. */
export function HostTitles({ view }: { view: HostView }) {
  return (
    <Stage className="flex flex-col justify-center gap-16">
      <header className="flex items-start justify-between gap-8">
        <div>
          <h1 className="text-8xl font-extrabold text-wood-pale">{ro.titles.hostHeading}</h1>
          <p className="mt-4 text-3xl text-wood-pale/80">{ro.titles.hostHint}</p>
        </div>
        <Countdown endsAt={view.endsAt} total={TITLE_WRITING_SECONDS} className="size-40 text-6xl" />
      </header>
      <ul className="grid grid-cols-2 gap-5">
        {view.players.map((p) => {
          const progress = view.titleProgress.find((t) => t.playerId === p.id);
          return (
            <motion.li
              key={p.id}
              layout
              animate={{ scale: progress?.done ? 1.02 : 1 }}
              transition={{ duration: duration.phase, ease: ease.pop }}
              className={`flex items-center gap-4 rounded-card ${progress?.done ? 'ring-4 ring-applause' : ''}`}
            >
              <div className="flex-1">
                <PlayerChip player={p} badge={ro.titles.hostCount(progress?.count ?? 0)} />
              </div>
            </motion.li>
          );
        })}
      </ul>
    </Stage>
  );
}
