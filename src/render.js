// The frame, back to front.
import { PALETTE } from './config.js';
import { resetTransform } from './sprites.js';
import { drawStars, drawMoon, drawShooting } from './sky.js';
import { drawGrass } from './grass.js';

const layers = { mid: [], front: [], top: [] };

// Later modules register draw passes: mid sits between sky and grass,
// front sits in front of the grass, top is drawn over the dim overlay.
export function addLayer(where, fn) { layers[where].push(fn); }

export function render(app) {
  const { ctx, dpr, L } = app;
  resetTransform(ctx, dpr);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.drawImage(app.bg, 0, 0, L.W, L.H);
  if (app.bgPrev && app.bgMix < 1) {
    ctx.globalAlpha = 1 - app.bgMix;
    ctx.drawImage(app.bgPrev, 0, 0, L.W, L.H);
    ctx.globalAlpha = 1;
  }

  ctx.globalCompositeOperation = 'lighter';
  drawStars(ctx, app, app.starReveal);
  ctx.globalCompositeOperation = 'source-over';
  drawMoon(ctx, app);
  ctx.globalCompositeOperation = 'lighter';
  drawShooting(ctx, app);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  for (const fn of layers.mid) { fn(ctx, app); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; resetTransform(ctx, dpr); }
  drawGrass(ctx, app);
  for (const fn of layers.front) { fn(ctx, app); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; resetTransform(ctx, dpr); }

  if (app.overlay > 0.002) {
    ctx.globalAlpha = Math.min(1, app.overlay);
    ctx.fillStyle = PALETTE.black;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.globalAlpha = 1;
  }
  for (const fn of layers.top) { fn(ctx, app); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; resetTransform(ctx, dpr); }
}
