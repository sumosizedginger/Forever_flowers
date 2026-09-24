// Roses, her favorites, wildflowers, the distant meadow, daily and planted
// flowers: per flower variance, placement, sway, lean, tap springs, and the
// stem, leaf and head draw passes.
import { LAYOUT, SIZE, MOTION, TUNE, SHAPE, GOLD, INPUT, PALETTE, BEATS } from './config.js';
import { FAVS, MEADOW } from './config-garden.js';
import { makeRng, TAU, lerp, clamp, clamp01, easeInOutSine, easeOutBack, win, mix } from './util.js';
import { makeHeadCache, cachedImage, dropCache, place, resetTransform, glow, drawGlow, sparkleSprite } from './sprites.js';
import { clampHeadX } from './layout.js';
import { breeze, gust } from './wind.js';
import { shapeStem, makeLeaves, strokeStems, fillTapered, drawLeaves } from './stem.js';
import { roseDetails, drawGlints } from './rose.js';
import { favDetails } from './favs.js';
import { drawHead, headKey, headExtent, hasBud } from './species.js';
import { drawSheen } from './gold.js';

const DEG = Math.PI / 180;

export function vary(rng, f) {
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

// Any non-rose flower: a small wildflower of palette type, or one of her favorites.
export function makeFlower(rng, species, fx, fy, type) {
  const f = { kind: species === 'wild' ? 'wild' : species, species, fx, fy, type: type || 0 };
  vary(rng, f);
  f.rMul = rng.next();
  if (species === 'wild') f.leaves = makeLeaves(rng, SHAPE.leaf.wild);
  else {
    favDetails(rng, f);
    f.leaves = makeLeaves(rng, FAVS.leaves[species]);
  }
  return f;
}

export function createFlowers(app) {
  const rng = makeRng(app.seed ^ 0xf10e);
  const roses = LAYOUT.roses.map((spec, i) => {
    const f = { kind: 'rose', species: 'rose', idx: i, colorName: spec.color, fx: spec.fx, fy: spec.hy };
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
    const f = makeFlower(rng, 'wild', fx, rng.range(LAYOUT.wildY[0], LAYOUT.wildY[1]), type);
    f.idx = i;
    wilds.push(f);
  }
  wilds.slice().sort((a, b) => Math.abs(a.fx - 0.5) - Math.abs(b.fx - 0.5)).forEach((f, j) => { f.order = j; });
  // her favorites, from their own stream so the rest of the field stays put
  const frng = makeRng(app.seed ^ 0xfa7e);
  for (const f of roses) roseDetails(frng, f);
  const favs = FAVS.cosmosSpots.map(([fx, fy]) => makeFlower(frng, 'cosmos', fx, fy))
    .concat(FAVS.daisySpots.map(([fx, fy]) => makeFlower(frng, 'daisy', fx, fy)));
  favs.forEach((f, i) => { f.idx = i; });
  favs.slice().sort((a, b) => a.fx - b.fx).forEach((f, j) => { f.order = j; });
  return { roses, favs, wilds, meadow: [], daily: [], planted: [], rng };
}

function favRadius(f, U) {
  if (f.species === 'wild') return lerp(SIZE.wild.rU[0], SIZE.wild.rU[1], f.rMul) * U * f.size;
  const [a, b] = FAVS.rU[f.species];
  return lerp(a, b, f.rMul) * U * f.size;
}

function placeOne(L, f, headX, headY, baseY) {
  f.baseY = baseY === undefined ? L.groundY : baseY;
  f.h = Math.max(f.baseY - headY, f.far ? MEADOW.lift[0] * L.H : L.U * INPUT.plantMinU);
  const hx = clampHeadX(L, headX, f.r * headExtent(f), f.h * LAYOUT.swayMargin);
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
  for (const f of fl.favs) {
    f.r = favRadius(f, U);
    placeOne(L, f, L.fieldL + f.fx * L.fieldW, L.H * f.fy);
  }
  for (const f of fl.wilds) {
    f.r = favRadius(f, U);
    placeOne(L, f, L.wildL + f.fx * L.wildW, L.H * f.fy);
  }
  for (const f of fl.daily) {
    if (f.far) continue;
    f.r = favRadius(f, U);
    placeOne(L, f, L.fieldL + f.fx * L.fieldW, L.H * f.fy);
  }
  const span = L.maxX - L.minX;
  for (const f of fl.meadow.concat(fl.daily.filter((d) => d.far))) {
    f.r = lerp(MEADOW.rU[0], MEADOW.rU[1], f.rMul) * U;
    placeOne(L, f, L.minX + f.fx * span, L.H * (f.fb - f.lift), L.H * f.fb);
  }
  for (const f of fl.planted) {
    f.r = favRadius(f, U);
    const headY = clamp(f.py * L.H, L.groundY - U * INPUT.plantMaxU, L.groundY - U * INPUT.plantMinU);
    placeOne(L, f, f.px * L.W, headY);
  }
}

export function allFlowers(app) {
  const fl = app.flowers;
  return fl.roses.concat(fl.favs, fl.wilds, fl.meadow, fl.daily, fl.planted);
}

// Stem bases that need foreground grass in front of them (the far meadow has its own tufts).
export function stemBases(app) {
  const fl = app.flowers;
  return fl.roses.concat(fl.favs, fl.wilds, fl.daily.filter((f) => !f.far), fl.planted).map((f) => f.x);
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

// Plant a flower whose head grows to about where she tapped: mostly her favorites.
export function plant(app, x, y, saved) {
  const fl = app.flowers;
  const rng = app.live;
  const alive = fl.planted.filter((f) => !f.fading);
  if (!saved && alive.length >= INPUT.plantCap) alive[0].fading = app.clock.T;
  const species = saved ? saved.species : rng.pick(INPUT.plantSpecies);
  const f = makeFlower(rng, species, 0, 0, saved ? saved.type : rng.int(0, PALETTE.wild.length - 1));
  f.kind = 'planted';
  f.idx = fl.planted.length;
  f.px = x / app.L.W;
  f.py = y / app.L.H;
  f.t0 = saved ? -Infinity : app.clock.T;
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
  const dim = app.openDim === undefined ? 1 : app.openDim;
  for (let i = fl.planted.length - 1; i >= 0; i--) {
    const f = fl.planted[i];
    const age = T - f.t0;
    f.grow = easeInOutSine(win(age, 0, BEATS.wildStems.dur));
    f.open = pop(win(age, BEATS.wildStems.dur * INPUT.plantPopAt, BEATS.wildPop.dur * f.bloomMul));
    f.fade = f.fading ? 1 - clamp01((T - f.fading) / INPUT.plantFade) : 1;
    f.openEff = f.open * f.fade * dim;
    if (f.fading && f.fade <= 0) fl.planted.splice(i, 1);
  }
  for (const f of allFlowers(app)) {
    const amp = f.far ? f.swayAmp * MEADOW.swayMul : f.swayAmp;
    const sway = f.h * amp * mul * breeze(f.x, T) * Math.sin(TAU * f.swayHz * TUNE.swaySpeed * T + f.phase);
    const bow = f.h * TUNE.exhale * gust(app, f.x);
    springStep(f.spring, dt);
    shapeStem(f, sway + bow + f.leanPx, f.grow);
    const sx = f.spring.x;
    f.ang = f.stemAng * SHAPE.stem.headFollow + f.tilt + sx * sp.tiltDeg * DEG * f.spring.dir;
    f.scale = (1 + sx * sp.scale) * lerp(SHAPE.stem.budScale, 1, f.grow);
  }
}

// ---- draw passes ----
function drawHeads(ctx, app, list, theme) {
  const { dpr } = app;
  for (const f of list) {
    if (f.grow <= 0 || f.gone) continue;
    const open = f.openEff;
    if (!hasBud(f) && open <= 0.001) continue;
    const draw = (g) => drawHead(g, f, open, theme);
    const c = cachedImage(f.cache, headKey(f, open, theme), f.r, dpr, draw);
    place(ctx, dpr, f.hx, f.hy, f.ang, f.scale, f.scale);
    ctx.globalAlpha = f.fade === undefined ? 1 : f.fade;
    if (c) ctx.drawImage(c.canvas, -c.r, -c.r, c.r * 2, c.r * 2);
    else draw(ctx);
    resetTransform(ctx, dpr);
    f.headImage = c;
  }
  ctx.globalAlpha = 1;
}

// Stems grouped by species so each group is one path.
function drawStems(ctx, app, list) {
  const { L, theme } = app;
  const groups = { cosmos: [], daisy: [], wild: [] };
  for (const f of list) (groups[f.species] || groups.wild).push(f);
  const rim = (c) => mix(c, theme.moonRim, SHAPE.stemRim.mix);
  if (groups.cosmos.length) strokeStems(ctx, groups.cosmos, FAVS.stemW.cosmos * L.U, theme.cosmosStem, rim(theme.cosmosStem));
  if (groups.daisy.length) strokeStems(ctx, groups.daisy, FAVS.stemW.daisy * L.U, theme.daisyStem, rim(theme.daisyStem));
  if (groups.wild.length) strokeStems(ctx, groups.wild, SIZE.wild.stemW * L.U, theme.stem, rim(theme.stem));
  const feathery = groups.cosmos;
  if (feathery.length) drawLeaves(ctx, app, feathery, app.featherSprite);
  const plain = groups.daisy.concat(groups.wild);
  if (plain.length) drawLeaves(ctx, app, plain);
}

export function drawMeadowLayer(ctx, app) {
  const fl = app.flowers;
  const list = fl.meadow.concat(fl.daily.filter((f) => f.far));
  if (!list.length) return;
  const { L } = app;
  const th = app.hazeTheme;
  strokeStems(ctx, list, MEADOW.stemW * L.U, th.stem);
  drawHeads(ctx, app, list, th);
  // small tufts in front of each base so the far stems sit in the grass
  ctx.fillStyle = th.grass[1];
  ctx.beginPath();
  for (const f of list) for (const t of f.tufts) {
    const x = f.x + t.dx * L.U, y = f.baseY + t.dy * L.U, h = t.h * L.U, w = MEADOW.tuftW * L.U;
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x + t.lean * h * 0.5, y - h * 0.6, x + t.lean * h, y - h);
    ctx.quadraticCurveTo(x + t.lean * h * 0.5 + w, y - h * 0.5, x + w, y);
  }
  ctx.fill();
}

export function drawCosmosLayer(ctx, app) {
  const fl = app.flowers;
  const list = fl.favs.filter((f) => f.species === 'cosmos').concat(fl.daily.filter((f) => !f.far && f.species === 'cosmos'));
  drawStems(ctx, app, list);
  drawHeads(ctx, app, list, app.theme);
}

export function drawRoseLayer(ctx, app) {
  const { L, theme } = app;
  const roses = app.flowers.roses;
  const T = SHAPE.stemTaper;
  fillTapered(ctx, roses, T.rose[0] * L.U, T.rose[1] * L.U, theme.stem, mix(theme.stem, theme.moonRim, SHAPE.stemRim.mix));
  drawLeaves(ctx, app, roses);
  for (const f of roses) {
    if (f.gold && f.grow > 0 && f.openEff > 0) {
      // blended normally: the glow may sit over paler petals behind it
      drawGlow(ctx, glow(PALETTE.gold.mid), f.hx, f.hy, f.r * GOLD.glowU, Math.min(MOTION.glowMax, GOLD.glowAlpha * TUNE.glow * clamp01(f.openEff)));
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  drawHeads(ctx, app, roses, theme);
  for (const f of roses) {
    if (!f.gold || f.grow <= 0 || f.openEff <= 0) continue;
    // sheen and glints sit on light gold, so they blend normally rather than add toward white
    drawSheen(ctx, app, f);
    drawGlints(ctx, app, f, sparkleSprite(PALETTE.gold.glint));
    ctx.globalAlpha = 1;
  }
}

export function drawFrontLayer(ctx, app) {
  const fl = app.flowers;
  const list = fl.favs.filter((f) => f.species === 'daisy')
    .concat(fl.daily.filter((f) => !f.far && f.species === 'daisy'), fl.wilds, fl.planted);
  drawStems(ctx, app, list);
  drawHeads(ctx, app, list, app.theme);
}

// Head extents at full bloom, for hit tests and the clipping check.
export function headRadius(f) {
  return f.r * headExtent(f) * Math.max(1, f.scale);
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
