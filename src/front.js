// The near side of the field, right at the lens: soft out of focus blades
// rising from the bottom corners, two blurred flowers, and drifting lights.
// Each is rendered small and scaled up, which blurs it for free, and tinted by
// the time of day so nothing turns into a black cutout under a light sky.
import { LENS } from './config-ground.js';
import { SHAPE, BEATS, WAKE } from './config.js';
import { TAU, makeRng, mix, win, smooth } from './util.js';
import { makeCanvas, glow, drawGlow, place, resetTransform } from './sprites.js';
import { makePose } from './light3d.js';
import { renderHead } from './petal3d.js';
import { daisyModel, daisyParts, cosmosModel, cosmosParts } from './models.js';

const isDay = (theme) => theme.stars < 0.5;

function frondSprite(theme, light) {
  const T = isDay(theme) ? LENS.day : LENS.night;
  const [w, h] = LENS.small;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const [a, b, cc, d] = SHAPE.leaf.ctrl;
  const m = w / 2;
  const body = mix(mix(theme.grass[0], theme.leaf[0], T.mix), theme.leaf[1], T.lift);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, body);
  grad.addColorStop(1, mix(body, light.rimColor, T.rim));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(m, h);
  g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, m, 0);
  g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
  g.fill();
  return c;
}

function lensFlower(app, spec, rng) {
  const px = LENS.flowerPx;
  const c = makeCanvas(px * 4, px * 4);
  const g = c.getContext('2d');
  const f = { petalRot: rng.range(0, TAU), color: rng.int(0, 2) };
  f.model = spec.species === 'daisy' ? daisyModel(rng) : cosmosModel(rng);
  const parts = spec.species === 'daisy' ? daisyParts(f, 1, app.theme, true) : cosmosParts(f, 1, app.theme, true);
  g.translate(px * 2, px * 2);
  renderHead(g, parts, makePose(f.model.pitch, f.model.yaw), app.light, px);
  return { ...spec, canvas: c, ph: rng.range(0, TAU) };
}

export function buildFront(app) {
  const { L, theme } = app;
  const rng = makeRng(app.seed ^ 0xf207);
  const fronds = LENS.fronds.map(([fx, fy, lean, lenU]) => ({
    x: L.W * fx, y: L.H * fy, lean, len: lenU * L.U, ph: rng.range(0, TAU),
  }));
  const colors = isDay(theme) ? LENS.bokehColors.day : LENS.bokehColors.night;
  const bokeh = Array.from({ length: LENS.bokeh }, () => ({
    x: rng.range(0, L.W), y: L.H * rng.range(LENS.bokehY[0], LENS.bokehY[1]),
    r: L.U * rng.range(LENS.bokehU[0], LENS.bokehU[1]), a: rng.range(LENS.bokehAlpha[0], LENS.bokehAlpha[1]),
    hz: rng.range(LENS.bokehHz[0], LENS.bokehHz[1]), ph: rng.range(0, TAU), sprite: glow(rng.pick(colors)),
  }));
  const flowers = LENS.flowers.map((spec) => lensFlower(app, spec, rng));
  return { fronds, bokeh, flowers, sprite: frondSprite(theme, app.light) };
}

export function drawFront(ctx, app) {
  const fr = app.front;
  if (!fr) return;
  const { dpr, L } = app;
  const T = app.clock.T;
  const [sw, sh] = LENS.small;
  for (const f of fr.fronds) {
    const rot = f.lean + LENS.frondSway * Math.sin(TAU * LENS.frondHz * T + f.ph);
    const w = (f.len * sw) / sh;
    place(ctx, dpr, f.x, f.y, rot, 1, 1);
    ctx.drawImage(fr.sprite, -w / 2, -f.len, w, f.len);
  }
  // the flowers at the lens bloom in with her favorites
  const fa = isDay(app.theme) ? LENS.flowerAlpha.day : LENS.flowerAlpha.night;
  const bloom = app.show.mode === 'wake' ? win(app.s, 0, WAKE.span) : win(app.s, BEATS.favBloom.start, BEATS.favBloom.dur);
  ctx.globalAlpha = fa * app.fadeIn * smooth(bloom);
  for (const f of fr.flowers) {
    const r = f.rU * L.U;
    place(ctx, dpr, L.W * f.x, L.H * f.y, f.rot + LENS.flowerSway * Math.sin(TAU * LENS.flowerHz * T + f.ph), 1, 1);
    ctx.drawImage(f.canvas, -r * 2, -r * 2, r * 4, r * 4);
  }
  ctx.globalAlpha = 1;
  resetTransform(ctx, dpr);
  // out of focus lights blend normally: they soften what is behind them, never add to white
  const vis = Math.max(app.theme.fireflies, app.theme.pollen * LENS.bokehAlpha[0]);
  if (vis <= 0.01) return;
  for (const b of fr.bokeh) {
    const x = b.x + Math.sin(TAU * b.hz * T + b.ph) * LENS.bokehDriftU * L.U;
    drawGlow(ctx, b.sprite, x, b.y, b.r, b.a * vis * app.fadeIn);
  }
}

