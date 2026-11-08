// ---------------------------------------------------------------
// RSVP widget: looks a guest up by name, shows the people in their
// party, asks yes or no for each person, then asks one yes or
// no per (invited) event for the whole party. Comments for diet
// & other, spotify playlist reqs below. Dwnld for cal, pdf and updating opts
// Feb 15th becomes dwnld, cal, or contact, no update opt. 
// ---------------------------------------------------------------

// Event details (label, day, time, location, description) come from
// window.WEDDING_EVENTS, loaded via assets/events-data.js before this file.
const EVENT_DEFS = window.WEDDING_EVENTS || [];

function el(tag, attrs = {}, html = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
}

function showStatus(container, message, type) {
  let box = container.querySelector(".rsvp-status-msg");
  if (!box) {
    box = el("div", { class: "rsvp-status-msg" });
    container.insertBefore(box, container.querySelector("#rsvp-form"));
  }
  box.className = `rsvp-status-msg ${type}`;
  box.textContent = message;
}

async function lookupGuest(name) {
  const url = `${window.RSVP_CONFIG.scriptUrl}?action=lookup&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Lookup request failed");
  return res.json();
}

// ---------------------------------------------------------------
// Shared wedding facts and helpers used by the PDF and the calendar file.
// Event times, descriptions, and details come from events-data.js.
// ---------------------------------------------------------------
const COUPLE_NAMES = "Tatum & Tavian Robey-Watson";
const WEDDING_DATES_TEXT = "May 7-8, 2027";
const LODGE_PLACE = "Legacy Lodge, Heber, Arizona";
const LODGE_GEO = "34.3330887;-110.6551981";
const CONTACT_EMAIL = "therobeywatsons@gmail.com";
const WEDDING_YEAR = window.WEDDING_YEAR || 2027;
const WEDDING_MONTH = window.WEDDING_MONTH || 5; // 5 = May
const UTC_OFFSET_HOURS = 7; // Arizona stays on UTC-7 all year

// The words for the Good to know section live in assets/events-data.js.
const GOOD_TO_KNOW = window.WEDDING_GOOD_TO_KNOW || { getting: [], parkHere: [], parkNot: [], parkNote: "", weather: "" };

function weddingMonthName() {
  return new Date(Date.UTC(WEDDING_YEAR, WEDDING_MONTH - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function eventDayNumber(evt) {
  return parseInt(evt.date, 10);
}

function parseClock(str) {
  const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(str || "");
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return { h: h, min: parseInt(m[2], 10) };
}

// Title badge: a kraft pill with a double sage frame and a green dot on each side, drawn on a
// canvas with Josefin Sans so any guest name works. Returns null if the font can't load,
// and the PDF then falls back to plain text.
let josefinReady = null;
async function makeTitleBadge(text) {
  try {
    if (!josefinReady) {
      josefinReady = new FontFace("Josefin Sans",
