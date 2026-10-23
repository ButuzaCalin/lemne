import { networkInterfaces } from 'node:os';

/**
 * This machine's address on the local Wi-Fi, e.g. 192.168.1.23, or null if there is none.
 * Used so a TV opened at localhost still shows phones a QR code they can reach.
 */
export function lanAddress(): string | null {
  const candidates = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i!.address);
  // Prefer typical home-router ranges over VPN or Docker bridges.
  return (
    candidates.find((a) => a.startsWith('192.168.')) ??
    candidates.find((a) => a.startsWith('10.')) ??
    candidates.find((a) => /^172\.(1[6-9]|2\d|3[01])\./.test(a)) ??
    candidates[0] ??
    null
  );
}
