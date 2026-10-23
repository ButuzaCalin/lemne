// Bundles the game server and the Electron main process into plain CommonJS, so the
// packaged app needs no node_modules and no tsx.
import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  logLevel: 'warning',
  // The server only reads import.meta.url when LEMNE_* paths are unset, which never happens
  // in the desktop app.
  define: { 'import.meta.url': '"file:///"' },
};

await build({
  ...common,
  entryPoints: ['../server/src/server.ts'],
  outfile: 'dist/server.cjs',
  // Optional native speedups for `ws`; it falls back to JS without them.
  external: ['bufferutil', 'utf-8-validate'],
});

await build({
  ...common,
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.cjs',
  // Loaded at runtime, after the content/web paths are set.
  external: ['electron', './server.cjs'],
});

console.log('bundled dist/main.cjs + dist/server.cjs');
