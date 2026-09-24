// The glass flower: petals of stained glass in 3D around a burning core, each
// divided by lead into panes that glow brightest toward the core. Petals are
// sorted back to front, filled pane by pane and leaded; then the lead of the
// petals behind shows faintly through the glass in front.
import { GLASS } from './config-flora.js';
import { PALETTE } from './config.js';
import { TAU, lerp, smooth, mod } from './util.js';
import { spine, surfAt, normalAt, sampleIndex } from './petal3d.js';
import { view, css, mixc, rgbOf } from './light3d.js';

const tmp = new Float32Array(3);
const nrm = new Float32Array(3);
const LEAD = rgbOf(PALETTE.lead), DEEP = rgbOf(GLASS.deepColor), STREAK = rgbOf(PALETTE.fantasyEdge);

// Per petal randomness: where its leads cross, how its panes differ, its color phase.
export function glassModel(rng) {
  const petals = [];
  GLASS.rings.forEach((ring, k) => {
    for (let i = 0; i < ring.n; i++) {
      petals.push({
        ring: k, i,
        ph: rng.next() * GLASS.petalPhase + k * GLASS.ringPhase,
        cross: GLASS.cross.map(([c, rise]) => [c + rng.range(-1, 1) * GLASS.crossJitter, rise * rng.range(1 - GLASS.riseJitter, 1 + GLASS.riseJitter)]),
        lum: Array.from({ length: GLASS.cross.length * 2 + 2 }, () => rng.range(-1, 1) * GLASS.paneJitter),
      });
    }
  });
  return petals;
}

// Petal geometry for ring openings e[k] (0 is the closed bud, 1 fully open).
export function glassParts(model, e) {
  return model.map((m) => {
    const ring = GLASS.rings[m.ring];
    const o = smooth(Math.min(1, Math.max(0, e[m.ring])));
    return {
      kind: 'petal', m,
      az: ring.off + (m.i * TAU) / ring.n, r0: ring.ring, z0: ring.z,
      len: ring.len * lerp(GLASS.budLen, 1, o), wid: ring.wid * lerp(GLASS.budWid, 1, o),
      open: lerp(ring.open[0], ring.open[1], o), curl: ring.curl * o, curlPow: GLASS.curlPow,
      cup0: lerp(GLASS.budCup, ring.cup[0], o), cup1: lerp(GLASS.budCup, ring.cup[1], o), shape: GLASS.shape,
    };
  });
}

// A petal's color at a point in the palette cycle.
export function glassColor(m, phase) {
  const P = PALETTE.fantasy;
  const c = mod(phase + m.ph * P.length, P.length);
  const a = Math.floor(c);
  return mixc(rgbOf(P[a]), rgbOf(P[(a + 1) % P.length]), smooth(c - a));
}

function lineUV(g, p, sp, M, R, pts) {
  for (let k = 0; k < pts.length; k++) {
    surfAt(p, sp, pts[k][0], pts[k][1], tmp, 0);
    view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
    if (k === 0) g.moveTo(tmp[0] * R, -tmp[2] * R);
    else g.lineTo(tmp[0] * R, -tmp[2] * R);
  }
}

const span = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n);

// The lead boundaries across a petal: u of cross lead k at across-coordinate v.
function crossU(m, k, v) {
  if (k < 0) return 0;
  if (k >= m.cross.length) return 1;
  const [c, rise] = m.cross[k];
  return Math.min(GLASS.crossMax, c + rise * Math.abs(v));
}

function leads(g, p, sp, M, R) {
  const m = p.m;
  const nv = GLASS.leadSamples;
  // outline
  lineUV(g, p, sp, M, R, span(0, 1, nv).map((u) => [u, -1]).concat(span(1, 0, nv).map((u) => [u, 1]), [[0, -1]]));
  // midrib and cross leads
  lineUV(g, p, sp, M, R, span(GLASS.ribFrom, GLASS.ribTo, nv).map((u) => [u, 0]));
  for (let k = 0; k < m.cross.length; k++) lineUV(g, p, sp, M, R, span(-1, 1, nv * 2).map((v) => [crossU(m, k, v), v]));
}

function drawPetal(g, p, M, R, base, core, glow) {
  const m = p.m;
  const sp = spine(p);
  const nv = GLASS.paneSamples;
  const n = m.cross.length;
  // which face she sees: the inner one catches the core's light
  normalAt(p, sp, sampleIndex(GLASS.faceAt), GLASS.faceAt, 0, nrm);
  view(M, nrm[0], nrm[1], nrm[2], nrm, 0);
  const inner = nrm[1] > 0;
  const face = inner ? 1 : GLASS.outerFace;
  let pane = 0;
  for (const s of [-1, 1]) {
    for (let k = -1; k < n; k++) {
      const lo = (v) => crossU(m, k, v), hi = (v) => crossU(m, k + 1, v);
      const vs = span(0, s, nv);
      const outline = vs.map((v) => [lo(v), v])
        .concat(span(lo(s), hi(s), nv).slice(1).map((u) => [u, s]))
        .concat(vs.slice().reverse().map((v) => [hi(v), v]));
      const depth = (k + 1) / n;
      const lum = m.lum[pane++];
      const bright = Math.max(0, GLASS.glow[k + 1] * glow + lum);
      const cIn = mixc(base, core, Math.min(1, bright));
      const cOut = mixc(mixc(base, core, bright * GLASS.outerGlow), DEEP, GLASS.deep * depth);
      const k0 = [(lo(0) + lo(s)) / 2, s / 2], k1 = [(hi(0) + hi(s)) / 2, s / 2];
      surfAt(p, sp, k0[0], k0[1], tmp, 0); view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
      const x0 = tmp[0] * R, y0 = -tmp[2] * R;
      surfAt(p, sp, k1[0], k1[1], tmp, 0); view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
      const grad = g.createLinearGradient(x0, y0, tmp[0] * R, -tmp[2] * R);
      grad.addColorStop(0, css(cIn.map((c) => c * face)));
      grad.addColorStop(1, css(cOut.map((c) => c * face)));
      g.fillStyle = grad;
      g.beginPath();
      lineUV(g, p, sp, M, R, outline);
      g.closePath();
      g.fill();
    }
  }
  // light caught on the glass
  if (inner) {
    g.strokeStyle = css(STREAK, GLASS.streakAlpha);
    g.lineWidth = R * GLASS.streakW;
    g.beginPath();
    lineUV(g, p, sp, M, R, span(GLASS.streak[0], GLASS.streak[1], GLASS.leadSamples).map((u) => [u, GLASS.streakV]));
    g.stroke();
  }
  g.strokeStyle = css(LEAD, GLASS.leadAlpha);
  g.lineWidth = R * GLASS.leadW;
  g.beginPath();
  leads(g, p, sp, M, R);
  g.stroke();
}

// Render the glass head at radius R, receptacle on the origin. colorOf(m) gives each petal's glass color.
export function renderGlass(g, parts, M, R, colorOf, glow) {
  const items = parts.map((p) => {
    const sp = spine(p);
    surfAt(p, sp, GLASS.depthAt, 0, tmp, 0);
    view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
    return { p, depth: tmp[1] };
  }).sort((a, b) => a.depth - b.depth);
  const core = rgbOf(PALETTE.core[0]);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  for (const it of items) drawPetal(g, it.p, M, R, colorOf(it.p.m), core, glow);
  // the lead behind, faintly through the glass in front
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = css(LEAD, GLASS.ghostAlpha);
  g.lineWidth = R * GLASS.leadW * GLASS.ghostW;
  g.beginPath();
  for (const it of items) leads(g, it.p, spine(it.p), M, R);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
}

// Where the core sits in the posed head, in head radii from the stem tip.
export function corePoint(M) {
  view(M, 0, 0, GLASS.coreZ, tmp, 0);
  return [tmp[0], -tmp[2]];
}
