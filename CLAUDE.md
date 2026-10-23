# Lemne

A Romanian browser party game about improvised presentations. One TV is the host screen and phones are the controllers. The full spec is in README.md.

## Commands
```bash
npm run dev               # server :3000 + web :5173
npm test                  # vitest (server game logic)
npm run typecheck         # all workspaces + scripts
npm run build && npm start  # production: server also serves apps/web/dist
npm run content:validate
```

## Layout
- `packages/shared`: types, socket event contracts, zod schemas, constants. Imported as `@lemne/shared` by both apps, as TS source with no build step.
- `apps/server`: Fastify + Socket.IO.
  - `game/machine.ts` is a **pure reducer**: no I/O, no clock, no randomness. Pass those in through actions.
  - `socket.ts` handles each event in order: validate (zod) → authorize → dispatch → broadcast.
  - `views.ts` builds the per-role views.
- `apps/web`: React + Vite + Tailwind v4.
  - Routes: `/`, `/host/:code` (TV) and `/play/:code` (phone). Each phase has its own component.
- `content/`: hand-written JSON (see the `lemne-continut` skill).

## Rules
- The server is authoritative. Clients send intents, and the server sends back full state that is filtered per role. Never send a player data their role shouldn't see.
- Every new reducer action gets a unit test in `machine.test.ts`.
- UI strings go in `apps/web/src/i18n/ro.ts`. Colors, fonts and durations come from `apps/web/src/styles/tokens.css`. Never hard-code them.

## Skills to load
- Any UI work: `lemne-design` (and `frontend-design` for craft), then `lemne-playtest` to verify visually.
- Animations, sound, haptics: `lemne-game-feel`.
- Any Romanian text: `lemne-romana`.
- Content changes: `lemne-continut`.
