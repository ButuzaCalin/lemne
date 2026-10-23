import { useEffect, useState } from 'react';
import { ro } from '../i18n/ro';

/** Corner button on the TV; hides itself once the page is fullscreen. */
export function FullscreenButton({ className = '' }: { className?: string }) {
  const [active, setActive] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const sync = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  if (active || !document.fullscreenEnabled) return null;

  return (
    <button
      type="button"
      onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
      className={`flex items-center gap-3 rounded-button bg-stage-raised/80 px-6 py-3 font-display text-xl font-bold text-wood-pale ring-2 ring-wood-light/50 transition-transform duration-(--duration-tap) hover:ring-wood-light active:scale-95 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-none stroke-current stroke-[2.5]">
        <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {ro.hostGame.fullscreen}
    </button>
  );
}
