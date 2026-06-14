# Campus Latino 92.1 FM — Podcast Website

[Radio Campus Brussels](https://www.radiocampus.be) — Latin American community radio show airing Sundays 11:00–14:30 on 92.1 FM.

Built as a lightweight, Bootstrap-free single-page app that pulls episodes from Mixcloud and filters only Campus Latino content.

## Tech Stack

- **Vanilla JavaScript** (no framework — no Vue, no React, no jQuery)
- **Custom CSS** (no Bootstrap, no Tailwind — full control)
- **Bootstrap Icons** (icon font only, not the CSS framework)
- **Mixcloud API** (episode search + embed player)
- **Botpoison** (contact form anti-spam)
- **localStorage** (dark mode preference)

## Features

- Hash-based SPA routing: `#/` (home), `#/about`, `#/episodes`, `#/contact`
- Persistent player sheet: slides up from the bottom, keeps playing across page navigations
- Live radio stream bar with play/pause
- Episode search by title text and year filter
- Share-to-clipboard with toast notification
- Dark mode toggle (persisted in localStorage)
- Horizontal episode cards with description excerpts
- Scroll-triggered fade-in for episode list
- Full-screen editorial hero with CSS geometric pattern background
- Page transition animations
- Skeleton loading state
- Error state with retry button

## Design

- Typography: Playfair Display (headings) + Ubuntu (body)
- Color palette: warm off-white background, deep red accent, amber highlights
- Mobile-first responsive layout
- Magazine/editorial style with horizontal card layout

## Getting Started

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```

No build step, no npm install — just serve the directory.

## File Structure

```
├── index.html          # All page sections + player sheet + live bar
├── css/style.css       # Complete stylesheet (~1460 lines)
├── js/app.js           # All logic: state, API, rendering, events
└── assets/             # Logo images, favicon
```

## API Notes

- Mixcloud search returns ALL Radio Campus shows; client-side filtering via `element.key.indexOf('/radiocampusbruxelles/campus-latino-') !== -1`
- Body has `padding-bottom: calc(var(--bar-h) * 2)` to account for the fixed player sheet + live bar

## External Dependencies

| Library | Purpose |
|---------|---------|
| [Bootstrap Icons](https://icons.getbootstrap.com/) | Icon font (free) |
| [Botpoison](https://botpoison.com/) | Contact form spam protection |
| [Google Fonts](https://fonts.google.com/) | Playfair Display + Ubuntu |
