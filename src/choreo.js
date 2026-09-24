// The beat sheet for the field: stem growth and blooms as pure functions of
// show time, for the full show and the five second wake up.
import { BEATS, WAKE, TUNE, MOTION } from './config.js';
import { SLEEP, GARDEN } from './config-garden.js';
import { win, lerp, smooth, easeInOutSine, easeOutBack, cubicBezier } from './util.js';

let curve = null;
let curveK = null;

// Bloom easing is the brief's cubic bezier; the tuning overshoot scales its lift past 1.
export function bloomEase() {
  if (curveK !== TUNE.overshoot) {
    const [x1, y1, x2, y2] = MOTION.bloomBezier;
    curve = cubicBezier(x1, 1 + (y1 - 1) * TUNE.overshoot, x2, y2);
    curveK = TUNE.overshoot;
  }
  return curve;
}

export const popEase = (x) => easeOutBack(x, MOTION.popOvershoot * TUNE.overshoot);

// Wake up: every element reopens from 35% somewhere inside the first 3 seconds.
export function wakeStart(order, n) {
  return n > 1 ? (order / (n - 1)) * (WAKE.span - WAKE.dur) : 0;
}

export function flowerTimes(app) {
  const s = app.s;
  const fl = app.flowers;
  const bloom = bloomEase();
  const dim = lerp(1, SLEEP.fold, app.dimLevel);
  if (app.show.mode === 'wake') {
    const nr = fl.roses.length, nw = fl.wilds.length;
    for (const f of fl.roses) {
      f.grow = 1;
      f.open = lerp(WAKE.startOpen, 1, bloom(win(s, wakeStart(f.order, nr), WAKE.dur * f.bloomMul)));
    }
    for (const f of fl.wilds) {
      f.grow = 1;
      f.open = lerp(WAKE.startOpen, 1, popEase(win(s, wakeStart(f.order, nw), WAKE.dur * f.bloomMul)));
    }
    const nf = fl.favs.length;
    for (const f of fl.favs) {
      f.grow = 1;
      f.open = lerp(WAKE.startOpen, 1, bloom(win(s, wakeStart(f.order, nf), WAKE.dur * f.bloomMul)));
    }
    const ns = fl.side.length;
    for (const f of fl.side) {
      f.grow = 1;
      f.open = lerp(WAKE.startOpen, 1, bloom(win(s, wakeStart(f.order, ns), WAKE.dur * f.bloomMul)));
    }
    const nm = fl.meadow.length;
    for (const f of fl.meadow) {
      f.grow = 1;
      f.open = lerp(WAKE.startOpen, 1, popEase(win(s, wakeStart(f.order, nm), WAKE.dur * f.bloomMul)));
    }
    // the garden: everything reopens, except today's new flower, which grows in
    const nd = fl.daily.length;
    for (const f of fl.daily) {
      if (f.isNew) {
        f.grow = easeInOutSine(win(s, GARDEN.grow[0], GARDEN.grow[1]));
        f.open = bloom(win(s, GARDEN.bloom[0], GARDEN.bloom[1]));
      } else {
        f.grow = 1;
        f.open = lerp(WAKE.startOpen, 1, bloom(win(s, wakeStart(f.order, nd), WAKE.dur * f.bloomMul)));
      }
    }
  } else {
    const rs = BEATS.roseStems, ws = BEATS.wildStems, wp = BEATS.wildPop;
    for (const f of fl.roses) {
      const j = f.order;
      f.grow = easeInOutSine(win(s, rs.start + j * rs.stagger, rs.dur));
      f.open = bloom(win(s, BEATS.roseBloom.start + j * TUNE.bloomStagger, TUNE.bloomDuration * f.bloomMul));
    }
    for (const f of fl.wilds) {
      const j = f.order;
      f.grow = easeInOutSine(win(s, ws.start + j * ws.stagger, ws.dur));
      f.open = popEase(win(s, wp.start + j * wp.stagger, wp.dur * f.bloomMul));
    }
    for (const f of fl.meadow) {
      const j = f.order;
      f.grow = easeInOutSine(win(s, ws.start + j * ws.stagger, ws.dur));
      f.open = popEase(win(s, wp.start + j * wp.stagger, wp.dur * f.bloomMul));
    }
    const fs = BEATS.favStems, fb = BEATS.favBloom;
    for (const f of fl.favs) {
      const j = f.order;
      f.grow = easeInOutSine(win(s, fs.start + j * fs.stagger, fs.dur));
      f.open = bloom(win(s, fb.start + j * fb.stagger, fb.dur * f.bloomMul));
    }
    for (const f of fl.side) {
      const j = f.order;
      if (f.species === 'wild') {
        f.grow = easeInOutSine(win(s, ws.start + j * ws.stagger, ws.dur));
        f.open = popEase(win(s, wp.start + j * wp.stagger, wp.dur * f.bloomMul));
      } else {
        f.grow = easeInOutSine(win(s, fs.start + j * fs.stagger, fs.dur));
        f.open = bloom(win(s, fb.start + j * fb.stagger, fb.dur * f.bloomMul));
      }
    }
    const nd = Math.max(1, fl.daily.length);
    for (const f of fl.daily) {
      const k = f.order / nd;
      f.grow = easeInOutSine(win(s, GARDEN.fullGrow[0] + k * GARDEN.fullGrow[1], ws.dur));
      f.open = bloom(win(s, GARDEN.fullPop[0] + k * GARDEN.fullPop[1], fb.dur * f.bloomMul));
    }
  }
  for (const f of fl.roses) f.openEff = f.open * dim;
  for (const f of fl.wilds) f.openEff = f.open * dim;
  for (const f of fl.favs) f.openEff = f.open * dim;
  for (const f of fl.side) f.openEff = f.open * dim;
  for (const f of fl.meadow) f.openEff = f.open * dim;
  for (const f of fl.daily) f.openEff = f.open * dim;
  app.openDim = dim;
  app.fantasyDim = lerp(1, SLEEP.fantasyFold, app.dimLevel);
}

// Held breath, and the end of the intro.
export function showTimes(app) {
  const s = app.s;
  const b = BEATS.breath;
  let k = 0;
  if (app.show.mode === 'full' && s >= b.start) {
    k = s < b.start + b.dur ? smooth((s - b.start) / b.ease) : 1 - smooth((s - b.start - b.dur) / b.recover);
  }
  app.breath = lerp(1, b.amp, k);
  const end = app.show.mode === 'wake' ? WAKE.total : BEATS.introEnd;
  app.introDone = s >= end;
  if (app.state === 'INTRO' && app.introDone) app.state = 'LIVE';
}

// When each rose starts to bloom, in bloom order, for the sound phrase.
export function roseBloomTimes(app) {
  return app.flowers.roses.slice().sort((a, b) => a.order - b.order).map((f) => BEATS.roseBloom.start + f.order * TUNE.bloomStagger);
}
