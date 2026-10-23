import { fileURLToPath } from 'node:url';

/**
 * Where content/ and the web build live. The repo layout is the default; the desktop app
 * points these at its packaged resources via LEMNE_CONTENT_DIR and LEMNE_WEB_DIST.
 */
export const contentDir = withSlash(
  process.env.LEMNE_CONTENT_DIR ?? fileURLToPath(new URL('../../../content/', import.meta.url)),
);
export const webDist = withSlash(
  process.env.LEMNE_WEB_DIST ?? fileURLToPath(new URL('../../web/dist/', import.meta.url)),
);

function withSlash(dir: string): string {
  return /[\\/]$/.test(dir) ? dir : `${dir}/`;
}
