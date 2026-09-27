// Renders the event cards on the Schedule page from window.WEDDING_EVENTS,
// so schedule details only need updating in one place (events-data.js).

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
  window.WEDDING_EVENTS.forEach((evt) => {
    const card = scheduleEl("div", { class: "event-card" });
    card.appendChild(scheduleEl("div", { class: "event-day" }, evt.day));
    card.appendChild(scheduleEl("h3", {}, evt.label));
    card.appendChild(scheduleEl("div", { class: "event-meta" }, `${evt.time} · ${evt.location}`));
    card.appendChild(scheduleEl("p", {}, evt.description));
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderSchedule);
