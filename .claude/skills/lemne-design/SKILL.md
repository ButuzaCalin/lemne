---
name: lemne-design
description: Visual identity of Lemne - stage concept, color/type tokens, host-screen vs phone layout rules, and what to avoid. Use before creating or changing any page, component or style in apps/web. Takes precedence over generic frontend-design choices.
---

# Lemne design

## Concept
**A slightly shabby Romanian conference stage.** Red velvet curtain, a wooden podium, an over-bright projector, and slides that parody corporate PowerPoint. It should feel warm, theatrical and a bit ridiculous, like a cultural centre hall at 9 pm, not a tech startup.

- **Stage** (backgrounds, chrome): dark, warm, with a curtain-red radial glow from the top.
- **Projector** (slides, inputs, cards that hold content): warm off-white with dark ink, like a projected slide.
- **Wood** (secondary surfaces, outlines, podium shadow under buttons): browns.
- **Spotlight** (primary action, room code, the "now" thing): yellow. Use it for one thing per screen.

## Tokens
All tokens live in `apps/web/src/styles/tokens.css` (Tailwind v4 `@theme`, so `bg-curtain`, `text-spotlight`, `font-display`, `rounded-card`, `shadow-podium` etc. exist). **Never hard-code a hex value in a component.** If a new color is needed, add a token first.

| Token | Use |
|---|---|
| `stage`, `stage-raised` | page background, raised panels |
| `curtain`, `curtain-deep` | glow, badges, VIP/role highlights |
| `wood`, `wood-light`, `wood-pale` | secondary buttons, outlines, headings on stage |
| `projector`, `ink`, `ink-soft` | slides, inputs, content cards |
| `spotlight` | the single primary action / key info |
| `applause`, `boo` | positive / negative feedback, errors |
| `avatar-0…7` | player colors, indexed by `PublicPlayer.avatar` |

Type:
- `font-display` (Bricolage Grotesque 500/700/800) for headings, buttons, names and codes.
- `font-body` (DM Sans 400/600) for everything else.
- Both have latin-ext. Any new font must render `ĂÂÎȘȚ ăâîșț` correctly at every weight used.

## Host screen (TV)
- It is read from 3 m away. Minimum sizes: body 24px, labels 28px, headings ≥ 48px, room code ≥ 140px.
- Fixed 16:9 composition, `h-dvh`, **never scrolls**. Test at 1920×1080 and 1280×720.
- At most 3 pieces of information competing per screen. Big empty space is fine; it's a stage.
- Every phase gets its own layout, but the curtain glow, podium shadows and type stay consistent.

## Phone controller
- One column, `max-w-md`, `min-h-dvh`, safe-area padding.
- Main actions sit in the bottom half (thumb zone). Tap targets ≥ 56px (`min-h-14`).
- Every screen answers two questions at the top: **who am I this round** (player chip plus role badge) and **what do I do now** (one sentence).
- Never show the player something meant only for the TV, and vice versa.

## Components
Reuse before creating: `ui/Button` (primary = spotlight with podium shadow, secondary = stage with wood ring) and `ui/PlayerChip` (avatar initial plus name plus optional badge). New shared pieces go in `apps/web/src/ui/`.

## Avoid
- Purple/blue gradients, glassmorphism, neon, generic "SaaS dashboard" cards.
- Emoji as UI icons (reactions 👏 😂 😬 🪵 are the only exception).
- Pure black `#000` or pure white `#fff`.
- Thin font weights on the TV, and grey-on-grey low-contrast text.
- More than one spotlight-yellow element per screen.

## Before finishing a UI change
1. Check the host screen at 1920×1080 and the phone at 390×844 (use the `lemne-playtest` skill).
2. Check that no hex values or font names are hard-coded in components.
3. Check that Romanian diacritics render (no tofu, no cedilla ş/ţ).
4. Check that the UI works with `prefers-reduced-motion`.
