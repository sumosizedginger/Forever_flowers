// The golden rose's slow sheen: a soft band of light sweeping across the
// cached head, kept inside the head by compositing on a small scratch canvas.
import { GOLD, PALETTE } from './config.js';
import { rgba, mod, clamp01 } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

let scratch = null;

export function drawSheen(ctx, app, f) {
  const c = f.headImage;
  if (!c) return;
  const S = GOLD.sheen;
  const p = mod(app.clock.T / S.period, 1) * (1 + S.pause);
  if (p > 1) return;
  const px = c.canvas.width;
  if (!scratch || scratch.width !== px) scratch = makeCanvas(px, px);
  const g = scratch.getContext('2d');
  g.globalCompositeOperation = 'copy';
  g.drawImage(c.canvas, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  const at = -S.band + p * (1 + S.band * 2);
  const grad = g.createLinearGradient(0, 0, px, px);
  grad.addColorStop(clamp01(at - S.band), rgba(PALETTE.gold.edge, 0));
  grad.addColorStop(clamp01(at), rgba(PALETTE.gold.edge, S.alpha));
  grad.addColorStop(clamp01(at + S.band), rgba(PALETTE.gold.edge, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  g.globalCompositeOperation = 'source-over';
  place(ctx, app.dpr, f.hx, f.hy, f.ang, f.scale, f.scale);
  ctx.globalAlpha = 1;
  ctx.drawImage(scratch, -c.r, -c.r, c.r * 2, c.r * 2);
  resetTransform(ctx, app.dpr);
}
