# AGENTS.md — Campus Latino

## Commands

```bash
# Serve the site locally
python3 -m http.server 8080

# Validate JS syntax
node --check js/app.js
```

## Project Structure

```
├── index.html       # All HTML sections, player sheet, live bar
├── css/style.css    # Complete custom stylesheet
├── js/app.js        # All JS: state, API, rendering, events
├── assets/          # Logo images, favicon
├── README.md        # Project docs
└── AGENTS.md        # This file
```

## Architecture

- **Vanilla JS SPA** — no framework, no build step
- **Hash-based routing** — `#/`, `#/about`, `#/episodes`, `#/contact`
- **Mixcloud API** — search returns all Radio Campus shows; client-side filter by `campus-latino-` prefix
- **localStorage** — dark mode (`cl-theme`)

## Key Design Decisions

- Player sheet is a fixed bottom panel above the live bar; stays visible across page navigations
- Body has `padding-bottom: calc(var(--bar-h) * 2)` to account for player sheet + live bar
- `position: sticky` nav needs to work with hash-based routing (no page reload)
- Episode cards use `IntersectionObserver` for scroll-triggered fade-in
- Dark mode via `data-theme` attribute on `<html>`, all colors as CSS variables

## CSS Conventions

- BEM-ish naming: `.btn--light`, `.card-btn--bm`
- Section comments use `/* ===== Section ===== */`
- Mobile-first: base styles are mobile, `@media (min-width: ...)` for larger

## JS Conventions

- IIFE wrapper, `"use strict"`
- No classes — plain functions and a single `state` object
- `setup*` functions attach event listeners (called from init)
- `render*` functions build HTML strings and inject into the DOM
- `observeFadeIn()` called after each dynamic render

## Common Gotchas

- Filter by year works via regex on episode name (names contain dates)
- Search and year filter are mutually exclusive (typing clears year, selecting year clears search)
- Bookmark/share buttons use event delegation via `e.target.closest()`
- Episode descriptions from Mixcloud are HTML; stripped to text via DOM parser

## External Dependencies

| CDN | Why |
|-----|-----|
| `bootstrap-icons@1.11.3` | Icon font only |
| Google Fonts: Ubuntu + Playfair Display | Typography |
