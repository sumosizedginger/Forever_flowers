// Until she has found the heart herself, a firefly now and then drifts over,
// settles on the fantasy flower and pulses on the music's beat: a quiet
// invitation to touch it. Its pose is a pure function of show time.
import { HINT } from './config-garden.js';
import { PALETTE, HEART } from './config.js';
import { lerp, smooth, easeInOutCubic, mod } from './util.js';
import { glow, drawGlow } from './sprites.js';

export function hintPose(app) {
  if (app.heartFound || app.show.mode !== 'wake' || app.state !== 'LIVE') return null;
  const f = app.fantasy;
  if (!f || f.open < 1) return null;
  const t = app.s - HINT.startS;
  if (t < 0) return null;
  const c = mod(t, HINT.cycle);
  const end = HINT.flyIn + HINT.stay + HINT.flyOut;
  if (c > end) return null;
  const U = app.L.U;
  const perch = [f.hx + HINT.perch[0] * f.r, f.hy + HINT.perch[1] * f.r];
  const from = [f.hx - HINT.fromU * U, f.hy + HINT.fromU * U * HINT.fromDrop];
  const to = [f.hx + HINT.fromU * U, f.hy - HINT.fromU * U * HINT.fromDrop];
  let x, y, pulse = 1;
  if (c < HINT.flyIn) {
    const e = easeInOutCubic(c / HINT.flyIn);
    x = lerp(from[0], perch[0], e) + Math.sin(e * Math.PI) * U * HINT.wobble;
    y = lerp(from[1], perch[1], e) - Math.sin(e * Math.PI) * U * HINT.arc;
  } else if (c < HINT.flyIn + HINT.stay) {
    x = perch[0];
    y = perch[1];
    const period = 60 / HEART.bpm;
    pulse = lerp(HINT.pulseMin, 1, Math.exp(-(mod(app.s, period) / period) * HINT.pulseDecay));
  } else {
    const e = easeInOutCubic((c - HINT.flyIn - HINT.stay) / HINT.flyOut);
    x = lerp(perch[0], to[0], e);
    y = lerp(perch[1], to[1], e) - Math.sin(e * Math.PI) * U * HINT.arc;
  }
  const fade = smooth(c / HINT.fade) * (1 - smooth((c - end + HINT.fade) / HINT.fade));
  return { x, y, a: fade * pulse };
}

export function drawHint(ctx, app) {
  const p = hintPose(app);
  if (!p || p.a <= 0.01) return;
  const U = app.L.U;
  const spr = glow(PALETTE.firefly);
  // blended normally: it rests on pale glass
  drawGlow(ctx, spr, p.x, p.y, HINT.sizeU * U * HINT.halo, HINT.haloAlpha * p.a);
  drawGlow(ctx, spr, p.x, p.y, HINT.sizeU * U, p.a);
  ctx.globalAlpha = 1;
}
