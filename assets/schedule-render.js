// Renders the public event cards on the Schedule page from window.WEDDING_EVENTS.
// Only the events listed in PUBLIC_EVENT_KEYS appear here. The RSVP page and the
// personal PDF still use every event in events-data.js.

const PUBLIC_EVENT_KEYS = ["fri_reception_party", "sat_day_after"];

function scheduleEl(tag, attrs = {}, html = "") {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (html) node.innerHTML = html;
  return node;
}

function renderSchedule() {
  const container = document.getElementById("schedule-cards");
  if (!container || !window.WEDDING_EVENTS) return;

  container.innerHTML = "";
  window.WEDDING_EVENTS
    .filter((evt) => PUBLIC_EVENT_KEYS.includes(evt.key))
    .forEach((evt) => {
      if (evt.intro) {
        container.appendChild(scheduleEl("div", { class: "schedule-intro" }, evt.intro));
      }
      const card = scheduleEl("div", { class: "event-card" });
      card.appendChild(scheduleEl("div", { class: "event-day" }, evt.day));
      card.appendChild(scheduleEl("h3", {}, evt.label));
      card.appendChild(scheduleEl("div", { class: "event-meta" }, `${evt.time} · ${evt.location}`));
      card.appendChild(scheduleEl("p", {}, evt.description));
      container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", renderSchedule);
