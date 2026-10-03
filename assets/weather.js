// Weather widget. Shows typical weather for the place and, starting a week
// before the event, the live National Weather Service forecast for the
// event days. Before that window opens, the page makes no outside requests.
(function () {
  var DAY_MS = 86400000;
  var FORECAST_WINDOW_DAYS = 7;
  var TZ = "America/Phoenix";
  var OFFSET = "-07:00"; // Arizona stays on this offset all year

  function make(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function icon(name) {
    var i = make("i", "bi " + name);
    i.setAttribute("aria-hidden", "true");
    return i;
  }

  function iconFor(shortForecast, isDay) {
    var s = (shortForecast || "").toLowerCase();
    if (s.indexOf("thunder") > -1) return "bi-cloud-lightning-rain-fill";
    if (s.indexOf("snow") > -1 || s.indexOf("flurr") > -1) return "bi-snow";
    if (s.indexOf("rain") > -1 || s.indexOf("shower") > -1) return "bi-cloud-rain-fill";
    if (s.indexOf("fog") > -1 || s.indexOf("haze") > -1) return "bi-cloud-fog2-fill";
    if (s.indexOf("wind") > -1) return "bi-wind";
    if (s.indexOf("partly") > -1 || s.indexOf("mostly sunny") > -1 || s.indexOf("mostly clear") > -1) {
      return isDay ? "bi-cloud-sun-fill" : "bi-cloud-moon-fill";
    }
    if (s.indexOf("cloud") > -1 || s.indexOf("overcast") > -1) return "bi-cloud-fill";
    if (s.indexOf("sunny") > -1 || s.indexOf("clear") > -1) {
      return isDay ? "bi-sun-fill" : "bi-moon-stars-fill";
    }
    return isDay ? "bi-cloud-sun-fill" : "bi-cloud-moon-fill";
  }

  function inForecastWindow(nowMs, startMs, endMs) {
    return nowMs >= startMs - FORECAST_WINDOW_DAYS * DAY_MS && nowMs <= endMs;
  }

  // Group NWS 12-hour periods into one entry per calendar day inside [start, end].
  function buildDays(periods, startDate, endDate) {
    var byDate = {};
    var order = [];
    (periods || []).forEach(function (p) {
      var d = String(p.startTime || "").slice(0, 10);
      if (!d || d < startDate || d > endDate) return;
      if (!byDate[d]) {
        byDate[d] = { date: d };
        order.push(d);
      }
      if (p.isDaytime) {
        byDate[d].high = p.temperature;
        byDate[d].day = p.shortForecast;
      } else {
        byDate[d].low = p.temperature;
        byDate[d].night = p.shortForecast;
      }
    });
    return order.sort().map(function (d) { return byDate[d]; });
  }

  function weekday(dateStr) {
    return new Date(dateStr + "T12:00:00" + OFFSET).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: TZ,
    });
  }

  function renderTypical(root, cfg) {
    var card = make("div", "weather-typical");
    var ic = make("div", "weather-typical-icon");
    ic.appendChild(icon("bi-cloud-sun-fill"));
    var body = make("div", "weather-typical-body");
    body.appendChild(make("div", "weather-title", "Typical May weather in " + cfg.place));
    var temps = make("div", "weather-typical-temps");
    temps.appendChild(make("span", "weather-big", cfg.high + "°F"));
    temps.appendChild(make("span", "weather-small", " high"));
    temps.appendChild(make("span", "weather-sep", " · "));
    temps.appendChild(make("span", "weather-big", cfg.low + "°F"));
    temps.appendChild(make("span", "weather-small", " low"));
    body.appendChild(temps);
    var swing = cfg.high - cfg.low;
    if (swing > 0) {
      body.appendChild(
        make("div", "script", "That is a swing of about " + swing + " degrees from afternoon to night. Layers are your friend.")
      );
    }
    card.appendChild(ic);
    card.appendChild(body);
    root.appendChild(card);
    if (cfg.source) root.appendChild(make("div", "weather-credit", cfg.source));
  }

  function renderForecast(root, days, cfg) {
    var wrap = make("div", "weather-forecast");
    wrap.appendChild(make("div", "weather-title", "Forecast for our weekend"));
    if (!days.length) {
      wrap.appendChild(make("div", "weather-note", "The forecast does not reach our weekend yet. Check back soon."));
    } else {
      var grid = make("div", "weather-days");
      days.forEach(function (d) {
        var card = make("div", "weather-day");
        card.appendChild(make("div", "weather-day-name", weekday(d.date)));
        var ic = make("div", "weather-day-icon");
        ic.appendChild(icon(iconFor(d.day || d.night, d.day !== undefined)));
        card.appendChild(ic);
        var t = [];
        if (d.high !== undefined) t.push("High " + d.high + "°");
        if (d.low !== undefined) t.push("Low " + d.low + "°");
        card.appendChild(make("div", "weather-day-temps", t.join(" · ")));
        card.appendChild(make("div", "weather-day-text", d.day || d.night || ""));
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }
    var credit = make("div", "weather-credit");
    var a = make("a", "", "National Weather Service");
    a.href = "https://forecast.weather.gov/MapClick.php?lat=" + cfg.lat + "&lon=" + cfg.lon;
    a.target = "_blank";
    a.rel = "noopener";
    credit.appendChild(document.createTextNode("Forecast from the "));
    credit.appendChild(a);
    wrap.appendChild(credit);
    root.appendChild(wrap);
  }

  function renderFallback(root, cfg) {
    var wrap = make("div", "weather-note");
    wrap.appendChild(document.createTextNode("We could not load the live forecast. "));
    var a = make("a", "", "See it on the National Weather Service site.");
    a.href = "https://forecast.weather.gov/MapClick.php?lat=" + cfg.lat + "&lon=" + cfg.lon;
    a.target = "_blank";
    a.rel = "noopener";
    wrap.appendChild(a);
    root.appendChild(wrap);
  }

  function loadForecast(root, cfg) {
    var holder = make("div", "weather-loading", "Loading the forecast...");
    root.appendChild(holder);
    fetch("https://api.weather.gov/points/" + cfg.lat + "," + cfg.lon)
      .then(function (r) {
        if (!r.ok) throw new Error("points");
        return r.json();
      })
      .then(function (p) { return fetch(p.properties.forecast); })
      .then(function (r) {
        if (!r.ok) throw new Error("forecast");
        return r.json();
      })
      .then(function (f) {
        root.removeChild(holder);
        renderForecast(root, buildDays(f.properties.periods, cfg.start, cfg.end), cfg);
      })
      .catch(function () {
        root.removeChild(holder);
        renderFallback(root, cfg);
      });
  }

  function init(root) {
    var cfg = {
      lat: root.getAttribute("data-lat"),
      lon: root.getAttribute("data-lon"),
      place: root.getAttribute("data-place") || "town",
      start: root.getAttribute("data-event-start"),
      end: root.getAttribute("data-event-end"),
      high: Number(root.getAttribute("data-typical-high")),
      low: Number(root.getAttribute("data-typical-low")),
      source: root.getAttribute("data-source") || "",
    };
    root.textContent = "";
    if (!isNaN(cfg.high) && !isNaN(cfg.low)) renderTypical(root, cfg);
    var startMs = Date.parse(cfg.start + "T00:00:00" + OFFSET);
    var endMs = Date.parse(cfg.end + "T23:59:59" + OFFSET);
    if (cfg.lat && cfg.lon && inForecastWindow(Date.now(), startMs, endMs)) {
      loadForecast(root, cfg);
    } else {
      root.appendChild(
        make("div", "weather-note", "The live forecast appears here one week before our wedding weekend.")
      );
    }
  }

  if (typeof document !== "undefined") {
    var run = function () {
      var els = document.querySelectorAll(".weather[data-lat]");
      for (var i = 0; i < els.length; i++) init(els[i]);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
    else run();
  }

  if (typeof module !== "undefined") {
    module.exports = { buildDays: buildDays, iconFor: iconFor, inForecastWindow: inForecastWindow };
  }
})();
