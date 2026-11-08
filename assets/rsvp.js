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
      josefinReady = new FontFace("Josefin Sans", "url(assets/fonts/josefin-sans.ttf)", { weight: "100 900" })
        .load()
        .then((f) => { document.fonts.add(f); return true; });
    }
    await josefinReady;
    await document.fonts.load('700 84px "Josefin Sans"', "Aa"); // make sure the bold weight is ready to draw
    const KRAFT = "#E8E1D0", SAGE = "#7F9186", GREEN = "#244F33", INKC = "#1F2D2B";
    const F = 84, H = 220, RING = 14, PADX = 112, GAP = 60, DOT = 24, SPACE = 0.16 * F;
    const chars = Array.from(String(text).toUpperCase());
    const meas = document.createElement("canvas").getContext("2d");
    meas.font = `700 ${F}px "Josefin Sans", sans-serif`;
    const widths = chars.map((c) => meas.measureText(c).width);
    const textW = widths.reduce((a, b) => a + b, 0) + SPACE * (chars.length - 1);
    const pw = PADX * 2 + (DOT + GAP) * 2 + textW;
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(pw + RING * 2);
    cv.height = H + RING * 2;
    const g = cv.getContext("2d");
    const pill = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    g.fillStyle = KRAFT;
    pill(0, 0, cv.width, cv.height, (H + RING * 2) / 2); g.fill();
    g.strokeStyle = SAGE; g.lineWidth = 6;
    pill(RING + 3, RING + 3, pw - 6, H - 6, (H - 6) / 2); g.stroke();
    pill(RING + 11, RING + 11, pw - 22, H - 22, (H - 22) / 2); g.stroke();
    g.fillStyle = GREEN;
    const cy = RING + H / 2;
    [RING + PADX + DOT / 2, RING + pw - PADX - DOT / 2].forEach((x) => { g.beginPath(); g.arc(x, cy, DOT / 2, 0, Math.PI * 2); g.fill(); });
    g.font = `700 ${F}px "Josefin Sans", sans-serif`;
    g.fillStyle = INKC; g.textBaseline = "alphabetic";
    const capH = F * 0.7; // Josefin cap height is about 0.7 em
    let x = RING + (pw - textW) / 2;
    chars.forEach((c, i) => { g.fillText(c, x, cy + capH / 2); x += widths[i] + SPACE; });
    return { url: cv.toDataURL("image/png"), w: cv.width, h: cv.height };
  } catch (err) {
    return null;
  }
}

// Title at the top of the schedule PDF and photos. The same for every guest.
const SCHEDULE_TITLE = "Robey-Watson Wedding Weekend";

// The page backgrounds have no transparency, so they are stored as JPEG inside the PDF.
// That keeps the file much smaller than PNG with no visible difference.
function toJpegData(img, quality) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", quality);
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
  ]);
  const bg = loaded[0];
  const gtkBg = loaded[1];
  const cardImgs = loaded.slice(2, 2 + events.length);
  const gtkImgs = loaded.slice(2 + events.length, 2 + events.length + GTK_KEYS.length);
  const useCards = USE_CARDS && (!!bg || cardImgs.some(Boolean));
  const useGtk = useCards && gtkImgs.every(Boolean);
  const nameBadge = useCards ? await makeTitleBadge(SCHEDULE_TITLE) : null;
  const gtkBadge = useGtk ? await makeTitleBadge("Good to know") : null;
  // Centers a title badge at the top of the page, 14 mm tall (shrunk if a long name needs it)
  const putBadge = (b, alias) => {
    let h = 14, w = (h * b.w) / b.h;
    if (w > 158) { w = 158; h = (w * b.h) / b.w; }
    doc.addImage(b.url, "PNG", (pageW - w) / 2, 27 + (14 - h) / 2, w, h, alias, "FAST");
  };
  const bgData = bg ? toJpegData(bg, 0.92) : null;
  const gtkData = gtkBg ? toJpegData(gtkBg, 0.92) : null;
  // drawBg(true) uses the watercolor trees page, used for the schedule cards and Good to know
  const drawBg = (trees) => {
    if (trees && gtkData) doc.addImage(gtkData, "JPEG", 0, 0, pageW, pageH, "pdf-bg-gtk", "FAST");
    else if (bgData) doc.addImage(bgData, "JPEG", 0, 0, pageW, pageH, "pdf-bg", "FAST");
  };
  drawBg(useCards);

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
    if (nameBadge) {
      putBadge(nameBadge, "name-badge");
    } else {
      setText("bold", 18, INK);
      doc.text(SCHEDULE_TITLE, pageW / 2, L.titleY, { align: "center" });
    }
    const cx = (pageW - L.w) / 2;
    let cy = L.firstTop;
    events.forEach((evt, i) => {
      if (i > 0 && i % L.perPage === 0) {
        doc.addPage();
        drawBg(true);
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
    drawBg(useGtk);
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
  sectionHeading(SCHEDULE_TITLE);
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
    if (gtkBadge) {
      putBadge(gtkBadge, "gtk-badge");
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
        drawBg(true);
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
// Photos: the same pages as the PDF, saved as PNG images (handy on phones).
// The pages are drawn on a canvas, then shown in a window where guests can save them
// to their photos (share sheet on phones, download on computers).
// ---------------------------------------------------------------
async function downloadScheduleImages(guest, events) {
  const L = CARD_LAYOUT;
  const [bg, gtkBg, ...rest] = await Promise.all([
    loadImage(PDF_BG_PATH),
    loadImage(PDF_BG_GTK_PATH),
    ...events.map((evt) => loadImage(cardPath(evt.key))),
    ...GTK_KEYS.map((key) => loadImage(cardPath(key))),
  ]);
  const cardImgs = rest.slice(0, events.length);
  const gtkImgs = rest.slice(events.length);
  if (!bg || !cardImgs.some(Boolean)) {
    alert("The schedule photos aren't available right now. Please use the PDF instead.");
    return;
  }
  const useGtk = !!gtkBg && gtkImgs.every(Boolean);

  const pageW = 215.9;
  const k = bg.width / pageW; // pixels per mm
  const [nameBadge, gtkBadge] = await Promise.all([
    makeTitleBadge(SCHEDULE_TITLE),
    useGtk ? makeTitleBadge("Good to know") : null,
  ]);
  let loraOk = false;
  try {
    const f = await new FontFace("Lora", "url(assets/fonts/lora.ttf)", { weight: "400 700" }).load();
    document.fonts.add(f);
    await document.fonts.load('400 30px "Lora"', "Aa");
    loraOk = true;
  } catch (err) {}

  const pages = [];
  const newPage = (background) => {
    const cv = document.createElement("canvas");
    cv.width = bg.width;
    cv.height = bg.height;
    const g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(background, 0, 0, cv.width, cv.height);
    pages.push(cv);
    return g;
  };
  const drawBadge = (g, b) => {
    if (!b) return;
    let h = 14, w = (h * b.w) / b.h;
    if (w > 158) { w = 158; h = (w * b.h) / b.w; }
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { g.drawImage(im, ((pageW - w) / 2) * k, (27 + (14 - h) / 2) * k, w * k, h * k); resolve(); };
      im.onerror = resolve;
      im.src = b.url;
    });
  };
  const drawCard = (g, img, y) => {
    const h = (L.w * img.height) / img.width;
    g.drawImage(img, ((pageW - L.w) / 2) * k, y * k, L.w * k, h * k);
    return h;
  };
  const plainTitle = (g, text) => {
    g.fillStyle = "#1F2D2B";
    g.font = `700 ${18 * 0.3528 * k}px ${loraOk ? "Lora" : "serif"}`;
    g.textAlign = "center";
    g.fillText(text, (pageW / 2) * k, L.titleY * k);
    g.textAlign = "start";
  };

  // Schedule pages
  const shown = cardImgs.filter(Boolean);
  for (let i = 0; i < shown.length; i += L.perPage) {
    const g = newPage(gtkBg || bg);
    let y = L.firstTop;
    if (i === 0) {
      if (nameBadge) await drawBadge(g, nameBadge);
      else plainTitle(g, SCHEDULE_TITLE);
    } else {
      y = L.nextTop;
    }
    shown.slice(i, i + L.perPage).forEach((img) => { y += drawCard(g, img, y) + L.gap; });
  }

  // Good to know pages
  const footerPages = [];
  if (useGtk) {
    let g = newPage(gtkBg);
    footerPages.push(g);
    if (gtkBadge) await drawBadge(g, gtkBadge);
    else plainTitle(g, "Good to know");
    let y = L.firstTop;
    gtkImgs.forEach((img, i) => {
      const h = (L.w * img.height) / img.width;
      if (i > 0 && y + h > GTK_BOTTOM) {
        g = newPage(gtkBg);
        footerPages.push(g);
        y = L.nextTop;
      }
      drawCard(g, img, y);
      y += h + L.gap;
    });
    footerPages.forEach((fg) => {
      fg.fillStyle = "#3C4E46";
      fg.font = `400 ${9 * 0.3528 * k}px ${loraOk ? "Lora" : "serif"}`;
      fg.textAlign = "center";
      fg.fillText(`Questions? Email us at ${CONTACT_EMAIL}`, (pageW / 2) * k, (279.4 - 10) * k);
    });
  }

  const blobs = await Promise.all(pages.map((cv) => new Promise((res) => cv.toBlob(res, "image/png"))));
  const base = `${safeFileName(guest.name)}-schedule`;
  showImageViewer(blobs.filter(Boolean).map((blob, i) => new File([blob], `${base}-${i + 1}.png`, { type: "image/png" })));
}

// Window with the finished page images and a save button
function showImageViewer(files) {
  const urls = files.map((f) => URL.createObjectURL(f));
  const backdrop = el("div", {
    style:
      "position:fixed;inset:0;z-index:9999;background:rgba(31,45,43,.72);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px;",
  });
  const panel = el("div", {
    style: "background:#fff;border-radius:14px;max-width:520px;width:100%;padding:18px;box-sizing:border-box;",
  });
  const close = () => { backdrop.remove(); urls.forEach((u) => URL.revokeObjectURL(u)); };

  panel.appendChild(el("p", { style: "margin:0 0 12px;font-weight:600;" }, "Your schedule photos"));
  panel.appendChild(
    el("p", { style: "margin:0 0 14px;font-size:.95em;" }, "Tap Save to add them to your photos. You can also press and hold an image to save it.")
  );

  const row = el("div", { style: "display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;" });
  const saveBtn = el("button", { type: "button", class: "btn btn-primary" }, "Save to photos");
  saveBtn.addEventListener("click", async () => {
    try {
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: "Weekend schedule" });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return; // they closed the share sheet
    }
    files.forEach((f, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = urls[i];
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 400);
    });
  });
  const closeBtn = el("button", { type: "button", class: "btn btn-outline-primary" }, "Close");
  closeBtn.addEventListener("click", close);
  row.appendChild(saveBtn);
  row.appendChild(closeBtn);
  panel.appendChild(row);

  urls.forEach((u, i) => {
    const img = el("img", { src: u, alt: `Schedule page ${i + 1}`, style: "width:100%;display:block;margin:0 0 12px;border-radius:6px;" });
    panel.appendChild(img);
  });
  backdrop.appendChild(panel);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
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

// ---------------------------------------------------------------
// Action list shown after an RSVP: Update RSVP, Download your schedule (PDF or Photo),
// and Add to calendar. Used on the returning-guest screen and right after submitting.
// The styles are added here so this file is all that needs to change.
// ---------------------------------------------------------------
const ACTION_ICONS = {
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l3 3"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  stay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6.5 8 6.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/></svg>',
};

function addActionListStyles() {
  if (document.getElementById("rsvp-action-list-styles")) return;
  const style = document.createElement("style");
  style.id = "rsvp-action-list-styles";
  style.textContent = `
.rsvp-list { margin-top: 1.5rem; border-top: 1px solid #C4CDC8; }
.rsvp-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  width: 100%; box-sizing: border-box; padding: 0.95rem 0.25rem;
  border: 0; border-bottom: 1px solid #C4CDC8; background: none; text-align: left;
  font-family: "Josefin Sans", sans-serif; font-weight: 600; font-size: 0.9rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: #3C4E46;
}
button.rsvp-row, a.rsvp-row { cursor: pointer; }
a.rsvp-row { text-decoration: none; }
button.rsvp-row:hover, a.rsvp-row:hover { background: rgba(60, 78, 70, 0.07); color: #3C4E46; }
.rsvp-row-label { display: flex; align-items: center; gap: 0.9rem; }
.rsvp-row svg {
  width: 22px; height: 22px; flex: none; fill: none; stroke: #3C4E46;
  stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round;
}
.rsvp-row-arrow { color: #7F9186; font-size: 1.3rem; line-height: 1; }
.rsvp-chips { display: flex; gap: 0.4rem; flex: none; }
.rsvp-chip {
  padding: 0.3rem 0.95rem; border: 1px solid #3C4E46; border-radius: 999px; background: none;
  font: inherit; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: #3C4E46; cursor: pointer;
}
.rsvp-chip:hover { background: #3C4E46; color: #E8E1D0; }
@media (max-width: 480px) {
  .rsvp-row { font-size: 0.8rem; letter-spacing: 0.1em; }
  .rsvp-row-label { gap: 0.65rem; }
  .rsvp-row-sched { flex-wrap: wrap; }
  .rsvp-row-sched .rsvp-chips { margin-left: calc(22px + 0.65rem); }
}
`;
  document.head.appendChild(style);
}

// options: { events, onUpdate } (leave onUpdate out to hide the Update RSVP row)
function buildActionList(guest, options) {
  addActionListStyles();
  const list = el("div", { class: "rsvp-list" });
  const events = options.events || [];

  const rowButton = (icon, label, onClick) => {
    const row = el("button", { type: "button", class: "rsvp-row" });
    const left = el("span", { class: "rsvp-row-label" });
    left.innerHTML = ACTION_ICONS[icon];
    left.appendChild(document.createTextNode(label));
    row.appendChild(left);
    row.appendChild(el("span", { class: "rsvp-row-arrow", "aria-hidden": "true" }, "&rsaquo;"));
    row.addEventListener("click", onClick);
    return row;
  };

  if (options.onUpdate) list.appendChild(rowButton("edit", "Update RSVP", options.onUpdate));

  if (events.length) {
    const row = el("div", { class: "rsvp-row rsvp-row-sched" });
    const left = el("span", { class: "rsvp-row-label" });
    left.innerHTML = ACTION_ICONS.download;
    left.appendChild(document.createTextNode("Download your schedule"));
    const chips = el("span", { class: "rsvp-chips" });
    const pdf = el("button", { type: "button", class: "rsvp-chip" }, "PDF");
    pdf.addEventListener("click", () => downloadSchedulePdf(guest, events));
    const photo = el("button", { type: "button", class: "rsvp-chip" }, "Photo");
    photo.addEventListener("click", () => downloadScheduleImages(guest, events));
    chips.appendChild(pdf);
    chips.appendChild(photo);
    row.appendChild(left);
    row.appendChild(chips);
    list.appendChild(row);

    list.appendChild(rowButton("calendar", "Add to calendar", () => downloadCalendar(guest, events)));

    // On-property guests also get a link to the hidden room and board page.
    if (guest.onProperty) {
      const stay = el("a", { class: "rsvp-row", href: "room-board.html" });
      const left = el("span", { class: "rsvp-row-label" });
      left.innerHTML = ACTION_ICONS.stay;
      left.appendChild(document.createTextNode("Contribute to your room & board"));
      stay.appendChild(left);
      stay.appendChild(el("span", { class: "rsvp-row-arrow", "aria-hidden": "true" }, "&rsaquo;"));
      list.appendChild(stay);
    }
  }
  return list;
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

  if (rsvpClosed()) {
    container.appendChild(
      el("p", { class: "rsvp-closed-note" }, "RSVPs are now closed. To make a change, please reach out to us directly.")
    );
  }

  const myEvents = eventsForGuest(guest);
  container.appendChild(
    buildActionList(guest, {
      events: guest.attending ? myEvents : [],
      onUpdate: rsvpClosed() ? null : () => renderInvite(container, guest),
    })
  );
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
        `You're staying on-property. If you'd like to contribute toward your room and board, there's a voluntary <a href="room-board.html">link here</a>. No pressure at all, we're just glad you're coming.`
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
          done.appendChild(buildActionList(guest, { events: picks }));
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
