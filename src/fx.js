// The falling seed and its pulse ring, fireflies at night, pollen by day.
import { BEATS, WAKE, SEED, FIREFLY, POLLEN, MOTION, PALETTE, INPUT } from './config.js';
import { TAU, makeRng, lerp, clamp01, win, easeInCubic, easeOutCubic, rgba, mod } from './util.js';
import { glow, drawGlow, streakSprite, place, resetTransform } from './sprites.js';

export function drawSeed(ctx, app) {
  if (app.show.mode !== 'full') return;
  const s = app.s;
  const B = BEATS.seed;
  const P = BEATS.pulse;
  if (s < B.appear || s > B.land + SEED.sink) return;
  const { L, dpr } = app;
  const U = L.U;
  const x = L.cx;
  const p = win(s, B.appear, B.land - B.appear);
  const y = lerp(L.H * B.startY, L.groundY, easeInCubic(p));
  const appear = clamp01((s - B.appear) / SEED.appearS);
  const after = s - B.land;
  const fade = after > 0 ? 1 - clamp01(after / SEED.sink) : 1;
  const flash = after > 0 ? Math.exp(-after / SEED.flashS) : 0;
  // blended normally: the seed lands right where the fantasy bud begins to grow
  ctx.globalCompositeOperation = 'source-over';
  if (after < 0) {
    const len = U * B.trailU * p * p;
    if (len > 1) {
      place(ctx, dpr, x, y, -Math.PI / 2, 1, 1);
      ctx.globalAlpha = appear * SEED.glowAlpha;
      ctx.drawImage(streakSprite(PALETTE.seed), -len, -U * SEED.trailW / 2, len, U * SEED.trailW);
      resetTransform(ctx, dpr);
    }
  }
  drawGlow(ctx, glow(PALETTE.seed), x, y, U * SEED.glowU * (1 + flash * SEED.flashGrow), SEED.glowAlpha * appear * fade + flash * SEED.flashAlpha);
  const q = win(s, P.start, P.dur);
  if (q > 0 && q < 1) {
    const rr = U * P.radiusU * easeOutCubic(q);
    ctx.strokeStyle = rgba(SEED.ringColor, P.alpha * (1 - q));
    ctx.lineWidth = SEED.ringW;
    ctx.beginPath();
    ctx.ellipse(x, L.groundY, rr, rr * SEED.ringSquash, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = appear * fade;
  ctx.fillStyle = PALETTE.seedCore;
  ctx.beginPath();
  ctx.arc(x, y, U * SEED.coreU, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function buildFireflies(app) {
  const { L } = app;
  const U = L.U;
  const F = MOTION.fireflies;
  const rng = makeRng(app.seed ^ 0xf1f1);
  const n = rng.int(F.count[0], F.count[1]);
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({
      hx: rng.range(L.wildL, L.wildL + L.wildW), hy: L.H * rng.range(FIREFLY.yRange[0], FIREFLY.yRange[1]),
      R: U * rng.range(F.driftU[0], F.driftU[1]),
      wx: TAU * rng.range(F.wanderHz[0], F.wanderHz[1]), wy: TAU * rng.range(F.wanderHz[0], F.wanderHz[1]),
      px: rng.range(0, TAU), py: rng.range(0, TAU),
      hz: rng.range(F.hz[0], F.hz[1]), ph: rng.range(0, TAU), size: U * rng.range(F.sizeU[0], F.sizeU[1]),
    });
  }
  const pollen = [];
  const P = MOTION.pollen;
  for (let i = 0; i < P.count; i++) {
    pollen.push({
      x0: rng.range(0, L.W), y0: rng.range(0, 1), R: U * rng.range(P.driftU[0], P.driftU[1]),
      hz: rng.range(POLLEN.hz[0], POLLEN.hz[1]), ph: rng.range(0, TAU), rise: rng.range(POLLEN.riseMul[0], POLLEN.riseMul[1]),
      size: U * rng.range(POLLEN.sizeU[0], POLLEN.sizeU[1]),
    });
  }
  return { list, pollen };
}

function fireflyVis(app) {
  const s = app.s;
  const up = app.show.mode === 'wake' ? win(s, WAKE.fireflies[0], WAKE.fireflies[1]) : win(s, BEATS.fireflies[0], BEATS.fireflies[1]);
  return up * lerp(1, INPUT.dimFireflies, app.dimLevel);
}

export function drawFireflies(ctx, app) {
  const ff = app.fireflies;
  const vis = fireflyVis(app) * app.theme.fireflies;
  if (!ff || vis <= 0.01) return;
  const T = app.clock.T;
  const spr = glow(PALETTE.firefly);
  const F = FIREFLY;
  ctx.globalCompositeOperation = app.theme.glowBlend;
  for (const f of ff.list) {
    const x = f.hx + f.R * Math.sin(f.wx * T + f.px);
    const y = f.hy + f.R * F.ySquash * Math.sin(f.wy * T + f.py);
    const pulse = Math.pow((1 + Math.sin(TAU * f.hz * T + f.ph)) / 2, F.pulsePow);
    drawGlow(ctx, spr, x, y, f.size * F.haloMul, Math.min(MOTION.glowMax, F.haloAlpha * pulse * vis));
    drawGlow(ctx, spr, x, y, f.size * F.coreMul, F.coreAlpha * pulse * vis);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function drawPollen(ctx, app) {
  const ff = app.fireflies;
  const vis = fireflyVis(app) * app.theme.pollen;
  if (!ff || vis <= 0.01) return;
  const { L } = app;
  const T = app.clock.T;
  const spr = glow(PALETTE.pollen);
  const [y0, y1] = POLLEN.yRange;
  const span = (y1 - y0) * L.H;
  for (const p of ff.pollen) {
    const y = L.H * y0 + mod(p.y0 * span - POLLEN.riseU * L.U * p.rise * T, span);
    const x = p.x0 + p.R * Math.sin(TAU * p.hz * T + p.ph);
    drawGlow(ctx, spr, x, y, p.size, POLLEN.alpha * vis);
  }
}
