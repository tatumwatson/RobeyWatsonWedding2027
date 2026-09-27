# RSVP backend setup (free, ~10 minutes)

This turns a Google Sheet you own into a private API your wedding site talks
to. Guests never see the sheet or the script, only the RSVP page on your site.

## 1. Create the sheet

1. Go to Google Sheets and create a new spreadsheet, e.g. "Wedding RSVPs".
2. Rename the first tab to exactly `Guests`.
3. Import `guests-template.csv` from this folder (File > Import > Upload,
   "Replace current sheet"), or just copy its header row and start filling
   in your real guest list underneath.
4. Columns:
   - `Name` — exactly how the guest should type it on the site (first + last
     is safest).
   - `OnProperty` — `TRUE` if they're staying on your property, else `FALSE`.
   - `thu_night_before`, `fri_reception_day`, `fri_reception_party`,
     `sat_day_after`, `sun_brunch` — `TRUE` for each event that guest is
     invited to, `FALSE` (or leave blank) for events they're not invited to.

This is the control point: guests only ever see the events you mark `TRUE`
for them. Nothing on the site lets them add an event you didn't assign.

## 2. Add the script

1. In the sheet, go to Extensions > Apps Script.
2. Delete the placeholder code and paste in the full contents of `Code.gs`
   from this folder.
3. Click the save icon.

## 3. Deploy it as a web app

1. Click Deploy > New deployment.
2. Click the gear icon next to "Select type" and choose "Web app".
3. Set "Execute as" to **Me**.
4. Set "Who has access" to **Anyone**.
5. Click Deploy, and authorize it with your Google account when prompted
   (you'll see a warning screen since it's your own unverified script —
   click "Advanced" then "Go to [project name] (unsafe)"; this is normal
   for a personal script only you control).
6. Copy the Web app URL it gives you. It looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

## 4. Connect it to your site

Open `assets/rsvp-config.js` in your site's files and replace
`PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with the URL you just copied.
Commit and push — the RSVP page will start working.

## 5. Where responses land

Every submitted RSVP appends a row to a new `RSVPs` tab in the same sheet,
with a timestamp, the guest's name, on/off-property status, their answer
for each event they were asked about, and any notes they left.

## Updating the guest list later

Just edit the `Guests` tab directly, anytime. Changes take effect
immediately, there's no republishing step.
