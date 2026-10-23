import { useState } from 'react';
import { RATING_MAX, RATING_MIN, type PlayerView } from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { submitRating } from '../../socket';
import { Button } from '../../ui/Button';
import { RatingSlider } from '../../ui/RatingSlider';
import { PhoneScreen, PlayHeader } from './PlayHeader';

export function PlayRating({ view }: { view: PlayerView }) {
  const [value, setValue] = useState(Math.round((RATING_MIN + RATING_MAX) / 2));
  const [error, setError] = useState<string | null>(null);
  const sent = view.myRating !== null;

  if (view.role !== 'audience') {
    return (
      <PhoneScreen>
        <PlayHeader view={view} instruction={ro.phone.beingRated} />
      </PhoneScreen>
    );
  }

  async function submit() {
    haptic('tap');
    const err = await submitRating(value);
    setError(err && ro.errors[err]);
  }

  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={sent ? ro.phone.rated : ro.phone.rate} />
      <div className="flex flex-1 flex-col justify-end gap-8">
        <RatingSlider
          value={view.myRating ?? value}
          onChange={(v) => {
            setValue(v);
            if (v % 10 === 0) haptic('tap');
          }}
          disabled={sent}
        />
        {error && <p className="font-semibold text-boo">{error}</p>}
        {!sent && <Button onClick={submit}>{ro.phone.rateSend}</Button>}
      </div>
    </PhoneScreen>
  );
}
