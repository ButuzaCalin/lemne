import type { PublicPlayer } from './types';

/** Connected players the start is waiting on. The VIP never counts: starting is their yes. */
export function playersNotReady(players: PublicPlayer[], vipId: string | null): PublicPlayer[] {
  return players.filter((p) => p.connected && p.id !== vipId && !p.ready);
}
