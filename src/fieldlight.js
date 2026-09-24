// The glass flower's light falling on the flowers near it. Each lit head gets
// copies of its own image washed in the glass colors and the heart's pink,
// bright on the side that faces the glass flower. They are drawn over the head
// at the strength of the core's light, crossfaded with the glass's color
// cycle; while the heart is out every flower blushes pink.
import { FIELD_LIGHT } from './config-flora.js';
import { PALETTE, TUNE, FANTASY } from './config.js';
import { rgba, smooth, mod, clamp01 } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

const COLORS = PALETTE.fantasy.concat(PALETTE.hearts[0]);

// 0 to 1: how much of the glass flower's light reaches this head.
function reach(app, f) {
  const fa = app.fantasy;
  if (!fa || fa.hx === undefined) return 0;
  const d = Math.hypot(fa.hx - f.hx, fa.hy - f.hy) / (FIELD_LIGHT.rangeU * app.L.U);
  return d >= 1 ? 0 : Math.pow(1 - d, FIELD_LIGHT.fall);
}

function masks(c, f, app) {
  const fa = app.fantasy;
  const dx = fa.restX - f.x, dy = fa.restY - (f.baseY - f.h);
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n, uy = dy / n;
  const key = `${c.key}|${Math.round(ux * FIELD_LIGHT.dirSteps)}|${Math.round(uy * FIELD_LIGHT.dirSteps)}`;
  if (c.maskKey === key) return c.masks;
  const w = c.canvas.width, h = c.canvas.height;
  const R = Math.max(w, h) / 2;
  c.masks = COLORS.map((col, i) => {
    const old = c.masks && c.masks[i];
    const m = old && old.width === w && old.height === h ? old : makeCanvas(w, h);
    const g = m.getContext('2d');
    g.globalCompositeOperation = 'copy';
    g.drawImage(c.canvas, 0, 0);
    g.globalCompositeOperation = 'source-in';
    const grad = g.createLinearGradient(w / 2 + ux * R, h / 2 + uy * R, w / 2 - ux * R, h / 2 - uy * R);
    grad.addColorStop(0, rgba(col, 1));
    grad.addColorStop(1, rgba(col, FIELD_LIGHT.far));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    return m;
  });
  c.maskKey = key;
  return c.masks;
}

// Called right after a head is drawn with scale s; c is its cached image.
export function drawFieldLight(ctx, app, f, c, s) {
  if (c.lod || f.far) return;
  const fa = app.fantasy;
  const hs = app.heart || {};
  const heart = hs.react || 0;
  const flare = hs.flare || 0;
  const k = reach(app, f);
  const base = FIELD_LIGHT.alpha * TUNE.glow * app.theme.glow * (f.fade === undefined ? 1 : f.fade);
  const glass = base * k * fa.core * (1 + FIELD_LIGHT.flareBoost * flare) * (1 - heart);
  const pink = base * Math.max(k, FIELD_LIGHT.heartFloor) * heart;
  if (glass <= FIELD_LIGHT.min && pink <= FIELD_LIGHT.min) return;
  app.fieldLit = Math.max(app.fieldLit || 0, glass, pink);
  const M = masks(c, f, app);
  const nC = PALETTE.fantasy.length;
  const P = mod((app.clock.T / FANTASY.cycleS) * nC, nC);
  const a = Math.floor(P), w = smooth(P - a);
  place(ctx, app.dpr, f.hx, f.hy, f.ang, s, s);
  if (glass > FIELD_LIGHT.min) {
    ctx.globalAlpha = clamp01(glass) * (1 - w);
    ctx.drawImage(M[a], c.x, c.y, c.w, c.h);
    ctx.globalAlpha = clamp01(glass) * w;
    ctx.drawImage(M[(a + 1) % nC], c.x, c.y, c.w, c.h);
  }
  if (pink > FIELD_LIGHT.min) {
    ctx.globalAlpha = clamp01(pink);
    ctx.drawImage(M[nC], c.x, c.y, c.w, c.h);
  }
  ctx.globalAlpha = 1;
  resetTransform(ctx, app.dpr);
}
