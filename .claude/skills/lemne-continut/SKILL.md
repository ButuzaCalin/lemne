---
name: lemne-continut
description: How Lemne game content works - JSON schemas for slides, titles, prompts and awards, adding images, running the validator. Use when adding, editing or bulk-importing content, or changing content schemas.
---

# Lemne content

All game content is hand-written and lives in `content/`. Schemas are defined once, in `packages/shared/src/content.ts` (zod), and used by both the server loader (`apps/server/src/content.ts`) and the validator.

## Files
| File | Shape | Example |
|---|---|---|
| `slides.json` | array of image or text slides | see below |
| `titles.json` | array of strings, 3–80 chars | `"Viitorul mititeilor în era digitală"` |
| `prompts.json` | array of strings, 3–100 chars | `"Citează un expert inventat."` |
| `awards.json` | `{ id, title, description }[]` | `{ "id": "cel-mai-lemn", "title": "Cel mai lemn", … }` |

### Slides
```json
{ "id": "img-001", "type": "image", "src": "https://img.lemne.ro/001.webp", "thumb": "https://img.lemne.ro/001-thumb.webp", "alt": "O capră pe un acoperiș", "tags": ["animale"] }
{ "id": "txt-001", "type": "text", "text": "Nu toți eroii poartă pelerină.", "tags": ["citat"] }
```
- Image ids are `img-NNN` and text ids are `txt-NNN`. Ids are never reused or renumbered, even after deleting a slide.
- `alt` is required. It's used for accessibility and to make the JSON readable.
- Text slides have a max of 140 chars. Shorter is funnier on a projector.
- `tags` are free-form, lowercase Romanian, singular. Current tags: `animale`, `citat`, `corporatist`, `final`. Reuse existing tags before inventing new ones.

## Images
- Source images stay outside the repo (e.g. `~/lemne-raw/`). Only URLs go in JSON.
- Host size: 1920px on the long edge, WebP, quality about 80. Thumbnail: 480px, used on the assistant's phone.
- `npm run content:images <folder>` is planned to do resize, upload to R2 and add JSON entries (`scripts/prepare-images.ts`, roadmap step 3). Until then, add entries by hand.
- Only use images you have the rights to: your own photos, CC0, or licensed.

## After any content change
```bash
npm run content:validate                 # schema, duplicates, cedilla ş/ţ
npm run content:validate -- --check-urls # also HEADs every image URL
```
The server validates on boot too and refuses to start with invalid content.

Copy rules (tone, diacritics) are in the `lemne-romana` skill.
