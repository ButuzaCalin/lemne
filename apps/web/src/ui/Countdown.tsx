import { useEffect, useState } from 'react';
import { serverNow } from '../socket';

function useSecondsLeft(endsAt: number | null): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 250);
    return () => clearInterval(id);
  }, []);
  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** Spotlight ring that empties as the server timer runs out. */
export function Countdown({
  endsAt,
  total,
  className = 'size-28 text-4xl',
}: {
  endsAt: number | null;
  total: number;
  className?: string;
}) {
  const left = useSecondsLeft(endsAt);
  const progress = total > 0 ? left / total : 0;
  const r = 45;
  const circumference = 2 * Math.PI * r;
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-stage-raised" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className={`transition-[stroke-dashoffset] duration-300 ${left <= 5 ? 'stroke-boo' : 'stroke-spotlight'}`}
        />
      </svg>
      <span className="font-display font-extrabold tabular-nums">{left}</span>
    </div>
  );
}
