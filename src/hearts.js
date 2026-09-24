// Hearts that float up from a tapped flower. Motion is a function of age.
import { HEARTS, HEART_CURVE, SIZE, PALETTE, MOTION, INPUT } from './config.js';
import { TAU, clamp01, easeOutBack, mix, darker, heartXY } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

const sprites = new Map();

// Classic heart curve, normalized to fit a unit box, drawn once per color.
function heartSprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const H = HEARTS;
  const px = H.px;
  const c = makeCanvas(px, px);
  const g = c.getContext('2d');
  const [hx, hy, hr] = H.highlight;
  const grad = g.createRadialGradient(px * hx, px * hy, 0, px * hx, px * hy, px * hr * 2);
  grad.addColorStop(0, mix(color, PALETTE.fantasyEdge, H.lightMix));
  grad.addColorStop(1, darker(color, H.shadeMix));
  g.fillStyle = grad;
  g.beginPath();
  const { steps, box, center } = HEART_CURVE;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = heartXY((i / steps) * TAU);
    const X = px / 2 + (x / box) * px;
    const Y = px * center + (y / box) * px;
    if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y);
  }
  g.fill();
  sprites.set(color, c);
  return c;
}

export function spawnHearts(app, f, x, y, r, gold) {
  const rng = app.live;
  const n = rng.int(INPUT.hearts[0], INPUT.hearts[1]);
  const H = HEARTS;
  const U = app.L.U;
  const colors = gold ? PALETTE.goldHearts : PALETTE.hearts;
  for (let i = 0; i < n; i++) {
    app.fx.hearts.push({
      t0: app.clock.T + i * H.stagger, x0: x + rng.range(-1, 1) * r * H.spreadR, y0: y - r * H.startR,
      rise: U * rng.range(H.riseU[0], H.riseU[1]), sway: U * rng.range(H.swayU[0], H.swayU[1]),
      hz: rng.range(H.swayHz[0], H.swayHz[1]), ph: rng.range(0, TAU),
      size: U * rng.range(SIZE.heartU[0], SIZE.heartU[1]), sprite: heartSprite(rng.pick(colors)),
      rot: rng.range(-1, 1) * H.wobble,
    });
  }
  if (app.fx.hearts.length > H.max) app.fx.hearts.splice(0, app.fx.hearts.length - H.max);
}

export function drawHearts(ctx, app) {
  const list = app.fx.hearts;
  if (!list.length) return;
  const { dpr } = app;
  const T = app.clock.T;
  const H = HEARTS;
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i];
    const age = T - h.t0;
    if (age < 0) continue;
    const p = age / H.life;
    if (p >= 1) { list.splice(i, 1); continue; }
    const x = h.x0 + h.sway * Math.sin(TAU * h.hz * age + h.ph) * clamp01(age / H.popS);
    const y = h.y0 - h.rise * age;
    const s = h.size * easeOutBack(clamp01(age / H.popS), MOTION.popOvershoot);
    const a = 1 - clamp01((p - H.fadeFrom) / (1 - H.fadeFrom));
    place(ctx, dpr, x, y, h.rot * Math.sin(TAU * h.hz * age), 1, 1);
    ctx.globalAlpha = a;
    ctx.drawImage(h.sprite, -s, -s, s * 2, s * 2);
  }
  resetTransform(ctx, dpr);
  ctx.globalAlpha = 1;
}

export function heartCount(app) {
  return app.fx.hearts.length;
}
