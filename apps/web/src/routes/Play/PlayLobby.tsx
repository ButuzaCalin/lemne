import { useState } from 'react';
import { MIN_PLAYERS, playersNotReady, type PlayerView } from '@lemne/shared';
import { haptic } from '../../haptic';
import { ro } from '../../i18n/ro';
import { send, setReady } from '../../socket';
import { Button } from '../../ui/Button';
import { PlayerChip } from '../../ui/PlayerChip';
import { PhotoPicker } from './PhotoPicker';

export function PlayLobby({ view }: { view: PlayerView }) {
  const [error, setError] = useState<string | null>(null);
  const connected = view.players.filter((p) => p.connected).length;
  const waiting = playersNotReady(view.players, view.vipId).length;

  async function start() {
    haptic('tap');
    const err = await send('game:start');
    setError(err && ro.errors[err]);
  }

  async function toggleReady() {
    haptic('tap');
    const err = await setReady(!view.me.ready);
    setError(err && ro.errors[err]);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <PlayerChip
        player={view.me}
        badge={view.isVip ? undefined : view.me.ready ? ro.game.ready : ro.game.notReadyBadge}
        badgeTone={view.me.ready ? 'applause' : 'muted'}
      />
      <div>
        <h1 className="text-5xl font-extrabold text-wood-pale">{ro.play.youAreIn}</h1>
        <p className="mt-3 text-lg text-wood-pale/80">{ro.play.waitForStart}</p>
      </div>
      {view.isVip && (
        <p className="rounded-card bg-curtain px-4 py-3 font-semibold">{ro.play.youAreVip}</p>
      )}
      <PhotoPicker view={view} />
      <div className="flex flex-col gap-2">
        {view.isVip ? (
          <Button onClick={start} disabled={connected < MIN_PLAYERS || waiting > 0}>
            {connected < MIN_PLAYERS
              ? ro.game.needPlayers(connected, MIN_PLAYERS)
              : waiting > 0
                ? ro.game.waitingReady(waiting)
                : ro.game.start}
          </Button>
        ) : (
          <>
            {view.me.ready && <p className="text-center text-wood-pale/80">{ro.game.readyWait}</p>}
            <Button variant={view.me.ready ? 'secondary' : 'primary'} onClick={toggleReady}>
              {view.me.ready ? ro.game.notReady : ro.game.imReady}
            </Button>
          </>
        )}
        {error && <p className="font-semibold text-boo">{error}</p>}
      </div>
    </main>
  );
}
