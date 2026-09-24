// Secret one. Press and hold the open fantasy flower: a ring sweeps clockwise,
// motes spiral in, the petals stretch. Let go at full charge and it flares,
// then 64 motes fly out into a heart that beats at 72 bpm, and drift away.
import { HEART, HEART_CURVE, INPUT, PALETTE, SIZE } from './config.js';
import { TAU, lerp, clamp01, smooth, smoothstep, easeInOutCubic, easeOutCubic, easeInQuad, heartXY, rgba, mix, mod, makeRng } from './util.js';
import { glow, drawGlow } from './sprites.js';

// Timeline from release, derived from the brief's durations.
const T_FLY = HEART.flarePeak;
const T_HOLD = T_FLY + HEART.stagger + HEART.fly;
const T_FADE = T_HOLD + HEART.hold;
const T_END = T_FADE + HEART.fade;
export const NOVA_LENGTH = T_END;

export function makeHeart() {
  return { phase: 'idle', active: false, charge: 0, full: false, stretch: 0, flare: 0, beat: 0, moteHide: 0, pressT: 0, releaseT: 0, shape: null, motes: [] };
}

// 64 points spaced evenly along the heart outline, in curve units.
function outline(n) {
  const S = HEART.samples;
  const pts = [];
  let total = 0;
  let prev = heartXY(0);
  const acc = [0];
  for (let i = 1; i <= S; i++) {
    const p = heartXY((i / S) * TAU);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    acc.push(total);
    prev = p;
  }
  let j = 0;
  for (let k = 0; k < n; k++) {
    const want = (k / n) * total;
    while (acc[j + 1] < want) j++;
    const f = (want - acc[j]) / (acc[j + 1] - acc[j] || 1);
    const a = heartXY((j / S) * TAU), b = heartXY(((j + 1) / S) * TAU);
    pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
  }
  return pts;
}

let unit = null;

export function layoutHeart(app) {
  const h = app.heart;
  const L = app.L;
  if (!unit) unit = outline(HEART.motes);
  const s = (HEART.widthU * L.U) / HEART_CURVE.width;
  const notch = heartXY(0);
  const ox = L.fantasy.x;
  const oy = L.fantasy.headY - HEART.notchU * L.U - notch[1] * s;
  let y0 = Infinity, y1 = -Infinity;
  for (const [, y] of unit) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  h.shape = { s, ox, oy, pts: unit, cy: oy + ((y0 + y1) / 2) * s };
}

export function heartPhase(app) {
  const h = app.heart;
  if (h.phase !== 'nova') return h.phase === 'charging' ? 'charging' : 'idle';
  const r = app.clock.T - h.releaseT;
  if (r < T_FLY) return 'flare';
  if (r < T_HOLD) return 'flyout';
  if (r < T_FADE) return 'hold';
  return 'fade';
}

// Pressing the fantasy flower. Charging begins after the delay if still held.
export function pressHeart(app) {
  const h = app.heart;
  h.phase = 'press';
  h.pressT = app.clock.T;
  h.full = false;
  h.charge = 0;
}

export function cancelHeart(app) {
  const h = app.heart;
  h.phase = 'relax';
  h.full = false;
  h.charge = 0;
  if (app.state === 'CHARGING') app.state = 'LIVE';
}

export function startNova(app, at) {
  const h = app.heart;
  const rng = makeRng((app.seed ^ Math.floor(app.clock.T * 1000)) >>> 0);
  h.phase = 'nova';
  h.releaseT = app.clock.T - (at || 0);
  h.charge = 1;
  h.full = true;
  h.motes = unit.map((_, i) => ({
    d: rng.range(0, HEART.stagger),
    side: i % 2 ? 1 : -1,
    bend: rng.range(HEART.curveMin, 1),
    color: PALETTE.hearts[i % PALETTE.hearts.length],
    drift: rng.range(-1, 1),
  }));
  app.state = 'NOVA';
}

export function updateHeart(app, dt) {
  const h = app.heart;
  const T = app.clock.T;
  if (h.phase === 'press' || h.phase === 'charging') {
    const held = T - h.pressT;
    if (h.phase === 'press' && held >= INPUT.chargeDelay) {
      h.phase = 'charging';
      app.state = 'CHARGING';
    }
    if (h.phase === 'charging') {
      h.charge = clamp01((held - INPUT.chargeDelay) / (INPUT.chargeFull - INPUT.chargeDelay));
      h.full = h.charge >= 1;
      h.stretch = HEART.stretch * easeOutCubic(h.charge);
    }
    h.flare = 0;
  } else if (h.phase === 'nova') {
    const r = T - h.releaseT;
    h.stretch = HEART.stretch * (1 - smooth(r / T_FLY));
    h.flare = r < T_FLY ? smooth(r / T_FLY) : 1 - smooth((r - T_FLY) / HEART.flareRelax);
    // the orbiting motes step aside while the heart's own motes are out
    h.moteHide = r < T_FADE ? smooth(r / T_FLY) : 1 - smooth((r - T_FADE) / HEART.fade);
    h.beat = 0;
    if (r >= T_HOLD && r < T_FADE) {
      const period = 60 / HEART.bpm;
      const ph = mod(r - T_HOLD, period);
      const env = (x) => (x < 0 ? 0 : x < HEART.beatAttack ? x / HEART.beatAttack : Math.exp(-(x - HEART.beatAttack) / HEART.beatDecay));
      h.beat = HEART.lub * env(ph) + HEART.dub * env(ph - HEART.dubAt);
    }
    if (r >= T_END) {
      h.phase = 'idle';
      h.flare = 0;
      h.stretch = 0;
      h.moteHide = 0;
      if (app.state === 'NOVA') app.state = 'LIVE';
    }
  } else {
    h.stretch *= Math.exp(-dt / HEART.relaxS);
    if (h.stretch < 1e-4) h.stretch = 0;
    h.flare = 0;
    if (h.phase === 'relax' && h.stretch === 0) h.phase = 'idle';
  }
  h.active = h.phase === 'charging' || h.phase === 'nova';
}

function drawCharge(ctx, app) {
  const h = app.heart;
  const f = app.fantasy;
  const U = app.L.U;
  const c = h.charge;
  if (c <= 0) return;
  const R = HEART.ringRU * U;
  const end = -Math.PI / 2 + TAU * c;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(HEART.ringColor, HEART.ringAlpha * Math.sqrt(c));
  ctx.lineWidth = HEART.ringWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(f.hx, f.hy, R, -Math.PI / 2, end);
  ctx.stroke();
  const dot = glow(HEART.ringColor);
  drawGlow(ctx, dot, f.hx + Math.cos(end) * R, f.hy + Math.sin(end) * R, HEART.dotU * U, HEART.dotAlpha);
  const n = HEART.chargeMotes;
  const inner = HEART.chargeInner * U;
  const outer = HEART.chargeMoteRU * U;
  for (let j = 0; j < n; j++) {
    const a = (j / n) * TAU + c * TAU * HEART.spin;
    const rr = lerp(outer, inner, easeInOutCubic(c));
    const mote = glow(PALETTE.hearts[j % PALETTE.hearts.length]);
    drawGlow(ctx, mote, f.hx + Math.cos(a) * rr, f.hy + Math.sin(a) * rr, HEART.moteRU * U, HEART.moteAlpha * smooth(c * 2));
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawNova(ctx, app) {
  const h = app.heart;
  const f = app.fantasy;
  const sh = h.shape;
  if (!sh) return;
  const U = app.L.U;
  const r = app.clock.T - h.releaseT;
  if (r < T_FLY) return;
  const scale = 1 + h.beat;
  const fade = r > T_FADE ? clamp01((r - T_FADE) / HEART.fade) : 0;
  const cx = f.hx, cy = f.hy;
  const pos = [];
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < h.motes.length; i++) {
    const m = h.motes[i];
    const local = r - T_FLY - m.d;
    if (local < 0) { pos.push(null); continue; }
    const p = clamp01(local / HEART.fly);
    const e = easeInOutCubic(p);
    const [ux, uy] = sh.pts[i];
    const tx = sh.ox + ux * sh.s * scale;
    const ty = sh.cy + (sh.oy + uy * sh.s - sh.cy) * scale;
    const mx = (cx + tx) / 2, my = (cy + ty) / 2;
    const len = Math.hypot(tx - cx, ty - cy) || 1;
    const k = HEART.curveU * U * m.bend * m.side;
    const qx = mx - ((ty - cy) / len) * k, qy = my + ((tx - cx) / len) * k;
    const u = 1 - e;
    let x = u * u * cx + 2 * u * e * qx + e * e * tx;
    let y = u * u * cy + 2 * u * e * qy + e * e * ty;
    let a = HEART.moteAlpha * lerp(smoothstep(HEART.showR[0] * U, HEART.showR[1] * U, Math.hypot(x - cx, y - cy)), 1, smooth(p));
    if (fade > 0) {
      y += HEART.fallU * U * easeInQuad(fade);
      x += HEART.driftU * U * m.drift * fade;
      a *= 1 - fade;
    }
    pos.push(p >= 1 ? [x, y, a] : null);
    drawGlow(ctx, glow(m.color), x, y, HEART.moteRU * U * (1 + (h.beat / HEART.lub) * HEART.beatGlow), a);
  }
  // bright centers blend normally so a mote never adds up to white
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = mix(PALETTE.hearts[1], PALETTE.fantasyEdge, HEART.coreMix);
  ctx.beginPath();
  for (let i = 0; i < pos.length; i++) {
    const q = pos[i];
    if (!q || q[2] <= 0.01) continue;
    ctx.moveTo(q[0] + HEART.coreU * U, q[1]);
    ctx.arc(q[0], q[1], HEART.coreU * U, 0, TAU);
  }
  ctx.globalAlpha = HEART.coreAlpha * (1 - fade);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = rgba(PALETTE.hearts[1], HEART.lineAlpha * (1 - fade));
  ctx.lineWidth = HEART.lineWidthPx;
  ctx.beginPath();
  for (let i = 0; i < pos.length; i++) {
    const a = pos[i], b = pos[(i + 1) % pos.length];
    if (!a || !b) continue;
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
}

export function drawHeartSecret(ctx, app) {
  const h = app.heart;
  if (h.phase === 'charging') drawCharge(ctx, app);
  else if (h.phase === 'nova') drawNova(ctx, app);
}

// Heart outline extents at the lub, for the clipping check.
export function heartBox(app) {
  const sh = app.heart.shape;
  if (!sh) return null;
  const k = 1 + HEART.lub;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [ux, uy] of sh.pts) {
    const x = sh.ox + ux * sh.s * k;
    const y = sh.cy + (sh.oy + uy * sh.s - sh.cy) * k;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const pad = HEART.moteRU * app.L.U;
  return { kind: 'heart', idx: 0, x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}
