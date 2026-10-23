import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { PlayerView } from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { titleIntent } from '../../socket';
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

  if (view.titleChoices) return <PickTitle view={view} choices={view.titleChoices} />;

  const title = view.round?.title;
  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={title ? INSTRUCTION[role] : ro.titles.othersWait} />
      <div className="flex flex-1 items-center justify-center [perspective:800px]">
        <motion.div
          className="grid aspect-[3/4] w-full place-items-center rounded-card bg-projector p-8 text-center shadow-slide"
          initial={{ rotateY: reduced ? 0 : 180, opacity: reduced ? 0 : 1 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: duration.celebrate, ease: ease.pop }}
        >
          <div>
            <p className="font-display text-5xl font-extrabold text-curtain">{ro.roles[role]}</p>
            {title && <p className="mt-6 font-display text-2xl font-bold text-ink">„{title}”</p>}
          </div>
        </motion.div>
      </div>
    </PhoneScreen>
  );
}

function PickTitle({ view, choices }: { view: PlayerView; choices: string[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(text: string) {
    if (chosen) return;
    haptic('tap');
    setChosen(text);
    const err = await titleIntent('title:pick', text);
    if (err) {
      setChosen(null);
      setError(ro.errors[err]);
    }
  }

  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={ro.titles.pickInstruction} />
      <ul className="mt-auto flex flex-col gap-4">
        {choices.map((c, i) => (
          <motion.li
            key={c}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: chosen && chosen !== c ? 0.4 : 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: duration.phase, ease: ease.pop }}
          >
            <button
              type="button"
              onClick={() => pick(c)}
              disabled={chosen !== null}
              className="min-h-20 w-full rounded-card bg-projector px-5 py-4 text-left font-display text-xl font-bold text-ink shadow-podium transition-transform duration-(--duration-tap) active:translate-y-1"
            >
              „{c}”
            </button>
          </motion.li>
        ))}
      </ul>
      {error && <p className="font-semibold text-boo">{error}</p>}
    </PhoneScreen>
  );
}
