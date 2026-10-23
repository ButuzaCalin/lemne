import type { PublicPlayer } from '@lemne/shared';

export function PlayerChip({ player, badge }: { player: PublicPlayer; badge?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-card bg-stage-raised px-4 py-3 shadow-[0_0.3rem_0_var(--color-curtain-deep)] ${player.connected ? '' : 'opacity-40'}`}
    >
      <span
        className="grid size-12 shrink-0 place-items-center rounded-full font-display text-2xl font-extrabold text-ink shadow-[inset_0_-0.25rem_0_rgb(0_0_0/0.2)] ring-2 ring-projector/20"
        style={{ background: `var(--color-avatar-${player.avatar})` }}
      >
        {player.name.charAt(0).toLocaleUpperCase('ro')}
      </span>
      <span className="font-display text-2xl font-bold">{player.name}</span>
      {badge && (
        <span className="ml-auto rounded-button bg-curtain px-3 py-1 text-sm font-semibold">
          {badge}
        </span>
      )}
    </div>
  );
}
