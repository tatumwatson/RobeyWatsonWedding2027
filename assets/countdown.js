// Countdown timers. Any element with class "countdown" and a data-target
// attribute (an ISO date with time zone) becomes a live countdown.
(function () {
  function breakdown(diff) {
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
    };
  }

  function tile(value, unit) {
    var box = document.createElement("div");
    box.className = "countdown-tile";
    var num = document.createElement("span");
    num.className = "countdown-num";
    num.textContent = value;
    var lab = document.createElement("span");
    lab.className = "countdown-unit";
    lab.textContent = unit;
    box.appendChild(num);
    box.appendChild(lab);
    return box;
  }

  function start(el) {
    var target = new Date(el.getAttribute("data-target"));
    if (isNaN(target.getTime())) return;
    var label = el.getAttribute("data-label") || "";
    var doneText = el.getAttribute("data-done") || "";
    var timer = null;

    function draw() {
      var diff = target.getTime() - Date.now();
      el.textContent = "";
      if (diff <= 0) {
        var done = document.createElement("div");
        done.className = "countdown-done";
        done.textContent = doneText;
        el.appendChild(done);
        if (timer) clearInterval(timer);
        return;
      }
      var t = breakdown(diff);
      var tiles = document.createElement("div");
      tiles.className = "countdown-tiles";
      tiles.appendChild(tile(t.days, t.days === 1 ? "Day" : "Days"));
      tiles.appendChild(tile(t.hours, t.hours === 1 ? "Hour" : "Hours"));
      tiles.appendChild(tile(t.mins, t.mins === 1 ? "Minute" : "Minutes"));
      tiles.appendChild(tile(t.secs, t.secs === 1 ? "Second" : "Seconds"));
      el.appendChild(tiles);
      if (label) {
        var cap = document.createElement("div");
        cap.className = "countdown-label";
        cap.textContent = label;
        el.appendChild(cap);
      }
    }

    draw();
    timer = setInterval(draw, 1000);
  }

  if (typeof document !== "undefined") {
    var init = function () {
      var els = document.querySelectorAll(".countdown[data-target]");
      for (var i = 0; i < els.length; i++) start(els[i]);
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  if (typeof module !== "undefined") module.exports = { breakdown: breakdown };
})();
