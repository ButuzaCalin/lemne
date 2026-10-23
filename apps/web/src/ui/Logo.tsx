import { ro } from '../i18n/ro';

/**
 * Lemne logo: three logs on a forest disc, a speech bubble („…”) and chunky outlined
 * lettering. Inline SVG so it uses our tokens and the display font at any size.
 */
export function Logo({ className = '', withName = true }: { className?: string; withName?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 400"
      role="img"
      aria-label={ro.appName}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <g stroke="var(--color-ink)" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="200" cy="185" r="140" fill="var(--color-forest)" stroke="none" />

        {/* Small log, back right */}
        <Log x={270} y={246} length={70} radius={31} angle={-8} />
        {/* Middle log */}
        <Log x={160} y={224} length={150} radius={43} angle={-15} />
        {/* Big log, front */}
        <Log x={50} y={168} length={190} radius={58} angle={-28} />

        {/* Speech bubble: the presenter has nothing to say yet. */}
        <path
          d="M300 46c46 0 76 22 76 52s-30 52-76 52c-8 0-15-1-22-2l-30 24 8-34c-20-10-32-24-32-40 0-30 30-52 76-52z"
          fill="var(--color-projector)"
        />
        <g fill="var(--color-ink)" stroke="none">
          <circle cx="272" cy="98" r="9" />
          <circle cx="300" cy="98" r="9" />
          <circle cx="328" cy="98" r="9" />
        </g>
      </g>

      {withName && (
        <text
          x="200"
          y="364"
          textAnchor="middle"
          transform="rotate(-3 200 330)"
          fill="var(--color-projector)"
          stroke="var(--color-ink)"
          strokeWidth="18"
          strokeLinejoin="round"
          paintOrder="stroke"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="114"
          letterSpacing="2"
        >
          {ro.appName.toLocaleUpperCase('ro')}
        </text>
      )}
    </svg>
  );
}

/** A log lying on its side: bark body with a few grain lines, and a ringed cut end. */
function Log({
  x,
  y,
  length,
  radius,
  angle,
}: {
  x: number;
  y: number;
  length: number;
  radius: number;
  angle: number;
}) {
  const end = x + length;
  const rx = radius * 0.62;
  return (
    <g transform={`rotate(${angle} ${end} ${y})`}>
      <path
        d={`M${end} ${y - radius} H${x + radius * 0.4} Q${x} ${y - radius} ${x} ${y} Q${x} ${y + radius} ${x + radius * 0.4} ${y + radius} H${end} Z`}
        fill="var(--color-bark)"
      />
      <g stroke="var(--color-bark-dark)" strokeWidth="5">
        <path d={`M${x + length * 0.15} ${y - radius * 0.45} l${length * 0.35} ${-radius * 0.08}`} />
        <path d={`M${x + length * 0.3} ${y + radius * 0.1} l${length * 0.4} ${-radius * 0.05}`} />
        <path d={`M${x + length * 0.1} ${y + radius * 0.55} l${length * 0.3} ${radius * 0.04}`} />
      </g>
      <ellipse cx={end} cy={y} rx={rx} ry={radius} fill="var(--color-wood-pale)" />
      <g fill="none" stroke="var(--color-wood-light)" strokeWidth="4">
        <ellipse cx={end} cy={y} rx={rx * 0.66} ry={radius * 0.66} />
        <ellipse cx={end} cy={y} rx={rx * 0.33} ry={radius * 0.33} />
      </g>
    </g>
  );
}
