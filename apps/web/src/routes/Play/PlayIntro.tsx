import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import type { PlayerView } from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { PhoneScreen, PlayHeader } from './PlayHeader';

const INSTRUCTION = {
  presenter: ro.phone.introPresenter,
  assistant: ro.phone.introAssistant,
  audience: ro.phone.introAudience,
} as const;

export function PlayIntro({ view }: { view: PlayerView }) {
  const reduced = useReducedMotion();
  const role = view.role ?? 'audience';

  useEffect(() => haptic(role === 'audience' ? 'reveal' : 'turn'), [role]);

  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={INSTRUCTION[role]} />
      <div className="flex flex-1 items-center justify-center [perspective:800px]">
        <motion.div
          className="grid aspect-[3/4] w-full place-items-center rounded-card bg-projector p-8 text-center shadow-slide"
          initial={{ rotateY: reduced ? 0 : 180, opacity: reduced ? 0 : 1 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: duration.celebrate, ease: ease.pop }}
        >
          <div>
            <p className="font-display text-5xl font-extrabold text-curtain">{ro.roles[role]}</p>
            <p className="mt-6 font-display text-2xl font-bold text-ink">„{view.round?.title}”</p>
          </div>
        </motion.div>
      </div>
    </PhoneScreen>
  );
}
