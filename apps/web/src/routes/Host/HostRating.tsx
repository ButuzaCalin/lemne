import { RATING_SECONDS, type HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { Countdown } from '../../ui/Countdown';
import { Stage } from '../../ui/Stage';

export function HostRating({ view }: { view: HostView }) {
  const round = view.round!;
  const presenter = view.players.find((p) => p.id === round.presenterId);
  return (
    <Stage className="flex flex-col items-center justify-center gap-12 text-center">
      <p className="text-3xl text-wood-pale/80">„{round.title}” · {presenter?.name}</p>
      <h1 className="text-9xl font-extrabold">{ro.hostGame.rateNow}</h1>
      <p className="font-display text-4xl font-bold">
        <span className="text-wood-light">🪵</span> {ro.hostGame.rateHint}{' '}
        <span className="text-diamond">💎</span>
      </p>
      <Countdown endsAt={view.endsAt} total={RATING_SECONDS} className="size-48 text-7xl" />
      <p className="text-3xl text-wood-pale/80">{ro.hostGame.rated(view.ratedCount, view.raterCount)}</p>
    </Stage>
  );
}
