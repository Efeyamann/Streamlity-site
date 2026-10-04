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

  // ---- Brand: smooth scroll back to the top on the same page -----------
  document.querySelectorAll("[data-top]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    });
  });

  // ---- Copy buttons -----------------------------------------------------
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    var label = b.textContent;
    b.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.dataset.copy).then(function () {
        b.textContent = b.dataset.done;
        setTimeout(function () { b.textContent = label; }, 1600);
      });
    });
  });

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

  // ---- Library used by the other app screens ------------------------------
  var ui = demo.ui;
  function t(s, n) { return s.replace("{n}", n); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function icon(id, cls) { return '<svg class="ico' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }

  // Poster art: CSS only, no images.
  var ART = [
    "radial-gradient(circle at 70% 28%,#FDE7B0 0 9%,transparent 10%),linear-gradient(170deg,#7A2E1F,#D9822B 55%,#2B1810)",
    "radial-gradient(ellipse at 50% 112%,#5FA35A 0 42%,transparent 43%),radial-gradient(circle at 30% 30%,#fff 0 8%,transparent 9%),linear-gradient(180deg,#8FD3F4,#D7F0C8)",
    "repeating-linear-gradient(90deg,rgba(255,255,255,.05) 0 2px,transparent 2px 14px),linear-gradient(160deg,#1C2B36,#3D6E80 60%,#0D1418)",
    "radial-gradient(circle at 50% 40%,#E9C46A 0 12%,transparent 13%),conic-gradient(from 200deg at 50% 60%,#264653,#2A9D8F,#264653,#1B2E35,#264653)",
    "radial-gradient(ellipse at 50% 110%,#2F7D5B 0 45%,transparent 46%),linear-gradient(180deg,#F4C7D9,#9BD3E8 60%,#3E8E6A)",
    "radial-gradient(circle at 30% 35%,#F7D46B 0 14%,transparent 15%),linear-gradient(200deg,#6E2C8C,#E0577A 60%,#1E1030)",
    "linear-gradient(135deg,transparent 46%,#F2C14E 46% 54%,transparent 54%),linear-gradient(180deg,#141E30,#243B55)",
    "radial-gradient(ellipse at 50% 100%,#3D2B56 0 35%,transparent 36%),linear-gradient(180deg,#0F2027,#5B4B8A 60%,#E6A57E)",
    "radial-gradient(circle at 65% 55%,#fff 0 6%,#FFD6A5 7% 13%,transparent 14%),linear-gradient(160deg,#4A1942,#C6426E 70%)",
    "repeating-linear-gradient(45deg,#F4A261 0 10px,#E76F51 10px 20px)",
    "radial-gradient(ellipse at 20% 120%,#1D3557 0 50%,transparent 51%),radial-gradient(ellipse at 80% 120%,#457B9D 0 45%,transparent 46%),linear-gradient(180deg,#A8DADC,#F1FAEE)",
    "radial-gradient(circle at 50% 45%,#FF6B6B 0 16%,transparent 17%),linear-gradient(180deg,#1A1A2E,#16213E 60%,#0F3460)"
  ];

  var MOVIES = [
    { t: "Sintel", y: 2010, d: 15, c: "fantasy", a: 0, p: 0.62 },
    { t: "Big Buck Bunny", y: 2008, d: 10, c: "comedy", a: 1 },
    { t: "Tears of Steel", y: 2012, d: 12, c: "scifi", a: 2 },
    { t: "Elephants Dream", y: 2006, d: 11, c: "scifi", a: 3 },
    { t: "Spring", y: 2019, d: 8, c: "fantasy", a: 4, p: 0.18 },
    { t: "Cosmos Laundromat", y: 2015, d: 12, c: "comedy", a: 5, p: 0.85 },
    { t: "Agent 327", y: 2017, d: 4, c: "action", a: 6 },
    { t: "Sprite Fright", y: 2021, d: 10, c: "comedy", a: 7 },
    { t: "Charge", y: 2022, d: 4, c: "action", a: 11 },
    { t: "Coffee Run", y: 2020, d: 3, c: "comedy", a: 9 },
    { t: "Hero", y: 2018, d: 4, c: "action", a: 8 },
    { t: "Wing It!", y: 2023, d: 4, c: "comedy", a: 10 }
  ];

  var SERIES = [
    { t: "Caminandes", c: "kids", a: 1, d: 3, seasons: [["Llama Drama", "Gran Dillama", "Llamigos"]], p: { "0-1": 0.4 } },
    { t: "Harbour Lights", c: "drama", a: 7, d: 42, seasons: [6, 4], p: { "1-0": 0.7 } },
    { t: "Paper Robots", c: "kids", a: 9, d: 11, seasons: [8] },
    { t: "Northern Trails", c: "docs", a: 10, d: 50, seasons: [4, 4, 3] }
  ];

  function episodes(sr, si) {
    var s = sr.seasons[si];
    var list = typeof s === "number" ? Array.apply(null, Array(s)).map(function () { return null; }) : s;
    return list.map(function (title, ei) {
      return { title: title || t(ui.episode, ei + 1), code: "S" + (si + 1) + " E" + (ei + 1), p: (sr.p || {})[si + "-" + ei] };
    });
  }

  var uid = 0;
  function sceneSVG() {
    var id = "sk" + (++uid);
    return '<svg class="scene" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop class="st1" offset="0"/><stop class="st2" offset="1"/></linearGradient></defs>' +
      '<rect width="640" height="360" fill="url(#' + id + ')"/><circle class="s-sun" cx="420" cy="150" r="34"/><g class="s-pan">' +
      '<path class="s-h1" d="M-200 210 C-80 180 40 200 160 186 S400 160 520 190 S760 170 840 196 V360 H-200Z"/>' +
      '<path class="s-h2" d="M-200 250 C-40 222 120 246 280 230 S560 214 700 240 S820 236 860 246 V360 H-200Z"/>' +
      '<path class="s-h3" d="M-200 296 C0 276 200 292 380 282 S700 270 860 290 V360 H-200Z"/></g></svg>';
  }

  function poster(item, attrs, extra) {
    return '<button type="button" class="v-poster" ' + attrs + '>' +
      '<span class="v-art" style="background:' + ART[item.a] + '"></span>' +
      '<span class="v-ptitle">' + esc(item.t) + '</span>' +
      (item.p ? '<span class="v-pbar"><i style="width:' + Math.round(item.p * 100) + '%"></i></span>' : "") +
      (extra || "") + "</button>";
  }

  // ---- Screens ----------------------------------------------------------
  var views = {};
  app.querySelectorAll("[data-view]").forEach(function (v) { views[v.dataset.view] = v; });
  var rail = app.querySelector("[data-rail]");
  var NAV = [
    ["home", "home"], ["live", "tv"], ["guide", "timeline"], ["movies", "film"],
    ["series", "stack"], ["multiview", "grid"], ["search", "search"], ["settings", "gear"]
  ];
  NAV.forEach(function (n) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "rail-btn" + (n[0] === "settings" ? " rail-end" : "");
    b.dataset.go = n[0];
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", ui.nav[n[0]]);
    b.title = ui.nav[n[0]];
    b.innerHTML = icon(n[1]);
    rail.appendChild(b);
  });

  var state = { view: "live", movie: null, series: null, season: 0, cat: "all", query: "", filter: "all", audio: 0, prev: "movies", playing: null, vsr: true, pin: false };

  function go(name, opts) {
    opts = opts || {};
    for (var k in opts) state[k] = opts[k];
    state.view = name;
    rail.querySelectorAll(".rail-btn").forEach(function (b) {
      var on = b.dataset.go === (name === "player" ? state.prev : name);
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    Object.keys(views).forEach(function (k) {
      if (k === "live") views.live.classList.toggle("is-off", name !== "live");
      else views[k].hidden = k !== name;
    });
    if (name !== "live" && render[name]) {
      views[name].innerHTML = render[name]();
      views[name].scrollTop = 0;
      if (after[name]) after[name](views[name]);
    }
  }

  app.addEventListener("click", function (e) {
    var el = e.target.closest("[data-go],[data-channel],[data-movie],[data-series],[data-ep],[data-cat],[data-filter],[data-season],[data-audio],[data-toggle],[data-back]");
    if (!el || !app.contains(el)) return;
    var d = el.dataset;
    if (d.go) go(d.go);
    else if (d.channel != null) { select(+d.channel, true); go("live"); }
    else if (d.movie != null) go("movies", { movie: +d.movie });
    else if (d.series != null) go("series", { series: +d.series, season: 0 });
    else if (d.ep != null) {
      var parts = d.ep.split("-"), sr = SERIES[state.series], ep = episodes(sr, +parts[0])[+parts[1]];
      go("player", { prev: "series", playing: { title: sr.t, sub: ep.code + "  " + ep.title, a: sr.a, d: sr.d, p: ep.p || 0 } });
    }
    else if (d.cat) go("movies", { cat: d.cat, movie: null });
    else if (d.filter) { state.filter = d.filter; renderResults(); }
    else if (d.season != null) go("series", { season: +d.season });
    else if (d.audio != null) go("multiview", { audio: +d.audio });
    else if (d.toggle) { state[d.toggle] = !state[d.toggle]; el.setAttribute("aria-checked", state[d.toggle]); }
    else if (d.back) {
      if (state.view === "player") go(state.prev);
      else if (state.view === "movies") go("movies", { movie: null });
      else go("series", { series: null });
    }
  });

  var render = {}, after = {};

  render.home = function () {
    var h = new Date().getHours();
    var greet = ui.greeting[h < 5 ? 0 : h < 12 ? 1 : h < 18 ? 2 : h < 22 ? 3 : 0];
    var cards = [
      ["live", "tv", t(ui.nChannels, channels.length)],
      ["guide", "timeline", ui.nowOn],
      ["movies", "film", t(ui.nTitles, MOVIES.length)],
      ["series", "stack", t(ui.nSeries, SERIES.length)]
    ].map(function (c) {
      return '<button type="button" class="v-short" data-go="' + c[0] + '">' + icon(c[1]) +
        "<b>" + esc(ui.nav[c[0]]) + "</b><span>" + esc(c[2]) + "</span></button>";
    }).join("");
    var cont = MOVIES.map(function (m, i) { return [m, i]; }).filter(function (x) { return x[0].p; }).map(function (x) {
      var left = Math.round(x[0].d * (1 - x[0].p));
      return poster(x[0], 'data-movie="' + x[1] + '"', '<span class="v-pcap">' + esc(t(ui.minLeft, Math.max(left, 1))) + "</span>");
    }).join("");
    var recent = [1, 0, 3, 2].map(function (i) {
      var nn = nowNext(i);
      return '<button type="button" class="v-chcard pal-' + i + '" data-channel="' + i + '"><span class="v-thumb">' + sceneSVG() +
        '</span><span class="v-chmeta"><span class="ch-logo">' + esc(channels[i].bug) + "</span><span><b>" + esc(channels[i].name) +
        "</b><em>" + esc(nn.cur.title) + '</em></span></span><span class="ch-bar" style="--p:' + nn.progress.toFixed(3) + '"><i></i></span></button>';
    }).join("");
    var pk = [["news", 0, 14], ["sports", 1, 22], ["kids", 5, 9], ["docs", 2, 11]].map(function (p) {
      return '<button type="button" class="v-chip" data-channel="' + p[1] + '">' + esc(ui.packages[p[0]]) + "<span>" + p[2] + "</span></button>";
    }).join("");
    return '<div class="v-pad"><h2 class="v-h1">' + esc(greet) + '</h2><p class="v-sub">' + esc(ui.homeIntro) + "</p>" +
      '<div class="v-shorts">' + cards + "</div>" +
      '<h3 class="v-h2">' + esc(ui.continueWatching) + '</h3><div class="v-shelf v-shelf-posters">' + cont + "</div>" +
      '<h3 class="v-h2">' + esc(ui.recentChannels) + '</h3><div class="v-shelf">' + recent + "</div>" +
      '<h3 class="v-h2">' + esc(ui.favoritePackages) + '</h3><div class="v-chips">' + pk + "</div></div>";
  };

  function guideHTML(rows, span, clickable) {
    var n = minutesNow();
    var from = Math.floor(n / 30) * 30 - 30, to = from + span, cols = span / 30;
    var html = '<div class="g-times" style="--cols:' + cols + '"><span></span>';
    for (var k = 0; k < cols; k++) html += "<span>" + fmt(from + k * 30) + "</span>";
    html += "</div>";
    channels.slice(0, rows).forEach(function (ch, i) {
      html += '<div class="g-row"><div class="g-ch"><span class="ch-logo pal-' + i + '">' + esc(ch.bug) +
        "</span><span>" + esc(ch.name) + '</span></div><div class="g-track">';
      schedule(i, from, to).forEach(function (p) {
        var w = Math.min(p.end, to) - Math.max(p.start, from);
        var cls = p.start <= n && n < p.end ? " now" : p.end <= n ? " past" : "";
        var tag = clickable ? 'button type="button" data-channel="' + i + '"' : "div";
        html += "<" + tag + ' class="g-prog' + cls + '" style="--w:' + w + '">' + esc(p.title) + "</" + tag.split(" ")[0] + ">";
      });
      html += "</div></div>";
    });
    return html + '<div class="g-line" style="--f:' + ((n - from) / span).toFixed(4) + '"></div>';
  }

  render.guide = function () {
    return '<div class="v-pad"><div class="v-head"><h2 class="v-h1">' + esc(ui.nav.guide) + '</h2><span class="v-count">' +
      esc(t(ui.nChannels, channels.length)) + '</span></div><div class="v-guide">' + guideHTML(channels.length, 150, true) + "</div></div>";
  };

  render.movies = function () {
    if (state.movie != null) {
      var m = MOVIES[state.movie];
      var left = m.p ? Math.max(Math.round(m.d * (1 - m.p)), 1) : 0;
      return '<div class="v-detail"><div class="v-backdrop" style="background:' + ART[m.a] + '"></div>' +
        '<button type="button" class="v-back" data-back="1">' + icon("back") + esc(ui.back) + "</button>" +
        '<div class="v-dbody"><h2 class="v-h1">' + esc(m.t) + '</h2><p class="v-meta">' + m.y + "  ·  " + esc(t(ui.minutes, m.d)) + "  ·  " + esc(ui.cats[m.c]) + "</p>" +
        '<p class="v-desc">' + esc(ui.openMovie) + "</p>" +
        (m.p ? '<div class="v-progress"><span class="v-pbar"><i style="width:' + Math.round(m.p * 100) + '%"></i></span><em>' + esc(t(ui.minLeft, left)) + "</em></div>" : "") +
        '<div class="v-actions"><button type="button" class="v-btn" data-go="player">' + icon("play") + esc(m.p ? ui.resume : ui.play) + "</button></div></div></div>";
    }
    var cats = ["all", "action", "comedy", "fantasy", "scifi"].map(function (c) {
      return '<button type="button" class="v-chip' + (state.cat === c ? " on" : "") + '" data-cat="' + c + '">' + esc(ui.cats[c]) + "</button>";
    }).join("");
    var grid = MOVIES.map(function (m, i) { return [m, i]; }).filter(function (x) { return state.cat === "all" || x[0].c === state.cat; })
      .map(function (x) { return poster(x[0], 'data-movie="' + x[1] + '"'); }).join("");
    return '<div class="v-pad"><div class="v-head"><h2 class="v-h1">' + esc(ui.nav.movies) + '</h2><span class="v-count">' +
      esc(t(ui.nTitles, MOVIES.length)) + '</span></div><div class="v-chips">' + cats + '</div><div class="v-grid">' + grid + "</div></div>";
  };
  after.movies = function () {
    if (state.movie == null) return;
    var m = MOVIES[state.movie];
    state.prev = "movies";
    state.playing = { title: m.t, sub: m.y + "  ·  " + ui.cats[m.c], a: m.a, d: m.d, p: m.p || 0 };
  };

  render.series = function () {
    if (state.series != null) {
      var sr = SERIES[state.series];
      var tabs = sr.seasons.map(function (_, i) {
        return '<button type="button" class="v-chip' + (state.season === i ? " on" : "") + '" data-season="' + i + '">' + esc(t(ui.season, i + 1)) + "</button>";
      }).join("");
      var eps = episodes(sr, state.season).map(function (ep, ei) {
        return '<button type="button" class="v-ep" data-ep="' + state.season + "-" + ei + '"><span class="v-epcode">' + ep.code + "</span><span class=\"v-eptitle\">" +
          esc(ep.title) + (ep.p ? '<span class="v-pbar"><i style="width:' + Math.round(ep.p * 100) + '%"></i></span>' : "") +
          '</span><span class="v-epdur">' + esc(t(ui.minutes, sr.d)) + "</span>" + icon("play") + "</button>";
      }).join("");
      var n = sr.seasons.length;
      return '<div class="v-pad"><button type="button" class="v-back v-back-flat" data-back="1">' + icon("back") + esc(ui.back) + "</button>" +
        '<div class="v-shead"><span class="v-art v-sart" style="background:' + ART[sr.a] + '"></span><div><h2 class="v-h1">' + esc(sr.t) +
        '</h2><p class="v-meta">' + esc(n === 1 ? ui.oneSeason : t(ui.seasons, n)) + "  ·  " + esc(ui.cats[sr.c]) + '</p><p class="v-desc">' +
        esc(sr.t === "Caminandes" ? ui.openMovie : ui.madeUp) + '</p></div></div><div class="v-chips">' + tabs + '</div><div class="v-eps">' + eps + "</div></div>";
    }
    var grid = SERIES.map(function (s, i) {
      var n = s.seasons.length;
      return poster(s, 'data-series="' + i + '"', '<span class="v-pcap">' + esc(n === 1 ? ui.oneSeason : t(ui.seasons, n)) + "</span>");
    }).join("");
    return '<div class="v-pad"><div class="v-head"><h2 class="v-h1">' + esc(ui.nav.series) + '</h2><span class="v-count">' +
      esc(t(ui.nSeries, SERIES.length)) + '</span></div><div class="v-grid">' + grid + "</div></div>";
  };

  render.multiview = function () {
    var tiles = [1, 0, 2, 3].map(function (ci, k) {
      var nn = nowNext(ci);
      return '<button type="button" class="v-tile pal-' + ci + (state.audio === k ? " on" : "") + '" data-audio="' + k + '" aria-pressed="' + (state.audio === k) + '">' +
        sceneSVG() + '<span class="v-tbug">' + esc(channels[ci].bug) + '</span><span class="v-tinfo">' +
        (state.audio === k ? icon("volume") : "") + "<b>" + esc(channels[ci].name) + "</b><em>" + esc(nn.cur.title) + "</em></span></button>";
    }).join("");
    return '<div class="v-pad v-pad-tight"><div class="v-head"><h2 class="v-h1">' + esc(ui.nav.multiview) + '</h2><span class="v-count">' +
      esc(ui.multiviewHint) + '</span></div><div class="v-mv">' + tiles + "</div></div>";
  };

  render.search = function () {
    var f = ["all", "live", "movies", "series"].map(function (k) {
      return '<button type="button" class="v-chip' + (state.filter === k ? " on" : "") + '" data-filter="' + k + '">' + esc(k === "all" ? ui.cats.all : ui.nav[k]) + "</button>";
    }).join("");
    return '<div class="v-pad"><label class="v-search">' + icon("search") + '<input type="search" autocomplete="off" spellcheck="false" placeholder="' +
      esc(ui.searchHint) + '" aria-label="' + esc(ui.searchHint) + '" value="' + esc(state.query) + '"></label><div class="v-chips" data-filters>' + f +
      '</div><div class="v-results" data-results aria-live="polite"></div></div>';
  };
  after.search = function (v) {
    var input = v.querySelector("input");
    input.addEventListener("input", function () { state.query = input.value; renderResults(); });
    renderResults();
  };

  function renderResults() {
    var v = views.search;
    v.querySelectorAll("[data-filter]").forEach(function (b) { b.classList.toggle("on", b.dataset.filter === state.filter); });
    var q = state.query.trim().toLowerCase(), out = v.querySelector("[data-results]");
    if (!q) { out.innerHTML = '<p class="v-empty">' + esc(ui.searchEmpty) + "</p>"; return; }
    var groups = [];
    if (state.filter === "all" || state.filter === "live") {
      var ch = channels.map(function (c, i) { return [c, i, nowNext(i).cur.title]; })
        .filter(function (x) { return (x[0].name + " " + x[2]).toLowerCase().indexOf(q) !== -1; })
        .map(function (x) {
          return '<button type="button" class="v-row" data-channel="' + x[1] + '"><span class="ch-logo pal-' + x[1] + '">' + esc(x[0].bug) +
            "</span><span><b>" + esc(x[0].name) + "</b><em>" + esc(x[2]) + "</em></span><i>" + esc(ui.nav.live) + "</i></button>";
        });
      if (ch.length) groups.push([ui.nav.live, ch]);
    }
    if (state.filter === "all" || state.filter === "movies") {
      var mv = MOVIES.map(function (m, i) { return [m, i]; }).filter(function (x) { return x[0].t.toLowerCase().indexOf(q) !== -1; })
        .map(function (x) {
          return '<button type="button" class="v-row" data-movie="' + x[1] + '"><span class="v-sw" style="background:' + ART[x[0].a] + '"></span><span><b>' +
            esc(x[0].t) + "</b><em>" + x[0].y + "</em></span><i>" + esc(ui.nav.movies) + "</i></button>";
        });
      if (mv.length) groups.push([ui.nav.movies, mv]);
    }
    if (state.filter === "all" || state.filter === "series") {
      var se = SERIES.map(function (s, i) { return [s, i]; }).filter(function (x) { return x[0].t.toLowerCase().indexOf(q) !== -1; })
        .map(function (x) {
          return '<button type="button" class="v-row" data-series="' + x[1] + '"><span class="v-sw" style="background:' + ART[x[0].a] + '"></span><span><b>' +
            esc(x[0].t) + "</b><em>" + esc(ui.cats[x[0].c]) + "</em></span><i>" + esc(ui.nav.series) + "</i></button>";
        });
      if (se.length) groups.push([ui.nav.series, se]);
    }
    out.innerHTML = groups.length ? groups.map(function (g) {
      return '<h3 class="v-h2">' + esc(g[0]) + "<span>" + g[1].length + "</span></h3>" + g[1].join("");
    }).join("") : '<p class="v-empty">' + esc(ui.noResults.replace("{q}", state.query.trim())) + "</p>";
  }

  render.settings = function () {
    function sw(key, on) { return '<button type="button" class="v-switch" role="switch" aria-checked="' + on + '" data-toggle="' + key + '"><i></i></button>'; }
    function row(ic, title, detail, end) {
      return '<div class="v-set">' + icon(ic) + '<span><b>' + esc(title) + "</b><em>" + esc(detail) + "</em></span>" + end + "</div>";
    }
    return '<div class="v-pad"><div class="v-head"><h2 class="v-h1">' + esc(ui.nav.settings) + "</h2></div>" +
      '<h3 class="v-h2">' + esc(ui.lists) + '</h3><div class="v-group">' + row("layers", ui.listName, ui.listDetail, '<span class="v-dot"></span>') + "</div>" +
      '<h3 class="v-h2">' + esc(ui.playback) + '</h3><div class="v-group">' + row("spark", ui.vsr, ui.vsrDetail, sw("vsr", state.vsr)) + "</div>" +
      '<h3 class="v-h2">' + esc(ui.parental) + '</h3><div class="v-group">' + row("lock", ui.parental, ui.parentalDetail, sw("pin", state.pin)) + "</div>" +
      '<h3 class="v-h2">' + esc(ui.language) + '</h3><div class="v-group">' + row("globe", ui.language, ui.languageDetail, '<span class="v-val">' + esc(ui.langValue) + "</span>") + "</div></div>";
  };

  render.player = function () {
    var p = state.playing || { title: MOVIES[0].t, sub: "", a: 0, d: MOVIES[0].d, p: 0 };
    var pos = Math.round(p.d * 60 * p.p), tot = p.d * 60;
    function mmss(x) { var m = Math.floor(x / 60), s = x % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
    return '<div class="v-player"><div class="v-pscreen" style="background:' + ART[p.a] + '"></div>' +
      '<button type="button" class="v-back" data-back="1">' + icon("back") + esc(ui.back) + "</button>" +
      '<div class="osd"><div class="osd-row"><div><p class="osd-ch">' + esc(p.sub) + '</p><p class="osd-prog">' + esc(p.title) +
      '</p></div><p class="osd-time">' + mmss(pos) + " / " + mmss(tot) + '</p></div><div class="bar"><i style="width:' + (p.p * 100).toFixed(1) +
      '%"></i></div><div class="osd-ctrl" aria-hidden="true">' + icon("play") + icon("volume") +
      '<span class="osd-spacer"></span><span class="osd-chip">CC</span>' + icon("expand") + "</div></div></div>";
  };

  select(0, false);
  go("live");
  setInterval(function () {
    tick();
    renderGuide();
    var cur = state.view;
    if (cur === "guide" || cur === "home" || cur === "multiview") {
      var st = views[cur].scrollTop;
      go(cur);
      views[cur].scrollTop = st;
    }
  }, 30000);

  // ---- Guide card -------------------------------------------------------
  var guide = document.querySelector("[data-guide]");
  function renderGuide() { if (guide) guide.innerHTML = guideHTML(5, 120, false); }
  renderGuide();

  // ---- VSR compare ------------------------------------------------------
  var vsr = document.querySelector("[data-vsr]");
  if (vsr) {
    var range = vsr.querySelector("input");
    range.addEventListener("input", function () { vsr.style.setProperty("--split", range.value + "%"); });
  }
})();
