# Wedding website

Quarto site, themed w/ invite color scheme and fonts.

## What's in here

- `index.qmd`, `schedule.qmd`, `travel.qmd`, `funds.qmd`, `rsvp.qmd` — the
  site's pages.
- `assets/theme.scss`, `assets/styles.css` — color palette
  and layout. 
- `assets/rsvp.js`, `assets/rsvp-config.js` — DIYed RSVP widget.
  Looks a guest up by name and shows only the events assigned them.
- `rsvp-backend/` — Google Sheet + Apps Script backend for RSVPs.
  **Start here**: `rsvp-backend/README.md` ~10 minute
  setup. 
- `.github/workflows/publish.yml` — automatically rebuilds and publishes
  the site every time pushed to `main`.
