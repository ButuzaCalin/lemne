import type { PlayerView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { send } from '../../socket';
import { Button } from '../../ui/Button';
import { CountUp } from '../../ui/CountUp';
import { PhoneScreen, PlayHeader } from './PlayHeader';

export function PlayResults({ view }: { view: PlayerView }) {
  const result = view.lastResult;
  const gained =
    result?.presenterId === view.me.id
      ? result.presenterPoints
      : result?.assistantId === view.me.id
        ? result.assistantPoints
        : 0;
  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={ro.phone.resultsLook} />
      <ScoreCard score={view.me.score} gained={gained} />
    </PhoneScreen>
  );
}

function ScoreCard({ score, gained }: { score: number; gained: number }) {
  return (
    <div className="mt-auto rounded-card bg-stage-raised p-6 text-center">
      <p className="text-wood-pale/80">{ro.phone.yourScore}</p>
      <p className="font-display text-6xl font-extrabold">
        <CountUp value={score} format={ro.game.pointsTotal} />
      </p>
      {gained > 0 && <p className="font-display text-2xl font-bold text-applause">{ro.game.points(gained)}</p>}
    </div>
  );
}

export function PlayFinal({ view }: { view: PlayerView }) {
  const top = Math.max(...view.players.map((p) => p.score));
  const won = view.me.score === top && top > 0;
  const mine = view.awards.filter((a) => a.playerId === view.me.id);
  return (
    <PhoneScreen>
      <PlayHeader view={view} instruction={won ? ro.phone.youWon : ro.phone.resultsLook} />
      {mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-bold text-wood-pale">{ro.phone.yourAwards}</h2>
          {mine.map((a) => (
            <div key={a.id} className="rounded-card bg-projector p-4 text-ink">
              <p className="font-display text-2xl font-extrabold">{a.title}</p>
              <p className="text-ink-soft">{a.description}</p>
            </div>
          ))}
        </section>
      )}
      <ScoreCard score={view.me.score} gained={0} />
      {view.isVip && (
        <>
          <p className="text-wood-pale/80">{ro.phone.vipRestart}</p>
          <Button onClick={() => send('game:restart')}>{ro.game.playAgain}</Button>
        </>
      )}
    </PhoneScreen>
  );
}
