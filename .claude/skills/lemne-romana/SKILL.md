---
name: lemne-romana
description: Romanian copy rules for Lemne - tone of voice, glossary, correct diacritics (ș ț with comma below), where UI strings live. Use whenever writing or editing any player-facing text, in apps/web/src/i18n/ro.ts or content/*.json.
---

# Romanian copy for Lemne

## Where strings live
- All UI text goes in `apps/web/src/i18n/ro.ts`, never inline in components. Use functions for plurals or numbers, e.g. `playersCount(n, min)`.
- Game content (slides, titles, prompts, awards) goes in `content/*.json` (see the `lemne-continut` skill).
- Server error codes map to messages in `ro.errors`. The server never sends Romanian text.

## Diacritics (non-negotiable)
- Use **ș ț Ș Ț with a comma below** (U+0219, U+021B, U+0218, U+021A), never ş ţ with a cedilla. `npm run content:validate` rejects cedilla forms in content.
- Use **ă â î** correctly: "â" inside words (România, câine), "î" at the start and end (început, a hotărî).
- Use Romanian quotes „…” in visible text, not "…".
- Use the ellipsis character `…`, not `...`.

## Tone
Informal and playful: **tu**, not *dumneavoastră*. Lightly mock corporate presentation speak. Keep sentences short, because people read them on a TV from the sofa while laughing.

Good:
- „Așteptăm prezentatorii…”
- „Tu ești asistentul. Alege slide-ul care îl încurcă cel mai tare.”
- „Prezentatorul transpiră. Tu doar privește.”
- „Numele e deja luat. Alege altul.”
- „Ești în cameră!”
- „Timpul a expirat. Aplauze… sau nu.”
- „Cine a fost cel mai lemn?”
- „Ține telefonul aproape.”
- „Concluzia: depinde.”
- „Mulțumim pentru atenție!”

Bad:
- „Vă rugăm să introduceți codul camerei.” (too formal)
- „Eroare: payload invalid” (technical jargon)
- „Asteptam jucatorii...” (missing diacritics, three dots)
- „Click aici pentru a continua” (use „Apasă” / „Atinge” on phones)
- „Lobby-ul este gol” (anglicism; use „Nu a intrat nimeni încă”)

## Glossary
| Concept | Romanian | Notes |
|---|---|---|
| room | cameră | „Creează cameră”, „Intră în cameră” |
| room code | codul camerei | |
| presenter | Prezentator | role name, capitalized in badges |
| assistant | Asistent | |
| audience | Public | |
| VIP / first player | Șef de sală | can start the game |
| round | rundă | |
| slide | slide | the anglicism is accepted; plural „slide-uri” |
| reaction | reacție | |
| score / points | puncte | |
| awards | premii | |
| wooden / stiff | lemn | the brand joke: „ai fost lemn” |
