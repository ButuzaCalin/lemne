import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '@lemne/shared';
import { ro } from '../i18n/ro';
import { HOST_TOKEN_KEY, PLAYER_TOKEN_KEY, socket } from '../socket';
import { Button } from '../ui/Button';

export function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [joining, setJoining] = useState(params.has('code'));
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function createRoom() {
    setBusy(true);
    socket.emit('room:create', (res) => {
      setBusy(false);
      if (!res.ok) return setError(ro.errors[res.error]);
      sessionStorage.setItem(HOST_TOKEN_KEY, res.data.hostToken);
      navigate(`/host/${res.data.code}`);
    });
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    socket.emit('room:join', { code, name }, (res) => {
      setBusy(false);
      if (!res.ok) return setError(ro.errors[res.error]);
      localStorage.setItem(PLAYER_TOKEN_KEY, res.data.playerToken);
      navigate(`/play/${code.trim().toUpperCase()}`);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-10 px-6 py-10">
      <header className="text-center">
        <h1 className="text-7xl font-extrabold tracking-tight text-wood-pale">{ro.appName}</h1>
        <p className="mt-3 text-lg text-wood-pale/70">{ro.tagline}</p>
      </header>

      {joining ? (
        <form onSubmit={joinRoom} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-wood-pale/80">{ro.home.codeLabel}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={ROOM_CODE_LENGTH}
              autoCapitalize="characters"
              autoComplete="off"
              className="h-16 rounded-card bg-projector text-center font-display text-4xl font-extrabold tracking-[0.3em] text-ink outline-none focus:ring-4 focus:ring-spotlight"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-wood-pale/80">{ro.home.nameLabel}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={ro.home.namePlaceholder}
              autoComplete="nickname"
              className="h-14 rounded-card bg-projector px-4 font-display text-2xl font-bold text-ink outline-none placeholder:text-ink-soft/50 focus:ring-4 focus:ring-spotlight"
            />
          </label>
          {error && <p className="font-semibold text-boo">{error}</p>}
          <Button type="submit" disabled={busy || code.length !== ROOM_CODE_LENGTH || !name.trim()}>
            {ro.home.submitJoin}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setJoining(false)}>
            {ro.home.back}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <Button onClick={() => setJoining(true)}>{ro.home.join}</Button>
          <p className="-mt-3 text-center text-sm text-wood-pale/60">{ro.home.joinHint}</p>
          <Button variant="secondary" onClick={createRoom} disabled={busy}>
            {ro.home.create}
          </Button>
          <p className="-mt-3 text-center text-sm text-wood-pale/60">{ro.home.createHint}</p>
          {error && <p className="text-center font-semibold text-boo">{error}</p>}
        </div>
      )}
    </main>
  );
}
