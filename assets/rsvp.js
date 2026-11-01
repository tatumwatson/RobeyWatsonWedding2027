// ---------------------------------------------------------------
// RSVP widget: looks a guest up by name, shows the people on their
// invitation, asks yes or no for each person, then asks one yes or
// no per event for the whole party. Only events someone in the party
// was invited to are shown.
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

function downloadSchedulePdf(guest, invitedEvents) {
  if (!window.jspdf) {
    alert("The PDF library didn't load. Check your connection and try again.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = 180;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`${guest.name}'s Weekend Schedule`, 15, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Mariie & [Partner] · Northern Arizona", 15, y);
  y += 12;

  invitedEvents.forEach((evt) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${evt.day} — ${evt.label}`, 15, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(evt.time, 15, y);
    y += 6;

    const lines = doc.splitTextToSize(evt.description || "", pageWidth);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 8;
  });

  const safeName = guest.name.trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`${safeName}-weekend-schedule.pdf`);
}

async function submitRsvp(payload) {
  // Sent as text/plain on purpose: it keeps this a "simple request" so the
  // browser skips a CORS preflight, which Apps Script web apps don't handle.
  const res = await fetch(window.RSVP_CONFIG.scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body:
