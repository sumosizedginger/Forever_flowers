// The beat sheet for the field: stem growth and blooms as pure functions of
// show time, for the full show and the five second wake up.
import { BEATS, WAKE, TUNE, MOTION, INPUT } from './config.js';
import { win, lerp, easeInOutSine, easeOutBack, cubicBezier } from './util.js';

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
  const dim = lerp(1, INPUT.dimOpen, app.dimLevel);
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
  }
  for (const f of fl.roses) f.openEff = f.open * dim;
  for (const f of fl.wilds) f.openEff = f.open * dim;
  app.openDim = dim;
}

// When each rose starts to bloom, in bloom order, for the sound phrase.
export function roseBloomTimes(app) {
  return app.flowers.roses.slice().sort((a, b) => a.order - b.order).map((f) => BEATS.roseBloom.start + f.order * TUNE.bloomStagger);
}
