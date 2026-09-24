// Foreground grass in front of every stem base: thin curved blades in a few
// shades, darker and taller toward her, their tips catching the moon or sun.
// The breeze shows as a brighter band rolling across the tips. Blades are
// built once per layout and batched into a few paths each frame.
import { MOTION, COUNTS } from './config.js';
import { GRASS } from './config-ground.js';
import { TAU, mix, makeRng, clamp01, lerp } from './util.js';
import { breeze, seedBow, gust } from './wind.js';

export function buildGrass(app, bases) {
  const { L, theme, light } = app;
  const { W, H, U } = L;
  const G = GRASS;
  const rng = makeRng(app.seed ^ 0x62a5);
  const n = G.shades.length;
  const blades = G.shades.map(() => []);
  const add = (x, y, h) => {
    const depth = clamp01((y - L.groundY) / (H - L.groundY));
    blades[Math.min(n - 1, Math.floor(depth * n))].push({
      x, y, h, w: (U * rng.range(G.wU[0], G.wU[1]) * lerp(1, G.nearWide, depth)) / 2,
      bend: rng.range(G.curve[0], G.curve[1]) * h,
      hz: rng.range(G.swayHz[0], G.swayHz[1]), ph: x * MOTION.sway.phasePerPx + rng.range(0, TAU),
    });
  };
  const count = Math.round(W * G.perPx);
  for (let i = 0; i < count; i++) {
    const y = H * lerp(G.rootY[0], G.rootY[1], Math.pow(rng.next(), G.rootPow));
    const depth = clamp01((y - L.groundY) / (H - L.groundY));
    add(rng.range(0, W), y, U * lerp(G.hU[0], G.hU[1], (depth + rng.next()) / 2));
  }
  for (const bx of bases) {
    for (let k = 0; k < COUNTS.grassClump; k++) {
      add(bx + rng.range(-1, 1) * U * G.clumpSpreadU, H * rng.range(G.clumpRootY[0], G.clumpRootY[1]), U * rng.range(G.clumpHU[0], G.clumpHU[1]));
    }
  }
  const colors = G.shades.map(([gm, dk]) => mix(mix(theme.grass[0], theme.grass[1], gm), theme.ground, dk));
  const tips = colors.map((c, i) => mix(c, light.rimColor, G.tipMix[i]));
  const shine = colors.map((c, i) => mix(c, light.rimColor, G.tipMix[i] + G.shineMix));
  const scratch = blades.map((l) => ({ leans: new Float32Array(l.length), lit: new Uint8Array(l.length) }));
  return { blades, colors, tips, shine, scratch };
}

// One blade as a curved sliver; `part` draws only the top of it, for the lit tip.
function blade(ctx, b, lean, part) {
  const tx = b.x + lean + b.bend, ty = b.y - b.h;
  if (part) {
    const k = 1 - GRASS.tip;
    const bx = b.x + (lean * GRASS.tipCurve + b.bend * GRASS.bendCurve) * k, by = b.y - b.h * k;
    const w = b.w * GRASS.tip;
    ctx.moveTo(bx - w, by);
    ctx.quadraticCurveTo(bx - w * GRASS.edge + (tx - bx) * GRASS.tipCurve, by - (by - ty) * GRASS.tipCurve, tx, ty);
    ctx.quadraticCurveTo(bx + w * GRASS.edge + (tx - bx) * GRASS.tipCurve, by - (by - ty) * GRASS.tipCurve, bx + w, by);
    return;
  }
  const cx = b.x + lean * GRASS.tipCurve + b.bend * GRASS.bendCurve, cy = b.y - b.h * GRASS.tipCurve;
  ctx.moveTo(b.x - b.w, b.y);
  ctx.quadraticCurveTo(cx - b.w * GRASS.edge, cy, tx, ty);
  ctx.quadraticCurveTo(cx + b.w * GRASS.edge, cy, b.x + b.w, b.y);
}

export function drawGrass(ctx, app) {
  const g = app.grass;
  if (!g) return;
  const G = GRASS;
  const T = app.clock.T;
  const sway = app.L.U * G.swayU;
  for (let s = 0; s < g.blades.length; s++) {
    const list = g.blades[s];
    const { leans, lit } = g.scratch[s];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const br = breeze(b.x, T);
      const bow = seedBow(app, b.x) * G.bowLean + gust(app, b.x) * G.gustLean;
      leans[i] = sway * Math.sin(TAU * b.hz * T + b.ph) * br + bow * b.h;
      lit[i] = br > G.shineOver ? 1 : 0;
    }
    ctx.fillStyle = g.colors[s];
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) blade(ctx, list[i], leans[i], false);
    ctx.fill();
    for (const on of [0, 1]) {
      ctx.fillStyle = on ? g.shine[s] : g.tips[s];
      ctx.beginPath();
      for (let i = 0; i < list.length; i++) if (lit[i] === on) blade(ctx, list[i], leans[i], true);
      ctx.fill();
    }
  }
}
