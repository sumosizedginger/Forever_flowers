// The living garden: a distant meadow near the hills, one new flower for every
// day since her first visit, and the flowers she plants, kept between visits.
import { MEADOW, GARDEN } from './config-garden.js';
import { STORAGE, INPUT, PALETTE } from './config.js';
import { makeRng, TAU, lerp, clamp01, easeOutCubic, rgba } from './util.js';
import { sparkleSprite } from './sprites.js';
import { makeFlower } from './flowers.js';
import { store } from './life.js';

export function farFlower(rng, species) {
  const f = makeFlower(rng, species, rng.next(), 0, rng.int(0, PALETTE.wild.length - 1));
  f.far = true;
  f.kind = 'meadow';
  f.fb = rng.range(MEADOW.band[0], MEADOW.band[1]);
  f.lift = rng.range(MEADOW.lift[0], MEADOW.lift[1]);
  f.tufts = Array.from({ length: MEADOW.tufts }, () => ({
    dx: rng.range(-1, 1) * MEADOW.tuftU[1], dy: rng.range(0, MEADOW.edge),
    h: rng.range(MEADOW.tuftU[0], MEADOW.tuftU[1]), lean: rng.range(-1, 1) * MEADOW.tuftLean,
  }));
  return f;
}

const byCenter = (list) => list.slice().sort((a, b) => Math.abs(a.fx - 0.5) - Math.abs(b.fx - 0.5)).forEach((f, j) => { f.order = j; });

// The few distant flowers she starts with, so the field has depth from the first night.
export function createMeadow(app) {
  const rng = makeRng(app.seed ^ 0x3ead);
  const list = [];
  for (let i = 0; i < MEADOW.base; i++) {
    const f = farFlower(rng, MEADOW.species[i % MEADOW.species.length]);
    f.fx = (i + 0.5 + rng.range(-MEADOW.jitter, MEADOW.jitter)) / MEADOW.base;
    f.idx = i;
    list.push(f);
  }
  byCenter(list);
  app.flowers.meadow = list;
}

// One flower for every day since her first visit. The first few fill gaps in the
// middle of the field where she will notice them; the rest gather in the far
// meadow, spread by the golden ratio so the band fills evenly over the months.
export function createDaily(app) {
  const days = Math.min(GARDEN.maxDaily, Math.max(0, app.days || 0));
  const list = [];
  for (let i = 0; i < days; i++) {
    const rng = makeRng((app.seed ^ Math.imul(i + 1, GARDEN.dayHash)) >>> 0);
    const species = GARDEN.species[i % GARDEN.species.length];
    let f;
    if (i < GARDEN.midSlots.length) {
      const [fx, fy] = GARDEN.midSlots[i];
      f = makeFlower(rng, species, fx + rng.range(-1, 1) * GARDEN.midJitter, fy + rng.range(-1, 1) * GARDEN.midJitterY);
    } else {
      f = farFlower(rng, species);
      f.fx = (GARDEN.farStart + (i - GARDEN.midSlots.length) * GARDEN.golden) % 1;
    }
    f.kind = 'daily';
    f.idx = i;
    f.isNew = !!app.newToday && i === days - 1;
    list.push(f);
  }
  byCenter(list);
  app.flowers.daily = list;
}

// ---- planted flowers, kept between visits ----
const round = (v) => Math.round(v * GARDEN.savePrecision) / GARDEN.savePrecision;

export function savePlanted(app) {
  const list = app.flowers.planted.filter((f) => !f.fading && !f.gone).map((f) => [round(f.px), round(f.py), f.species, f.type]);
  store.set(STORAGE.planted, JSON.stringify(list));
}

export function loadPlanted(app) {
  let list = null;
  try { list = JSON.parse(store.get(STORAGE.planted) || '[]'); } catch (e) { list = null; }
  if (!Array.isArray(list)) return;
  for (const item of list.slice(-INPUT.plantCap)) {
    if (!Array.isArray(item)) continue;
    const [px, py, species, type] = item;
    if (!Number.isFinite(px) || !Number.isFinite(py) || !INPUT.plantSpecies.includes(species)) continue;
    const rng = makeRng((app.seed ^ Math.imul(Math.round(px * GARDEN.savePrecision) + 1, GARDEN.dayHash) ^ Math.round(py * GARDEN.savePrecision)) >>> 0);
    const f = makeFlower(rng, species, 0, 0, Number.isFinite(type) ? type : 0);
    f.kind = 'planted';
    f.px = px;
    f.py = py;
    f.t0 = -Infinity;
    f.idx = app.flowers.planted.length;
    app.flowers.planted.push(f);
  }
}

// Replay grows her planted flowers back with the rest of the field.
export function regrowPlanted(app, at) {
  const fl = app.flowers;
  fl.planted = fl.planted.filter((f) => !f.fading && !f.gone);
  fl.planted.forEach((f, k) => { f.t0 = at + k * GARDEN.regrowStagger; f.spring.x = 0; f.spring.v = 0; });
}

// The newest flower of the day arrives with a small ring of light and four glints.
export function drawNewSparkle(ctx, app) {
  if (app.show.mode !== 'wake') return;
  const f = app.flowers.daily.find((d) => d.isNew);
  if (!f || f.grow <= 0) return;
  const q = (app.s - GARDEN.bloom[0]) / GARDEN.sparkleDur;
  if (q <= 0 || q >= 1) return;
  const U = app.L.U;
  const e = easeOutCubic(q);
  const a = GARDEN.sparkleAlpha * (1 - q);
  const R = lerp(f.r, GARDEN.sparkleU * U, e);
  // blended normally, never adding toward white over pale petals
  ctx.strokeStyle = rgba(PALETTE.firefly, a);
  ctx.lineWidth = GARDEN.sparkleW;
  ctx.beginPath();
  ctx.ellipse(f.hx, f.hy, R, R * GARDEN.sparkleSquash, 0, 0, TAU);
  ctx.stroke();
  const spr = sparkleSprite(PALETTE.gold.glint);
  const s = f.r * GARDEN.glintSize * (1 - q);
  ctx.globalAlpha = clamp01(a * GARDEN.glintBoost);
  for (let k = 0; k < GARDEN.glints; k++) {
    const ang = (k / GARDEN.glints) * TAU + q * GARDEN.glintSpin;
    ctx.drawImage(spr, f.hx + Math.cos(ang) * R - s, f.hy + Math.sin(ang) * R * GARDEN.sparkleSquash - s, s * 2, s * 2);
  }
  ctx.globalAlpha = 1;
}
