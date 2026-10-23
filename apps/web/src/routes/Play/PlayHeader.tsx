import { motion, useReducedMotion } from 'motion/react';
import type { PlayerView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { PlayerChip } from '../../ui/PlayerChip';

/** Top of every phone screen: who am I this round, and what do I do now. */
export function PlayHeader({ view, instruction }: { view: PlayerView; instruction: string }) {
  const reduced = useReducedMotion();
  return (
    <header className="flex flex-col gap-4">
      <PlayerChip player={view.me} badge={view.role ? ro.roles[view.role] : undefined} />
      <motion.p
        key={instruction}
        className="font-display text-2xl leading-snug font-bold text-wood-pale"
        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.phase, ease: ease.outSoft }}
      >
        {instruction}
      </motion.p>
    </header>
  );
}

export function PhoneScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
