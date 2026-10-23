# Lemne 🪵

A Romanian party game about improvised presentations, played in the browser. One player has to give a presentation on slides they have never seen. Another player picks those slides live from their phone, and everyone else judges it at the end.

> *„A fost cam lemn.”* The name plays on *lemn* (wood): a presenter who freezes on stage is *„lemn”*.

- **One shared screen** (TV or laptop) is the **host**. It shows the room code, the slides and the scores. Nobody plays on it.
- **Every player uses their phone** as a controller, in real time, with no app and no account.
- **The content is hand-made**: about 200 images plus text slides, presentation titles and prompts, all written by hand.

All game text is in Romanian. Code, comments and this README are in English.

---

## 1. The game

### Landing page
Two big buttons:
- **Creează cameră** (Create room): this device becomes the host screen. It shows a 4-letter code and a QR code.
- **Intră în cameră** (Join room): the player enters the code and a nickname, and their phone becomes a controller.

### Roles in each round
| Role | Device | What they do |
|---|---|---|
| **Prezentator** (presenter) | phone + talks out loud | Improvises a presentation on a title they just received. Taps "Următorul slide" to advance. Sometimes gets a prompt card on their phone ("Spune o poveste din copilărie", "Citează un expert inventat"). |
| **Asistent** (assistant) | phone | For each slide, picks 1 of 2–3 options (image or text) that the presenter must then explain. |
| **Public** (audience) | phone | Watches, then rates the presentation at the end on a slider from 🪵 lemn (wood) to 💎 diamant (diamond). |

### Game flow (server state machine)
```
LOBBY
  └─► (optional) TITLE_WRITING    every player writes 2 titles, or titles come from the hand-made list
       └─► ROUND_INTRO            pick presenter + assistant, reveal the title
            └─► PRESENTING        loop N slides (default 6):
            │                       assistant picks → host shows → presenter talks → presenter taps "next"
            │                       timer ~2 min
            └─► RATING            audience rates the presentation on one slider: 🪵 lemn (0) → 💎 diamant (100)
                 └─► ROUND_RESULTS
                      └─► next round, or ──► FINAL_RESULTS (podium + funny awards: „Cel mai lemn”, „Asistentul trădător”…)
```
Players rotate so that everyone is the presenter once (3–8 players; extra people can join as audience only).

### Scoring (first version, tune after playtests)
- Presenter: average slider rating (0–100) × 5.
- Assistant: average slider rating × 2 (they share in a good presentation).
- Audience: no points in v1.

---

## 2. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One type set shared by server and client. |
| Client | **React + Vite** | Fast dev server, simple static build. |
| Styling | **Tailwind CSS v4** + CSS variables for design tokens | Quick iteration, with tokens kept in one place. |
| Animation | **Motion** (`motion/react`) | Slide transitions, floating reactions, score count-ups. |
| Sound | **Howler.js** | Works reliably on mobile; sounds play on the host only. |
| Realtime | **Socket.IO** | Rooms, reconnects and acks out of the box, plus a fallback when WebSockets are blocked. |
| Server | **Node.js (Fastify + Socket.IO)** | One process serves the API, the sockets and the built client. |
| Validation | **zod** | Every incoming socket payload is validated. |
| QR | `qrcode` | Join QR on the host lobby screen. |
| Images | **Cloudflare R2** (public bucket on a custom domain, e.g. `img.lemne.ro`) | Free tier is plenty for 200 images, with no egress fees. Cloudinary would also work. |
| Hosting | **Fly.io** (one machine, region `fra`) or Railway | Long-lived WebSocket server, cheap, close to Romania. |
| Tests | **Vitest** (game logic) + **Playwright** (multi-device E2E) | |

**Game state lives in server memory.** There is no database. A room only exists while people are playing. If the server restarts, games in progress are lost, which is acceptable for a party game. This also means the app must run as a **single instance**: do not scale horizontally without adding a Redis adapter.

**Alternative:** Cloudflare Durable Objects with PartyServer, where one Durable Object = one room. It runs serverless and on the edge, but local debugging is harder. Only switch if hosting cost or cold starts become a problem.

---

## 3. Project structure

npm workspaces. The shared package is consumed as TypeScript source, with no build step.

```
lemne/
├── apps/
│   ├── server/
│   │   └── src/
│   │       ├── index.ts            Fastify + Socket.IO bootstrap, serves web build in production
│   │       ├── rooms.ts            room registry, code generation, cleanup of idle rooms
│   │       ├── socket.ts           event handlers: validate → authorize (role + phase) → dispatch → broadcast
│   │       ├── views.ts            role-filtered state sent to host / each phone
│   │       ├── content.ts          loads + validates content/*.json at boot
│   │       └── game/
│   │           ├── machine.ts      pure reducer: (state, action) → state  ← the heart, fully unit-tested
│   │           ├── machine.test.ts
│   │           ├── scoring.ts
│   │           └── deck.ts         draws slides/titles/prompts without repeats in a session
│   └── web/
│       └── src/
│           ├── routes/
│           │   ├── Home.tsx        Creează / Intră
│           │   ├── Host/…          big-screen views, one per phase
│           │   └── Play/…          phone views, one per (phase × role)
│           ├── ui/                 shared components (Button, PlayerChip…)
│           ├── i18n/ro.ts          every UI string
│           ├── socket.ts           typed client + state store hook
│           └── styles/tokens.css   colors, fonts, radii, motion durations (Tailwind v4 @theme)
├── packages/
│   └── shared/
│       └── src/
│           ├── events.ts           zod schemas + TS types for every socket event
│           ├── types.ts            Phase, Role, views, error codes
│           ├── content.ts          zod schemas for content/*.json
│           └── constants.ts        timings, limits, slide count
├── content/
│   ├── slides.json
│   ├── titles.json
│   ├── prompts.json
│   └── awards.json
├── scripts/
│   ├── prepare-images.ts           resize/convert local images → WebP, upload to R2, write slides.json (stub)
│   └── validate-content.ts         schema check, broken URLs, duplicates, Romanian diacritics check
├── .claude/
│   ├── settings.json               plugins (frontend-design, playwright) + safe command allowlist
│   └── skills/                     project skills (see §8)
└── CLAUDE.md                       short orientation for Claude sessions
```

---

## 4. Realtime protocol

The **server is authoritative**. Clients send *intents* and the server answers with *state*. Phones never trust each other or the host.

Each client gets a **view of the state tailored to its role**, so nothing leaks: for example, the presenter never receives the assistant's upcoming slide options.

### Client → server
| Event | From | Payload |
|---|---|---|
| `room:create` | host | – → ack `{ code, hostToken }` |
| `room:join` | phone | `{ code, name, avatar }` → ack `{ playerId, playerToken }` |
| `room:rejoin` | any | `{ code, token }` |
| `game:start` | host, or first player ("VIP") | settings |
| `title:submit` | player | `{ text }` |
| `slide:pick` | assistant | `{ optionId }` |
| `slide:next` | presenter | – |
| `rating:submit` | audience | `{ value: 0-100 }` (lemn → diamant) |

### Server → client
| Event | Payload |
|---|---|
| `state` | full snapshot of the role-filtered view, sent on every change (it's small, so no diffing needed) |
| `error` | `{ code, message }` with a Romanian user-facing message |

### Rooms and connections
- **Room codes:** 4 uppercase letters from an alphabet without look-alikes (no `I O 0 1`), plus a small blocklist of Romanian rude words.
- **Reconnect:** `playerToken` is stored in `localStorage`. A disconnected player keeps their seat for 2 minutes. Phones lock screens all the time, so this is essential.
- **Timers** run on the server, which sends an `endsAt` timestamp. Clients only render a countdown.
- **Room cleanup:** delete a room after 15 min with no activity, or 2 min after the host disconnects for good.
- **Limits:** 8 players, plus up to 20 audience-only members. Names are max 12 characters, trimmed and escaped.

---

## 5. Content (hand-made)

### `content/slides.json`
```json
[
  { "id": "img-001", "type": "image", "src": "https://img.lemne.ro/001.webp", "thumb": "https://img.lemne.ro/001-thumb.webp", "alt": "O capră pe un acoperiș", "tags": ["animale"] },
  { "id": "txt-001", "type": "text", "text": "Nu toți eroii poartă pelerină.", "tags": ["citat"] },
  { "id": "txt-002", "type": "chart", "text": "Productivitatea mea în funcție de ziua săptămânii" }
]
```
- `image`: one of your ~200 pictures.
- `text`: a big statement, quote or bullet slide.
- `chart` (optional, later): a fake chart drawn by the client, for corporate-parody slides.

### `content/titles.json`
Presentation titles, e.g. `„De ce mama are mereu dreptate”`, `„Strategia mea de investiții în borcane”`.

### `content/prompts.json`
Prompt cards for the presenter, e.g. `„Acum fă o comparație cu fotbalul.”`

### Image pipeline
1. Put your source images in a local folder that is not committed, e.g. `~/lemne-raw/`.
2. Run `npm run content:images ~/lemne-raw`. It uses **sharp** to make a 1920px WebP for the host screen and a 480px WebP thumbnail for the assistant's phone, uploads both to R2, and adds the missing entries to `slides.json`.
3. Run `npm run content:validate`, which also runs in CI.
4. The host **preloads** every slide of a round during `ROUND_INTRO`, so slides appear instantly when the assistant picks one.

Mind image rights: use your own photos, CC0 images, or images you have a licence for, especially if the site is public.

---

## 6. Romanian language rules

- Use the correct diacritics: **ș ț** with a *comma below* (U+0219, U+021B), **not** ş ţ with a cedilla. `validate-content` flags cedilla forms.
- Fonts must include the **latin-ext** subset. Test them with `ĂÂÎȘȚ ăâîșț` at every weight you use.
- Set `<html lang="ro">`.
- Keep all UI strings in `apps/web/src/i18n/ro.ts`, not hard-coded in components. They are easier to polish later, and English can be added if ever needed.
- Tone: informal (*tu*, not *dumneavoastră*), playful, with a light parody of corporate presentation language.

---

## 7. Feel and polish checklist

These details are what make a party game feel finished:

**Host screen**
- Designed for a TV seen from 3 m away: huge type, high contrast, 16:9, no scrolling ever.
- Fullscreen button and the **Screen Wake Lock API**, so the TV never sleeps.
- Join instructions and a QR code are always visible in the lobby, and players' avatars pop in as they join.
- Every phase change is animated. Nothing should just "appear".
- Sound effects and a quiet music loop, with a mute toggle. Browsers need a first click before audio can play, so the "Creează cameră" click unlocks it.

**Phones**
- One-handed use: big tap targets (≥ 56px), main actions in the thumb zone.
- Each screen tells the player **who they are this round** and **what to do now**, in one sentence.
- No zoom, no pull-to-refresh, no accidental text selection, and `100dvh` layouts.
- Haptic tick on tap where supported (`navigator.vibrate`; iOS ignores it, which is fine).
- Waiting screens are fun rather than empty, e.g. "Așteaptă, prezentatorul transpiră…".
- Honest connection status: a small banner saying "Te reconectăm…".

**Performance**
- The host should load in under 2 s on a laptop, and phones should load in under 1 s on 4G.
- Phones never download full-size images, only thumbnails.

---

## 8. Claude skills

Skills give Claude standing instructions for this project, so the UI comes out consistent and polished rather than generic. Everything below is already set up in the repo.

### 8.1 Plugins (enabled in `.claude/settings.json`)

| Plugin | What it does for Lemne |
|---|---|
| **`frontend-design@claude-plugins-official`** | Pushes Claude toward a bold, deliberate visual direction and away from the generic "AI-made" look. Our `lemne-design` skill decides *which* direction. |
| **`playwright@claude-plugins-official`** | A Playwright MCP server, so Claude can open the host at TV size and phones at phone size, click through, and take screenshots. `lemne-playtest` depends on it. |

When you open this folder in Claude Code and trust it, you'll be prompted to install them. If you aren't, run:
```
/plugin install frontend-design@claude-plugins-official
/plugin install playwright@claude-plugins-official
```

Optional extras from `/plugin marketplace add anthropics/skills`, in the `example-skills` plugin:
- `theme-factory`: for exploring alternative palettes.
- `webapp-testing`: a Python Playwright scripting alternative.

### 8.2 Project skills (`.claude/skills/`)

These hold *your* taste. They are drafts, so edit them freely as the game takes shape. Claude loads them automatically when the task matches.

| Skill | Covers |
|---|---|
| `lemne-design` | Stage concept, tokens in `tokens.css`, TV vs. phone rules, what to avoid, pre-finish checklist |
| `lemne-game-feel` | Durations and easings, required effects per phase, sound map, haptics, reduced motion |
| `lemne-romana` | Tone of voice, good and bad examples, diacritics (ș ț with comma below), glossary |
| `lemne-continut` | Content JSON schemas, ids and tags, images, validator |
| `lemne-playtest` | Start dev, open 1 host + 3 phones via Playwright MCP, screenshot each phase, check against `lemne-design` |

Add 2–3 screenshots of screens you love to `lemne-design` once you have them. Reference images steer the design more than any written rule. To create new skills, use `skill-creator`.

### 8.3 Built-in skills that are useful here
- `/run`: starts the app and shows it working.
- `/code-review`, `/simplify`: review before each milestone.
- `/security-review`: run once before going public. Socket input validation and rate limits are the risky parts.

---

## 9. Roadmap

1. **Skeleton:** monorepo, shared types, create/join room, lobby with live player list on host and phones. *(Done. Still missing: rejoin after refresh or screen lock.)*
2. **Core loop:** state machine plus unit tests, a full round with placeholder content and no styling.
3. **Content:** image pipeline, first 50 slides. *(The validator is done.)*
4. **Design pass:** refine `lemne-design` and `lemne-game-feel`, then style every phase.
5. **Juice:** animations, sound, haptics, awards screen.
6. **Playtest** with real people on real phones and a TV, then tune timings and scoring.
7. **Deploy:** Fly.io, custom domain, R2 image domain.

---

## 10. Running locally

Requires Node 22+ (see `.nvmrc`).

```bash
npm install
npm run dev         # server on :3000, web on :5173 (Socket.IO proxied)
```
To test with real phones, open `http://<your-laptop-LAN-IP>:5173` on a phone connected to the same Wi-Fi. Vite prints the address.

```bash
npm test                    # unit tests (game machine)
npm run typecheck
npm run content:validate    # add -- --check-urls to also check image URLs
npm run build && npm start  # production: one server on :3000 serves everything
```

### Desktop app (LAN parties)
`apps/desktop` wraps the same server in Electron: double-click, and the computer runs the game and shows the TV screen in its own window. Phones on the same Wi-Fi join through the lobby QR code.

```bash
npm run desktop       # run it from source
npm run package:win   # → apps/desktop/release/Lemne-Setup-<version>.exe (works from macOS too)
npm run package:mac   # → apps/desktop/release/Lemne-<version>.dmg
```
- The installer is unsigned, so Windows SmartScreen asks once: „More info → Run anyway”.
- On first launch, allow Lemne through the Windows firewall on **private networks**, or phones can't connect.
- F11 toggles fullscreen. The screen won't sleep while the app is open.

---

*Lemne is an independent, non-commercial party game.*
