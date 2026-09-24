// The heart of the piece: a tall luminous flower with three rings of stained
// glass petals that drift through color, a burning core and orbiting motes.
// Petals are cached sprites per ring and color, crossfaded and transformed.
import { FANTASY, SIZE, BEATS, WAKE, MOTION, TUNE, SHAPE, PALETTE, INPUT, HEART } from './config.js';
import { TAU, makeRng, lerp, clamp01, win, smooth, easeInOutSine, mix, darker, rgba, mod } from './util.js';
import { LIGHT } from './config-garden.js';
import { makeCanvas, glow, drawGlow, place, resetTransform } from './sprites.js';
import { shapeStem, makeLeaves, drawLeaves, fillTapered, pointAt } from './stem.js';
import { breeze, gust } from './wind.js';
import { bloomEase } from './choreo.js';

const DEG = Math.PI / 180;
let sprites = null;

function petalSprite(ring, color) {
  const F = FANTASY;
  const [w, h] = F.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  const [a, b, cc, d] = ring.shape;
  const path = () => {
    g.beginPath();
    g.moveTo(m, h);
    g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, m, 0);
    g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
    g.closePath();
  };
  // Stained glass lit from the core: brightest at the base, deepening outward,
  // panes a shade apart, a soft light band inside the lead, dark lead over all.
  const G = F.glass;
  const edge = mix(PALETTE.fantasyEdge, color, F.edgeMix);
  const grad = g.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, mix(color, PALETTE.core[0], G.baseLight));
  grad.addColorStop(F.midAt, color);
  grad.addColorStop(1, mix(color, edge, G.tipMix));
  g.globalAlpha = F.alpha;
  g.fillStyle = grad;
  path();
  g.fill();
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = rgba(PALETTE.core[0], G.paneLight);
  g.fillRect(0, 0, m, h);
  g.fillStyle = rgba(darker(color, G.paneDark), G.paneShade);
  g.fillRect(m, 0, m, h);
  g.strokeStyle = rgba(edge, G.innerAlpha);
  g.lineWidth = G.innerW;
  path();
  g.stroke();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = rgba(PALETTE.lead, G.leadAlpha);
  g.lineCap = 'round';
  g.lineWidth = G.paneW;
  g.beginPath();
  g.moveTo(m, h);
  g.lineTo(m, h * G.spineTo);
  for (const [at, bow] of G.cross) {
    const y = h * at;
    g.moveTo(m - m * G.crossReach, y + h * bow);
    g.quadraticCurveTo(m, y - h * bow, m + m * G.crossReach, y + h * bow);
  }
  g.stroke();
  g.lineWidth = G.leadW;
  path();
  g.stroke();
  return c;
}

function coreSprite() {
  const px = FANTASY.corePx;
  const c = makeCanvas(px, px);
  const g = c.getContext('2d');
  const r = px / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  const [s0, s1, s2] = FANTASY.coreStops;
  grad.addColorStop(s0[0], rgba(PALETTE.core[0], s0[1]));
  grad.addColorStop(s1[0], rgba(PALETTE.core[1], s1[1]));
  grad.addColorStop(s2[0], rgba(PALETTE.core[1], s2[1]));
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  return c;
}

function ensureSprites() {
  if (sprites) return sprites;
  sprites = {
    rings: FANTASY.rings.map((ring) => PALETTE.fantasy.map((col) => petalSprite(ring, col))),
    halos: PALETTE.fantasy.map((col) => glow(col)),
    core: coreSprite(),
    coreGlow: glow(PALETTE.core[1]),
    mote: glow(FANTASY.moteColor),
  };
  return sprites;
}

export function createFantasy(app) {
  const rng = makeRng(app.seed ^ 0xfa27);
  const s = MOTION.sway;
  const F = FANTASY;
  const f = {
    kind: 'fantasy', idx: 0, size: 1, bend: rng.range(-1, 1) * F.stillness,
    tilt: 0, swayHz: rng.range(s.hz[0], s.hz[1]), swayAmp: rng.range(s.amp[0], s.amp[1]),
    phaseRand: rng.range(0, s.phaseRand), spring: { x: 0, v: 0, dir: 1 }, leanPx: 0,
    grow: 0, swell: 0, rings: F.rings.map(() => 0), halo: 0, core: 0, scale: 1, ang: 0,
    leaves: makeLeaves(rng, SHAPE.leaf.fantasy), petals: [], motes: [],
  };
  F.rings.forEach((ring, k) => {
    for (let i = 0; i < ring.n; i++) {
      const a = ring.off + (i * TAU) / ring.n;
      f.petals.push({ k, ang: Math.atan2(Math.sin(a), Math.cos(a)), ph: rng.next() * F.petalPhase + k * F.ringPhase });
    }
  });
  for (let i = 0; i < F.motes; i++) {
    f.motes.push({
      r: rng.range(F.moteRU[0], F.moteRU[1]), hz: rng.range(F.moteHz[0], F.moteHz[1]) * rng.sign(),
      ph: rng.range(0, TAU), size: rng.range(F.moteSizeU[0], F.moteSizeU[1]), tw: rng.range(0, TAU),
    });
  }
  return f;
}

export function placeFantasy(app) {
  const f = app.fantasy;
  const L = app.L;
  f.r = SIZE.fantasy.rU * L.U;
  f.baseY = L.groundY;
  f.h = f.baseY - L.fantasy.headY;
  f.x = L.fantasy.x - f.bend * f.h * SHAPE.stem.restLean;
  f.phase = f.x * MOTION.sway.phasePerPx + f.phaseRand;
  f.restX = L.fantasy.x;
  f.restY = L.fantasy.headY;
}

function ignite(t, from) {
  const g = BEATS.ignite;
  if (t < 0) return { halo: from, core: 0 };
  if (t < g.rise) return { halo: lerp(from, g.peak, smooth(t / g.rise)), core: smooth(t / g.rise) };
  return { halo: lerp(g.peak, g.settle, smooth((t - g.rise) / g.fall)), core: 1 };
}

export function fantasyTimes(app) {
  const f = app.fantasy;
  const s = app.s;
  const F = FANTASY;
  const bloom = bloomEase();
  const fo = BEATS.fantasyOpen;
  let lit;
  if (app.show.mode === 'wake') {
    const [a, b] = WAKE.fantasy;
    const k = (b - a) / fo.dur;
    f.grow = 1;
    f.swell = 1;
    f.rings = fo.ringDelays.map((d) => lerp(WAKE.startOpen, 1, bloom(win(s, a + d * k, F.ringDur * k))));
    lit = ignite(s - WAKE.ignite, WAKE.fantasyDim * BEATS.ignite.settle);
  } else {
    f.grow = easeInOutSine(win(s, BEATS.fantasyStem[0], BEATS.fantasyStem[1]));
    f.swell = smooth(win(s, BEATS.budSwell[0], BEATS.budSwell[1]));
    f.rings = fo.ringDelays.map((d) => bloom(win(s, fo.start + d, F.ringDur)));
    lit = ignite(s - BEATS.ignite.start, lerp(F.budHalo[0], F.budHalo[1], f.swell) * f.grow);
  }
  const dim = app.fantasyDim === undefined ? 1 : app.fantasyDim;
  f.open = Math.min(...f.rings);
  f.ringsEff = f.rings.map((o) => o * dim);
  f.halo = lit.halo;
  f.core = lit.core;
  f.swelling = s >= BEATS.ignite.start && s < BEATS.ignite.start + BEATS.ignite.rise + BEATS.ignite.fall && app.show.mode !== 'wake';
}

export function updateFantasy(app, dt) {
  const f = app.fantasy;
  const T = app.clock.T;
  const sp = MOTION.spring;
  const still = app.heart && app.heart.active ? FANTASY.stillness : 1;
  const sway = f.h * f.swayAmp * TUNE.swayAmp * app.breath * still * breeze(f.x, T) * Math.sin(TAU * f.swayHz * TUNE.swaySpeed * T + f.phase);
  const bow = f.h * TUNE.exhale * gust(app, f.x);
  if (f.spring.x !== 0 || f.spring.v !== 0) {
    const n = Math.max(1, Math.ceil(dt / sp.step));
    const h = dt / n;
    for (let i = 0; i < n; i++) { f.spring.v += (-sp.k * f.spring.x - sp.c * f.spring.v) * h; f.spring.x += f.spring.v * h; }
    if (Math.abs(f.spring.x) < sp.rest && Math.abs(f.spring.v) < sp.rest) { f.spring.x = 0; f.spring.v = 0; }
  }
  shapeStem(f, sway + bow + f.leanPx, f.grow);
  f.ang = f.stemAng * SHAPE.stem.headFollow + f.spring.x * sp.tiltDeg * DEG * f.spring.dir;
  f.scale = (1 + f.spring.x * sp.scale) * lerp(SHAPE.stem.budScale, 1, f.grow);
}

function drawStem(ctx, app, f) {
  const F = FANTASY;
  const U = app.L.U;
  const q = f.stem;
  const [w0, w1] = SHAPE.stemTaper.fantasy;
  fillTapered(ctx, [f], w0 * U, w1 * U, app.theme.stem, mix(app.theme.stem, app.theme.moonRim, SHAPE.stemRim.mix));
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(q[0], q[1]);
  ctx.bezierCurveTo(q[2], q[3], q[4], q[5], q[6], q[7]);
  ctx.strokeStyle = rgba(mix(app.theme.stem, PALETTE.fantasy[0], F.stemGlowMix), F.stemGlowAlpha * f.grow);
  ctx.lineWidth = SIZE.fantasy.stemW * U * F.stemGlowW;
  ctx.stroke();
}

// The halo lights the air around the flower. It is drawn before the flowers in
// front of it, so it glows behind them rather than washing over their petals.
export function drawFantasyHalo(ctx, app) {
  const f = app.fantasy;
  if (!f || f.grow <= 0 || f.hx === undefined) return;
  const S = ensureSprites();
  const flare = (app.heart && app.heart.flare) || 0;
  const nC = PALETTE.fantasy.length;
  const capped = !(f.swelling || flare > 0);
  let haloA = f.halo * TUNE.glow * app.theme.glow * (1 + HEART.flareHalo * flare);
  if (capped) haloA = Math.min(haloA, MOTION.glowMax);
  const hc = mod((app.clock.T / FANTASY.cycleS) * nC, nC);
  const ha = Math.floor(hc), hw = smooth(hc - ha);
  const hr = SIZE.fantasy.haloU * app.L.U;
  ctx.globalCompositeOperation = app.theme.glowBlend;
  drawGlow(ctx, S.halos[ha], f.hx, f.hy, hr, haloA * (1 - hw));
  drawGlow(ctx, S.halos[(ha + 1) % nC], f.hx, f.hy, hr, haloA * hw);
  ctx.globalCompositeOperation = 'source-over';
}

export function drawFantasy(ctx, app) {
  const f = app.fantasy;
  if (!f || f.grow <= 0) return;
  const S = ensureSprites();
  const F = FANTASY;
  const { dpr, L } = app;
  const U = L.U;
  const T = app.clock.T;
  const hs = app.heart || {};
  const flare = hs.flare || 0;
  const stretch = hs.stretch || 0;
  drawPool(ctx, app, f);
  drawStem(ctx, app, f);
  drawLeaves(ctx, app, [f]);
  resetTransform(ctx, dpr);
  drawStemLight(ctx, app, f);

  const cx = f.hx, cy = f.hy;
  const breathe = 1 + F.breathe[1] * Math.sin(TAU * F.breathe[0] * T);
  const r = f.r * f.scale * breathe * (1 + F.budSwell * f.swell * (1 - f.open));
  const phase = (T / F.cycleS) * PALETTE.fantasy.length;
  const nC = PALETTE.fantasy.length;
  const glowMul = TUNE.glow * app.theme.glow;
  ctx.globalCompositeOperation = app.theme.glowBlend;
  // the burning core's glow sits behind the glass so it lights the petals from inside
  let flick = 1;
  for (const [hz, amt] of F.flicker) flick += amt * Math.sin(TAU * hz * T);
  const coreMul = 1 + HEART.flareCore * flare;
  if (f.core > 0) drawGlow(ctx, S.coreGlow, cx, cy, F.coreGlowU * U * coreMul, F.coreGlowAlpha * f.core * flick * glowMul * coreMul);
  ctx.globalCompositeOperation = 'source-over';

  // petals, back ring first
  const q = F.squash;
  const [sw, sh] = F.sprite;
  const petalMul = 1 + stretch + HEART.flarePetals * flare;
  for (const p of f.petals) {
    const ring = F.rings[p.k];
    const e = clamp01(f.ringsEff[p.k]);
    const over = Math.max(0, f.ringsEff[p.k] - 1);
    const ang = lerp(p.ang * F.budSpread, p.ang, e) + f.ang;
    const len = r * ring.len * lerp(F.budLen, 1, e) * (1 + over) * petalMul;
    const wid = len * ring.w;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const sx = wid / sw, sy = len / sh;
    ctx.setTransform(dpr * cs * sx, dpr * sn * sx * q, -dpr * sn * sy, dpr * cs * sy * q, dpr * cx, dpr * cy);
    const c = mod(phase + p.ph * nC, nC);
    const ia = Math.floor(c), w = smooth(c - ia);
    const set = S.rings[p.k];
    ctx.globalAlpha = 1;
    ctx.drawImage(set[ia], -sw / 2, -sh, sw, sh);
    ctx.globalAlpha = w;
    ctx.drawImage(set[(ia + 1) % nC], -sw / 2, -sh, sw, sh);
  }
  resetTransform(ctx, dpr);

  // the burning core itself, over the glass
  if (f.core > 0) {
    const cr = SIZE.fantasy.coreU * U * f.scale * lerp(1, coreMul, F.coreFlareSize) * flick;
    ctx.globalAlpha = clamp01(f.core);
    ctx.drawImage(S.core, cx - cr, cy - cr, cr * 2, cr * 2);
    ctx.globalAlpha = 1;
  }

  // motes orbiting outside the petals
  const mv = clamp01((f.core - 1 + F.moteFade) / F.moteFade) * f.core * (1 - (hs.moteHide || 0));
  if (mv > 0) {
    ctx.globalCompositeOperation = app.theme.glowBlend;
    for (const m of f.motes) {
      const a = m.ph + TAU * m.hz * T;
      const x = cx + Math.cos(a) * m.r * U;
      const y = cy + Math.sin(a) * m.r * U * q;
      const tw = (1 + Math.sin(a * F.moteTwinkle + m.tw)) / 2;
      drawGlow(ctx, S.mote, x, y, m.size * U * (1 + tw * F.moteGrow), F.moteAlpha * mv * lerp(F.moteDim, 1, tw));
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

// The seed's light climbing the stem into the bud while it swells.
function drawStemLight(ctx, app, f) {
  if (app.show.mode !== 'full') return;
  const S = LIGHT.stem;
  const p = (app.s - S.start) / S.dur;
  if (p <= 0 || p >= 1) return;
  const U = app.L.U;
  const spr = glow(PALETTE.seed);
  const head = easeInOutSine(p);
  // blended normally: the light passes in front of paler petals on its way up
  ctx.globalCompositeOperation = 'source-over';
  [0].concat(S.trail).forEach((back, i) => {
    const u = head - back;
    if (u <= 0) return;
    const [x, y] = pointAt(f.full, u);
    drawGlow(ctx, spr, x, y, S.sizeU * U * (1 - i * S.trailShrink), S.alpha * Math.pow(S.trailFade, i) * Math.sin(Math.PI * p));
  });
  ctx.globalCompositeOperation = 'source-over';
}

// A soft pool of the flower's light on the grass below it.
function drawPool(ctx, app, f) {
  const P = LIGHT.pool;
  const a = P.alpha * f.core * TUNE.glow * app.theme.glow;
  if (a <= 0.002) return;
  const S = ensureSprites();
  const nC = PALETTE.fantasy.length;
  const hc = mod((app.clock.T / FANTASY.cycleS) * nC, nC);
  const ha = Math.floor(hc), hw = smooth(hc - ha);
  const R = P.rU * app.L.U;
  ctx.globalCompositeOperation = app.theme.glowBlend;
  place(ctx, app.dpr, f.x, f.baseY, 0, 1, P.squash);
  ctx.globalAlpha = a * (1 - hw);
  ctx.drawImage(S.halos[ha], -R, -R, R * 2, R * 2);
  ctx.globalAlpha = a * hw;
  ctx.drawImage(S.halos[(ha + 1) % nC], -R, -R, R * 2, R * 2);
  resetTransform(ctx, app.dpr);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function fantasyRadius(app) {
  const f = app.fantasy;
  return f.r * FANTASY.rings[0].len;
}

export function fantasyBox(app) {
  const f = app.fantasy;
  if (!f || f.grow <= 0) return null;
  const r = fantasyRadius(app) * Math.max(1, f.scale);
  return { kind: 'fantasy', idx: 0, x: f.hx - r, y: f.hy - r * FANTASY.squash, w: r * 2, h: r * 2 * FANTASY.squash };
}

export function hitFantasy(app, x, y, pad) {
  const f = app.fantasy;
  if (!f || f.grow < 1 || f.open < INPUT.bloomedAt) return false;
  return Math.hypot(x - f.hx, y - f.hy) < fantasyRadius(app) * (pad || INPUT.hitPad);
}
