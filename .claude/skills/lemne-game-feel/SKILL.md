---
name: lemne-game-feel
description: Motion, sound and haptics rules for Lemne - durations, easings, required effects per game phase, sound map, reduced-motion handling. Use when adding animations, transitions, sounds or any "juice" to apps/web.
---

# Lemne game feel

A party game lives or dies on feedback. **Nothing should just appear.** Every state change gets motion, and big moments also get sound.

## Library and tokens
- Animation: `motion/react` (install with `npm i motion -w @lemne/web` when first needed). Use CSS transitions only for simple hover/tap.
- Durations (CSS vars in `tokens.css`): `--duration-tap` 150ms, `--duration-phase` 500ms, `--duration-celebrate` 1200ms. In motion code, read them from one `apps/web/src/motion.ts` constants file. Never scatter magic numbers.
- Easings: `--ease-pop` (overshoot, for things arriving: slides, avatars, scores) and `--ease-out-soft` (for things leaving and for layout changes).

## Required effects by phase
| Phase | Host (TV) | Phone |
|---|---|---|
| LOBBY | Avatar pops in with `ease-pop` + a soft "knock" sound on each join | Join button presses down (podium shadow collapses) |
| ROUND_INTRO | Curtain opens (two panels slide out), then the title types in word by word | Role reveal: card flips to show "Prezentator" / "Asistent" / "Public" + short vibration |
| PRESENTING | New slide drops onto the projector with slight rotation → settles to 0° | Assistant: chosen card lifts and flies up; Audience: reaction buttons squash on tap |
| reactions | Emoji float up from the bottom, drift sideways and fade; a burst of many merges into a bigger one | – |
| RATING | Countdown ring in spotlight yellow | Rating stars/logs fill with pop |
| ROUND_RESULTS | Scores count up (not jump) and the leaderboard re-sorts with layout animation | – |
| FINAL_RESULTS | Podium rises, confetti made of wood chips, award cards flip one by one | "Ai câștigat" / your award |

## Sound (host only)
- Library: Howler.js. Files go in `apps/web/public/sounds/` as short `.webm` + `.mp3` fallback, normalized to the same loudness.
- The first click on "Creează cameră" unlocks audio. Always show a mute toggle on the host.
- Map (filenames): `join`, `curtain`, `slide`, `reaction-clap`, `reaction-laugh`, `tick` (last 5 s), `buzzer` (time up), `drumroll`, `fanfare`, plus a quiet `lobby-loop`.
- Phones stay silent. People are in the same room, so one sound source is enough.

## Haptics (phones)
`navigator.vibrate` where it exists (Android; iOS ignores it). Use 10ms on any tap, `[30, 50, 30]` on role reveal, and 200ms when it's your turn. Wrap all of this in one `haptic(kind)` helper.

## Reduced motion
`prefers-reduced-motion` sets the duration vars to 0. Motion components must also respect it, via `useReducedMotion()`. Replace movement with opacity fades rather than removing feedback entirely.

## Performance
- Animate only `transform` and `opacity`.
- Cap floating reactions at about 40 on screen and recycle the nodes.
- The host must hold 60 fps on a mid-range laptop. Check this in DevTools during a reaction spam.
