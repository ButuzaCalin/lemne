/** Motion durations (seconds) mirroring --duration-* in tokens.css, for motion/react. */
export const duration = {
  tap: 0.15,
  phase: 0.5,
  celebrate: 1.2,
} as const;

/** Same curves as --ease-pop and --ease-out-soft. */
export const ease = {
  pop: [0.34, 1.56, 0.64, 1],
  outSoft: [0.22, 1, 0.36, 1],
} as const;
