(() => {
  "use strict";

  const VIEWS = {
    py: { langs: ["es", "en"], def: "es" },
    jp: { langs: ["en", "ja"], def: "en" }
  };

  // Wave geometry. Wavelength ratio 50 Hz : 60 Hz = 60 : 50, speed ratio = 50 : 60.
  const WAVE = {
    gap: 8,
    amp: 2.8,
    lambda: { 50: 48, 60: 40 },
    speed: { 50: 50 * 0.22, 60: 60 * 0.22 }, // px per second
    width: 1.25
  };

  const COLORS = {
    bg: "#10151c",
    land: "#18202a",
    ink: "rgba(233,228,216,0.82)",
    border: "rgba(160,170,182,0.55)",
    muni: "rgba(160,170,182,0.18)",
    accent: "#f0b54a",
    line: "#ffffff",
    dc: "#c4a8ff",
    wave: { 50: "#5fb0f2", 60: "#ff9a45" },
    tint: { 50: "rgba(95,176,242,0.14)", 60: "rgba(255,154,69,0.14)" },
    water: "#0c1218",
    river: "rgba(180,192,204,0.45)",
    label: "rgba(233,228,216,0.72)",
    nodata: "rgba(160,170,182,0.35)"
  };

  const T = window.I18N;
  const state = {
    view: "py",
    lang: "es",
    data: {},
    sites: null,
    transform: d3.zoomIdentity,
    dirty: true,
    playing: null,
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    paused: false
  };
  state.paused = state.reduceMotion;

  const canvas = document.getElementById("map"); // base: land and tints
  const ctx = canvas.getContext("2d");
  const topCanvas = document.getElementById("top"); // lines, labels, links; receives zoom gestures
  const topCtx = topCanvas.getContext("2d");
  const wavesEl = document.getElementById("waves");
  const wrap = document.getElementById("mapwrap");
  const markersEl = document.getElementById("markers");
  const popup = document.getElementById("popup");
  let W = 0, H = 0, DPR = 1;

  // ---------- URL state ----------
  function readURL() {
    const p = new URLSearchParams(location.search);
    const v = p.get("view");
    state.view = VIEWS[v] ? v : "py";
    const l = p.get("lang");
    if (l && VIEWS[state.view].langs.includes(l)) state.lang = l;
    else if (l) state.lang = "en";
    else state.lang = VIEWS[state.view].def;
  }
  function writeURL() {
    const p = new URLSearchParams(location.search);
    p.set("view", state.view);
    p.set("lang", state.lang);
    history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
  }

  const t = (key) => {
    const v = T.strings[state.view][key];
    if (v == null) return "";
    return typeof v === "string" ? v : (v[state.lang] ?? v.en ?? "");
  };
  const tx = (obj) => (obj == null ? "" : typeof obj === "string" ? obj : (obj[state.lang] ?? obj.en ?? ""));

  // ---------- wave tiles ----------
  // Waves are CSS layers: an oversized strip with a repeating wave tile, slid by one
  // wavelength in an endless linear animation (runs on the compositor), masked to the map area.
  const tiles = {};
  function makeTile(hz, period, offset) {
    const lam = WAVE.lambda[hz];
    const h = WAVE.gap * period;
    const c = document.createElement("canvas");
    c.width = Math.round(lam * DPR);
    c.height = Math.round(h * DPR);
    const g = c.getContext("2d");
    g.scale(c.width / lam, c.height / h);
    g.strokeStyle = COLORS.wave[hz];
    g.lineWidth = WAVE.width;
    g.lineCap = "round";
    const y0 = WAVE.gap * offset + WAVE.gap / 2;
    g.beginPath();
    for (let x = -2; x <= lam + 2; x += 0.5) {
      const y = y0 + WAVE.amp * Math.sin((2 * Math.PI * x) / lam);
      if (x === -2) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    return { url: c.toDataURL(), w: lam, h, hz };
  }
  function buildTiles() {
    tiles["50"] = makeTile(50, 1, 0);
    tiles["60"] = makeTile(60, 1, 0);
    tiles["50h"] = makeTile(50, 2, 0);
    tiles["60h"] = makeTile(60, 2, 1);
    document.querySelectorAll("[data-tile]").forEach(styleStrip);
  }
  const anims = new Set();
  function styleStrip(strip) {
    const tile = tiles[strip.dataset.tile];
    if (!tile) return;
    strip.style.backgroundImage = `url(${tile.url})`;
    strip.style.backgroundSize = `${tile.w}px ${tile.h}px`;
    strip.style.left = `${-tile.w}px`;
    strip.style.width = `calc(100% + ${2 * tile.w}px)`;
  }
  // creates an element whose content is an endlessly moving wave strip
  function waveBox(key, className) {
    const box = document.createElement("div");
    box.className = className;
    const strip = document.createElement("div");
    strip.className = "wave-strip";
    strip.dataset.tile = key;
    box.appendChild(strip);
    styleStrip(strip);
    const hz = key.startsWith("50") ? 50 : 60;
    const lam = WAVE.lambda[hz];
    const anim = strip.animate(
      [{ transform: "translateX(0px)" }, { transform: `translateX(${lam}px)` }],
      { duration: (lam / WAVE.speed[hz]) * 1000, iterations: Infinity, easing: "linear" }
    );
    if (state.paused) anim.pause();
    anims.add(anim);
    box._anim = anim;
    return box;
  }
  function dropBox(box) {
    if (box._anim) { box._anim.cancel(); anims.delete(box._anim); }
    box.remove();
  }
  function setPaused(p) {
    state.paused = p;
    anims.forEach((a) => (p ? a.pause() : a.play()));
  }

  // ---------- projections & layers ----------
  function projectionFor(view) {
    if (view === "py") return d3.geoConicEqualArea().parallels([-5, -40]).rotate([60, 0]);
    return d3.geoConicEqualArea().parallels([30, 42]).rotate([-137, 0]);
  }
  const EXTENT = {
    py: { type: "Polygon", coordinates: [[[-82, -56], [-82, 13], [-34, 13], [-34, -56], [-82, -56]]] },
    jp: { type: "Polygon", coordinates: [[[123, 24], [123, 45.6], [146, 45.6], [146, 24], [123, 24]]] }
  };
  let projection = null;
  let base = null; // {scale, translate}

  function prepareView(view) {
    const d = state.data[view];
    if (d.prepared) return;
    const topo = d.topo;
    const out = {};
    if (view === "py") {
      const obj = topo.objects.countries;
      const geoms = obj.geometries;
      out.land = topojson.feature(topo, obj);
      out.groups = ["50", "60", "mixed"].map((hz) => ({
        hz,
        geom: topojson.merge(topo, geoms.filter((g) => g.properties.hz === hz))
      }));
      out.borders = topojson.mesh(topo, obj, (a, b) => a !== b);
      out.coast = topojson.mesh(topo, obj, (a, b) => a === b);
      out.hzline = topojson.mesh(topo, obj, (a, b) => a !== b && a.properties.hz !== b.properties.hz);
      out.rivers = topojson.feature(topo, topo.objects.rivers);
      out.lakes = topojson.feature(topo, topo.objects.lakes);
      const dt = d.detail;
      const dobj = dt.objects.countries;
      out.detail = {
        land: topojson.feature(dt, dobj),
        groups: ["50", "60"].map((hz) => ({ hz, geom: topojson.merge(dt, dobj.geometries.filter((g) => g.properties.hz === hz)) })),
        borders: topojson.mesh(dt, dobj, (a, b) => a !== b),
        hzline: topojson.mesh(dt, dobj, (a, b) => a !== b && a.properties.hz !== b.properties.hz),
        rivers: topojson.feature(dt, dt.objects.rivers),
        lakes: topojson.feature(dt, dt.objects.lakes)
      };
      out.detailBox = d.detailBox;
    } else {
      const obj = topo.objects.muni;
      const geoms = obj.geometries;
      out.land = topojson.feature(topo, obj);
      out.groups = ["50", "60"].map((hz) => ({
        hz,
        geom: topojson.merge(topo, geoms.filter((g) => g.properties.hz === hz))
      }));
      out.nodata = topojson.merge(topo, geoms.filter((g) => !g.properties.hz));
      out.pref = topojson.mesh(topo, obj, (a, b) => a !== b && a.properties.pref !== b.properties.pref);
      out.munilines = topojson.mesh(topo, obj, (a, b) => a !== b && a.properties.pref === b.properties.pref);
      out.hzline = topojson.mesh(topo, obj, (a, b) => a !== b && !!a.properties.hz && !!b.properties.hz && a.properties.hz !== b.properties.hz);
      out.coast = topojson.mesh(topo, obj, (a, b) => a === b);
    }
    d.layers = out;
    d.prepared = true;
  }

  function fitBase() {
    projection = projectionFor(state.view);
    projection.fitExtent([[16, 56], [W - 16, H - 30]], EXTENT[state.view]);
    base = { scale: projection.scale(), translate: projection.translate() };
  }
  function applyTransform() {
    const k = state.transform.k;
    projection
      .scale(base.scale * k)
      .translate([state.transform.x + k * base.translate[0], state.transform.y + k * base.translate[1]])
      .clipExtent([[-20, -20], [W + 20, H + 20]]);
  }

  // ---------- paths ----------
  let P = null;
  function buildPaths() {
    applyTransform();
    const L = state.data[state.view].layers;
    const k = state.transform.k;
    const mk = (geo) => {
      const p = new Path2D();
      d3.geoPath(projection, p)(geo);
      return p;
    };
    P = { k };
    if (state.view === "py") {
      const useDetail = k >= 4;
      const src = useDetail ? L.detail : L;
      P.land = mk(L.land);
      if (useDetail) P.detailLand = mk(L.detail.land);
      P.groups = src.groups.map((g) => ({ hz: g.hz, path: mk(g.geom) }));
      if (useDetail) {
        // outside the detail box, keep the coarse groups
        P.coarse = L.groups.map((g) => ({ hz: g.hz, path: mk(g.geom) }));
        const b = L.detailBox;
        P.detailClip = mk({ type: "Polygon", coordinates: [[[b[0], b[1]], [b[0], b[3]], [b[2], b[3]], [b[2], b[1]], [b[0], b[1]]]] });
      }
      P.borders = mk(src.borders);
      P.hzline = mk(src.hzline);
      if (useDetail) { P.cborders = mk(L.borders); P.chzline = mk(L.hzline); }
      P.coast = mk(L.coast);
      P.rivers = mk(src.rivers);
      P.lakes = mk(src.lakes);
      P.useDetail = useDetail;
    } else {
      P.land = mk(L.land);
      P.groups = L.groups.map((g) => ({ hz: g.hz, path: mk(g.geom) }));
      P.nodata = mk(L.nodata);
      P.pref = mk(L.pref);
      P.muni = k >= 2.5 ? mk(L.munilines) : null;
      P.hzline = mk(L.hzline);
    }
    placeMarkers();
  }

  // ---------- draw ----------
  // The map is drawn when the view, language, size or zoom settles. While zooming,
  // the drawn layers are moved with CSS transforms, and the waves keep running.
  let cx = ctx; // context used by the line and label helpers
  const layers = {
    base: { el: canvas, tr: null },
    top: { el: topCanvas, tr: null },
    waves: {} // hz -> { box: [elements], url, tr, canvas }
  };
  let renderGen = 0;
  function sizeCanvas(c) {
    c.width = Math.round(W * DPR);
    c.height = Math.round(H * DPR);
  }
  function begin(g) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    return g;
  }
  // Runs fnCoarse(groups) outside the detail box and fnDetail(groups) inside it (Paraguay zoom).
  function byRegion(g, fnCoarse, fnDetail) {
    if (state.view === "py" && P.useDetail) {
      g.save();
      const outside = new Path2D();
      outside.rect(-50, -50, W + 100, H + 100);
      outside.addPath(P.detailClip);
      g.clip(outside, "evenodd");
      fnCoarse(P.coarse);
      g.restore();
      g.save();
      g.clip(P.detailClip);
      fnDetail(P.groups);
      g.restore();
    } else {
      fnCoarse(P.groups);
    }
  }
  function renderStatic() {
    if (!projection || !state.sites) return;
    const gen = ++renderGen;
    buildPaths();
    const tr = state.transform;

    // base: land and the light tint of each frequency
    let g = begin(ctx);
    g.fillStyle = COLORS.land;
    g.fill(P.land);
    const tints = (groups) => groups.forEach((gr) => {
      if (gr.hz === "mixed") return;
      g.fillStyle = COLORS.tint[gr.hz];
      g.fill(gr.path);
    });
    byRegion(g, tints, (groups) => {
      g.fillStyle = COLORS.bg;
      g.fill(P.detailClip);
      g.fillStyle = COLORS.land;
      g.fill(P.detailLand);
      tints(groups);
    });
    layers.base.tr = tr;

    // top: water, lines, labels, DC links
    g = begin(topCtx);
    cx = g;
    if (state.view === "py") {
      g.fillStyle = COLORS.water;
      if (P.useDetail) { g.save(); g.clip(P.detailClip); g.fill(P.lakes); g.restore(); }
      else g.fill(P.lakes);
      g.strokeStyle = COLORS.river;
      g.lineWidth = P.useDetail ? 1.6 : 0.9;
      g.stroke(P.rivers);
      byRegion(g,
        () => { g.strokeStyle = COLORS.border; g.lineWidth = 0.8; g.stroke(P.useDetail ? P.cborders : P.borders); strokeHz(P.useDetail ? P.chzline : P.hzline); },
        () => { g.strokeStyle = COLORS.border; g.lineWidth = 0.8; g.stroke(P.borders); strokeHz(P.hzline); });
      drawCountryLabels();
    } else {
      g.fillStyle = COLORS.land;
      g.fill(P.nodata);
      if (P.muni) {
        g.strokeStyle = COLORS.muni;
        g.lineWidth = 0.6;
        g.stroke(P.muni);
      }
      g.strokeStyle = COLORS.border;
      g.lineWidth = 0.7;
      g.stroke(P.pref);
      strokeHz(P.hzline);
      drawJapanLabels();
    }
    g.save();
    g.setLineDash([6, 4]);
    g.strokeStyle = COLORS.dc;
    g.lineWidth = 2;
    (state.sites[state.view].links || []).forEach((ln) => {
      const a = projection(ln.from), b = projection(ln.to);
      if (!a || !b) return;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    });
    g.restore();
    cx = ctx;
    layers.top.tr = tr;

    // wave masks (white where a frequency is), handed to CSS as images
    const present = ["50", "60", "mixed"].filter((hz) => (P.coarse || P.groups).some((gr) => gr.hz === hz));
    Object.keys(layers.waves).forEach((hz) => {
      if (!present.includes(hz) || layers.waves[hz].view !== state.view) removeWave(hz);
    });
    present.forEach((hz) => {
      let lw = layers.waves[hz];
      if (!lw) {
        const keys = hz === "mixed" ? ["50h", "60h"] : [hz];
        lw = layers.waves[hz] = { boxes: keys.map((k) => waveBox(k, "wave")), canvas: document.createElement("canvas"), url: null, tr: null, view: state.view };
        lw.boxes.forEach((b) => { b.style.visibility = "hidden"; wavesEl.appendChild(b); });
      }
      sizeCanvas(lw.canvas);
      const m = begin(lw.canvas.getContext("2d"));
      m.fillStyle = "#fff";
      const fill = (groups) => groups.forEach((gr) => { if (gr.hz === hz) m.fill(gr.path); });
      byRegion(m, fill, fill);
      lw.canvas.toBlob((blob) => {
        if (gen !== renderGen || layers.waves[hz] !== lw || !blob) return;
        const url = URL.createObjectURL(blob);
        if (lw.url) URL.revokeObjectURL(lw.url);
        lw.url = url;
        lw.tr = tr;
        lw.boxes.forEach((b) => {
          b.style.webkitMaskImage = b.style.maskImage = `url(${url})`;
          b.style.visibility = "";
        });
        positionLayers();
      });
    });
    state.dirty = false;
    positionLayers();
  }
  function removeWave(hz) {
    const lw = layers.waves[hz];
    if (!lw) return;
    lw.boxes.forEach(dropBox);
    if (lw.url) URL.revokeObjectURL(lw.url);
    delete layers.waves[hz];
  }
  // where a layer drawn at transform t0 has to go for the current transform
  function rel(t0) {
    const t1 = state.transform;
    const r = t1.k / t0.k;
    return { r, dx: t1.x - r * t0.x, dy: t1.y - r * t0.y };
  }
  function positionLayers() {
    [layers.base, layers.top].forEach((l) => {
      if (!l.tr) return;
      const { r, dx, dy } = rel(l.tr);
      l.el.style.transform = r === 1 && dx === 0 && dy === 0 ? "" : `matrix(${r},0,0,${r},${dx},${dy})`;
    });
    Object.values(layers.waves).forEach((lw) => {
      if (!lw.tr) return;
      const { r, dx, dy } = rel(lw.tr);
      lw.boxes.forEach((b) => {
        b.style.webkitMaskSize = b.style.maskSize = `${W * r}px ${H * r}px`;
        b.style.webkitMaskPosition = b.style.maskPosition = `${dx}px ${dy}px`;
      });
    });
  }
  let renderReq = null;
  function scheduleRender() {
    if (renderReq != null) return;
    renderReq = requestAnimationFrame(() => {
      renderReq = null;
      renderStatic();
    });
  }

  function strokeHz(path) {
    cx.strokeStyle = "rgba(16,21,28,0.9)";
    cx.lineWidth = 6;
    cx.stroke(path);
    cx.strokeStyle = COLORS.line;
    cx.lineWidth = 2.6;
    cx.stroke(path);
  }

  function label(text, lon, lat, opts = {}) {
    const p = projection([lon, lat]);
    if (!p) return;
    cx.font = `${opts.weight || 600} ${opts.size || 12}px ${getComputedStyle(document.body).fontFamily}`;
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.lineWidth = 4;
    cx.strokeStyle = "rgba(16,21,28,0.92)";
    cx.strokeText(text, p[0], p[1]);
    cx.fillStyle = opts.color || COLORS.label;
    cx.fillText(text, p[0], p[1]);
  }
  function drawCountryLabels() {
    const k = state.transform.k;
    T.countryLabels.forEach((c) => {
      if (k < (c.minK || 1) || (c.maxK && k > c.maxK)) return;
      const name = tx(c.name);
      const hz = c.hz === "mixed" ? "50/60 Hz" : c.hz + " Hz";
      label(name, c.at[0], c.at[1], { size: k >= 4 ? 14 : 12 });
      const p = projection(c.at);
      if (!p) return;
      label(hz, ...projection.invert([p[0], p[1] + 14]), { size: 11, weight: 700, color: COLORS.wave[c.hz] || COLORS.label });
    });
  }
  function drawJapanLabels() {
    const k = state.transform.k;
    T.japanLabels.forEach((c) => {
      if (k < (c.minK || 1) || (c.maxK && k > c.maxK)) return;
      label(tx(c.name), c.at[0], c.at[1], { size: c.size || 13, weight: c.weight || 700, color: c.color });
    });
  }

  // ---------- markers & popup ----------
  function renderMarkers() {
    markersEl.innerHTML = "";
    state.sites[state.view].sites.forEach((site) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `marker ${site.type}` + (site.labelLeft ? " lbl-left" : "");
      b.dataset.id = site.id;
      b.innerHTML = `<span class="sym"></span><span class="lbl"></span>`;
      b.querySelector(".lbl").textContent = tx(site.short || site.name);
      b.setAttribute("aria-label", tx(site.name));
      b.addEventListener("click", (e) => { e.stopPropagation(); openPopup(site); });
      markersEl.appendChild(b);
    });
    placeMarkers();
  }
  function placeMarkers() {
    if (!projection || !state.sites) return;
    const k = state.transform.k;
    state.sites[state.view].sites.forEach((site) => {
      const el = markersEl.querySelector(`[data-id="${site.id}"]`);
      if (!el) return;
      const p = projection([site.lon, site.lat]);
      const vis = k >= (site.minK || 0) && p && p[0] > -10 && p[0] < W + 10 && p[1] > -10 && p[1] < H + 10;
      el.style.display = vis ? "" : "none";
      if (vis) { el.style.left = p[0] + "px"; el.style.top = p[1] + "px"; }
      el.querySelector(".lbl").style.display = k >= (site.labelK ?? 2) ? "" : "none";
    });
  }
  function openPopup(site) {
    const body = document.getElementById("popup-body");
    const rows = (site.facts || []).map((f) => `<dt>${esc(tx(T.factKeys[f.k]))}</dt><dd>${esc(tx(f.v))}</dd>`).join("");
    const srcs = (site.src || []).map((s) => `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join(" · ");
    body.innerHTML = `<h3>${esc(tx(site.name))}</h3>` +
      `<dl>${rows}</dl>` +
      (site.role ? `<p>${esc(tx(site.role))}</p>` : "") +
      (srcs ? `<p class="src">${esc(t("source"))}: ${srcs}</p>` : "");
    popup.hidden = false;
    popup.dataset.id = site.id;
  }
  function closePopup() { popup.hidden = true; delete popup.dataset.id; }
  document.getElementById("popup-close").addEventListener("click", closePopup);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePopup(); });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- zoom ----------
  const zoom = d3.zoom()
    .scaleExtent([0.8, 60])
    .on("start", () => { state.zooming = true; })
    .on("zoom", (e) => {
      state.transform = e.transform;
      if (!base) return;
      applyTransform();
      placeMarkers();
      positionLayers();
    })
    .on("end", () => {
      state.zooming = false;
      scheduleRender();
    });
  d3.select(topCanvas).call(zoom).on("dblclick.zoom", null);
  topCanvas.addEventListener("click", closePopup);

  function presetTransform(bbox) {
    // bbox: [w, s, e, n]
    const tmp = projectionFor(state.view).scale(base.scale).translate(base.translate);
    const a = tmp([bbox[0], bbox[3]]), b = tmp([bbox[2], bbox[1]]);
    const c = tmp([(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
    const xs = [a[0], b[0], tmp([bbox[0], bbox[1]])[0], tmp([bbox[2], bbox[3]])[0]];
    const ys = [a[1], b[1], tmp([bbox[0], bbox[1]])[1], tmp([bbox[2], bbox[3]])[1]];
    const dx = Math.max(...xs) - Math.min(...xs), dy = Math.max(...ys) - Math.min(...ys);
    const k = Math.min((W - 32) / dx, (H - 90) / dy);
    const cy = (56 + H - 30) / 2;
    return d3.zoomIdentity.translate(W / 2, cy).scale(k).translate(-c[0], -c[1]);
  }
  function goPreset(i, animate = true) {
    const pr = T.presets[state.view][i];
    const tr = pr.bbox ? presetTransform(pr.bbox) : d3.zoomIdentity;
    state.preset = i;
    updatePresetButtons();
    const sel = d3.select(topCanvas);
    if (animate && !state.reduceMotion) sel.transition().duration(1400).call(zoom.transform, tr);
    else sel.call(zoom.transform, tr);
  }
  function updatePresetButtons() {
    document.querySelectorAll("#zoom-presets button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === state.preset)));
  }

  // ---------- panel ----------
  function renderPanel() {
    document.documentElement.lang = state.lang;
    document.title = `${tx(T.strings[state.view].title)} · Where 50 Hz meets 60 Hz`;
    document.querySelectorAll("#view-switch button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.view === state.view));
      b.textContent = tx(T.viewNames[b.dataset.view]);
    });
    document.getElementById("view-switch").setAttribute("aria-label", tx(T.ui.view));
    const ls = document.getElementById("lang-switch");
    ls.setAttribute("aria-label", tx(T.ui.language));
    ls.innerHTML = "";
    VIEWS[state.view].langs.forEach((l) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = T.langNames[l];
      b.lang = l;
      b.setAttribute("aria-pressed", String(l === state.lang));
      b.addEventListener("click", () => setLang(l));
      ls.appendChild(b);
    });

    document.getElementById("view-title").textContent = t("title");
    document.getElementById("view-subtitle").textContent = t("subtitle");
    document.getElementById("lede").innerHTML = t("lede");
    document.getElementById("sound-title").textContent = tx(T.ui.soundTitle);
    document.getElementById("sound-hint").textContent = tx(T.ui.soundHint);
    document.querySelectorAll(".tone").forEach((b) => {
      const hz = b.dataset.hz;
      const on = state.playing === hz;
      b.setAttribute("aria-pressed", String(on));
      b.textContent = (on ? "■ " : "▶ ") + hz + " Hz" + (on ? " · " + tx(T.ui.stop) : "");
    });
    document.getElementById("map-note").textContent = t("mapNote");
    document.getElementById("motion-toggle").textContent = state.paused ? tx(T.ui.play) : tx(T.ui.pause);

    const zp = document.getElementById("zoom-presets");
    zp.innerHTML = "";
    zp.setAttribute("aria-label", tx(T.ui.zoom));
    T.presets[state.view].forEach((pr, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = tx(pr.name);
      b.addEventListener("click", () => goPreset(i));
      zp.appendChild(b);
    });
    updatePresetButtons();

    renderLegend();
    document.getElementById("feature").innerHTML = state.view === "py" ? unitsDiagram() : t("story");
    document.getElementById("notes-title").textContent = tx(T.ui.notes);
    document.getElementById("notes-body").innerHTML = t("notes");
    renderMarkers();
    if (popup.dataset.id) {
      const site = state.sites[state.view].sites.find((s) => s.id === popup.dataset.id);
      if (site) openPopup(site); else closePopup();
    }
  }

  function renderLegend() {
    const lg = document.getElementById("legend");
    const items = [
      { kind: "wave", hz: "50", text: T.ui.leg50 },
      { kind: "wave", hz: "60", text: T.ui.leg60 }
    ];
    if (state.view === "py") items.push({ kind: "wave", hz: "mixed", text: T.ui.legMixed });
    else items.push({ kind: "none", text: T.ui.legNoData });
    items.push({ kind: "line", text: state.view === "py" ? T.ui.legLinePy : T.ui.legLineJp });
    (state.view === "py" ? ["dam", "fc", "dc"] : ["fc", "dc"]).forEach((m) => items.push({ kind: "marker", m, text: T.ui["legM_" + m + "_" + state.view] || T.ui["legM_" + m] }));
    items.push({ kind: "link", text: T.ui.legLink });
    lg.querySelectorAll(".sw-layer").forEach(dropBox);
    lg.innerHTML = "";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "row";
      let sw;
      if (it.kind === "wave") {
        sw = document.createElement("span");
        sw.className = "sw-wave";
        if (it.hz === "mixed") sw.append(waveBox("50h", "sw-layer"), waveBox("60h", "sw-layer"));
        else { sw.style.background = COLORS.tint[it.hz]; sw.append(waveBox(it.hz, "sw-layer")); }
      } else if (it.kind === "none") {
        sw = document.createElement("span");
        sw.className = "sw-wave";
      } else if (it.kind === "line") {
        sw = document.createElement("span"); sw.className = "sw-line";
      } else if (it.kind === "link") {
        sw = document.createElement("span"); sw.className = "sw-dc";
      } else {
        sw = document.createElement("span"); sw.className = "sym-wrap";
        sw.innerHTML = `<span class="marker ${it.m}"><span class="sym"></span></span>`;
      }
      const tx_ = document.createElement("span");
      tx_.textContent = tx(it.text);
      row.append(sw, tx_);
      lg.appendChild(row);
    });
  }
  function unitsDiagram() {
    const u = T.itaipuUnits;
    const cw = 28, ch = 34, gap = 4, labelH = 18, rowGap = 10;
    const w = 10 * cw + 9 * gap;
    const defs = `<defs>
      <pattern id="pw50" width="${WAVE.lambda[50] / 2}" height="7" patternUnits="userSpaceOnUse">${wavePathSVG(WAVE.lambda[50] / 2, 7, COLORS.wave[50])}</pattern>
      <pattern id="pw60" width="${WAVE.lambda[60] / 2}" height="7" patternUnits="userSpaceOnUse">${wavePathSVG(WAVE.lambda[60] / 2, 7, COLORS.wave[60])}</pattern>
    </defs>`;
    let body = "";
    [[50, u.left], [60, u.right]].forEach(([hz, txt], r) => {
      const y0 = r * (labelH + ch + rowGap);
      body += `<text x="0" y="${y0 + 12}" font-size="12" font-weight="700" fill="${COLORS.wave[hz]}">${esc(tx(txt))}</text>`;
      for (let i = 0; i < 10; i++) {
        const x = i * (cw + gap);
        body += `<rect x="${x}" y="${y0 + labelH}" width="${cw}" height="${ch}" rx="2" fill="${COLORS.tint[hz]}" stroke="${COLORS.wave[hz]}" stroke-opacity="0.6"/>` +
          `<rect x="${x + 1}" y="${y0 + labelH + 1}" width="${cw - 2}" height="${ch - 2}" fill="url(#pw${hz})"/>`;
      }
    });
    const h = 2 * (labelH + ch) + rowGap;
    const svg = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(tx(u.aria))}">${defs}${body}</svg>`;
    return `<h2>${esc(tx(u.title))}</h2><div class="units">${svg}<p class="cap">${tx(u.caption)}</p></div>`;
  }
  function wavePathSVG(lam, h, color) {
    let d = "";
    for (let x = -1; x <= lam + 1; x += 0.5) {
      const y = h / 2 + 2 * Math.sin((2 * Math.PI * x) / lam);
      d += (d ? " L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1"/>`;
  }

  // ---------- sound ----------
  let audio = null;
  function stopTone() {
    if (!audio || !audio.voice) return;
    const v = audio.voice;
    const now = audio.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.15);
    v.oscs.forEach((o) => o.stop(now + 0.2));
    audio.voice = null;
  }
  function playTone(hz) {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      // iOS: let Web Audio play even when the ring/silent switch is on silent
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* not supported */ }
      audio = { ctx: new AC() };
    }
    const c = audio.ctx;
    if (c.state !== "running") c.resume();
    stopTone();
    const now = c.currentTime;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.connect(c.destination);
    // Fundamental + 2nd harmonic (100 / 120 Hz), plus weaker 3rd-5th harmonics
    // so that small speakers, which cannot reproduce 50-60 Hz, still sound the tone.
    const parts = [[1, 0.5], [2, 0.45], [3, 0.22], [4, 0.14], [5, 0.08]];
    const oscs = parts.map(([n, a]) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(hz * n, now);
      const g = c.createGain();
      g.gain.setValueAtTime(a, now);
      o.connect(g).connect(gain);
      o.start(now);
      return o;
    });
    gain.gain.linearRampToValueAtTime(0.22, now + 0.25);
    audio.voice = { gain, oscs };
  }
  document.querySelectorAll(".tone").forEach((b) => b.addEventListener("click", () => {
    const hz = b.dataset.hz;
    if (state.playing === hz) { stopTone(); state.playing = null; }
    else { playTone(hz === "50" ? 50 : 60); state.playing = hz; }
    renderPanel();
  }));

  // ---------- switching ----------
  function setView(v) {
    if (v === state.view) return;
    state.view = v;
    if (!VIEWS[v].langs.includes(state.lang)) state.lang = "en";
    closePopup();
    writeURL();
    prepareView(v);
    fitBase();
    state.preset = 0;
    Object.keys(layers.waves).forEach(removeWave);
    d3.select(topCanvas).interrupt().call(zoom.transform, d3.zoomIdentity);
    renderPanel();
    scheduleRender();
  }
  function setLang(l) {
    state.lang = l;
    writeURL();
    renderPanel();
    scheduleRender();
  }
  document.querySelectorAll("#view-switch button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  document.getElementById("motion-toggle").addEventListener("click", () => {
    setPaused(!state.paused);
    renderPanel();
  });

  function resize() {
    const r = wrap.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const newDPR = Math.min(window.devicePixelRatio || 1, 2);
    const dprChanged = newDPR !== DPR;
    DPR = newDPR;
    sizeCanvas(canvas);
    sizeCanvas(topCanvas);
    if (dprChanged || !tiles["50"]) buildTiles();
    fitBase();
    const keep = state.preset || 0;
    d3.select(topCanvas).interrupt();
    goPreset(keep, false);
    scheduleRender();
  }

  // ---------- init ----------
  async function init() {
    readURL();
    writeURL();
    const [sa, saDetail, jp, sites] = await Promise.all([
      fetch("data/south-america.topo.json").then((r) => r.json()),
      fetch("data/itaipu-region.topo.json").then((r) => r.json()),
      fetch("data/japan.topo.json").then((r) => r.json()),
      fetch("data/sites.json").then((r) => r.json())
    ]);
    state.data.py = { topo: sa, detail: saDetail, detailBox: saDetail.bbox_region };
    state.data.jp = { topo: jp };
    state.sites = sites;
    prepareView(state.view);
    prepareView(state.view === "py" ? "jp" : "py");
    state.preset = 0;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    buildTiles();
    renderPanel();
    resize();
    new ResizeObserver(() => resize()).observe(wrap);
    document.documentElement.classList.add("ready");
  }
  init();
})();
