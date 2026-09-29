// Globe stage, adapted from the prior project Falak (فَلَك) — see README "Globe decision" and /about.
// Scene frame = ecliptic (inertial) frame, +Y = ecliptic north. The Sun sits at its real position for now;
// the star sphere is sky-aligned at load and then rides with the camera (static backdrop).
// The Earth sits in a 23.44° tilt group and turns at its real rate (GMST), so the terminator is true for this moment.
// Changes for the atlas: the twelve atlas countries are lit (full land wash + copper outline) and labelled first;
// every other country is dimmed and only labelled when zoomed in or hovered. No live clouds, no external requests.
// Every color is read from CSS custom properties, never hard-coded.
import * as THREE from "three";
import { geoArea, geoBounds, geoCentroid, geoContains, geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import type { Feature, Geometry } from "geojson";

export type GlobeCountry = { iso3: string; nameAr: string; nameEn: string; unStatus?: string; atlasId?: string; atlasName?: string };
export type GlobeCallbacks = {
  onSelect?: (key: string | null) => void;
  onHover?: (key: string | null) => void;
  onSun?: (sun: { lat: number; lon: number; utc: Date }) => void;
};
export type GlobeOptions = { lang: "ar" | "en"; reduced: boolean; intro: boolean; atlas: Set<string>; texture: number; touchPan: boolean };
export type GlobeApi = {
  setSelected(k: string | null): void;
  setOffset(x: number, y: number): void;
  setLang(l: "ar" | "en"): void;
  focus(k: string): void;
  peek(k: string | null): void;
  reset(): void;
  dispose(): void;
};

type Item = {
  key: string; f: Feature<Geometry>; c: GlobeCountry; atlas: boolean;
  b: [[number, number], [number, number]]; area: number; anchor: [number, number];
  anchorLocal?: THREE.Vector3; sqrtA?: number; labelEl?: HTMLDivElement; pri?: HTMLElement;
  shown?: boolean; size?: { w: number; h: number } | null; vis?: boolean; px?: number; py?: number; op?: number;
};

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const OBLIQUITY = 23.44;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const wrap180 = (a: number) => ((a % 360) + 540) % 360 - 180;
const SPIN_DEG_PER_S = 360 / 105; // camera orbit, one turn ≈ 105 s; surface appears to move west → east
const RESUME_MS = 1200;
const SIDEREAL_DEG_PER_DAY = 360.98564736629;
const OTHERS_ALPHA = 0.4; // land wash for countries outside the atlas
const ZOOMED_R = 520; // globe radius (px) above which non-atlas labels may appear

// ---- astronomy (low precision, ±0.01°: ample for a terminator) ----
const julian = (ms: number) => ms / 86400000 + 2440587.5;
const gmstDeg = (ms: number) => ((280.46061837 + SIDEREAL_DEG_PER_DAY * (julian(ms) - 2451545.0)) % 360 + 360) % 360;
function sunEclipticLon(ms: number) {
  const n = julian(ms) - 2451545.0;
  const L = 280.46 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * D2R;
  return ((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360 + 360) % 360;
}

function tokenRGB(name: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = `var(--${name})`;
  document.body.appendChild(probe);
  const col = getComputedStyle(probe).color;
  probe.remove();
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const x = c.getContext("2d")!;
  x.fillStyle = col; x.fillRect(0, 0, 1, 1);
  const d = x.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

export async function createGlobe(el: HTMLElement, countries: GlobeCountry[], cb: GlobeCallbacks, opts: GlobeOptions): Promise<GlobeApi> {
  const [topo, starData] = await Promise.all([
    fetch("/globe/countries-110m.json").then((r) => r.json()),
    fetch("/globe/stars.json").then((r) => r.json()).catch(() => ({ stars: [] })),
  ]);
  const feats = (feature(topo, topo.objects.countries) as unknown as { features: Feature<Geometry>[] }).features;
  const byId: Record<string, GlobeCountry> = {}, byName: Record<string, GlobeCountry> = {}, byKey: Record<string, Item> = {};
  countries.forEach((c) => { if (c.atlasId) byId[c.atlasId] = c; if (c.atlasName) byName[c.atlasName] = c; });
  const items: Item[] = [];
  feats.forEach((f) => {
    const c = f.id !== undefined ? byId[String(f.id)] : byName[(f.properties as { name?: string })?.name ?? ""];
    if (!c) return;
    // label anchor: centroid of the largest polygon (keeps France on the mainland, USA off Alaska)
    const g = f.geometry; let main: Feature<Geometry> | Geometry = f;
    if (g.type === "MultiPolygon") {
      let best = -1;
      g.coordinates.forEach((poly: number[][][]) => { const pf = { type: "Polygon" as const, coordinates: poly }; const a = geoArea(pf); if (a > best) { best = a; main = pf; } });
    }
    const it: Item = { key: c.iso3, f, c, atlas: opts.atlas.has(c.iso3), b: geoBounds(f), area: geoArea(f), anchor: geoCentroid(main) };
    items.push(it); byKey[it.key] = it;
  });
  const land = merge(topo, topo.objects.countries.geometries);
  const coast = mesh(topo, topo.objects.countries, (a, b) => a === b);
  const inner = mesh(topo, topo.objects.countries, (a, b) => a !== b);
  const grat = geoGraticule10();

  const RGB: Record<string, [number, number, number]> = {};
  ["ocean", "ocean-lit", "land-wash", "limestone", "copper", "copper-glow", "verdigris", "rim-copper"].forEach((k) => { RGB[k] = tokenRGB(k); });
  const css = (k: string) => `rgb(${RGB[k].join(",")})`;
  const col3 = (k: string) => new THREE.Color().setRGB(RGB[k][0] / 255, RGB[k][1] / 255, RGB[k][2] / 255, THREE.SRGBColorSpace);

  // ---------- textures ----------
  const W = opts.texture, H = opts.texture / 2;
  const mk = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const tex = mk(), ovl = mk();
  const tctx = tex.getContext("2d")!, octx = ovl.getContext("2d")!;
  const proj = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]).precision(0.1);
  const pathB = geoPath(proj, tctx), pathO = geoPath(proj, octx);
  const k = W / 4096; // line widths were tuned at 4096 px

  const spec = mk(W / 2, H / 2), sctx = spec.getContext("2d")!;
  const projS = geoEquirectangular().scale(W / 2 / (2 * Math.PI)).translate([W / 4, H / 4]).precision(0.2);
  sctx.fillStyle = css("limestone"); sctx.fillRect(0, 0, W / 2, H / 2);
  sctx.fillStyle = css("ocean"); sctx.beginPath(); geoPath(projS, sctx)(land); sctx.fill();

  let selected: string | null = null, hover: string | null = null, selT0 = -1;
  function drawBase() {
    const x = tctx;
    x.globalAlpha = 1; x.setLineDash([]); x.fillStyle = css("ocean-lit"); x.fillRect(0, 0, W, H);
    x.fillStyle = css("land-wash");
    items.forEach((it) => { x.globalAlpha = it.atlas ? 1 : OTHERS_ALPHA; x.beginPath(); pathB(it.f); x.fill(); });
    x.globalAlpha = 0.1; x.strokeStyle = css("limestone"); x.lineWidth = 1.2 * k; x.beginPath(); pathB(grat); x.stroke();
    x.globalAlpha = 0.42; x.lineWidth = 1.6 * k; x.beginPath(); pathB(coast); x.stroke();
    x.globalAlpha = 0.24; x.lineWidth = 1.2 * k; x.beginPath(); pathB(inner); x.stroke();
    x.globalAlpha = 0.8; x.lineWidth = 2 * k; x.setLineDash([9 * k, 7 * k]);
    items.forEach((it) => { if (it.c.unStatus === "disputed") { x.beginPath(); pathB(it.f); x.stroke(); } });
    x.setLineDash([]); x.globalAlpha = 1;
    earthTex.needsUpdate = true; dirty = true;
  }
  // Overlay (above the earth): atlas outlines, selection wash + copper edge, hover edge.
  function drawOverlay(now: number) {
    const x = octx; x.clearRect(0, 0, W, H); x.setLineDash([]);
    x.fillStyle = css("copper-glow"); x.strokeStyle = css("copper-glow"); x.lineWidth = 2.4 * k;
    items.forEach((it) => { if (it.atlas && it.key !== selected) { x.beginPath(); pathO(it.f); x.globalAlpha = 0.16; x.fill(); x.globalAlpha = 0.85; x.stroke(); } });
    if (selected && byKey[selected]) {
      const sk = selT0 < 0 ? 1 : clamp((now - selT0) / 180, 0, 1); if (sk >= 1) selT0 = -1;
      const f = byKey[selected].f;
      x.fillStyle = css("verdigris"); x.globalAlpha = 0.6 * easeOut(sk); x.beginPath(); pathO(f); x.fill();
      x.globalAlpha = 1; x.strokeStyle = css("copper"); x.lineWidth = 3.2 * k; x.beginPath(); pathO(f); x.stroke();
    }
    if (hover && hover !== selected && byKey[hover]) {
      const f = byKey[hover].f, a = byKey[hover].atlas;
      x.globalAlpha = a ? 0.14 : 0.08; x.fillStyle = css("limestone"); x.beginPath(); pathO(f); x.fill();
      x.globalAlpha = a ? 0.95 : 0.5; x.strokeStyle = css(a ? "copper-glow" : "limestone"); x.lineWidth = 2 * k; x.beginPath(); pathO(f); x.stroke();
    }
    x.globalAlpha = 1; ovlTex.needsUpdate = true; dirty = true;
  }

  // ---------- renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  const dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  const intro = opts.intro && !opts.reduced;
  canvas.style.cssText = `position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:${opts.touchPan ? "pan-y" : "none"};cursor:grab;outline:none;transform-origin:50% 50%;` + (intro ? "opacity:0;transform:scale(0.92)" : "");
  canvas.setAttribute("aria-hidden", "true");
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 300);

  // Stars: Yale BSC (mag ≤ 5.0). RA/Dec → equatorial, then tilted into the ecliptic frame.
  const starGroup = new THREE.Group(); starGroup.rotation.x = -OBLIQUITY * D2R; scene.add(starGroup);
  {
    const list: [number, number, number][] = starData.stars || [], n = list.length;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
    list.forEach(([ra, dec, mag], i) => {
      const a = ra * D2R, d = dec * D2R, R = 150;
      pos[i * 3] = R * Math.cos(d) * Math.cos(a); pos[i * 3 + 1] = R * Math.sin(d); pos[i * 3 + 2] = -R * Math.cos(d) * Math.sin(a);
      size[i] = clamp(3.1 - 0.42 * mag, 1.0, 3.4) * dpr;
      alpha[i] = clamp(0.95 - 0.13 * mag, 0.22, 0.95);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: col3("limestone") } },
      vertexShader: "attribute float aSize; attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_PointSize = aSize; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, r) * vA; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }",
      transparent: true, depthWrite: false,
    });
    starGroup.add(new THREE.Points(g, m));
  }

  const tiltGroup = new THREE.Group(); tiltGroup.rotation.x = -OBLIQUITY * D2R; scene.add(tiltGroup);
  const spinGroup = new THREE.Group(); tiltGroup.add(spinGroup);

  const earthTex = new THREE.CanvasTexture(tex); earthTex.colorSpace = THREE.SRGBColorSpace; earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const specTex = new THREE.CanvasTexture(spec);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96),
    new THREE.MeshPhongMaterial({ map: earthTex, specularMap: specTex, specular: col3("copper-glow").multiplyScalar(0.3), shininess: 18 }));
  spinGroup.add(earth);

  const ovlTex = new THREE.CanvasTexture(ovl); ovlTex.colorSpace = THREE.SRGBColorSpace; ovlTex.anisotropy = earthTex.anisotropy;
  // Unlit, unlike Falak's Lambert overlay: the twelve atlas countries glow in copper on the night side as well.
  const overlay = new THREE.Mesh(new THREE.SphereGeometry(1.004, 128, 96), new THREE.MeshBasicMaterial({ map: ovlTex, transparent: true, depthWrite: false }));
  overlay.renderOrder = 2; spinGroup.add(overlay);

  const rim = new THREE.Mesh(new THREE.SphereGeometry(1.028, 96, 64), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: col3("rim-copper") }, uOpacity: { value: 0.5 } },
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV; void main(){ float d = max(dot(normalize(vN), normalize(vV)), 0.0); float a = pow(1.0-d, 3.0) * smoothstep(0.0, 0.22, d) * uOpacity; gl_FragColor = vec4(uColor, a); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  rim.renderOrder = 3; tiltGroup.add(rim);

  // Earth axis: hairline, only the stubs beyond the poles show (depth-tested).
  const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1.32, 0), new THREE.Vector3(0, 1.32, 0)]),
    new THREE.LineBasicMaterial({ color: col3("limestone"), transparent: true, opacity: 0.08 }));
  tiltGroup.add(axis);

  // One Sun at its real position for current UTC; low ambient keeps the night side readable.
  scene.add(new THREE.AmbientLight(0xffffff, 0.24));
  const sun = new THREE.DirectionalLight(0xffffff, 3.5); scene.add(sun);
  function updateSun() {
    const now = Date.now(), lam = sunEclipticLon(now) * D2R, eps = OBLIQUITY * D2R;
    sun.position.set(Math.cos(lam) * 10, 0, -Math.sin(lam) * 10);
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) * R2D;
    const ra = ((Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) * R2D) + 360) % 360;
    cb.onSun?.({ lat: dec, lon: wrap180(ra - gmstDeg(now)), utc: new Date(now) });
    dirty = true;
  }

  // ---------- view state ----------
  let w = 1, h = 1, dist = 4, d0 = 4, vx = 0, vy = 0, dirty = true, sized = false;
  const reduced = opts.reduced;
  let ox = 0, oy = 0, oxT = 0, oyT = 0, raf = 0, lastT = 0;
  let tween: { t0: number; d: number; o0: number; e0: number; z0: number; dO: number; dE: number; dZ: number } | null = null;
  let spinK = 1, lastInteract = -1e9;
  // The camera orbits the Earth's axis: camRA = right ascension it looks from, camLat = declination.
  let camRA = gmstDeg(Date.now()) + 45, camLat = 22; const homeLat = 22;
  const tanH = Math.tan((FOV / 2) * D2R);
  function resize() {
    const r = el.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const m = Math.min(w, h); d0 = h / (0.76 * m * tanH); if (!sized) { dist = d0; sized = true; }
    dist = clamp(dist, 1.35, d0 * 1.7); dirty = true;
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  const radiusPx = () => (h / 2) / (Math.sqrt(Math.max(dist * dist - 1, 0.01)) * tanH);
  function apply() {
    spinGroup.rotation.y = gmstDeg(Date.now()) * D2R;
    const f = camRA * D2R, b = camLat * D2R, eps = OBLIQUITY * D2R;
    const px = Math.cos(b) * Math.cos(f), py = Math.sin(b), pz = -Math.cos(b) * Math.sin(f);
    camera.position.set(dist * px, dist * (py * Math.cos(eps) + pz * Math.sin(eps)), dist * (-py * Math.sin(eps) + pz * Math.cos(eps)));
    camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
    camera.setViewOffset(w, h, ox, oy, w, h);
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld();
  }
  const touch = () => { lastInteract = performance.now(); spinK = 0; };
  function startTween(toRA: number, toLat: number, toDist: number, ms: number) {
    vx = vy = 0;
    const dRA = wrap180(toRA - camRA);
    if (reduced) { camRA += dRA; camLat = toLat; dist = toDist; tween = null; dirty = true; return; }
    tween = { t0: performance.now(), d: ms, o0: camRA, e0: camLat, z0: dist, dO: dRA, dE: toLat - camLat, dZ: toDist - dist };
  }

  // ---------- labels (DOM, screen space, above everything) ----------
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
  const SVG = "http://www.w3.org/2000/svg";
  const leaderSvg = document.createElementNS(SVG, "svg");
  leaderSvg.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;overflow:visible");
  const leaderLine = document.createElementNS(SVG, "line");
  leaderLine.setAttribute("stroke", "var(--copper-glow)"); leaderLine.setAttribute("stroke-width", "1"); leaderLine.style.display = "none";
  const dot = document.createElementNS(SVG, "circle");
  dot.setAttribute("r", "2.5"); dot.setAttribute("fill", "var(--copper-glow)"); dot.style.display = "none";
  leaderSvg.append(leaderLine, dot); layer.appendChild(leaderSvg);
  el.appendChild(layer);
  let lang = opts.lang;
  function buildLabel(it: Item) {
    const d = it.labelEl || document.createElement("div");
    d.textContent = "";
    d.style.cssText = "position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;white-space:nowrap;text-align:center;opacity:0;visibility:hidden;transition:opacity 200ms ease-out;text-shadow:0 0 2px var(--ink),0 0 6px var(--ink),0 0 10px var(--ink);font-family:var(--font);will-change:transform";
    const pri = document.createElement(lang === "en" ? "bdi" : "span");
    const priTxt = lang === "en" ? it.c.nameEn : it.c.nameAr;
    pri.textContent = priTxt || ""; if (lang === "en") pri.dir = "ltr";
    pri.style.cssText = it.atlas
      ? `font-size:${it.area > 0.1 ? 14.5 : 13}px;font-weight:600;line-height:1.25;color:var(--limestone)`
      : "font-size:11.5px;font-weight:400;line-height:1.25;color:var(--muted-night)";
    d.append(pri);
    if (it.atlas) {
      const secTxt = lang === "en" ? it.c.nameAr : it.c.nameEn;
      const sec = document.createElement(lang === "en" ? "span" : "bdi");
      sec.textContent = secTxt || ""; if (lang !== "en") sec.dir = "ltr";
      sec.style.cssText = "font-size:10.5px;font-weight:400;line-height:1.3;color:var(--copper-glow)";
      d.append(sec);
    }
    it.labelEl = d; it.pri = pri; it.shown = false; it.size = null;
    if (!d.parentNode) layer.appendChild(d);
  }
  items.forEach(buildLabel);
  const measure = (it: Item) => {
    if (!it.size) { it.labelEl!.style.visibility = "hidden"; it.size = { w: it.labelEl!.offsetWidth, h: it.labelEl!.offsetHeight }; }
    return it.size;
  };
  items.forEach((it) => {
    const [lon, lat] = it.anchor;
    it.anchorLocal = new THREE.Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R));
    it.sqrtA = Math.sqrt(it.area);
  });
  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function layoutLabels() {
    const R = radiusPx();
    camDir.copy(camera.position).normalize();
    const minExtent = Math.max(14, 0.1 * R - (R > 500 ? (R - 500) * 0.04 : 0));
    const SMALL_SR = 0.004;
    const cap = Math.round(clamp(30 * Math.pow(R / 350, 1.1), 30, 90));
    type Cand = { it: Item; sx: number; sy: number; s: { w: number; h: number }; forced: boolean; leader: boolean; pr: number; facing: number };
    const cands: Cand[] = [];
    for (const it of items) {
      tmp.copy(it.anchorLocal!).applyMatrix4(earth.matrixWorld);
      const facing = tmp.dot(camDir);
      const forced = it.key === selected || it.key === hover;
      if (facing < (forced ? 0.02 : 0.2)) { it.vis = false; continue; }
      tmp.project(camera);
      const sx = ((tmp.x + 1) / 2) * w, sy = ((1 - tmp.y) / 2) * h;
      const s = measure(it), extent = it.sqrtA! * R * facing;
      const fits = it.area >= SMALL_SR ? extent >= 0.22 * s.w : extent >= 0.45 * s.w;
      const bigEnough = it.atlas || (R > ZOOMED_R && (it.area >= SMALL_SR ? extent >= minExtent : extent >= minExtent && R > 700));
      if (!forced && !(bigEnough && (fits || it.atlas))) { it.vis = false; continue; }
      cands.push({ it, sx, sy, s, forced, leader: forced && !fits, pr: (forced ? 10 : 0) + (it.atlas ? 5 : 0) + it.area, facing });
    }
    cands.sort((a, b) => b.pr - a.pr);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    let count = 0; let leaderFor: Cand | null = null, dotFor: Cand | null = null;
    for (const c of cands) {
      const cx = c.sx, cy = c.leader ? c.sy - 30 - c.s.h / 2 : c.sy;
      const bx = { x0: cx - c.s.w / 2 - 4, x1: cx + c.s.w / 2 + 4, y0: cy - c.s.h / 2 - 2, y1: cy + c.s.h / 2 + 2 };
      if (!c.forced && (count >= cap || boxes.some((b) => bx.x0 < b.x1 && bx.x1 > b.x0 && bx.y0 < b.y1 && bx.y1 > b.y0))) { c.it.vis = false; continue; }
      boxes.push(bx); count++;
      c.it.vis = true; c.it.px = cx; c.it.py = cy; c.it.op = c.forced ? 1 : clamp((c.facing - 0.2) / 0.25, 0, 1);
      if (c.it.key === selected) { dotFor = c; if (c.leader) leaderFor = c; }
      else if (c.leader && !leaderFor) leaderFor = c;
    }
    for (const it of items) {
      const el2 = it.labelEl!;
      if (it.vis) {
        el2.style.transform = `translate(${(it.px! - it.size!.w / 2).toFixed(1)}px,${(it.py! - it.size!.h / 2).toFixed(1)}px)`;
        el2.style.visibility = "visible"; el2.style.opacity = String(it.op);
        if (it.atlas) it.pri!.style.fontWeight = it.key === selected ? "700" : "600";
        it.shown = true;
      } else if (it.shown) { el2.style.opacity = "0"; el2.style.visibility = "hidden"; it.shown = false; }
    }
    if (leaderFor) {
      leaderLine.style.display = "";
      leaderLine.setAttribute("x1", String(leaderFor.sx)); leaderLine.setAttribute("y1", String(leaderFor.sy));
      leaderLine.setAttribute("x2", String(leaderFor.sx)); leaderLine.setAttribute("y2", String(leaderFor.it.py! + leaderFor.s.h / 2));
    } else leaderLine.style.display = "none";
    if (dotFor) { dot.style.display = ""; dot.setAttribute("cx", String(dotFor.sx)); dot.setAttribute("cy", String(dotFor.sy)); } else dot.style.display = "none";
  }

  // ---------- loop ----------
  const pointers = new Map<number, [number, number]>();
  let dragging = false, downX = 0, downY = 0, downT = 0, lastX = 0, lastY = 0, moved = 0, pinch0 = 0, dist0 = 0;
  let hoverQueued: [number, number] | null = null;
  function tick(t: number) {
    raf = requestAnimationFrame(tick);
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    if (tween) {
      const kk = Math.min(1, (t - tween.t0) / tween.d), e = easeOut(kk);
      camRA = tween.o0 + tween.dO * e; camLat = tween.e0 + tween.dE * e; dist = tween.z0 + tween.dZ * e; dirty = true;
      if (kk >= 1) tween = null;
    } else if (!dragging && (Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002)) {
      camRA -= vx; camLat = clamp(camLat + vy, -60, 60); vx *= 0.93; vy *= 0.93; dirty = true; lastInteract = t;
    } else if (!reduced && !selected && !dragging && pointers.size === 0 && t - lastInteract > RESUME_MS) {
      spinK = Math.min(1, spinK + dt / 0.6);
      camRA -= SPIN_DEG_PER_S * dt * spinK; dirty = true;
    }
    if (Math.abs(ox - oxT) > 0.3 || Math.abs(oy - oyT) > 0.3) { const f = reduced ? 1 : 0.2; ox += (oxT - ox) * f; oy += (oyT - oy) * f; dirty = true; }
    else if (ox !== oxT || oy !== oyT) { ox = oxT; oy = oyT; dirty = true; }
    if (selT0 >= 0) drawOverlay(t);
    if (dirty) { apply(); renderer.render(scene, camera); layoutLabels(); dirty = false; }
  }

  // ---------- picking & input ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // Returns an ISO3 key, "" for ocean, or null when the pointer misses the Earth.
  function pick(cx: number, cy: number): string | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    apply(); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(earth)[0];
    if (!hit || !hit.uv) return null;
    const lon = hit.uv.x * 360 - 180, lat = hit.uv.y * 180 - 90, p: [number, number] = [lon, lat];
    for (const it of items) {
      const [[x0, y0], [x1, y1]] = it.b;
      if (lat < y0 - 0.5 || lat > y1 + 0.5) continue;
      if (x0 <= x1 ? lon < x0 - 0.5 || lon > x1 + 0.5 : lon < x0 - 0.5 && lon > x1 + 0.5) continue;
      if (geoContains(it.f, p)) return it.key;
    }
    return "";
  }
  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
    tween = null; vx = vy = 0; touch();
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = dist; moved = 99; return; }
    dragging = true; downX = lastX = e.clientX; downY = lastY = e.clientY; downT = performance.now(); moved = 0; canvas.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 2) {
      touch(); const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinch0) { dist = clamp((dist0 * pinch0) / d, 1.35, d0 * 1.7); dirty = true; } return;
    }
    if (dragging) {
      touch();
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
      const kk = 57.3 / radiusPx();
      camRA -= dx * kk; camLat = clamp(camLat + dy * kk, -60, 60); vx = dx * kk; vy = dy * kk; dirty = true; return;
    }
    if (e.pointerType === "mouse") {
      if (hoverQueued) { hoverQueued = [e.clientX, e.clientY]; return; }
      hoverQueued = [e.clientX, e.clientY];
      requestAnimationFrame((now) => {
        const [x, y] = hoverQueued!; hoverQueued = null;
        const key = pick(x, y) || null;
        canvas.style.cursor = key && byKey[key]?.atlas ? "pointer" : "grab";
        if (key !== hover) { hover = key; drawOverlay(now); cb.onHover?.(key); }
      });
    }
  };
  const onUp = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size > 0) return;
    pinch0 = 0; touch();
    if (!dragging) return;
    dragging = false; canvas.style.cursor = hover && byKey[hover]?.atlas ? "pointer" : "grab";
    if (reduced) vx = vy = 0;
    if (e.type === "pointerup" && moved < 5 && performance.now() - downT < 600) { vx = vy = 0; cb.onSelect?.(pick(e.clientX, e.clientY)); }
  };
  const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse" && hover && !dragging) { hover = null; drawOverlay(performance.now()); cb.onHover?.(null); } };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); touch(); tween = null; dist = clamp(dist * Math.exp(e.deltaY * 0.0012), 1.35, d0 * 1.7); dirty = true; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  // ---------- start ----------
  updateSun(); const sunTimer = setInterval(updateSun, 30000);
  drawBase(); drawOverlay(0); apply();
  // Star sphere: aligned to the real sky at load, then parented to the camera so the backdrop stays still on screen.
  scene.add(camera); camera.updateMatrixWorld(); camera.attach(starGroup);
  renderer.render(scene, camera); layoutLabels();
  raf = requestAnimationFrame(tick);
  if (intro) requestAnimationFrame(() => requestAnimationFrame(() => {
    canvas.style.transition = "opacity 700ms ease-out, transform 700ms ease-out"; canvas.style.opacity = "1"; canvas.style.transform = "none";
  }));

  function focus(key: string) {
    const it = byKey[key]; if (!it) return;
    const [lon, lat] = it.anchor;
    startTween(gmstDeg(Date.now()) + lon, clamp(lat, -60, 60), Math.min(dist, d0 * 0.8), 420);
  }

  return {
    setSelected(key) { if (key !== selected) { selected = key; selT0 = key && !reduced ? performance.now() : -1; drawOverlay(performance.now()); } },
    setOffset(x, y) { oxT = x; oyT = y; },
    setLang(l) { if (l === lang) return; lang = l; items.forEach(buildLabel); dirty = true; },
    focus,
    // Hovering a row in the country list: outline it and turn the Earth toward it, without selecting.
    peek(key) {
      if (key === hover) return;
      hover = key; drawOverlay(performance.now()); touch();
      if (key && !selected) focus(key);
    },
    reset() { startTween(camRA, homeLat, d0, 350); lastInteract = performance.now(); spinK = 0; },
    dispose() {
      cancelAnimationFrame(raf); clearInterval(sunTimer); ro.disconnect();
      renderer.dispose(); earthTex.dispose(); ovlTex.dispose(); specTex.dispose();
      canvas.remove(); layer.remove();
    },
  };
}
