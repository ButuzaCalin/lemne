import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MIN_PLAYERS, type HostView } from '@lemne/shared';
import { ro } from '../../i18n/ro';
import { send } from '../../socket';
import { Button } from '../../ui/Button';
import { PlayerChip } from '../../ui/PlayerChip';
import { Stage } from '../../ui/Stage';

export function HostLobby({ view }: { view: HostView }) {
  const joinUrl = `${location.origin}/?code=${view.code}`;
  const photoCount = view.players.reduce((n, p) => n + p.photoCount, 0);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 360,
      color: { dark: '#1e1a17', light: '#fff8e7' },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  return (
    <Stage className="grid grid-cols-[1fr_1.2fr] gap-16">
      <section className="flex flex-col justify-center gap-8">
        <h1 className="wood-text text-9xl font-extrabold tracking-tight">{ro.appName}</h1>
        <div>
          <p className="text-2xl text-wood-pale/80">{ro.host.joinAt}</p>
          <p className="font-display text-4xl font-bold">{location.host}</p>
        </div>
        <div>
          <p className="text-2xl text-wood-pale/80">{ro.host.roomCode}</p>
          <p className="font-display text-[10rem] leading-none font-extrabold tracking-[0.15em] text-spotlight">
            {view.code}
          </p>
        </div>
        <div className="flex items-end gap-6">
          {qr && <img src={qr} alt="" className="size-56 rounded-card shadow-slide" />}
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="text-xl text-wood-pale/70 underline"
          >
            {ro.hostGame.fullscreen}
          </button>
        </div>
      </section>

      <section className="flex flex-col justify-center gap-6">
        <h2 className="text-4xl font-bold">
          {view.players.length === 0
            ? ro.host.waitingForPlayers
            : ro.host.playersCount(view.players.length, MIN_PLAYERS)}
        </h2>
        <ul className="grid grid-cols-2 gap-4">
          {view.players.map((p) => (
            <li key={p.id}>
              <PlayerChip player={p} badge={p.id === view.vipId ? ro.host.vip : undefined} />
            </li>
          ))}
        </ul>
        {view.players.filter((p) => p.connected).length >= MIN_PLAYERS && (
          <Button variant="secondary" className="self-start" onClick={() => send('game:start')}>
            {ro.game.start}
          </Button>
        )}
        {photoCount > 0 && (
          <p className="text-2xl text-wood-pale/80">{ro.host.photosCount(photoCount)}</p>
        )}
      </section>
    </Stage>
  );
}
