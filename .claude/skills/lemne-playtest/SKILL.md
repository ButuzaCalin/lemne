---
name: lemne-playtest
description: Visually verify Lemne in a browser - start the dev servers, open one host (TV) plus three phone viewports with the Playwright MCP, play through the flow, screenshot every phase and check it against lemne-design. Use after any UI change and before calling UI work done.
---

# Lemne playtest

## 1. Start the app
```bash
npm run dev      # server :3000, web :5173 (Vite proxies /socket.io)
```
Run it in the background, then wait until `http://localhost:5173` responds.

## 2. Open the devices (Playwright MCP)
Each player needs its own tab, since each tab has its own socket connection.

1. **Host**: open a tab, resize to **1920×1080**, go to `http://localhost:5173`, click „Creează cameră”, and read the 4-letter code from the screen.
2. **Phones ×3**: for each, open a new tab, resize to **390×844**, go to `http://localhost:5173/?code=<CODE>`, enter a name and tap „Intră”. Use names that test diacritics and length: `Ștefan`, `Ioana-Mădălina` (12 chars max, so truncation shows), `Ăîâșț`.
3. Switch back to the host tab and screenshot it.

## 3. Play the flow
Go through every phase that exists so far. For each one, take a screenshot of the host and of at least one phone per role (presenter, assistant, audience). Also test:
- **Reconnect:** reload a phone tab. It should get its seat back (once rejoin is implemented).
- **Errors:** wrong code, duplicate name, joining a full room.
- **Smallest screen:** a 1280×720 host and a 360×640 phone. Nothing should overflow or scroll on the host.

## 4. Check each screenshot against `lemne-design`
- Text on the TV is readable from a distance (sizes in the design skill). Nothing scrolls.
- Only one spotlight-yellow element per screen.
- The phone shows who I am and what to do now, with actions in the thumb zone.
- Diacritics render, with no tofu boxes.
- There is nothing generic-looking (see the "Avoid" list).

Report what you saw, with the screenshots, and fix issues before saying the work is done. If the Playwright MCP is not available, say so instead of claiming a visual check.
