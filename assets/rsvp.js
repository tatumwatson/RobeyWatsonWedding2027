// ---------------------------------------------------------------
// RSVP widget: looks a guest up by name, shows ONLY the events
// they were assigned by the couple, and submits their response.
// No guest ever sees an event they weren't invited to.
// ---------------------------------------------------------------

const EVENT_DEFS = [
  { key: "thu_night_before",   label: "The Night Before",        day: "Thursday" },
  { key: "fri_reception_day",  label: "Reception Day",           day: "Friday"   },
  { key: "fri_reception_party",label: "Reception Party",         day: "Friday"   },
  { key: "sat_day_after",      label: "The Day After",           day: "Saturday" },
  { key: "sun_brunch",         label: "Mother's Day Brunch",     day: "Sunday"   },
];

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
    container.appendChild(box);
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

function renderInvite(container, guest) {
  container.innerHTML = "";

  const heading = el("h3", {}, `Welcome, ${guest.name}!`);
  container.appendChild(heading);
  container.appendChild(
    el("p", {}, guest.onProperty
      ? "You're staying with us on-property — thank you! Details on that below."
      : "Here's what you're invited to. Let us know if you can make it.")
  );

  const form = el("form", { id: "rsvp-form" });
  const invitedEvents = EVENT_DEFS.filter((e) => guest.events && guest.events[e.key]);

  if (invitedEvents.length === 0) {
    form.appendChild(el("p", {}, "We couldn't find any events attached to your invitation. Please reach out to us directly."));
  }

  invitedEvents.forEach((evt) => {
    const block = el("div", { class: "rsvp-event-block" });
    block.appendChild(el("h4", {}, `${evt.label} · ${evt.day}`));
    block.appendChild(el("label", {}, "Will you be joining us?"));

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
    form.appendChild(block);
  });

  const notesBlock = el("div", { class: "rsvp-event-block" });
  notesBlock.appendChild(el("label", { for: "rsvp-notes" }, "Dietary restrictions or notes for us"));
  notesBlock.appendChild(el("textarea", { id: "rsvp-notes", rows: "3", class: "form-control" }));
  form.appendChild(notesBlock);

  if (guest.onProperty) {
    const note = el("div", { class: "rsvp-event-block" });
    note.appendChild(
      el(
        "p",
        {},
        `You're staying on-property. If you'd like to contribute toward your room and board, there's a voluntary link on the <a href="funds.html">Gifts</a> page — no pressure at all, we're just glad you're coming.`
      )
    );
    form.appendChild(note);
  }

  const submitBtn = el("button", { type: "submit", class: "btn btn-primary mt-2" }, "Send my RSVP");
  form.appendChild(submitBtn);
  container.appendChild(form);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const responses = {};
    invitedEvents.forEach((evt) => {
      const checked = form.querySelector(`input[name="${evt.key}"]:checked`);
      responses[evt.key] = checked ? checked.value : "No response";
    });

    try {
      const result = await submitRsvp({
        action: "submit",
        name: guest.name,
        onProperty: guest.onProperty,
        responses,
        notes: document.getElementById("rsvp-notes").value,
      });
      if (result.ok) {
        form.innerHTML = "";
        showStatus(container, "Thank you! Your RSVP has been received.", "success");
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
  const label = el("label", { for: "guest-name" }, "Full name (as it appears on your invitation)");
  const input = el("input", { type: "text", id: "guest-name", placeholder: "e.g. Jordan Smith" });
  const button = el("button", { type: "button", class: "btn btn-primary" }, "Find my invitation");

  app.appendChild(label);
  app.appendChild(input);
  app.appendChild(button);

  const doLookup = async () => {
    const name = input.value.trim();
    if (!name) return;
    button.disabled = true;
    button.textContent = "Looking...";
    try {
      const guest = await lookupGuest(name);
      if (guest.found) {
        renderInvite(app, guest);
      } else {
        showStatus(app, "We couldn't find that name. Try the name exactly as it appears on your invite, or reach out to us.", "error");
        button.disabled = false;
        button.textContent = "Find my invitation";
      }
    } catch (err) {
      showStatus(app, "We couldn't reach the RSVP service. Please try again in a moment.", "error");
      button.disabled = false;
      button.textContent = "Find my invitation";
    }
  };

  button.addEventListener("click", doLookup);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLookup();
  });
}

document.addEventListener("DOMContentLoaded", initRsvp);
