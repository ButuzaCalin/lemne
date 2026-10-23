import { useEffect, useState } from 'react';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The host:port phones should open. Same as the TV's own address, except when the TV is on
 * localhost: then ask the server for its Wi-Fi IP and keep the port (5173 in dev, 3000 in prod).
 */
export function useJoinHost(): string {
  const [host, setHost] = useState(location.host);

  useEffect(() => {
    if (!LOCAL_HOSTS.has(location.hostname)) return;
    fetch('/api/lan')
      .then((r) => r.json() as Promise<{ address: string | null }>)
      .then(({ address }) => {
        if (address) setHost(location.port ? `${address}:${location.port}` : address);
      })
      .catch(() => {});
  }, []);

  return host;
}
