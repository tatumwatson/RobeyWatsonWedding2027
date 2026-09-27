# Wedding website

A Quarto site, themed for a Northern Arizona pines / luxury cabin wedding.
Free to host, no domain required.

## What's in here

- `index.qmd`, `schedule.qmd`, `travel.qmd`, `funds.qmd`, `rsvp.qmd` — the
  site's pages. Search each for text in `[brackets]` and replace it with
  your real details.
- `assets/theme.scss`, `assets/styles.css` — the pine/cabin color palette
  and layout. Edit colors here if you want to adjust the look.
- `assets/rsvp.js`, `assets/rsvp-config.js` — the custom RSVP widget. It
  looks a guest up by name and shows only the events you've assigned them.
- `rsvp-backend/` — the free Google Sheet + Apps Script backend for RSVPs.
  **Start here**: `rsvp-backend/README.md` walks through the ~10 minute
  setup. Do this before the RSVP page will work.
- `.github/workflows/publish.yml` — automatically rebuilds and publishes
  the site every time you push to `main`. You don't need Quarto installed
  locally to update the site, just edit the `.qmd` files on GitHub (or
  locally) and push.

## First-time setup

1. **Create a GitHub repo** (e.g. `wedding-2027`), and push everything in
   this folder to it.
2. **Turn on GitHub Pages**: in the repo, go to Settings > Pages. Under
   "Build and deployment", set Source to "Deploy from a branch", branch
   `gh-pages`, folder `/ (root)`. Save. (The `gh-pages` branch is created
   automatically the first time the workflow runs, so do this *after* your
   first push.)
3. Wait a minute or two for the first Action run to finish (check the
   "Actions" tab), then your site will be live at:
   `https://<your-github-username>.github.io/<repo-name>/`
4. Set up the RSVP backend: follow `rsvp-backend/README.md`.
5. Fill in the honeymoon fund and room/board fund links in `funds.qmd`.
6. Replace every `[bracketed placeholder]` across the `.qmd` files with
   your real details (names, date, venue, schedule).
7. Commit and push. The site rebuilds automatically within a minute or two.

## QR code for your invite

Once your site is live, generate a QR code pointing at your site's URL
using any free QR generator (e.g. qr-code-generator.com, or the `qrcode`
Python package). One QR code works for every guest — the RSVP page asks
for their name and shows them their own invitation, so there's no need for
per-guest codes or links.

## Updating content later

Everything here is plain text and Markdown. To make a change:
- Small edits: click the pencil icon on any file directly on GitHub, edit,
  and commit. The site rebuilds itself.
- Bigger changes: clone the repo locally, edit, and push.

You do not need to install Quarto yourself unless you want to preview
changes before pushing them.
