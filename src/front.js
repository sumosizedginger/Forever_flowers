// The near side of the field: a few dark fronds rising from the bottom corners
// and soft out of focus lights drifting low, so the scene has a foreground.
import { FRONT } from './config-garden.js';
import { SHAPE, PALETTE } from './config.js';
import { TAU, makeRng, mix, darker, rgba } from './util.js';
import { makeCanvas, glow, drawGlow, place, resetTransform } from './sprites.js';

function frondSprite(theme) {
  const [w, h] = SHAPE.leaf.sprite;
  const [a, b, cc, d] = SHAPE.leaf.ctrl;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  g.fillStyle = darker(mix(theme.grass[0], theme.ground, FRONT.frondDark), FRONT.frondDark);
  g.beginPath();
  g.moveTo(m, h);
  g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, m, 0);
  g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
  g.fill();
  g.strokeStyle = rgba(mix(theme.grass[1], theme.moonRim, FRONT.rimMix), FRONT.rimAlpha);
  g.lineWidth = FRONT.rimW;
  g.beginPath();
  g.moveTo(m, 0);
  g.bezierCurveTo(m + m * cc, h * d, m + m * a, h * b, m, h);
  g.stroke();
  return c;
}

export function buildFront(app) {
  const { L, theme } = app;
  const rng = makeRng(app.seed ^ 0xf207);
  const fronds = FRONT.fronds.map(([fx, fy, lean, lenU]) => ({
    x: L.W * fx, y: L.H * fy, lean, len: lenU * L.U, ph: rng.range(0, TAU),
  }));
  const bokeh = Array.from({ length: FRONT.bokeh }, () => ({
    x: rng.range(0, L.W), y: L.H * rng.range(FRONT.bokehY[0], FRONT.bokehY[1]),
    r: L.U * rng.range(FRONT.bokehU[0], FRONT.bokehU[1]), a: rng.range(FRONT.bokehAlpha[0], FRONT.bokehAlpha[1]),
    hz: rng.range(FRONT.bokehHz[0], FRONT.bokehHz[1]), ph: rng.range(0, TAU),
  }));
  return { fronds, bokeh, sprite: frondSprite(theme) };
}

export function drawFront(ctx, app) {
  const fr = app.front;
  if (!fr) return;
  const { dpr, L } = app;
  const T = app.clock.T;
  const [sw, sh] = SHAPE.leaf.sprite;
  for (const f of fr.fronds) {
    const rot = f.lean + FRONT.frondSway * Math.sin(TAU * FRONT.frondHz * T + f.ph);
    const w = (f.len * sw) / sh;
    place(ctx, dpr, f.x, f.y, rot, 1, 1);
    ctx.drawImage(fr.sprite, -w / 2, -f.len, w, f.len);
  }
  resetTransform(ctx, dpr);
  // out of focus lights blend normally: they soften what is behind them, never add to white
  const spr = glow(PALETTE.firefly);
  const vis = app.theme.fireflies;
  if (vis <= 0.01) return;
  for (const b of fr.bokeh) {
    const x = b.x + Math.sin(TAU * b.hz * T + b.ph) * FRONT.bokehDriftU * L.U;
    drawGlow(ctx, spr, x, b.y, b.r, b.a * vis * app.fadeIn);
  }
}
