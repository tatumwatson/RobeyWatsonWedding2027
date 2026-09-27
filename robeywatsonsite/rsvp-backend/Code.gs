/**
 * Wedding RSVP backend — turns a Google Sheet into a free JSON API.
 *
 * Sheet "Guests" columns (row 1 = header, exact names matter):
 *   Name | OnProperty | thu_night_before | fri_reception_day |
 *   fri_reception_party | sat_day_after | sun_brunch
 *
 * OnProperty and each event column: enter TRUE or FALSE (or Yes/No).
 * This is where YOU control what each guest is invited to — guests
 * never see or choose this, they only see what you've marked TRUE.
 *
 * Sheet "RSVPs" is created automatically to log responses.
 *
 * Setup: Extensions > Apps Script, paste this file in, then
 * Deploy > New deployment > Web app, execute as "Me", access
 * "Anyone". Copy the resulting URL into assets/rsvp-config.js.
 */

const GUEST_SHEET = "Guests";
const RSVP_SHEET = "RSVPs";
const EVENT_KEYS = [
  "thu_night_before",
  "fri_reception_day",
  "fri_reception_party",
  "sat_day_after",
  "sun_brunch",
];

function truthy(val) {
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === "lookup") {
    return lookupGuest_(e.parameter.name || "");
  }
  return jsonResponse_({ ok: false, error: "Unknown action" });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse_({ ok: false, error: "Bad request body" });
  }
  if (body.action === "submit") {
    return submitRsvp_(body);
  }
  return jsonResponse_({ ok: false, error: "Unknown action" });
}

function lookupGuest_(rawName) {
  const name = rawName.trim().toLowerCase();
  if (!name) return jsonResponse_({ found: false });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUEST_SHEET);
  const data = sheet.getDataRange().getValues();
  const header = data[0].map((h) => String(h).trim());
  const nameCol = header.indexOf("Name");
  const onPropCol = header.indexOf("OnProperty");

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowName = String(row[nameCol] || "").trim().toLowerCase();
    if (rowName === name) {
      const events = {};
      EVENT_KEYS.forEach((key) => {
        const col = header.indexOf(key);
        events[key] = col === -1 ? false : truthy(row[col]);
      });
      return jsonResponse_({
        found: true,
        name: row[nameCol],
        onProperty: onPropCol === -1 ? false : truthy(row[onPropCol]),
        events: events,
      });
    }
  }
  return jsonResponse_({ found: false });
}

function submitRsvp_(body) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RSVP_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(RSVP_SHEET);
    sheet.appendRow(["Timestamp", "Name", "OnProperty", ...EVENT_KEYS, "Notes"]);
  }

  const row = [
    new Date(),
    body.name || "",
    body.onProperty ? "Yes" : "No",
  ];
  EVENT_KEYS.forEach((key) => {
    row.push((body.responses && body.responses[key]) || "");
  });
  row.push(body.notes || "");

  sheet.appendRow(row);
  return jsonResponse_({ ok: true });
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
