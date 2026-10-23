import type { HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { Stage } from '../../ui/Stage';
import { WoodDiamondScale } from '../../ui/WoodDiamondScale';
import { Leaderboard } from './Leaderboard';

export function HostResults({ view }: { view: HostView }) {
  const result = view.lastResult!;
  const presenter = view.players.find((p) => p.id === result.presenterId);
  return (
    <Stage className="grid grid-cols-[1.3fr_1fr] gap-16">
      <section className="flex flex-col justify-center gap-10">
        <p className="text-3xl text-wood-pale/80">{ro.hostGame.results}</p>
        <h1 className="text-7xl font-extrabold">
          {presenter?.name}: „{result.title}”
        </h1>
        {result.average === null ? (
          <p className="font-display text-5xl font-bold text-wood-pale">{ro.game.noVotes}</p>
        ) : (
          <>
            <WoodDiamondScale value={result.average} />
            <p className="font-display text-6xl font-extrabold text-spotlight">
              {ro.scale.verdict(result.average)}
            </p>
          </>
        )}
      </section>
      <section className="flex flex-col justify-center gap-6">
        <h2 className="text-4xl font-bold text-wood-pale">{ro.hostGame.scores}</h2>
        <Leaderboard players={view.players} highlight={[result.presenterId, result.assistantId]} />
      </section>
    </Stage>
  );
}
