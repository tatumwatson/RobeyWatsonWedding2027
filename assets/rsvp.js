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

function safeFileName(name) {
  return String(name || "guest").trim().replace(/\s+/g, "-").toLowerCase();
}

// ---------------------------------------------------------------
// PDF
// Card pages: the Canva background (assets/imgs/pdf-background.png) with one
// Canva card per attended event (assets/imgs/cards/<event key>.png), four per
// page. The "Good to know" pages follow on the same background. If neither the
// background nor any card image exists, the PDF falls back to the plain text schedule.
// ---------------------------------------------------------------
const PDF_BG_PATH = "assets/imgs/pdf-background.png";
const PDF_BG_GTK_PATH = "assets/imgs/pdf-background-gtk.png"; // trees version, used for the Good to know page
const USE_CARDS = true; // false = background only with the text schedule
// Measurements in mm, set to fit inside the wavy border of the Canva background
// (the border's inner edge runs about 25 mm from the left and 191 mm from the right,
// 24 mm from the top and 255 mm from the bottom). Cards keep the 1905 x 555 px shape.
const CARD_LAYOUT = { w: 160, h: (160 * 555) / 1905, gap: 5, perPage: 4, titleY: 36, firstTop: 44, nextTop: 32 };
const GTK_KEYS = ["gtk_getting", "gtk_parking", "gtk_weather"]; // Good to know card images
const GTK_BOTTOM = 250; // mm, lowest point a Good to know card may reach
const TEXT_LAYOUT = { margin: 29, top: 36, bottom: 249 }; // used for text pages when the background is present

function cardPath(key) {
  return `assets/imgs/cards/${key}.png`;
}

const imageLoadErrors = {};

// Fetches the file first so a failure reports a reason (HTTP status or decode problem).
async function loadImage(src) {
  try {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(new Error("the browser could not decode it (type " + blob.type + ", " + blob.size + " bytes)"));
      img.src = objectUrl;
    });
  } catch (err) {
    imageLoadErrors[src] = String((err && err.message) || err);
    return null;
  }
}

async function downloadSchedulePdf(guest, events) {
  if (!window.jspdf) {
    alert("The PDF library didn't load. Check your connection and try again.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const loaded = await Promise.all([
    loadImage(PDF_BG_PATH),
    loadImage(PDF_BG_GTK_PATH),
    ...events.map((evt) => loadImage(cardPath(evt.key))),
    ...GTK_KEYS.map((key) => loadImage(cardPath(key))),
    loadImage(cardPath("gtk_title")),
  ]);
  const bg = loaded[0];
  const gtkBg = loaded[1];
  const cardImgs = loaded.slice(2, 2 + events.length);
  const gtkImgs = loaded.slice(2 + events.length, 2 + events.length + GTK_KEYS.length);
  const gtkTitle = loaded[2 + events.length + GTK_KEYS.length];
  const useCards = USE_CARDS && (!!bg || cardImgs.some(Boolean));
  const useGtk = useCards && gtkImgs.every(Boolean);
  const drawBg = (alt) => {
    if (alt) doc.addImage(alt, "PNG", 0, 0, pageW, pageH, "pdf-bg-gtk", "FAST");
    else if (bg) doc.addImage(bg, "PNG", 0, 0, pageW, pageH, "pdf-bg", "FAST");
  };
  drawBg();

  const M = bg ? TEXT_LAYOUT.margin : 18;       // page margin
  const W = doc.internal.pageSize.getWidth() - M * 2;
  const BOTTOM = bg ? TEXT_LAYOUT.bottom : doc.internal.pageSize.getHeight() - 22;
  const TOP = bg ? TEXT_LAYOUT.top : M + 6;
  const INK = [31, 45, 43];
  const PINE = [60, 78, 70];
  const SAGE = [127, 145, 134];
  const FOG = [196, 205, 200];
  let y = TOP;

  const setText = (style, size, color) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const lineHeight = (size) => size * 0.3528 * 1.35;
  const ensure = (h) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      drawBg();
      y = TOP;
    }
  };
  const rule = (gapAfter) => {
    doc.setDrawColor(FOG[0], FOG[1], FOG[2]);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + W, y);
    y += gapAfter;
  };
  // Writes wrapped text starting at x, returns nothing, advances y.
  const paragraph = (text, opts) => {
    const o = Object.assign({ size: 10, style: "normal", color: INK, x: M, width: W, after: 2 }, opts || {});
    setText(o.style, o.size, o.color);
    const lines = doc.splitTextToSize(text, o.width);
    const lh = lineHeight(o.size);
    ensure(lines.length * lh);
    lines.forEach((ln) => {
      doc.text(ln, o.x, y);
      y += lh;
    });
    y += o.after;
  };
  const bullets = (items) => {
    items.forEach((t) => {
      setText("normal", 10, INK);
      const lines = doc.splitTextToSize(t, W - 6);
      const lh = lineHeight(10);
      ensure(lines.length * lh);
      doc.setFillColor(SAGE[0], SAGE[1], SAGE[2]);
      doc.circle(M + 1.6, y - 1.1, 0.6, "F");
      lines.forEach((ln) => {
        doc.text(ln, M + 6, y);
        y += lh;
      });
      y += 0.8;
    });
    y += 1.5;
  };
  const sectionHeading = (text) => {
    ensure(14);
    setText("bold", 13, INK);
    doc.text(text, M, y);
    y += 6;
  };

  const L = CARD_LAYOUT;
  const cardPages = useCards ? Math.ceil(events.length / L.perPage) : 0;

  if (useCards) {
    // ---- Card pages ----
    setText("bold", 18, INK);
    doc.text(`${guest.name}'s Weekend Schedule`, pageW / 2, L.titleY, { align: "center" });
    const cx = (pageW - L.w) / 2;
    let cy = L.firstTop;
    events.forEach((evt, i) => {
      if (i > 0 && i % L.perPage === 0) {
        doc.addPage();
        drawBg();
        cy = L.nextTop;
      }
      if (cardImgs[i]) {
        doc.addImage(cardImgs[i], "PNG", cx, cy, L.w, L.h, `card-${evt.key}`, "FAST");
      } else {
        // Placeholder until this event's card image is uploaded
        doc.setDrawColor(SAGE[0], SAGE[1], SAGE[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(cx, cy, L.w, L.h, 3, 3, "S");
        setText("bold", 15, INK);
        doc.text(evt.label, pageW / 2, cy + L.h / 2 - 2, { align: "center" });
        setText("normal", 11, PINE);
        doc.text(`${evt.day} · ${evt.time}`, pageW / 2, cy + L.h / 2 + 6, { align: "center" });
      }
      cy += L.h + L.gap;
    });
    doc.addPage();
    drawBg(useGtk && gtkBg ? gtkBg : null);
    y = TOP;
  } else {
  // ---- Header ----
  setText("bold", 22, PINE);
  doc.text(COUPLE_NAMES, M, y);
  y += 8;
  setText("normal", 11, PINE);
  doc.text(`${WEDDING_DATES_TEXT} · The Legacy Lodge · Heber, Arizona`, M, y);
  y += 6;
  rule(9);

  // ---- Schedule ----
  sectionHeading(`${guest.name}'s Weekend Schedule`);
  y += 3;

  events.forEach((evt, i) => {
    const details = evt.details || [];
    setText("normal", 10, INK);
    const descLines = doc.splitTextToSize(evt.description || "", W);
    let est = 6 + 7 + 6 + descLines.length * lineHeight(10) + 4;
    details.forEach(() => { est += lineHeight(10) + 1.5; });
    ensure(est);

    setText("bold", 9, SAGE);
    doc.text(`${evt.day}, ${weddingMonthName()} ${eventDayNumber(evt)}`.toUpperCase(), M, y);
    y += 6;
    setText("bold", 15, INK);
    doc.text(evt.label, M, y);
    y += 6.5;
    setText("normal", 11, PINE);
    doc.text(evt.time, M, y);
    y += 6;
    paragraph(evt.description || "", { after: 2 });

    details.forEach((d) => {
      setText("normal", 10, INK);
      const lines = doc.splitTextToSize(d.value, W - 24);
      const lh = lineHeight(10);
      ensure(lines.length * lh + 1.5);
      setText("bold", 8.5, PINE);
      doc.text(String(d.label).toUpperCase(), M, y);
      setText("normal", 10, INK);
      lines.forEach((ln) => {
        doc.text(ln, M + 24, y);
        y += lh;
      });
      y += 1.5;
    });

    y += 3;
    if (i < events.length - 1) {
      ensure(10);
      rule(8);
    }
  });

  }

  // ---- Good to know ----
  if (useGtk) {
    // Styled cards, drawn when the site is published
    if (gtkTitle) {
      // Kraft badge with a wavy outline, 14 mm tall
      const th = 14, tw = (th * gtkTitle.width) / gtkTitle.height;
      doc.addImage(gtkTitle, "PNG", (pageW - tw) / 2, 27, tw, th, "gtk-title", "FAST");
    } else {
      setText("bold", 18, INK);
      doc.text("Good to know", pageW / 2, L.titleY, { align: "center" });
    }
    const gx = (pageW - L.w) / 2;
    let gy = L.firstTop;
    gtkImgs.forEach((img, i) => {
      const h = (L.w * img.height) / img.width;
      if (i > 0 && gy + h > GTK_BOTTOM) {
        doc.addPage();
        drawBg(gtkBg);
        gy = L.nextTop;
      }
      doc.addImage(img, "PNG", gx, gy, L.w, h, `gtk-${i}`, "FAST");
      gy += h + L.gap;
    });
  } else {
  ensure(30);
  if (!useCards) {
    y += 2;
    rule(9);
  }
  sectionHeading("Good to know");
  y += 1;

  setText("bold", 10, PINE);
  ensure(8);
  doc.text("GETTING HERE", M, y);
  y += 5.5;
  bullets(GOOD_TO_KNOW.getting);

  setText("bold", 10, PINE);
  ensure(10);
  doc.text("PARKING", M, y);
  y += 5.5;
  paragraph("Park here", { style: "bold", after: 1 });
  bullets(GOOD_TO_KNOW.parkHere);
  paragraph("Please do not", { style: "bold", after: 1 });
  bullets(GOOD_TO_KNOW.parkNot);
  paragraph(GOOD_TO_KNOW.parkNote || "Parking and no parking signs are posted throughout the property.", { after: 4 });

  setText("bold", 10, PINE);
  ensure(10);
  doc.text("WEATHER", M, y);
  y += 5.5;
  paragraph(GOOD_TO_KNOW.weather, { after: 4 });

  }

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let p = cardPages + 1; p <= pages; p++) {
    doc.setPage(p);
    setText("normal", 9, PINE);
    const ph = pageH;
    const pw = pageW;
    if (!bg) {
      doc.setDrawColor(FOG[0], FOG[1], FOG[2]);
      doc.setLineWidth(0.3);
      doc.line(M, ph - 16, pw - M, ph - 16);
    }
    doc.text(`Questions? Email us at ${CONTACT_EMAIL}`, pw / 2, ph - 10, { align: "center" });
  }

  doc.save(`${safeFileName(guest.name)}-weekend-schedule.pdf`);
}

// ---------------------------------------------------------------
// Calendar file (.ics). Opens in Apple Calendar, Google Calendar, and Outlook.
// ---------------------------------------------------------------
function icsStamp(day, clock) {
  const d = new Date(Date.UTC(WEDDING_YEAR, WEDDING_MONTH - 1, day, clock.h + UTC_OFFSET_HOURS, clock.min));
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`
  );
}

function icsEscape(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function icsFold(line) {
  const parts = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function buildIcs(events) {
  const now = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const stamp =
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tatum and Tavian Wedding//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((evt) => {
    const start = parseClock(evt.time);
    if (!start) return;
    let end = parseClock(evt.end);
    if (!end) end = { h: start.h + 3, min: start.min }; // default length: 3 hours
    const day = eventDayNumber(evt);

    const descParts = [evt.description || ""];
    (evt.details || []).forEach((d) => descParts.push(`${d.label}: ${d.value}`));
    descParts.push(`Questions? Email ${CONTACT_EMAIL}`);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${evt.key}-${WEDDING_YEAR}${p(WEDDING_MONTH)}@robeywatsonwedding2027`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(day, start)}`,
      `DTEND:${icsStamp(day, end)}`,
      `SUMMARY:${icsEscape(`${evt.label} (Tatum & Tavian)`)}`,
      `LOCATION:${icsEscape(LODGE_PLACE)}`,
      `GEO:${LODGE_GEO}`,
      `DESCRIPTION:${icsEscape(descParts.join("\n"))}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

function downloadCalendar(guest, events) {
  const usable = events.filter((e) => parseClock(e.time));
  if (!usable.length) {
    alert("We couldn't find any events to add to your calendar.");
    return;
  }
  const blob = new Blob([buildIcs(usable)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFileName(guest.name)}-wedding-weekend.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function submitRsvp(payload) {
  // Sent as text/plain on purpose: it keeps this a "simple request" so the
  // browser skips a CORS preflight, which Apps Script web apps don't handle.
  const res = await fetch(window.RSVP_CONFIG.scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Submit request failed");
  return res.json();
}

async function songSearch(q) {
  const url = `${window.RSVP_CONFIG.scriptUrl}?action=songsearch&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Song search failed");
  return res.json();
}

function songRow(guest, track) {
  const row = el("div", { class: "song-row" });
  if (track.image && track.image.startsWith("https://")) {
    row.appendChild(el("img", { src: track.image, alt: "", width: "40", height: "40" }));
  }
  const text = el("div", { class: "song-text" });
  const title = el("strong");
  title.textContent = track.name;
  const artist = el("span");
  artist.textContent = track.artist;
  text.appendChild(title);
  text.appendChild(artist);
  row.appendChild(text);

  const btn = el("button", { type: "button", class: "btn btn-outline-primary btn-sm" }, "Add");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Adding...";
    try {
      const r = await submitRsvp({
        action: "songadd",
        name: guest.name,
        uri: track.uri,
        label: `${track.name} - ${track.artist}`,
      });
      if (r.ok) {
        btn.textContent = r.duplicate ? "Already added" : "Added";
      } else {
        btn.textContent = "Try again";
        btn.disabled = false;
      }
    } catch (err) {
      btn.textContent = "Try again";
      btn.disabled = false;
    }
  });
  row.appendChild(btn);
  return row;
}

function renderSongs(guest) {
  const block = el("div", { class: "rsvp-event-block song-block" });
  block.appendChild(el("h3", {}, "Song requests"));
  block.appendChild(el("p", {}, "Search for a song to add it to our playlist."));
  const input = el("input", {
    type: "text",
    class: "form-control",
    placeholder: "Search by song or artist",
    "aria-label": "Search for a song",
  });
  const results = el("div", { class: "song-results" });
  block.appendChild(input);
  block.appendChild(results);

  // Pressing Enter here should not submit the RSVP form.
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });

  let timer;
  let latest = 0;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = "";
      return;
    }
    timer = setTimeout(async () => {
      const id = ++latest;
      try {
        const data = await songSearch(q);
        if (id !== latest) return;
        results.innerHTML = "";
        const tracks = data.tracks || [];
        if (!tracks.length) {
          results.textContent = "No matches. Try another search.";
          return;
        }
        tracks.forEach((t) => results.appendChild(songRow(guest, t)));
      } catch (err) {
        if (id !== latest) return;
        results.textContent = "Search isn't available right now. Please try again in a moment.";
      }
    }, 500);
  });

  return block;
}

function invitedEventsFor(guest) {
  const members = guest.members || [];
  return EVENT_DEFS.filter((e) => members.some((m) => m.events && m.events[e.key]));
}

// Events the party said yes to. Falls back to everything invited if the
// script doesn't report answers yet.
function eventsForGuest(guest) {
  const invited = invitedEventsFor(guest);
  return guest.yesEvents ? invited.filter((e) => guest.yesEvents[e.key]) : invited;
}

// Shown when someone looks up their name after they already responded.
function renderThanks(container, guest) {
  container.innerHTML = "";
  container.appendChild(el("h3", {}, `Welcome back, ${guest.name}!`));

  const msg = el("div", { class: "rsvp-status-msg success" });
  msg.textContent = guest.attending
    ? "Thank you for your RSVP! We look forward to seeing you."
    : "Thank you for your RSVP! We're sorry to miss you.";
  container.appendChild(msg);

  const actions = el("div", { class: "rsvp-actions" });

  if (rsvpClosed()) {
    container.appendChild(
      el("p", { class: "rsvp-closed-note" }, "RSVPs are now closed. To make a change, please reach out to us directly.")
    );
  } else {
    const editBox = el("div", { class: "rsvp-action" });
    editBox.appendChild(el("p", {}, "To edit your RSVP"));
    const editBtn = el("button", { type: "button", class: "btn btn-outline-primary" }, "Click here");
    editBtn.addEventListener("click", () => renderInvite(container, guest));
    editBox.appendChild(editBtn);
    actions.appendChild(editBox);
  }

  const myEvents = eventsForGuest(guest);
  if (guest.attending && myEvents.length) {
    const pdfBox = el("div", { class: "rsvp-action" });
    pdfBox.appendChild(el("p", {}, "To download your schedule"));
    const pdfBtn = el("button", { type: "button", class: "btn btn-outline-primary" }, "Click here");
    pdfBtn.addEventListener("click", () => downloadSchedulePdf(guest, myEvents));
    pdfBox.appendChild(pdfBtn);
    actions.appendChild(pdfBox);

    const calBox = el("div", { class: "rsvp-action" });
    calBox.appendChild(el("p", {}, "To add the events to your calendar"));
    const calBtn = el("button", { type: "button", class: "btn btn-outline-primary" }, "Click here");
    calBtn.addEventListener("click", () => downloadCalendar(guest, myEvents));
    calBox.appendChild(calBtn);
    actions.appendChild(calBox);
  }

  container.appendChild(actions);
}

// RSVPs close at the countdown's target date (set in rsvp.qmd).
function rsvpClosed() {
  const c = document.querySelector(".countdown[data-target]");
  if (!c) return false;
  const t = new Date(c.getAttribute("data-target")).getTime();
  return !isNaN(t) && Date.now() > t;
}

// Shown after the deadline to someone who has not responded.
function renderClosed(container, guest) {
  container.innerHTML = "";
  container.appendChild(el("h3", {}, `Welcome, ${guest.name}!`));
  container.appendChild(
    el("p", {}, "RSVPs are now closed. If you still need to respond, please reach out to us directly.")
  );
}

function renderInvite(container, guest) {
  container.innerHTML = "";

  container.appendChild(el("h3", {}, `Welcome, ${guest.name}!`));
  container.appendChild(
    el("p", {}, guest.onProperty
      ? "We're excited to have you staying with us on property!"
      : "We're excited to celebrate with you! Please let us know what you can make it to.")
  );

  const form = el("form", { id: "rsvp-form" });
  const members = guest.members || [];
  const invitedEvents = EVENT_DEFS.filter((e) =>
    members.some((m) => m.events && m.events[e.key])
  );

  if (invitedEvents.length === 0) {
    form.appendChild(el("p", {}, "We couldn't find any events attached to your invitation. Please reach out to us directly."));
  }

  const nameInputs = {}; // member id -> name input (guests added by name)
  const ageInputs = {};  // member id -> Adult / Teen / Child checkboxes

  const memberRadio = (m, val) => form.querySelector(`input[name="who_${m.id}"][value="${val}"]`);
  const isYes = (m) => !!(memberRadio(m, "Yes") && memberRadio(m, "Yes").checked);
  const isNo = (m) => !!(memberRadio(m, "No") && memberRadio(m, "No").checked);

  // ---- Top section: yes or no for each person ----
  const whoBlock = el("div", { class: "rsvp-event-block" });
  whoBlock.appendChild(el("h4", {}, "Who will be attending?"));
  whoBlock.appendChild(
    el("p", {}, "Please select yes or no for everyone in your party.")
  );

  members.forEach((m) => {
    const row = el("div", { class: "rsvp-member mb-3" });
    const nameLabel = el("div", { class: "mb-1" });
    nameLabel.textContent = m.name;
    row.appendChild(nameLabel);

    const group = el("div", { class: "btn-group", role: "group" });
    ["Yes", "No"].forEach((val) => {
      const id = `who_${m.id}_${val}`;
      const radio = el("input", {
        type: "radio",
        name: `who_${m.id}`,
        id,
        value: val,
        class: "btn-check",
        autocomplete: "off",
      });
      const lab = el("label", { class: "btn btn-outline-primary btn-sm me-2", for: id }, val);
      group.appendChild(radio);
      group.appendChild(lab);
    });
    row.appendChild(group);

    if (m.plusOne) {
      const input = el("input", {
        type: "text",
        class: "form-control rsvp-guest-name",
        placeholder: "Guest's full name (required)",
        "aria-label": `Full name for ${m.name}`,
        autocomplete: "off",
      });
      input.hidden = true;
      nameInputs[m.id] = input;
      row.appendChild(input);

      const ageRow = el("div", { class: "rsvp-guest-age" });
      ageRow.hidden = true;
      const ageBoxes = [];
      ["Adult", "Teen", "Child"].forEach((age) => {
        const wrap = el("div", { class: "form-check form-check-inline" });
        const ageId = `age_${m.id}_${age}`;
        const box = el("input", {
          type: "checkbox",
          class: "form-check-input",
          id: ageId,
          value: age,
        });
        const ageLabel = el("label", { class: "form-check-label", for: ageId }, age);
        box.addEventListener("change", () => {
          if (box.checked) {
            ageBoxes.forEach((other) => {
              if (other !== box) other.checked = false;
            });
          }
        });
        ageBoxes.push(box);
        wrap.appendChild(box);
        wrap.appendChild(ageLabel);
        ageRow.appendChild(wrap);
      });
      ageInputs[m.id] = ageBoxes;
      row.appendChild(ageRow);

      group.addEventListener("change", () => {
        const yes = isYes(m);
        input.hidden = !yes;
        ageRow.hidden = !yes;
        input.required = yes;
        if (yes) {
          input.focus();
        } else {
          ageBoxes.forEach((b) => { b.checked = false; });
        }
      });
      input.addEventListener("input", () => {
        nameLabel.textContent = input.value.trim() || m.name;
      });
    }

    whoBlock.appendChild(row);
  });
  form.appendChild(whoBlock);

  // ---- Days section: appears when anyone is a yes ----
  const eventsWrap = el("div");
  eventsWrap.hidden = true;
  const eventBlocks = {};

  const daysHead = el("div", { class: "rsvp-event-block" });
  daysHead.appendChild(el("h4", {}, "Which days will your party be able to attend?"));
  eventsWrap.appendChild(daysHead);

  invitedEvents.forEach((evt) => {
    const block = el("div", { class: "rsvp-event-block" });
    block.appendChild(el("h4", {}, `${evt.label} · ${evt.day}`));

    const wrap = el("div", { class: "btn-group", role: "group" });
    ["Yes", "No"].forEach((val) => {
      const id = `${evt.key}_${val}`;
      const input = el("input", {
        type: "radio",
        name: evt.key,
        id,
        value: val,
        class: "btn-check",
        autocomplete: "off",
      });
      const label = el("label", { class: "btn btn-outline-primary btn-sm me-2", for: id }, val);
      wrap.appendChild(input);
      wrap.appendChild(label);
    });
    block.appendChild(wrap);
    eventBlocks[evt.key] = block;
    eventsWrap.appendChild(block);
  });
  form.appendChild(eventsWrap);

  // ---- Notes, songs, on-property note, submit: appear once everyone has answered ----
  const lateBlocks = [];

  const notesBlock = el("div", { class: "rsvp-event-block" });
  notesBlock.appendChild(el("label", { for: "rsvp-notes" }, "Dietary restrictions or notes for us"));
  notesBlock.appendChild(el("textarea", { id: "rsvp-notes", rows: "3", class: "form-control" }));
  lateBlocks.push(notesBlock);

  lateBlocks.push(renderSongs(guest));

  if (guest.onProperty) {
    const note = el("div", { class: "rsvp-event-block" });
    note.appendChild(
      el(
        "p",
        {},
        `You're staying on-property. If you'd like to contribute toward your room and board, there's a voluntary link on the <a href="funds.html">Gifts</a> page — no pressure at all, we're just glad you're coming.`
      )
    );
    lateBlocks.push(note);
  }

  const submitWrap = el("div", { class: "rsvp-submit" });
  const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, "Send my RSVP");
  submitWrap.appendChild(submitBtn);

  lateBlocks.forEach((b) => {
    b.hidden = true;
    form.appendChild(b);
  });
  form.appendChild(submitWrap); // always visible fix 
  container.appendChild(form);

  function refresh() {
    const anyYes = members.some(isYes);
    const allAnswered = members.every((m) => isYes(m) || isNo(m));
    eventsWrap.hidden = !(anyYes && invitedEvents.length > 0);
    lateBlocks.forEach((b) => { b.hidden = !allAnswered; });
  }
  form.addEventListener("change", refresh);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    if (!members.every((m) => isYes(m) || isNo(m))) {
      showStatus(container, "Please select yes or no for everyone in your party.", "error");
      whoBlock.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const attending = members.filter(isYes).map((m) => {
      const picked = (ageInputs[m.id] || []).find((b) => b.checked);
      return {
        id: m.id,
        name: nameInputs[m.id] ? nameInputs[m.id].value.trim() : "",
        ageGroup: picked ? picked.value : "",
      };
    });

    const missingAge = members.find(
      (m) => m.plusOne && isYes(m) && !(ageInputs[m.id] || []).some((b) => b.checked)
    );
    if (missingAge) {
      showStatus(container, "Please select Adult, Teen, or Child for each additional guest who is attending.", "error");
      whoBlock.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // If anyone is attending, every event needs a yes or no.
    if (attending.length > 0) {
      const missing = invitedEvents.find(
        (evt) => !form.querySelector(`input[name="${evt.key}"]:checked`)
      );
      if (missing) {
        showStatus(container, `Please tell us whether you'll be joining ${missing.label}.`, "error");
        eventBlocks[missing.key].scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    const events = {};
    invitedEvents.forEach((evt) => {
      const checked = form.querySelector(`input[name="${evt.key}"]:checked`);
      events[evt.key] = attending.length > 0 && !!checked && checked.value === "Yes";
    });

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      const result = await submitRsvp({
        action: "submit",
        name: guest.name,
        attending,
        events,
        notes: document.getElementById("rsvp-notes").value,
      });
      if (result.ok) {
        // Clear the RSVP questions but keep the song search available.
        Array.from(form.children).forEach((child) => {
          if (!child.classList.contains("song-block")) child.remove();
        });
        const oldMsg = container.querySelector(".rsvp-status-msg");
        if (oldMsg) oldMsg.remove();

        const done = el("div", { class: "rsvp-submit" });
        const thanks = el("div", { class: "rsvp-status-msg success" });
        thanks.textContent = "Thank you! Your RSVP has been received.";
        done.appendChild(thanks);

        const picks = invitedEvents.filter((evt) => events[evt.key]);
        if (attending.length > 0 && picks.length) {
          const btnRow = el("div", { class: "rsvp-actions" });
          const pdfBtn = el(
            "button",
            { type: "button", class: "btn btn-outline-primary" },
            "Download your schedule (PDF)"
          );
          pdfBtn.addEventListener("click", () => downloadSchedulePdf(guest, picks));
          const calBtn = el(
            "button",
            { type: "button", class: "btn btn-outline-primary" },
            "Add to my calendar"
          );
          calBtn.addEventListener("click", () => downloadCalendar(guest, picks));
          btnRow.appendChild(pdfBtn);
          btnRow.appendChild(calBtn);
          done.appendChild(btnRow);
        }
        form.appendChild(done);
        done.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        showStatus(container, result.error || "Something went wrong. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Send my RSVP";
      }
    } catch (err) {
      showStatus(container, "We couldn't reach the RSVP service. Please try again in a moment.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send my RSVP";
    }
  });
}

function initRsvp() {
  const app = document.getElementById("rsvp-app");
  if (!app) return;

  if (!window.RSVP_CONFIG || window.RSVP_CONFIG.scriptUrl.includes("PASTE_YOUR")) {
    app.innerHTML = "";
    showStatus(app, "RSVP isn't connected yet — see rsvp-backend/README.md to finish setup.", "error");
    return;
  }

  app.innerHTML = "";
  const closed = rsvpClosed();
  const findText = closed ? "Find my schedule" : "Find my invitation";
  const help = document.getElementById("rsvp-help");
  if (closed && help) {
    help.innerHTML = `Need to make a change or RSVP late? Send us a message at <a href="mailto:therobeywatsons@gmail.com">therobeywatsons@gmail.com</a>.`;
  }
  const label = el("label", { for: "guest-name" }, "Full name");
  const input = el("input", { type: "text", id: "guest-name", placeholder: "e.g. Macy Mouradian" });
  const button = el("button", { type: "button", class: "btn btn-primary" }, findText);

  app.appendChild(label);
  app.appendChild(input);
  const buttonWrap = el("div", { class: "rsvp-submit" });
  buttonWrap.appendChild(button);
  app.appendChild(buttonWrap);

  const doLookup = async () => {
    const name = input.value.trim();
    if (!name) return;
    button.disabled = true;
    button.textContent = "Looking...";
    try {
      const guest = await lookupGuest(name);
      if (guest.found && guest.responded) {
        renderThanks(app, guest);
      } else if (guest.found && rsvpClosed()) {
        renderClosed(app, guest);
      } else if (guest.found) {
        renderInvite(app, guest);
      } else if (guest.ambiguous) {
        showStatus(app, "More than one guest has that name. Please reach out to us directly and we'll get you set up.", "error");
        button.disabled = false;
        button.textContent = findText;
      } else {
        showStatus(app, "We couldn't find that name. Try the name exactly as it appears on your invite, or reach out to us.", "error");
        button.disabled = false;
        button.textContent = findText;
      }
    } catch (err) {
      showStatus(app, "We couldn't reach the RSVP service. Please try again in a moment.", "error");
      button.disabled = false;
      button.textContent = findText;
    }
  };

  button.addEventListener("click", doLookup);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLookup();
  });
}

document.addEventListener("DOMContentLoaded", initRsvp);
