// Per frame logic. Show time s is seconds since the show (re)started.
import { BEATS, WAKE, TOD, WORLD } from './config.js';
import { win, clamp01 } from './util.js';

const steps = [];

// Later modules register per frame steps in the order main.js adds them.
export function addStep(fn) { steps.push(fn); }

export function update(app, dt) {
  app.prevS = app.s;
  app.s = app.clock.T - app.show.start;
  const s = app.s;
  const wake = app.show.mode === 'wake';
  const fade = wake ? win(s, 0, WAKE.fadeIn) : win(s, BEATS.fadeIn[0], BEATS.fadeIn[1]);
  app.fadeIn = fade;
  app.starReveal = !wake && s < BEATS.fadeIn[1] + WORLD.stars.delay[1] + WORLD.stars.twinkleUp ? s : null;
  if (app.bgPrev) {
    app.bgMix = clamp01(app.bgMix + dt / TOD.crossfadeS);
    if (app.bgMix >= 1) app.bgPrev = null;
  }
  for (const fn of steps) fn(app, dt);
  app.overlay = Math.max(1 - fade, 1 - (1 - (app.darken || 0)) * (1 - app.theme.darken));
}
