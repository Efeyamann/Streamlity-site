// Streamlity website: OS-aware download buttons, the interactive app preview,
// the program guide card and the RTX VSR compare slider.
(function () {
  "use strict";

  // ---- Operating system -------------------------------------------------
  function detectOS() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    var ua = navigator.userAgent || "";
    var s = (p + " " + ua).toLowerCase();
    if (/android|iphone|ipad|ipod/.test(s)) return null;
    if (s.indexOf("win") !== -1) return "win";
    if (s.indexOf("mac") !== -1) return "mac";
    if (s.indexOf("linux") !== -1 || s.indexOf("x11") !== -1) return "linux";
    return null;
  }

  var os = detectOS();
  var osIcon = { win: "#i-windows", mac: "#i-mac", linux: "#i-linux" };

  document.querySelectorAll("[data-os-download]").forEach(function (a) {
    if (!os) {
      a.href = "#download";
      a.querySelector("span").textContent = a.dataset.labelNone;
      a.querySelector(".ico-os use").setAttribute("href", "#i-download");
      return;
    }
    a.href = a.dataset[os];
    a.querySelector("span").textContent = a.dataset["label" + os.charAt(0).toUpperCase() + os.slice(1)];
    a.querySelector(".ico-os use").setAttribute("href", osIcon[os]);
  });
  if (os) {
    var mine = document.querySelector('[data-platform="' + os + '"]');
    if (mine) mine.classList.add("is-mine");
  }

  // ---- Demo schedule ----------------------------------------------------
  var app = document.querySelector(".app[data-demo]");
  if (!app) return;
  var demo = JSON.parse(app.dataset.demo);
  var channels = demo.channels;

  // Program lengths in minutes per channel; the schedule repeats from midnight.
  var LENGTHS = [
    [60, 30, 60, 90],
    [120, 45, 45, 90],
    [50, 70, 60, 60],
    [30, 60, 90, 60],
    [105, 75, 40, 20],
    [25, 25, 40, 30]
  ];

  function minutesNow() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }

  // Programs of channel i overlapping [from, to) minutes since midnight.
  function schedule(i, from, to) {
    var lens = LENGTHS[i % LENGTHS.length];
    var out = [], t = 0, k = 0;
    while (t < to) {
      var len = lens[k % lens.length];
      if (t + len > from) {
        out.push({ start: t, end: t + len, title: channels[i].programs[k % channels[i].programs.length] });
      }
      t += len; k++;
    }
    return out;
  }

  function fmt(min) {
    var m = Math.round(min) % 1440;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function nowNext(i) {
    var n = minutesNow();
    var list = schedule(i, n, n + 300);
    var cur = list[0], next = list[1];
    return { cur: cur, next: next, progress: (n - cur.start) / (cur.end - cur.start) };
  }

  // ---- Hero preview -----------------------------------------------------
  var listEl = app.querySelector("[data-channels]");
  var screen = app.querySelector("[data-screen]");
  var count = app.querySelector("[data-count]");
  var selected = 0;
  var buttons = [];

  count.textContent = demo.count.replace("{n}", channels.length);

  channels.forEach(function (ch, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ch pal-" + i;
    b.setAttribute("role", "option");
    b.innerHTML =
      '<span class="ch-logo"></span><span class="ch-text"><span class="ch-name"></span>' +
      '<span class="ch-prog"></span><span class="ch-bar"><i></i></span></span>';
    b.querySelector(".ch-logo").textContent = ch.bug;
    b.querySelector(".ch-name").textContent = ch.name;
    b.addEventListener("click", function () { select(i, true); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var j = (i + d + channels.length) % channels.length;
      select(j, true);
      buttons[j].focus();
    });
    listEl.appendChild(b);
    buttons.push(b);
  });

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var zapTimer;

  function select(i, user) {
    selected = i;
    buttons.forEach(function (b, j) {
      b.setAttribute("aria-selected", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (user && !reduced) {
      clearTimeout(zapTimer);
      screen.classList.add("zap");
      zapTimer = setTimeout(function () { screen.classList.remove("zap"); }, 160);
    }
    screen.className = screen.className.replace(/\bpal-\d\b/g, "").trim() + " pal-" + i;
    app.querySelector("[data-bug]").textContent = channels[i].bug;
    app.querySelector("[data-osd-ch]").textContent = channels[i].name;
    tick();
  }

  function tick() {
    channels.forEach(function (ch, i) {
      var nn = nowNext(i);
      buttons[i].querySelector(".ch-prog").textContent = nn.cur.title;
      buttons[i].querySelector(".ch-bar").style.setProperty("--p", nn.progress.toFixed(3));
    });
    var s = nowNext(selected);
    app.querySelector("[data-osd-prog]").textContent = s.cur.title;
    app.querySelector("[data-osd-time]").textContent = fmt(s.cur.start) + " – " + fmt(s.cur.end);
    app.querySelector("[data-osd-bar]").style.width = (s.progress * 100).toFixed(1) + "%";
    app.querySelector("[data-now]").textContent = fmt(s.cur.start) + "  " + s.cur.title;
    app.querySelector("[data-next]").textContent = fmt(s.next.start) + "  " + s.next.title;
  }

  select(0, false);
  setInterval(function () { tick(); renderGuide(); }, 30000);

  // ---- Guide card -------------------------------------------------------
  var guide = document.querySelector("[data-guide]");

  function renderGuide() {
    if (!guide) return;
    var n = minutesNow();
    var from = Math.floor(n / 30) * 30 - 30;
    var to = from + 120;
    var html = '<div class="g-times"><span></span>';
    for (var k = 0; k < 4; k++) html += "<span>" + fmt(from + k * 30) + "</span>";
    html += "</div>";
    channels.slice(0, 5).forEach(function (ch, i) {
      html += '<div class="g-row"><div class="g-ch"><span class="ch-logo pal-' + i + '">' + ch.bug +
        "</span><span>" + escapeHtml(ch.name) + '</span></div><div class="g-track">';
      schedule(i, from, to).forEach(function (p) {
        var w = Math.min(p.end, to) - Math.max(p.start, from);
        var cls = p.start <= n && n < p.end ? " now" : p.end <= n ? " past" : "";
        html += '<div class="g-prog' + cls + '" style="--w:' + w + '">' + escapeHtml(p.title) + "</div>";
      });
      html += "</div></div>";
    });
    html += '<div class="g-line"></div>';
    guide.innerHTML = html;

    // Place the now-line over the track area.
    var track = guide.querySelector(".g-track");
    var gr = guide.getBoundingClientRect(), tr = track.getBoundingClientRect();
    var x = tr.left - gr.left + ((n - from) / (to - from)) * tr.width;
    guide.querySelector(".g-line").style.left = x + "px";
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  renderGuide();
  window.addEventListener("resize", renderGuide);

  // ---- VSR compare ------------------------------------------------------
  var vsr = document.querySelector("[data-vsr]");
  if (vsr) {
    var range = vsr.querySelector("input");
    range.addEventListener("input", function () { vsr.style.setProperty("--split", range.value + "%"); });
  }
})();
