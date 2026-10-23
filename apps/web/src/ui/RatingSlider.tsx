import { RATING_MAX, RATING_MIN } from '@lemne/shared';
import { ro } from '../i18n/ro';

/** The only way to judge a presentation: drag from lemn (wood) to diamant (diamond). */
export function RatingSlider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const t = value / RATING_MAX;
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="grid size-32 place-items-center rounded-full bg-stage-raised text-7xl shadow-podium transition-transform duration-(--duration-tap)"
        style={{ transform: `scale(${0.85 + t * 0.3}) rotate(${(t - 0.5) * 20}deg)` }}
        aria-hidden
      >
        {t < 0.5 ? '🪵' : '💎'}
      </div>
      <p className="font-display text-2xl font-bold text-wood-pale">{ro.scale.verdict(value)}</p>
      <input
        type="range"
        min={RATING_MIN}
        max={RATING_MAX}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ro.phone.rate}
        className="rating-slider w-full"
      />
      <div className="flex w-full justify-between font-display text-xl font-bold">
        <span className="text-wood-light">🪵 {ro.scale.wood}</span>
        <span className="text-diamond">{ro.scale.diamond} 💎</span>
      </div>
    </div>
  );
}
