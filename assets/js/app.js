/* Comoros flood potential warnings viewer (UQ product).
   Zones per cycle from assets/data/zones/<event>/<cycle>.js (loaded on demand), raster layers as
   per island PNGs in assets/layers/<island>/, series in assets/data/series_<event>.js.
   Interface strings come from window.WARN_STRINGS. */
"use strict";
var S = window.WARN_STRINGS, BASE = window.WARN_BASE || "", GRID = window.WARN_GRID, SER = window.WARN_SERIES, VER = window.WARN_VERIF;
var ISL = ["grande", "anjouan", "moheli"];
var CLS = { 0: "#D3D7DB", 1: "#7FDCBE", 2: "#FFD23F", 3: "#F4802A", 4: "#AB1111" };
var CLSB = { 0: "#98A0A7", 1: "#3E9B7C", 2: "#C7A400", 3: "#C05E08", 4: "#700B0C" };
var FLASH_RGB = ["#ACACAC", "#C8CE33", "#F79320", "#BC3F34", "#D14FC8", "#2B2BD5", "#FFFFFF"];
var RAIN_RGB = ["#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#54278f", "#800026"];
var PROB_RGB = ["#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"];
var LOC = S.locale || "en-US";
function num(v) { return Math.round(v).toLocaleString(LOC); }
function fixName(n) { return S.fixName ? S.fixName(n) : n; }
function shortList(n, k) { var a = fixName(n).split(", "); return a.length > k ? a.slice(0, k).join(", ") + " +" + (a.length - k) : a.join(", "); }
var ev = "apr2024", ci = 0, view = "A", bset = "flash", raster = "cls", showZones = true, showVerif = false, showRep = true, showAdm = true, playing = null, curBase = "positron";
var zoneCache = {}, pendingZones = null, current = null, selectedZone = null;
function cycles() { return SER[ev]; }
function cur() { return cycles()[ci]; }

/* ---------- map ---------- */
var map = L.map("map", { preferCanvas: true, zoomControl: false, attributionControl: false });
L.control.zoom({ position: "topleft", zoomInText: "+", zoomOutText: "-" }).addTo(map);
L.control.attribution({ prefix: false }).addTo(map);
var CARTO_KEY = "cb1_2hul_1_d1beea1581cc2f8c94ba52d4";
function carto(style) { return L.tileLayer("https://basemaps.cartocdn.com/rastertiles/" + style + "/{z}/{x}/{y}{r}.png?key=" + CARTO_KEY, { maxZoom: 20, detectRetina: false, r: "", attribution: "CARTO, OpenStreetMap" }); }
var bases = { voyager: carto("voyager"), positron: carto("light_all"), sat: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Imagery" }) };
["ras", "adm", "zone", "verif", "rep"].forEach(function (p, i) { map.createPane(p).style.zIndex = 300 + i * 25; });
var NAT = [[-12.42, 43.2], [-11.35, 44.56]];
var ISL_BOUNDS = {};
ISL.forEach(function (k) { var b = GRID.islands[k].bounds_4326; ISL_BOUNDS[k] = [[b[1], b[0]], [b[3], b[2]]]; });
map.fitBounds(NAT);
var admLayer = L.geoJSON(window.COMMUNES, { pane: "adm", style: function () { return { color: "#1b2733", weight: 1, dashArray: "4 4", fill: false }; },
  onEachFeature: function (f, l) { l.bindTooltip(fixName(f.properties.name), { sticky: true }); } }).addTo(map);
var zoneLayer = L.geoJSON(null, { pane: "zone" }).addTo(map), verifLayer = L.geoJSON(null, { pane: "verif" }), repLayer = L.layerGroup([], { pane: "rep" }).addTo(map);
var rasterOverlays = {};

/* ---------- raster layers ---------- */
var RASTERS = { cls: { per: "cycle" }, clsS: { per: "cycle" }, p1: { per: "cycle" }, qpe: { per: "cycle" }, fc: { per: "cycle" }, p05: { per: "feat" }, p50: { per: "feat" }, p95: { per: "feat" }, max: { per: "feat" }, ssmed: { per: "feat" }, ssmax: { per: "feat" }, qpemax: { per: "event" }, qpetot: { per: "event" }, none: {} };
function rasterUrl(isl) {
  var r = RASTERS[raster]; if (!r || !r.per) { return null; }
  if (r.per === "event") { return BASE + "assets/layers/" + isl + "/" + ev + "_" + raster + ".png"; }
  if (r.per === "feat" && !cur().featured) { return null; }
  return BASE + "assets/layers/" + isl + "/" + cur().cycle + "_" + raster + ".png";
}
function drawRaster() {
  ISL.forEach(function (k) {
    var url = rasterUrl(k);
    if (!url) { if (rasterOverlays[k]) { map.removeLayer(rasterOverlays[k]); rasterOverlays[k] = null; } return; }
    if (rasterOverlays[k]) { rasterOverlays[k].setUrl(url); } else { rasterOverlays[k] = L.imageOverlay(url, ISL_BOUNDS[k], { pane: "ras", opacity: 0.85, interactive: false }).addTo(map); }
  });
}

/* ---------- zones ---------- */
window.WARN_ZONES_CB = function (p) { zoneCache[ev + p.cycle] = p; if (pendingZones === ev + p.cycle) { current = p; pendingZones = null; drawZones(); } };
function loadZones() {
  var key = ev + cur().cycle;
  if (zoneCache[key]) { current = zoneCache[key]; drawZones(); return; }
  pendingZones = key;
  var s = document.createElement("script"); s.src = BASE + "assets/data/zones/" + ev + "/" + cur().cycle + ".js"; s.async = true; document.head.appendChild(s);
}
function zoneStyle(f) {
  var p = f.properties, k = (view === "A") ? p.cls : p.lvl, sel = selectedZone === p.id;
  return { color: sel ? "#111" : CLSB[k], weight: sel ? 3 : 1.5, dashArray: p.conf === 1 ? "5 4" : null, fillColor: CLS[k], fillOpacity: showZones ? 0.5 : 0, opacity: showZones ? 1 : 0 };
}
function zonePopup(p) {
  var k = (view === "A") ? p.cls : p.lvl;
  var h = "<b>" + S.zoneWord + " " + p.id + ", " + (view === "A" ? S.clsNames[k] : S.lvlNames[k]) + "</b>" +
    "<br>" + S.areaWord + ": " + p.area_km2 + " km2, " + S.confWord + ": " + S.confNames[p.conf] +
    (view === "A" ? "<br>" + S.bandWord + ": " + S.bandNames[bset][p.cls] + " (" + S.medianWord + " " + S.bandNames[bset][p.cls_med] + ", " + S.worstWord + " " + S.bandNames[bset][p.cls_worst] + ")" +
      "<br>P(UQ >= " + S.bandEdges[bset][1] + "): " + Math.round(p.p_ge1 * 100) + " %, P(UQ >= " + S.bandEdges[bset][2] + "): " + Math.round(p.p_ge2 * 100) + " %, P(UQ >= " + S.bandEdges[bset][3] + "): " + Math.round(p.p_ge4 * 100) + " %" : "") +
    "<br>" + S.popWord + ": " + num(p.pop) + ", " + S.bldWord + ": " + num(p.n_bld) + ", " + S.facWord + ": " + p.n_crit + ", " + S.roadWord + ": " + p.road_km + " km" +
    "<br>" + S.communesWord + ": " + fixName(p.communes) + (p.n_reports ? "<br>" + S.reportsWord + ": " + p.n_reports : "");
  return h;
}
function drawZones() {
  zoneLayer.clearLayers();
  if (!current) { return; }
  var key = (view === "A" ? "A" : "B") + (bset === "steep" ? "_steep" : "");
  var fc = current[key];
  zoneLayer.options.style = zoneStyle;
  zoneLayer.addData(fc);
  zoneLayer.eachLayer(function (l) {
    l.bindPopup(zonePopup(l.feature.properties));
    l.on("click", function () { selectedZone = l.feature.properties.id; zoneLayer.setStyle(zoneStyle); listZones(); });
  });
  listZones(); side();
}
function drawVerif() {
  verifLayer.clearLayers();
  if (!showVerif) { if (map.hasLayer(verifLayer)) { map.removeLayer(verifLayer); } return; }
  var fc = VER[ev][bset];
  verifLayer.options.style = function (f) { return { color: "#111", weight: 2, dashArray: "2 6", fill: true, fillColor: CLS[f.properties.cls], fillOpacity: 0.25 }; };
  verifLayer.addData(fc);
  verifLayer.eachLayer(function (l) { var p = l.feature.properties; l.bindPopup("<b>" + S.verifZone + " " + p.id + ", " + S.clsNames[p.cls] + "</b><br>" + S.areaWord + ": " + p.area_km2 + " km2<br>" + S.uqMedMax + ": " + p.uq_med_max + " m3/s/km2<br>" + S.popWord + ": " + num(p.pop) + ", " + S.bldWord + ": " + num(p.n_bld) + ", " + S.facWord + ": " + p.n_crit + "<br>" + S.communesWord + ": " + fixName(p.communes)); });
  verifLayer.addTo(map);
}
function drawReports() {
  repLayer.clearLayers(); if (!showRep) { return; }
  window.REPORTS.filter(function (r) { return r.event === ev; }).forEach(function (r) {
    var m = L.circleMarker([r.lat, r.lon], { pane: "rep", radius: 6, color: "#111", weight: 2, fillColor: "#fff", fillOpacity: 0.9 });
    m.bindPopup("<b>" + fixName(r.name) + "</b><br>" + S.reportedImpact + ", " + r.start + " " + S.toWord + " " + r.end + "<br>" + S.scaleWord + ": " + r.scale + (r.infrastructure ? "<br>" + S.infraWord + ": " + r.infrastructure : "") + "<br><span class='src'>" + S.reportSource + "</span>");
    repLayer.addLayer(m);
  });
}

/* ---------- side panel ---------- */
function listZones() {
  var key = (view === "A" ? "A" : "B") + (bset === "steep" ? "_steep" : ""), fc = current ? current[key] : { features: [] };
  var rows = ["<thead><tr><th>#</th><th>" + S.tblLevel + "</th><th>" + S.tblArea + "</th><th>" + S.tblPop + "</th><th>" + S.tblCommunes + "</th></tr></thead><tbody>"];
  fc.features.slice(0, 40).forEach(function (f) {
    var p = f.properties, k = view === "A" ? p.cls : p.lvl;
    rows.push('<tr data-id="' + p.id + '" class="' + (selectedZone === p.id ? "sel" : "") + '"><td>' + p.id + '</td><td><i style="background:' + CLS[k] + '"></i>' + (view === "A" ? S.clsNames[k] : S.lvlNames[k]) + (p.conf === 1 ? " *" : "") + "</td><td>" + p.area_km2 + "</td><td>" + num(p.pop) + "</td><td title=\"" + fixName(p.communes) + "\">" + shortList(p.communes, 2) + "</td></tr>");
  });
  rows.push("</tbody>");
  var t = document.getElementById("zonetable"); t.innerHTML = rows.join("");
  [].forEach.call(t.querySelectorAll("tr[data-id]"), function (tr) {
    tr.addEventListener("click", function () {
      selectedZone = +tr.dataset.id; zoneLayer.setStyle(zoneStyle); listZones();
      zoneLayer.eachLayer(function (l) { if (l.feature.properties.id === selectedZone) { map.fitBounds(l.getBounds(), { padding: [20, 20] }); l.openPopup(); } });
    });
  });
  document.getElementById("zonecount").textContent = fc.features.length + " " + S.zonesWord + (fc.features.length > 40 ? " (" + S.first40 + ")" : "");
}
function side() {
  var c = cur(), s = c[bset];
  document.getElementById("cyctitle").textContent = S.cycleWord + " " + S.fixLabel(c.label) + " UTC";
  var rows = ["<thead><tr><th>" + S.tblIsland + "</th><th>" + S.tblQpe + "</th><th>" + S.tblFc + "</th><th>" + S.tblKm2 + "</th><th>" + S.tblMax + "</th><th>" + S.tblPopB + "</th></tr></thead><tbody>"];
  ISL.forEach(function (k) {
    var e = c.isl[k], b = e[bset], kk = view === "A" ? b.maxcls : b.maxlvl, noz = !(b.areaA > 0);
    rows.push("<tr><td>" + S.islandNames[k] + "</td><td>" + e.qpecum + " (" + e.qpe1h + ")</td><td>" + e.fc_p50 + " (" + e.fc_p05 + " " + S.toWord + " " + e.fc_p95 + ")</td><td>" + e.km2[String(S.bandEdges[bset][1])] + "</td><td><i style='background:" + CLS[kk] + "'></i>" + (noz ? S.noZone : (view === "A" ? S.clsNames[kk] : S.lvlNames[kk])) + "</td><td>" + num(b.popB) + "</td></tr>");
  });
  rows.push("</tbody>"); document.getElementById("isltable").innerHTML = rows.join("");
  var kv = document.getElementById("kv");
  var A = s.A, B = s.B;
  kv.innerHTML = "<dt>" + S.kvZonesA + "</dt><dd>" + [4, 3, 2, 1].map(function (k) { return S.clsNames[k] + " " + A[k]; }).join(", ") + "</dd>" +
    "<dt>" + S.kvZonesB + "</dt><dd>" + [4, 3, 2, 1].map(function (k) { return S.lvlNames[k] + " " + B[k]; }).join(", ") + "</dd>" +
    "<dt>" + S.kvPopB + "</dt><dd>" + num(s.popB[4]) + " / " + num(s.popB[3]) + " / " + num(s.popB[2]) + " / " + num(s.popB[1]) + "</dd>" +
    "<dt>" + S.kvKm2 + "</dt><dd>" + [4, 3, 2, 1].map(function (k) { return S.clsNames[k] + " " + s.km2_cls[k]; }).join(", ") + " km2</dd>" +
    "<dt>" + S.kvMaxP + "</dt><dd>" + Math.round(s.maxp * 100) + " %</dd>";
  legend();
}
function legend() {
  var lg = document.getElementById("legend"), h = "";
  if (view === "A") { h += "<div class='lgt'>" + S.legA + "</div>"; [1, 2, 3, 4].forEach(function (k) { h += "<span><i style='background:" + CLS[k] + "'></i>" + S.clsNames[k] + ", " + S.bandNames[bset][k] + "</span>"; }); }
  else { h += "<div class='lgt'>" + S.legB + "</div>"; [1, 2, 3, 4].forEach(function (k) { h += "<span><i style='background:" + CLS[k] + "'></i>" + S.lvlNames[k] + "</span>"; }); }
  h += "<span><i style='border:1.5px dashed #555;background:#fff'></i>" + S.legConfLow + "</span>";
  if (raster !== "none") {
    h += "<div class='lgt'>" + S.rasterNames[raster] + "</div>";
    if (raster === "cls" || raster === "clsS") { var bs = raster === "cls" ? "flash" : "steep"; [1, 2, 3, 4].forEach(function (k) { h += "<span><i style='background:" + CLS[k] + "'></i>" + S.bandNames[bs][k] + "</span>"; }); }
    else if (raster === "p1") { ["5", "20", "40", "60", "80"].forEach(function (e, i) { h += "<span><i style='background:" + PROB_RGB[i] + "'></i>" + e + " %+</span>"; }); }
    else if (raster === "qpe" || raster === "fc" || raster === "qpetot") { GRID.rain_edges.forEach(function (e, i) { h += "<span><i style='background:" + RAIN_RGB[i] + "'></i>" + e + "+ mm</span>"; }); }
    else { GRID.flash_edges.forEach(function (e, i) { h += "<span><i style='background:" + FLASH_RGB[i] + ";border:1px solid #999'></i>" + e + "+</span>"; }); h += "<span class='u'>m3/s/km2</span>"; }
  }
  h += "<span><i class='k-rep'></i>" + S.reportedImpact + "</span>";
  lg.innerHTML = h;
}

/* ---------- charts ---------- */
var chartIsland = "grande";
function chart() {
  var C = cycles(), n = C.length, Wd = 1000, Hd = 190, PL = 48, PR = 12, PT = 14, PB = 26, iw = Wd - PL - PR;
  var x = function (i) { return PL + iw * i / (n - 1); };
  var vals = C.map(function (c) { return c.isl[chartIsland]; });
  var maxR = Math.max(10, Math.ceil(Math.max.apply(null, vals.map(function (v) { return Math.max(v.fc_p95, v.qpecum); })) / 20) * 20);
  var y = function (v) { return PT + (Hd - PT - PB) * (1 - v / maxR); };
  var parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Wd + " " + Hd + '" preserveAspectRatio="none"><rect width="' + Wd + '" height="' + Hd + '" fill="#fff"/>'];
  [0, maxR / 2, maxR].forEach(function (v) { parts.push('<line x1="' + PL + '" y1="' + y(v) + '" x2="' + (Wd - PR) + '" y2="' + y(v) + '" stroke="#e6eaee"/><text x="' + (PL - 6) + '" y="' + (y(v) + 4) + '" font-size="10" fill="#65727f" text-anchor="end">' + v + "</text>"); });
  parts.push('<path d="' + vals.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v.fc_p95); }).join(" ") + vals.slice().reverse().map(function (v, j) { return "L" + x(n - 1 - j) + " " + y(v.fc_p05); }).join(" ") + 'Z" fill="#2b6ca3" fill-opacity="0.15" stroke="none"/>');
  parts.push('<path d="' + vals.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v.fc_p50); }).join(" ") + '" fill="none" stroke="#2b6ca3" stroke-width="2"/>');
  parts.push('<path d="' + vals.map(function (v, i) { return (i ? "L" : "M") + x(i) + " " + y(v.qpecum); }).join(" ") + '" fill="none" stroke="#111" stroke-width="1.6" stroke-dasharray="4 3"/>');
  var bw = iw / n * 0.8, maxQ = Math.max(1, Math.max.apply(null, vals.map(function (v) { return v.qpe1h; })));
  vals.forEach(function (v, i) { var hh = (Hd - PT - PB) * 0.45 * v.qpe1h / maxQ; parts.push('<rect x="' + (x(i) - bw / 2) + '" y="' + (Hd - PB - hh) + '" width="' + bw + '" height="' + hh + '" fill="#6baed6" fill-opacity="0.8"/>'); });
  C.forEach(function (c, i) { if (c.cycle.slice(9, 11) === "00") { parts.push('<line x1="' + x(i) + '" y1="' + PT + '" x2="' + x(i) + '" y2="' + (Hd - PB) + '" stroke="#cfd6dd"/><text x="' + (x(i) + 4) + '" y="' + (Hd - PB + 14) + '" font-size="10.5" fill="#65727f">' + S.dayLabel(c.cycle) + "</text>"); } });
  parts.push('<line id="cursor1" x1="' + x(ci) + '" y1="' + PT + '" x2="' + x(ci) + '" y2="' + (Hd - PB) + '" stroke="#111" stroke-width="2"/></svg>');
  var el = document.getElementById("chart1"); el.innerHTML = parts.join("");
  el.querySelector("svg").addEventListener("click", function (e) { var r = e.currentTarget.getBoundingClientRect(); var f = (e.clientX - r.left) / r.width * Wd; ci = Math.min(n - 1, Math.max(0, Math.round((f - PL) / iw * (n - 1)))); draw(); });
  /* chart 2: area at class 2 or worse (p90 above the second band) per island */
  var H2 = 150, y2max = Math.max(10, Math.ceil(Math.max.apply(null, C.map(function (c) { return Math.max.apply(null, ISL.map(function (k) { return c.isl[k].km2[String(S.bandEdges[bset][1])]; })); })) / 100) * 100);
  var y2 = function (v) { return PT + (H2 - PT - PB) * (1 - v / y2max); };
  var p2 = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + Wd + " " + H2 + '" preserveAspectRatio="none"><rect width="' + Wd + '" height="' + H2 + '" fill="#fff"/>'];
  [0, y2max / 2, y2max].forEach(function (v) { p2.push('<line x1="' + PL + '" y1="' + y2(v) + '" x2="' + (Wd - PR) + '" y2="' + y2(v) + '" stroke="#e6eaee"/><text x="' + (PL - 6) + '" y="' + (y2(v) + 4) + '" font-size="10" fill="#65727f" text-anchor="end">' + v + "</text>"); });
  var colors = { grande: "#1b4f72", anjouan: "#c0392b", moheli: "#1e8449" };
  ISL.forEach(function (k) { p2.push('<path d="' + C.map(function (c, i) { return (i ? "L" : "M") + x(i) + " " + y2(c.isl[k].km2[String(S.bandEdges[bset][1])]); }).join(" ") + '" fill="none" stroke="' + colors[k] + '" stroke-width="2"/>'); });
  C.forEach(function (c, i) { if (c.cycle.slice(9, 11) === "00") { p2.push('<line x1="' + x(i) + '" y1="' + PT + '" x2="' + x(i) + '" y2="' + (H2 - PB) + '" stroke="#cfd6dd"/><text x="' + (x(i) + 4) + '" y="' + (H2 - PB + 14) + '" font-size="10.5" fill="#65727f">' + S.dayLabel(c.cycle) + "</text>"); } });
  p2.push('<line id="cursor2" x1="' + x(ci) + '" y1="' + PT + '" x2="' + x(ci) + '" y2="' + (H2 - PB) + '" stroke="#111" stroke-width="2"/></svg>');
  var el2 = document.getElementById("chart2"); el2.innerHTML = p2.join("");
  el2.querySelector("svg").addEventListener("click", function (e) { var r = e.currentTarget.getBoundingClientRect(); var f = (e.clientX - r.left) / r.width * Wd; ci = Math.min(n - 1, Math.max(0, Math.round((f - PL) / iw * (n - 1)))); draw(); });
  document.getElementById("chart2cap").textContent = S.chart2cap(S.bandEdges[bset][1]);
}

/* ---------- controls ---------- */
var sel = document.getElementById("cycsel");
function fillSel() { sel.innerHTML = ""; cycles().forEach(function (c, i) { var o = document.createElement("option"); o.value = i; o.textContent = S.fixLabel(c.label) + (c.featured ? " *" : ""); sel.appendChild(o); }); }
sel.addEventListener("change", function () { ci = +sel.value; draw(); });
document.getElementById("prev").addEventListener("click", function () { ci = Math.max(0, ci - 1); draw(); });
document.getElementById("next").addEventListener("click", function () { ci = Math.min(cycles().length - 1, ci + 1); draw(); });
document.getElementById("play").addEventListener("click", function () {
  var b = document.getElementById("play");
  if (playing) { clearInterval(playing); playing = null; b.textContent = S.play; b.classList.remove("on"); return; }
  b.textContent = S.pause; b.classList.add("on"); playing = setInterval(function () { ci = (ci + 1) % cycles().length; draw(); }, 1000);
});
function seg(id, key, fn) { [].forEach.call(document.querySelectorAll("#" + id + " button"), function (b) { b.addEventListener("click", function () { fn(b.dataset[key]); }); }); }
seg("seg-event", "e", function (v) { if (v === ev) { return; } ev = v; ci = Math.min(ci, cycles().length - 1); selectedZone = null; current = null; fillSel(); chart(); draw(); });
seg("seg-view", "v", function (v) { view = v; selectedZone = null; draw(); });
seg("seg-set", "s", function (v) { bset = v; selectedZone = null; chart(); draw(); });
seg("seg-island", "i", function (v) { map.fitBounds(v === "all" ? NAT : ISL_BOUNDS[v]); chartIsland = v === "all" ? "grande" : v; chart(); });
seg("seg-base", "b", function (v) { if (v === curBase) { return; } map.removeLayer(bases[curBase]); curBase = v; bases[v].addTo(map); });
document.getElementById("rassel").addEventListener("change", function () { raster = this.value; draw(); });
[["t-zones", function () { showZones = !showZones; }], ["t-verif", function () { showVerif = !showVerif; }], ["t-rep", function () { showRep = !showRep; }], ["t-adm", function () { showAdm = !showAdm; }]].forEach(function (x) { document.getElementById(x[0]).addEventListener("click", function () { x[1](); draw(); }); });
document.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { ci = Math.max(0, ci - 1); draw(); } if (e.key === "ArrowRight") { ci = Math.min(cycles().length - 1, ci + 1); draw(); } });

function readHash() {
  var h = new URLSearchParams(location.hash.slice(1));
  if (h.get("e") && SER[h.get("e")]) { ev = h.get("e"); }
  if (h.get("c")) { cycles().forEach(function (c, i) { if (c.cycle === h.get("c")) { ci = i; } }); }
  if (h.get("v") === "B") { view = "B"; }
  if (h.get("s") === "steep") { bset = "steep"; }
  if (h.get("r") && RASTERS[h.get("r")]) { raster = h.get("r"); }
  if (h.get("verif") === "1") { showVerif = true; }
  if (["voyager", "positron", "sat"].indexOf(h.get("b")) >= 0) { curBase = h.get("b"); }
}
function writeHash() { var h = new URLSearchParams(); h.set("e", ev); h.set("c", cur().cycle); h.set("v", view); if (bset === "steep") { h.set("s", "steep"); } h.set("r", raster); if (showVerif) { h.set("verif", "1"); } if (curBase !== "positron") { h.set("b", curBase); } history.replaceState(null, "", "#" + h.toString()); }

function draw() {
  sel.value = ci;
  [["seg-event", "e", ev], ["seg-view", "v", view], ["seg-set", "s", bset], ["seg-base", "b", curBase]].forEach(function (x) { [].forEach.call(document.querySelectorAll("#" + x[0] + " button"), function (b) { b.classList.toggle("on", b.dataset[x[1]] === x[2]); }); });
  [["t-zones", showZones], ["t-verif", showVerif], ["t-rep", showRep], ["t-adm", showAdm]].forEach(function (x) { document.getElementById(x[0]).classList.toggle("on", x[1]); });
  document.getElementById("rassel").value = raster;
  [].forEach.call(document.querySelectorAll("#rassel option"), function (o) { var r = RASTERS[o.value]; o.disabled = !!(r && r.per === "feat" && !cur().featured); });
  document.getElementById("featnote").style.display = cur().featured ? "block" : "none";
  admLayer.setStyle(function () { return { color: "#1b2733", weight: 1, dashArray: "4 4", fill: false, opacity: showAdm ? 0.8 : 0 }; });
  drawRaster(); drawVerif(); drawReports(); side(); loadZones();
  var c1 = document.getElementById("cursor1"), c2 = document.getElementById("cursor2");
  var n = cycles().length, xx = 48 + (1000 - 48 - 12) * ci / (n - 1);
  if (c1) { c1.setAttribute("x1", xx); c1.setAttribute("x2", xx); } if (c2) { c2.setAttribute("x1", xx); c2.setAttribute("x2", xx); }
  writeHash();
}
readHash(); bases[curBase].addTo(map); fillSel(); chart(); draw();
