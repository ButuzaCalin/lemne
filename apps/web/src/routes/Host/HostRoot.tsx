import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { ro } from '../../i18n/ro';
import { duration, ease } from '../../motion';
import { useGameState } from '../../socket';
import { useWakeLock } from '../../wakeLock';
import { HostFinal } from './HostFinal';
import { HostIntro } from './HostIntro';
import { HostLobby } from './HostLobby';
import { HostPresenting } from './HostPresenting';
import { HostRating } from './HostRating';
import { HostResults } from './HostResults';

export function HostRoot() {
  const view = useGameState((s) => s.host);
  const lost = useGameState((s) => s.sessionLost);
  const reduced = useReducedMotion();
  useWakeLock();

  useEffect(() => {
    document.documentElement.classList.add('host-screen');
    return () => document.documentElement.classList.remove('host-screen');
  }, []);

  if (!view) {
    return (
      <main className="grid min-h-dvh place-items-center">
        {lost && (
          <Link to="/" className="font-display text-3xl text-wood-pale underline">
            {ro.play.backHome}
          </Link>
        )}
      </main>
    );
  }

  const screen = (() => {
    switch (view.phase) {
      case 'LOBBY':
        return <HostLobby view={view} />;
      case 'ROUND_INTRO':
        return <HostIntro view={view} />;
      case 'PRESENTING':
        return <HostPresenting view={view} />;
      case 'RATING':
        return <HostRating view={view} />;
      case 'ROUND_RESULTS':
        return <HostResults view={view} />;
      case 'FINAL_RESULTS':
        return <HostFinal view={view} />;
      default:
        return null;
    }
  })();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${view.phase}-${view.round?.index ?? ''}`}
        initial={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.phase, ease: ease.outSoft }}
      >
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}
