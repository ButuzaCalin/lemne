const patterns = {
  tap: 10,
  reveal: [30, 50, 30],
  turn: 200,
} satisfies Record<string, VibratePattern>;

/** Android only; iOS ignores navigator.vibrate, which is fine. */
export function haptic(kind: keyof typeof patterns): void {
  navigator.vibrate?.(patterns[kind]);
}
