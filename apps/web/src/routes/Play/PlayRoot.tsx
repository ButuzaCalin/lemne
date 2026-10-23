import { Link } from 'react-router';
import { ro } from '../../i18n/ro';
import { useGameState } from '../../socket';
import { PlayIntro } from './PlayIntro';
import { PlayLobby } from './PlayLobby';
import { PlayPresenting } from './PlayPresenting';
import { PlayRating } from './PlayRating';
import { PlayFinal, PlayResults } from './PlayResults';

export function PlayRoot() {
  const view = useGameState((s) => s.player);
  const connected = useGameState((s) => s.connected);
  const lost = useGameState((s) => s.sessionLost);

  if (!view && !lost) return <main className="min-h-dvh" />;
  if (!view) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-display text-3xl font-bold">{ro.play.noSession}</p>
        <Link to="/" className="text-xl text-wood-pale underline">
          {ro.play.backHome}
        </Link>
      </main>
    );
  }

  return (
    <>
      {!connected && (
        <div className="fixed inset-x-0 top-0 bg-boo py-2 text-center font-semibold">
          {ro.connection.reconnecting}
        </div>
      )}
      {view.phase === 'LOBBY' && <PlayLobby view={view} />}
      {view.phase === 'ROUND_INTRO' && <PlayIntro view={view} />}
      {view.phase === 'PRESENTING' && <PlayPresenting view={view} />}
      {view.phase === 'RATING' && <PlayRating view={view} />}
      {view.phase === 'ROUND_RESULTS' && <PlayResults view={view} />}
      {view.phase === 'FINAL_RESULTS' && <PlayFinal view={view} />}
    </>
  );
}
