// Roses, wildflowers and planted flowers: per flower variance, placement,
// sway, lean, tap springs, and the stem, leaf and head draw passes.
import { LAYOUT, SIZE, MOTION, TUNE, SHAPE, GOLD, INPUT, PALETTE, BEATS } from './config.js';
import { makeRng, TAU, lerp, clamp, clamp01, easeInOutSine, easeOutBack, win } from './util.js';
import { makeHeadCache, cachedImage, dropCache, place, resetTransform, glow, drawGlow, starSprite } from './sprites.js';
import { clampHeadX } from './layout.js';
import { breeze, gust } from './wind.js';
import { shapeStem, makeLeaves, strokeStems, drawLeaves } from './stem.js';
import { drawRose, roseColors, roseKey, drawGlints } from './rose.js';
import { drawWild, wildKey } from './wild.js';

const DEG = Math.PI / 180;

function vary(rng, f) {
  const v = MOTION.variance;
  const s = MOTION.sway;
  f.size = 1 + rng.range(-v.size, v.size);
  f.bloomMul = 1 + rng.range(-v.bloomDur, v.bloomDur);
  f.tilt = rng.range(-v.tiltDeg, v.tiltDeg) * DEG;
  f.petalRot = rng.range(0, TAU);
  f.swayHz = rng.range(s.hz[0], s.hz[1]);
  f.swayAmp = rng.range(s.amp[0], s.amp[1]);
  f.phaseRand = rng.range(0, s.phaseRand);
  f.bend = rng.range(-1, 1);
  f.spring = { x: 0, v: 0, dir: 1 };
  f.leanPx = 0;
  f.grow = 0; f.open = 0; f.openEff = 0; f.scale = 1; f.ang = 0;
  f.cache = makeHeadCache();
}

function makeWild(rng, type, fx, fy) {
  const f = { kind: 'wild', type, fx, fy };
  vary(rng, f);
  f.rMul = rng.next();
  f.leaves = makeLeaves(rng, SHAPE.leaf.wild);
  return f;
}

export function createFlowers(app) {
  const rng = makeRng(app.seed ^ 0xf10e);
  const roses = LAYOUT.roses.map((spec, i) => {
    const f = { kind: 'rose', idx: i, colorName: spec.color, fx: spec.fx, fy: spec.hy };
    vary(rng, f);
    f.layers = rng.pick(MOTION.variance.roseLayers);
    f.order = LAYOUT.roseOrder.indexOf(i);
    f.leaves = makeLeaves(rng, SHAPE.leaf.rose);
    f.glints = Array.from({ length: GOLD.glints }, (_, k) => ({
      ang: (k * TAU) / GOLD.glints + rng.range(0, TAU / GOLD.glints),
      rr: rng.range(GOLD.glintR[0], GOLD.glintR[1]), ph: rng.range(0, TAU),
    }));
    return f;
  });
  const n = rng.int(LAYOUT.wildCount[0], LAYOUT.wildCount[1]);
  const types = PALETTE.wild.map((_, i) => i);
  const wilds = [];
  let prev = -1;
  for (let i = 0; i < n; i++) {
    let type = rng.pick(types);
    if (type === prev) type = (type + 1) % types.length;
    prev = type;
    const fx = (i + 0.5 + rng.range(-LAYOUT.wildJitter, LAYOUT.wildJitter)) / n;
    const f = makeWild(rng, type, fx, rng.range(LAYOUT.wildY[0], LAYOUT.wildY[1]));
    f.idx = i;
    wilds.push(f);
  }
  wilds.slice().sort((a, b) => Math.abs(a.fx - 0.5) - Math.abs(b.fx - 0.5)).forEach((f, j) => { f.order = j; });
  return { roses, wilds, planted: [], rng };
}

function placeOne(L, f, headX, headY) {
  f.baseY = L.groundY;
  f.h = Math.max(f.baseY - headY, L.U * INPUT.plantMinU);
  const hx = clampHeadX(L, headX, f.r * SHAPE.rose.ctrl[6], f.h * LAYOUT.swayMargin);
  f.x = hx - f.bend * f.h * SHAPE.stem.restLean;
  f.phase = f.x * MOTION.sway.phasePerPx + f.phaseRand;
  dropCache(f.cache);
}

export function placeFlowers(app) {
  const { L } = app;
  const U = L.U;
  const fl = app.flowers;
  for (const f of fl.roses) {
    f.r = SIZE.rose.rU * U * f.size;
    f.gold = f.colorName === 'crimson' && app.gold;
    placeOne(L, f, L.fieldL + f.fx * L.fieldW, L.H * f.fy);
  }
  for (const f of fl.wilds) {
    f.r = lerp(SIZE.wild.rU[0], SIZE.wild.rU[1], f.rMul) * U * f.size;
    placeOne(L, f, L.wildL + f.fx * L.wildW, L.H * f.fy);
  }
  for (const f of fl.planted) {
    f.r = lerp(SIZE.wild.rU[0], SIZE.wild.rU[1], f.rMul) * U * f.size;
    const headY = clamp(f.py * L.H, L.groundY - U * INPUT.plantMaxU, L.groundY - U * INPUT.plantMinU);
    placeOne(L, f, f.px * L.W, headY);
  }
}

export function allFlowers(app) {
  const fl = app.flowers;
  return fl.roses.concat(fl.wilds, fl.planted);
}

export function stemBases(app) {
  return allFlowers(app).map((f) => f.x);
}

// Tap response: a normalized spring kick, peaking near 1.
export function kick(f, dir) {
  f.spring.v = 1 / MOTION.spring.peak;
  f.spring.dir = dir;
}

function springStep(s, dt) {
  if (s.x === 0 && s.v === 0) return;
  const sp = MOTION.spring;
  const n = Math.max(1, Math.ceil(dt / sp.step));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -sp.k * s.x - sp.c * s.v;
    s.v += a * h;
    s.x += s.v * h;
  }
  if (Math.abs(s.x) < sp.rest && Math.abs(s.v) < sp.rest) { s.x = 0; s.v = 0; }
}

// Plant a wildflower whose head grows to about where she tapped.
export function plant(app, x, y) {
  const fl = app.flowers;
  const rng = app.live;
  const alive = fl.planted.filter((f) => !f.fading);
  if (alive.length >= INPUT.plantCap) alive[0].fading = app.clock.T;
  const f = makeWild(rng, rng.int(0, PALETTE.wild.length - 1), 0, 0);
  f.kind = 'planted';
  f.idx = fl.planted.length;
  f.px = x / app.L.W;
  f.py = y / app.L.H;
  f.t0 = app.clock.T;
  fl.planted.push(f);
  placeFlowers(app);
  return f;
}

export function plantedCount(app) {
  return app.flowers.planted.filter((f) => !f.fading && !f.gone).length;
}

export function updateFlowers(app, dt) {
  const T = app.clock.T;
  const mul = TUNE.swayAmp * app.breath;
  const sp = MOTION.spring;
  const fl = app.flowers;
  const pop = (x) => easeOutBack(x, MOTION.popOvershoot * TUNE.overshoot);
  for (let i = fl.planted.length - 1; i >= 0; i--) {
    const f = fl.planted[i];
    const age = T - f.t0;
    f.grow = easeInOutSine(win(age, 0, BEATS.wildStems.dur));
    f.open = pop(win(age, BEATS.wildStems.dur * INPUT.plantPopAt, BEATS.wildPop.dur * f.bloomMul));
    f.fade = f.fading ? 1 - clamp01((T - f.fading) / INPUT.plantFade) : 1;
    f.openEff = f.open * f.fade * (app.openDim === undefined ? 1 : app.openDim);
    if (f.fading && f.fade <= 0) fl.planted.splice(i, 1);
  }
  for (const f of allFlowers(app)) {
    const sway = f.h * f.swayAmp * mul * breeze(f.x, T) * Math.sin(TAU * f.swayHz * TUNE.swaySpeed * T + f.phase);
    const bow = f.h * TUNE.exhale * gust(app, f.x);
    springStep(f.spring, dt);
    shapeStem(f, sway + bow + f.leanPx, f.grow);
    const sx = f.spring.x;
    f.ang = f.stemAng * SHAPE.stem.headFollow + f.tilt + sx * sp.tiltDeg * DEG * f.spring.dir;
    f.scale = (1 + sx * sp.scale) * lerp(SHAPE.stem.budScale, 1, f.grow);
  }
}

// ---- draw passes ----
export function drawRoseLayer(ctx, app) {
  const { dpr, L, theme } = app;
  const roses = app.flowers.roses;
  strokeStems(ctx, roses, SIZE.rose.stemW * L.U, theme.stem);
  drawLeaves(ctx, app, roses);
  for (const f of roses) {
    if (f.grow <= 0) continue;
    const open = f.openEff;
    if (f.gold && open > 0) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(ctx, glow(PALETTE.gold.mid), f.hx, f.hy, f.r * GOLD.glowU, Math.min(MOTION.glowMax, GOLD.glowAlpha * TUNE.glow * clamp01(open)));
      ctx.globalCompositeOperation = 'source-over';
    }
    const col = roseColors(theme, f.colorName, f.gold);
    const draw = (g) => drawRose(g, f, f.r, open, col, theme);
    const c = cachedImage(f.cache, roseKey(f, open, theme), f.r, dpr, draw);
    place(ctx, dpr, f.hx, f.hy, f.ang, f.scale, f.scale);
    ctx.globalAlpha = 1;
    if (c) ctx.drawImage(c.canvas, -c.r, -c.r, c.r * 2, c.r * 2);
    else draw(ctx);
    resetTransform(ctx, dpr);
    if (f.gold && open > 0) {
      // Glints sit on light gold, so they blend normally rather than add toward white.
      drawGlints(ctx, app, f, starSprite(PALETTE.gold.glint));
      ctx.globalAlpha = 1;
    }
  }
}

export function drawWildLayer(ctx, app) {
  const { dpr, L, theme } = app;
  const list = app.flowers.wilds.concat(app.flowers.planted);
  strokeStems(ctx, list, SIZE.wild.stemW * L.U, theme.stem);
  drawLeaves(ctx, app, list);
  for (const f of list) {
    if (f.grow <= 0 || f.openEff <= 0.001) continue;
    const open = f.openEff;
    const draw = (g) => drawWild(g, f, f.r, open, theme);
    const c = cachedImage(f.cache, wildKey(f, open, theme), f.r, dpr, draw);
    place(ctx, dpr, f.hx, f.hy, f.ang, f.scale, f.scale);
    ctx.globalAlpha = f.fade === undefined ? 1 : f.fade;
    if (c) ctx.drawImage(c.canvas, -c.r, -c.r, c.r * 2, c.r * 2);
    else draw(ctx);
    resetTransform(ctx, dpr);
  }
  ctx.globalAlpha = 1;
}

// Head extents at full bloom, for hit tests and the clipping check.
export function headRadius(f) {
  const ext = f.kind === 'rose' ? SHAPE.rose.ctrl[6] : SHAPE.wild[f.type].len;
  return f.r * ext * Math.max(1, f.scale);
}

export function headBoxes(app) {
  return allFlowers(app).filter((f) => f.grow > 0 && !f.fading).map((f) => {
    const r = headRadius(f);
    return { kind: f.kind, idx: f.idx, x: f.hx - r, y: f.hy - r, w: r * 2, h: r * 2 };
  });
}

// The nearest bloomed head under (x, y), or null.
export function hitFlower(app, x, y) {
  let best = null, bestD = Infinity;
  for (const f of allFlowers(app)) {
    if (f.fading || f.open < INPUT.bloomedAt || f.grow < 1) continue;
    const d = Math.hypot(x - f.hx, y - f.hy);
    if (d < headRadius(f) * INPUT.hitPad && d < bestD) { best = f; bestD = d; }
  }
  return best;
}
