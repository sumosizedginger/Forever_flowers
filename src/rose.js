// Roses: layered petals around a deep spiral, bases darker and edges lighter.
// A closed bud unfolds layer by layer, outer layers first. Once a bloom holds
// still the head is served from a cached sprite.
import { SHAPE, PALETTE, GOLD, TUNE } from './config.js';
import { TAU, mix, darker, rgba, clamp01, lerp, smooth } from './util.js';

export function roseColors(theme, name, gold) {
  const R = SHAPE.rose;
  if (gold) {
    const G = PALETTE.gold;
    return { deep: darker(G.base, GOLD.deep), base: G.base, mid: G.mid, edge: G.edge, line: darker(G.base, R.lineDark), gold: true };
  }
  const c = theme.roses[name];
  return {
    deep: darker(c, R.deep), base: darker(c, R.base), mid: c, edge: mix(c, R.edgeTo, R.edge),
    line: darker(c, R.lineDark), gold: false,
  };
}

function petalPath(g, len, half, rot) {
  const [a0, a1, b0, b1, c0, c1, tip] = SHAPE.rose.ctrl;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const X = (u, v) => u * cs - v * sn;
  const Y = (u, v) => u * sn + v * cs;
  g.moveTo(0, 0);
  g.bezierCurveTo(X(len * a0, -half * a1), Y(len * a0, -half * a1), X(len * b0, -half * b1), Y(len * b0, -half * b1), X(len * c0, -half * c1), Y(len * c0, -half * c1));
  g.quadraticCurveTo(X(len * tip, 0), Y(len * tip, 0), X(len * c0, half * c1), Y(len * c0, half * c1));
  g.bezierCurveTo(X(len * b0, half * b1), Y(len * b0, half * b1), X(len * a0, half * a1), Y(len * a0, half * a1), 0, 0);
}

function layerGradient(g, rad, col) {
  const R = SHAPE.rose;
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, rad);
  if (col.gold) {
    const seq = [col.deep, col.base, col.mid, col.edge, col.mid, col.edge];
    R.goldStops.forEach((at, i) => grad.addColorStop(at, seq[i]));
  } else {
    const seq = [col.deep, col.base, col.mid, col.edge];
    R.stops.forEach((at, i) => grad.addColorStop(at, seq[i]));
  }
  return grad;
}

function sepals(g, r, open, theme) {
  const R = SHAPE.rose;
  const a = 1 - smooth(open * R.sepalFade);
  if (a <= 0.01) return;
  g.globalAlpha = a;
  g.fillStyle = theme.leaf[1];
  for (const ang of R.sepals) {
    const len = r * R.sepalLen, half = r * R.sepalW;
    const rot = Math.PI / 2 + ang;
    g.save();
    g.translate(0, r * R.sepalDrop);
    g.rotate(rot + Math.PI);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len / 2, -half, len, 0);
    g.quadraticCurveTo(len / 2, half, 0, 0);
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
}

// Draw a rose head centered at the origin, radius r, opening 0 (bud) to 1 (and a little past).
export function drawRose(g, f, r, open, col, theme) {
  const R = SHAPE.rose;
  const layers = f.layers;
  const K = layers - 1;
  const o = Math.max(0, open);
  const over = o > 1 ? o - 1 : 0;
  const sy = lerp(R.budStretch, R.squash, smooth(Math.min(o, 1)));
  sepals(g, r, o, theme);
  g.save();
  g.scale(1, sy);
  for (let k = 0; k < layers; k++) {
    const p = Math.min(1, clamp01(Math.min(o, 1) * (1 + K * R.lag) - k * R.lag)) + over;
    const bud = R.budR * (1 - k * R.budShrink);
    const rad = r * lerp(bud, R.layerR[k], smooth(Math.min(p, 1))) * (1 + over);
    const n = R.petals[k];
    const half = rad * Math.sin(Math.PI / n) * R.spread;
    const rot0 = f.petalRot + k * R.twist;
    g.fillStyle = layerGradient(g, rad, col);
    g.strokeStyle = rgba(col.line, R.lineAlpha);
    g.lineWidth = r * R.lineW;
    for (let j = 0; j < n; j++) {
      g.beginPath();
      petalPath(g, rad, half, rot0 + (j * TAU) / n);
      g.fill();
      g.stroke();
    }
  }
  // the spiral center
  const sr = r * R.spiralR * lerp(R.budR, 1, smooth(Math.min(o, 1)));
  g.strokeStyle = col.deep;
  g.lineWidth = r * R.spiralW;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= R.spiralSteps; i++) {
    const t = i / R.spiralSteps;
    const ang = f.petalRot + t * R.spiralTurns * TAU;
    const rr = sr * t;
    if (i === 0) g.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    else g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  g.stroke();
  g.fillStyle = col.deep;
  g.beginPath();
  g.arc(0, 0, r * R.coreR, 0, TAU);
  g.fill();
  g.restore();
}

export function roseKey(f, open, theme) {
  return `${open.toFixed(3)}|${theme.name}|${f.gold ? 1 : 0}|${f.r.toFixed(2)}|${TUNE.overshoot}`;
}

// Gold glints: small twinkling stars slowly rotating over the cached head.
export function drawGlints(ctx, app, f, sprite) {
  const T = app.clock.T;
  const spin = T * GOLD.spinHz * TAU;
  for (const gl of f.glints) {
    const tw = Math.pow(0.5 + 0.5 * Math.sin(TAU * GOLD.glintHz * T + gl.ph), GOLD.glintPow);
    if (tw < GOLD.glintCut) continue;
    const ang = spin + gl.ang;
    const x = f.hx + Math.cos(ang) * gl.rr * f.r;
    const y = f.hy + Math.sin(ang) * gl.rr * f.r * SHAPE.rose.squash;
    const s = f.r * GOLD.glintSize * lerp(GOLD.glintMin, 1, tw);
    ctx.globalAlpha = tw * clamp01(f.openEff);
    ctx.drawImage(sprite, x - s, y - s, s * 2, s * 2);
  }
}
