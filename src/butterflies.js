// Two butterflies drifting in after the exhale. Paths are smooth functions of
// time; wings are one cached sprite per butterfly, mirrored and flapped.
import { BUTTERFLY, BEATS, WAKE, PALETTE, MOTION } from './config.js';
import { TAU, makeRng, lerp, clamp, smooth, mix, darker, rgba } from './util.js';
import { makeCanvas, glow, drawGlow, resetTransform } from './sprites.js';

// One side's pair of wings: deep at the body, the color, a light flush, then a
// dark border with pale spots, and fine veins. Drawn once per butterfly.
function wingSprite(colors) {
  const B = BUTTERFLY;
  const W = B.wing;
  const px = B.px;
  const c = makeCanvas(px, px * 2);
  const g = c.getContext('2d');
  const shape = (pts, [sx, sy]) => {
    const P = pts.map(([x, y]) => [px * sx * x, px + px * sy * y]);
    g.moveTo(0, px);
    g.bezierCurveTo(P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1]);
    g.quadraticCurveTo(P[3][0], P[3][1], 0, px);
    return P;
  };
  const grad = g.createRadialGradient(0, px, 0, 0, px, px * W.reach);
  grad.addColorStop(0, darker(colors[1], W.root));
  grad.addColorStop(W.colorAt, colors[1]);
  grad.addColorStop(W.flushAt, mix(colors[0], PALETTE.fantasyEdge, B.edgeMix));
  grad.addColorStop(1, colors[0]);
  g.fillStyle = grad;
  g.beginPath();
  const up = shape(B.up, B.upper);
  const low = shape(B.low, B.lower);
  g.fill();
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = rgba(B.body, W.borderAlpha);
  g.lineWidth = W.borderW;
  g.beginPath();
  shape(B.up, B.upper);
  shape(B.low, B.lower);
  g.stroke();
  g.strokeStyle = rgba(darker(colors[1], W.root), W.veinAlpha);
  g.lineWidth = W.veinW;
  g.beginPath();
  for (const [x, y] of [up[0], up[1], up[2], low[1], low[2]]) {
    g.moveTo(0, px);
    g.quadraticCurveTo(x * W.veinBend, px + (y - px) * W.veinBend * W.veinLift, x * W.veinReach, px + (y - px) * W.veinReach);
  }
  g.stroke();
  g.fillStyle = rgba(PALETTE.fantasyEdge, W.spotAlpha);
  g.beginPath();
  for (const [x, y] of [up[1], up[2], low[1]]) {
    const sx = x * W.spotAt, sy = px + (y - px) * W.spotAt;
    g.moveTo(sx + W.spotR, sy);
    g.arc(sx, sy, W.spotR, 0, TAU);
  }
  g.fill();
  g.globalCompositeOperation = 'source-over';
  return c;
}

export function buildButterflies(app) {
  const rng = makeRng(app.seed ^ 0xb077);
  const B = BUTTERFLY;
  const j = B.wander.jitter;
  return PALETTE.butterflies.map((colors, i) => ({
    i, colors, sprite: wingSprite(colors),
    flap: rng.range(B.flapHz[0], B.flapHz[1]),
    f: B.wanderHz[i].map((hz) => hz * rng.range(1 - j, 1 + j)),
    p: [rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)],
    fromLeft: i === 0,
  }));
}

function wander(app, b, t) {
  const L = app.L;
  const W = BUTTERFLY.wander;
  const [y0, y1] = BUTTERFLY.region;
  const cx = L.fieldL + L.fieldW / 2;
  const cy = (L.H * (y0 + y1)) / 2;
  const ay = (L.H * (y1 - y0)) / 2;
  const [f1, f2] = b.f;
  const x = cx + L.fieldW * W.ax * (W.mixX[0] * Math.sin(TAU * f1 * t + b.p[0]) + W.mixX[1] * Math.sin(TAU * f2 * W.mulX * t + b.p[1]));
  const y = cy + ay * (W.mixY[0] * Math.sin(TAU * f2 * t + b.p[2]) + W.mixY[1] * Math.sin(TAU * f1 * W.mulY * t + b.p[3]));
  return [x, y];
}

function position(app, b, t, s, enter) {
  const L = app.L;
  const B = BUTTERFLY;
  const [wx, wy] = wander(app, b, t);
  const e = smooth((s - enter) / B.enterS);
  const sx = b.fromLeft ? -L.U * 2 : L.W + L.U * 2;
  const sy = L.H * B.region[0];
  const bob = Math.sin(TAU * B.bob[0] * t + b.p[0]) * L.U * B.bob[1];
  return [lerp(sx, wx, e), lerp(sy, wy, e) + bob];
}

export function drawButterflies(ctx, app) {
  const list = app.butterflies;
  if (!list) return;
  const { dpr, L } = app;
  const T = app.clock.T;
  const s = app.s;
  const times = app.show.mode === 'wake' ? WAKE.butterflies : BEATS.butterflies;
  const B = BUTTERFLY;
  const span = L.U * B.spanU;
  const px = B.px;
  const dt = MOTION.dtMax / 2;
  for (const b of list) {
    const enter = times[b.i];
    if (s < enter) continue;
    const [x, y] = position(app, b, T, s, enter);
    const [x2] = position(app, b, T + dt, s + dt, enter);
    const tilt = clamp((x2 - x) / (L.U * dt), -1, 1) * B.tilt;
    const open = lerp(B.fold, 1, Math.abs(Math.sin(Math.PI * b.flap * T)));
    // a faint soft light behind, blended normally so it never adds toward white
    drawGlow(ctx, glow(b.colors[0]), x, y, L.U * B.glowU, B.glowAlpha * app.theme.fireflies);
    ctx.globalAlpha = 1;
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    const k = span / px;
    for (const side of [1, -1]) {
      const sx = side * open * k;
      ctx.setTransform(dpr * cs * sx, dpr * sn * sx, -dpr * sn * k, dpr * cs * k, dpr * x, dpr * y);
      ctx.drawImage(b.sprite, 0, -px, px, px * 2);
    }
    ctx.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * x, dpr * y);
    ctx.fillStyle = B.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, span * B.bodyW, span * B.bodyL, 0, 0, TAU);
    ctx.fill();
    resetTransform(ctx, dpr);
  }
}
