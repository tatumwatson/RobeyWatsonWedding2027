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

      // Splits "7th" into a big number and a small raised suffix
      const m = evt.date && String(evt.date).match(/^(\d+)(st|nd|rd|th)$/);
      const dateHtml = m
        ? `<span class="event-date"><span class="event-date-num">${m[1]}</span><span class="event-date-suffix">${m[2]}</span></span>`
        : "";

      card.appendChild(scheduleEl("div", { class: "event-day" }, `${evt.day}${dateHtml}`));
      card.appendChild(scheduleEl("h3", {}, evt.label));
      card.appendChild(scheduleEl("div", { class: "event-meta" }, evt.time));
      card.appendChild(scheduleEl("p", {}, evt.description));

      if (evt.details && evt.details.length) {
        const list = scheduleEl("div", { class: "event-details" });
        evt.details.forEach((d) => {
          const row = scheduleEl("div", { class: "event-detail" });
          row.appendChild(scheduleEl("span", { class: "event-detail-label" }, d.label));
          row.appendChild(scheduleEl("span", { class: "event-detail-value" }, d.value));
          list.appendChild(row);
        });
        card.appendChild(list);
      }

      container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", renderSchedule);
