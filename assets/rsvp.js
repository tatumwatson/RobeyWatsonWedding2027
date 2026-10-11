// ---------------------------------------------------------------
// RSVP widget: looks a guest up by name, shows the people on their
// invitation, asks who is attending, then asks one yes or no per
// event for the whole party. Only events someone in the party was
// invited to are shown.
// ---------------------------------------------------------------

// Event details (label, day, time, location, description) come from
// window.WEDDING_EVENTS, loaded via assets/events-data.js before this file.
// That's also what the Schedule page renders from, so there's one place
// to update your event details.
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
    doc.text(`${evt.time} · ${evt.location}`, 15, y);
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
  block.appendChild(el("h4", {}, "Song requests"));
  block.appendChild(el("p", {}, "Search for a song and add it to our playlist."));
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

function renderInvite(container, guest) {
  container.innerHTML = "";

  container.appendChild(el("h3", {}, `Welcome, ${guest.name}!`));
  container.appendChild(
    el("p", {}, guest.onProperty
      ? "You're staying with us on-property — thank you! Details on that below."
      : "Here's what you're invited to. Let us know who can make it.")
  );

  const form = el("form", { id: "rsvp-form" });
  const members = guest.members || [];
  const invitedEvents = EVENT_DEFS.filter((e) =>
    members.some((m) => m.events && m.events[e.key])
  );

  if (invitedEvents.length === 0) {
    form.appendChild(el("p", {}, "We couldn't find any events attached to your invitation. Please reach out to us directly."));
  }

  // ---- Top section: who is attending ----
  const memberBoxes = {}; // member id -> checkbox
  const nameInputs = {};  // member id -> name input (guests added by name)
  const ageInputs = {};   // member id -> Adult / Teen / Child checkboxes

  const whoBlock = el("div", { class: "rsvp-event-block" });
  whoBlock.appendChild(el("h4", {}, "Who will be attending?"));
  whoBlock.appendChild(
    el("p", {}, "Check the box for everyone in your party who will be attending.")
  );

  members.forEach((m) => {
    const id = `who_${m.id}`;
    const row = el("div", { class: "form-check" });
    const cb = el("input", { type: "checkbox", class: "form-check-input", id });
    const label = el("label", { class: "form-check-label", for: id });
    label.textContent = m.name;
    row.appendChild(cb);
    row.appendChild(label);
    whoBlock.appendChild(row);
    memberBoxes[m.id] = cb;

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
      whoBlock.appendChild(input);

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
      whoBlock.appendChild(ageRow);

      cb.addEventListener("change", () => {
        input.hidden = !cb.checked;
        ageRow.hidden = !cb.checked;
        input.required = cb.checked;
        if (cb.checked) {
          input.focus();
        } else {
          ageBoxes.forEach((b) => { b.checked = false; });
        }
      });
      input.addEventListener("input", () => {
        label.textContent = input.value.trim() || m.name;
      });
    }
  });
  form.appendChild(whoBlock);

  // ---- Bottom section: one yes or no per event for the whole party ----
  const eventBlocks = {};
  const eventQuestion = members.length > 1
    ? "Will your party be joining us?"
    : "Will you be joining us?";

  invitedEvents.forEach((evt) => {
    const block = el("div", { class: "rsvp-event-block" });
    block.appendChild(el("h4", {}, `${evt.label} · ${evt.day}`));
    block.appendChild(el("label", {}, eventQuestion));

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
    form.appendChild(block);
  });

  const notesBlock = el("div", { class: "rsvp-event-block" });
  notesBlock.appendChild(el("label", { for: "rsvp-notes" }, "Dietary restrictions or notes for us"));
  notesBlock.appendChild(el("textarea", { id: "rsvp-notes", rows: "3", class: "form-control" }));
  form.appendChild(notesBlock);

  form.appendChild(renderSongs(guest));

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

  const submitWrap = el("div", { class: "rsvp-submit" });
  const submitBtn = el("button", { type: "submit", class: "btn btn-primary" }, "Send my RSVP");
  submitWrap.appendChild(submitBtn);
  form.appendChild(submitWrap);
  container.appendChild(form);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const attending = members
      .filter((m) => memberBoxes[m.id].checked)
      .map((m) => {
        const picked = (ageInputs[m.id] || []).find((b) => b.checked);
        return {
          id: m.id,
          name: nameInputs[m.id] ? nameInputs[m.id].value.trim() : "",
          ageGroup: picked ? picked.value : "",
        };
      });

    const missingAge = members.find(
      (m) =>
        m.plusOne &&
        memberBoxes[m.id].checked &&
        !(ageInputs[m.id] || []).some((b) => b.checked)
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

    if (
      attending.length === 0 &&
      !window.confirm("No one is checked as attending. Send your RSVP as not attending?")
    ) {
      return;
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
        showStatus(container, "Thank you! Your RSVP has been received.", "success");
        const pdfBtn = el(
          "button",
          { type: "button", class: "btn btn-outline-primary mt-3" },
          "Download your weekend schedule (PDF)"
        );
        pdfBtn.addEventListener("click", () => downloadSchedulePdf(guest, invitedEvents));
        container.insertBefore(pdfBtn, form);
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
      if (guest.found) {
        renderInvite(app, guest);
      } else if (guest.ambiguous) {
        showStatus(app, "More than one guest has that name. Please reach out to us directly and we'll get you set up.", "error");
        button.disabled = false;
        button.textContent = "Find my invitation";
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
