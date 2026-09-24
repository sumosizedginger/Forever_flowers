// The golden rose: a slow sheen sweeping across the cached head, kept inside
// the head by compositing on a small scratch canvas, and four point glints
// turning over the bloom.
import { GOLD, PALETTE } from './config.js';
import { TAU, rgba, mod, clamp01, lerp } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

let scratch = null;

export function drawSheen(ctx, app, f) {
  const c = f.headImage;
  if (!c || !c.canvas) return;
  const S = GOLD.sheen;
  const p = mod(app.clock.T / S.period, 1) * (1 + S.pause);
  if (p > 1) return;
  const pw = c.canvas.width, ph = c.canvas.height;
  if (!scratch || scratch.width !== pw || scratch.height !== ph) scratch = makeCanvas(pw, ph);
  const g = scratch.getContext('2d');
  g.globalCompositeOperation = 'copy';
  g.drawImage(c.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const at = -S.band + p * (1 + S.band * 2);
  const grad = g.createLinearGradient(0, 0, pw, ph);
  grad.addColorStop(clamp01(at - S.band), rgba(PALETTE.gold.edge, 0));
  grad.addColorStop(clamp01(at), rgba(PALETTE.gold.edge, S.alpha));
  grad.addColorStop(clamp01(at + S.band), rgba(PALETTE.gold.edge, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, pw, ph);
  g.globalCompositeOperation = 'source-over';
  place(ctx, app.dpr, f.hx, f.hy, f.ang, f.scale, f.scale);
  ctx.globalAlpha = 1;
  ctx.drawImage(scratch, c.x, c.y, c.w, c.h);
  resetTransform(ctx, app.dpr);
}

// Glints slowly turning over the bloom; rect is the head's place on screen.
export function drawGlints(ctx, app, f, sprite, rect) {
  const T = app.clock.T;
  const spin = T * GOLD.spinHz * TAU;
  for (const gl of f.glints) {
    const tw = Math.pow(0.5 + 0.5 * Math.sin(TAU * GOLD.glintHz * T + gl.ph), GOLD.glintPow);
    if (tw < GOLD.glintCut) continue;
    const ang = spin + gl.ang;
    const x = rect.cx + Math.cos(ang) * gl.rr * rect.hw;
    const y = rect.cy + rect.hh * GOLD.glintY + Math.sin(ang) * gl.rr * rect.hh * GOLD.glintSquash;
    const s = f.r * GOLD.glintSize * lerp(GOLD.glintMin, 1, tw);
    ctx.globalAlpha = tw * Math.min(1, f.openEff);
    ctx.drawImage(sprite, x - s, y - s, s * 2, s * 2);
  }
}
