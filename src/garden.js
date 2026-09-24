// The living garden: a distant meadow near the hills, one new flower for every
// day since her first visit, and the flowers she plants, kept between visits.
import { MEADOW, GARDEN } from './config-garden.js';
import { makeRng } from './util.js';
import { makeFlower } from './flowers.js';

export function farFlower(rng, species) {
  const f = makeFlower(rng, species, rng.next(), 0, rng.int(0, 4));
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

// The few distant flowers she starts with, so the field has depth from the first night.
export function createMeadow(app) {
  const rng = makeRng(app.seed ^ 0x3ead);
  const species = ['daisy', 'cosmos', 'wild'];
  const list = [];
  for (let i = 0; i < MEADOW.base; i++) {
    const f = farFlower(rng, species[i % species.length]);
    f.fx = (i + 0.5 + rng.range(-MEADOW.jitter, MEADOW.jitter)) / MEADOW.base;
    f.idx = i;
    list.push(f);
  }
  list.slice().sort((a, b) => Math.abs(a.fx - 0.5) - Math.abs(b.fx - 0.5)).forEach((f, j) => { f.order = j; });
  app.flowers.meadow = list;
}

// Days since her first visit, from storage, or forced with ?day=N.
export function gardenDays(app) {
  return Math.min(GARDEN.maxDaily, Math.max(0, app.days || 0));
}

