// Dark foreground grass drawn in front of every stem base. Blades are built
// once per layout and batched into one path per shade each frame.
import { WORLD, MOTION, COUNTS } from './config.js';
import { TAU, mix, makeRng, clamp01, lerp } from './util.js';
import { breeze, seedBow, gust } from './wind.js';

export function buildGrass(app, bases) {
  const { L, theme } = app;
  const { W, H, U } = L;
  const f = WORLD.front;
  const rng = makeRng(app.seed ^ 0x62a5);
  const shades = f.shades.length;
  const blades = f.shades.map(() => []);
  const add = (x, y, h) => {
    const depth = clamp01((y - L.groundY) / (H - L.groundY));
    const i = Math.min(shades - 1, Math.floor(depth * shades));
    blades[i].push({
      x, y, h, w: U * rng.range(f.wU[0], f.wU[1]) / 2,
      hz: rng.range(f.swayHz[0], f.swayHz[1]),
      ph: x * MOTION.sway.phasePerPx + rng.range(0, TAU),
    });
  };
  const n = Math.round(W * f.perPx);
  for (let i = 0; i < n; i++) {
    const y = H * lerp(f.rootY[0], f.rootY[1], Math.pow(rng.next(), f.rootPow));
    const depth = clamp01((y - L.groundY) / (H - L.groundY));
    add(rng.range(0, W), y, U * lerp(f.hU[0], f.hU[1], (depth + rng.next()) / 2));
  }
  for (const bx of bases) {
    for (let k = 0; k < COUNTS.grassClump; k++) {
      add(bx + rng.range(-1, 1) * U * f.clumpSpreadU, H * rng.range(f.clumpRootY[0], f.clumpRootY[1]), U * rng.range(f.clumpHU[0], f.clumpHU[1]));
    }
  }
  const colors = f.shades.map(([gm, dk]) => mix(mix(theme.grass[0], theme.grass[1], gm), theme.ground, dk));
  return { blades, colors };
}

export function drawGrass(ctx, app) {
  const g = app.grass;
  if (!g) return;
  const f = WORLD.front;
  const T = app.clock.T;
  const U = app.L.U;
  const sway = U * f.swayU;
  for (let s = 0; s < g.blades.length; s++) {
    ctx.fillStyle = g.colors[s];
    ctx.beginPath();
    for (const b of g.blades[s]) {
      const bow = seedBow(app, b.x) * f.bowLean + gust(app, b.x) * f.gustLean;
      const lean = sway * Math.sin(TAU * b.hz * T + b.ph) * breeze(b.x, T) + bow * b.h;
      const tipX = b.x + lean;
      const tipY = b.y - b.h;
      ctx.moveTo(b.x - b.w, b.y);
      ctx.quadraticCurveTo(b.x - b.w * f.baseCurve + lean * f.tipCurve, b.y - b.h * f.tipCurve, tipX, tipY);
      ctx.quadraticCurveTo(b.x + b.w * f.baseCurve + lean * f.tipCurve, b.y - b.h * f.tipCurve, b.x + b.w, b.y);
    }
    ctx.fill();
  }
}
