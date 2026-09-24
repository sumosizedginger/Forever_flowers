// Stems are cubic curves that grow from the base and bend with sway, lean
// and gust. Leaves are one cached sprite drawn with a transform as they unfurl.
import { SHAPE, MOTION, TUNE } from './config.js';
import { FAVS } from './config-garden.js';
import { rgba, darker, clamp01, lerp, easeOutBack } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

// Compute the stem for displacement D (px at the head) and growth g.
// Writes f.full (the whole curve) and f.stem (the grown part), and the head pose.
export function shapeStem(f, D, g) {
  const S = SHAPE.stem;
  const h = f.h, x0 = f.x, y0 = f.baseY;
  const rest = f.bend * h * S.restLean;
  const p = f.full || (f.full = new Float32Array(8));
  p[0] = x0; p[1] = y0;
  p[2] = x0 + f.bend * h * S.c1Bend + D * S.c1Follow; p[3] = y0 - h * S.c1Y;
  p[4] = x0 + rest * S.c2Rest + D * S.c2Follow; p[5] = y0 - h * S.c2Y;
  p[6] = x0 + rest + D; p[7] = y0 - h + ((D * D) / (2 * h)) * S.arcDrop;
  const q = f.stem || (f.stem = new Float32Array(8));
  const u = 1 - g;
  const ax = p[0] + (p[2] - p[0]) * g, ay = p[1] + (p[3] - p[1]) * g;
  const bx = p[2] + (p[4] - p[2]) * g, by = p[3] + (p[5] - p[3]) * g;
  const cx = p[4] + (p[6] - p[4]) * g, cy = p[5] + (p[7] - p[5]) * g;
  const dx = ax + (bx - ax) * g, dy = ay + (by - ay) * g;
  const ex = bx + (cx - bx) * g, ey = by + (cy - by) * g;
  q[0] = p[0]; q[1] = p[1]; q[2] = ax; q[3] = ay; q[4] = dx; q[5] = dy;
  q[6] = dx + (ex - dx) * g; q[7] = dy + (ey - dy) * g;
  // tangent at g on the full curve
  const tx = 3 * (u * u * (p[2] - p[0]) + 2 * u * g * (p[4] - p[2]) + g * g * (p[6] - p[4]));
  const ty = 3 * (u * u * (p[3] - p[1]) + 2 * u * g * (p[5] - p[3]) + g * g * (p[7] - p[5]));
  f.hx = q[6];
  f.hy = q[7];
  f.stemAng = Math.atan2(tx, -ty);
}

export function pointAt(p, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  const tx = 3 * (u * u * (p[2] - p[0]) + 2 * u * t * (p[4] - p[2]) + t * t * (p[6] - p[4]));
  const ty = 3 * (u * u * (p[3] - p[1]) + 2 * u * t * (p[5] - p[3]) + t * t * (p[7] - p[5]));
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7], Math.atan2(tx, -ty)];
}

function stemPath(ctx, list, dx) {
  let any = false;
  for (const f of list) {
    if (f.grow <= 0 || f.gone) continue;
    const q = f.stem;
    ctx.moveTo(q[0] + dx, q[1]);
    ctx.bezierCurveTo(q[2] + dx, q[3], q[4] + dx, q[5], q[6] + dx, q[7]);
    any = true;
  }
  return any;
}

// A thin line of moonlight down the right edge of each stem.
function rimLine(ctx, list, width, color, dx) {
  const R = SHAPE.stemRim;
  ctx.strokeStyle = rgba(color, R.alpha);
  ctx.lineWidth = width * R.w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (stemPath(ctx, list, dx)) ctx.stroke();
}

// All stems of one width and color in a single stroke, with an optional moonlit edge.
export function strokeStems(ctx, list, width, color, rim) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (!stemPath(ctx, list, 0)) return;
  ctx.stroke();
  if (rim) rimLine(ctx, list, width, rim, width * SHAPE.stemRim.dx);
}

// Thicker stems that taper from base to head, filled as one path.
export function fillTapered(ctx, list, w0, w1, color, rim) {
  const n = SHAPE.stemTaper.steps;
  ctx.fillStyle = color;
  ctx.beginPath();
  let any = false;
  for (const f of list) {
    if (f.grow <= 0 || f.gone) continue;
    const q = f.stem;
    const side = [];
    for (let i = 0; i <= n; i++) {
      const [x, y, ang] = pointAt(q, i / n);
      const w = lerp(w0, lerp(w0, w1, f.grow), i / n) / 2;
      side.push([x, y, Math.cos(ang) * w, Math.sin(ang) * w]);
      if (i === 0) ctx.moveTo(x - side[0][2], y - side[0][3]);
      else ctx.lineTo(x - side[i][2], y - side[i][3]);
    }
    for (let i = n; i >= 0; i--) ctx.lineTo(side[i][0] + side[i][2], side[i][1] + side[i][3]);
    ctx.closePath();
    any = true;
  }
  if (!any) return;
  ctx.fill();
  if (rim) rimLine(ctx, list, w1, rim, (w0 + w1) * SHAPE.stemRim.dx / 2);
}

export function makeLeaves(rng, spec, U) {
  const n = rng.int(spec.count[0], spec.count[1]);
  const leaves = [];
  let side = rng.sign();
  for (let i = 0; i < n; i++) {
    const at = lerp(spec.at[0], spec.at[1], n === 1 ? rng.next() : i / (n - 1));
    leaves.push({ at, side, len: rng.range(spec.lenU[0], spec.lenU[1]), open: rng.range(SHAPE.leaf.open[0], SHAPE.leaf.open[1]) });
    side = -side;
  }
  return leaves;
}

export function buildLeafSprite(theme) {
  const L = SHAPE.leaf;
  const [w, h] = L.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const [a, b, cc, d] = L.ctrl;
  const m = w / 2;
  const grad = g.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, theme.leaf[0]);
  grad.addColorStop(1, theme.leaf[1]);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(m, h);
  g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, m, 0);
  g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
  g.fill();
  g.strokeStyle = rgba(darker(theme.leaf[0], L.ribDark), L.ribAlpha);
  g.lineWidth = L.ribW;
  g.beginPath();
  g.moveTo(m, h);
  g.lineTo(m, h * (1 - L.rib));
  g.stroke();
  return c;
}

// Cosmos leaves: a thin midrib with fine threadlike leaflets, like a feather.
export function buildFeatherSprite(theme) {
  const F = FAVS.feather;
  const [w, h] = F.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  const bow = w * F.droop;
  g.strokeStyle = theme.feather;
  g.lineCap = 'round';
  g.lineWidth = F.rachisW;
  g.beginPath();
  g.moveTo(m, h);
  g.quadraticCurveTo(m + bow, h / 2, m, 0);
  g.stroke();
  g.lineWidth = F.leafletW;
  g.beginPath();
  for (let i = 1; i <= F.leaflets; i++) {
    const t = i / (F.leaflets + 1);
    const x = m + 2 * t * (1 - t) * bow, y = h * (1 - t);
    const len = m * F.leafletLen * (1 - t * F.taper);
    for (const s of [-1, 1]) {
      g.moveTo(x, y);
      g.quadraticCurveTo(x + s * len * F.curl[0], y - len * F.curl[1], x + s * len, y - len * F.curl[2]);
    }
  }
  g.stroke();
  return c;
}

// Leaves along the full stem, unfurling as growth passes their attach point.
export function drawLeaves(ctx, app, list, leafSprite) {
  const sprite = leafSprite || app.leafSprite;
  const { dpr, L } = app;
  const ratio = sprite.width / sprite.height;
  for (const f of list) {
    if (f.grow <= 0 || f.gone) continue;
    for (const lf of f.leaves) {
      const u = clamp01((f.grow - lf.at) / SHAPE.leaf.unfurlSpan);
      if (u <= 0) continue;
      const e = easeOutBack(u, MOTION.popOvershoot * TUNE.overshoot);
      const [x, y, ang] = pointAt(f.full, lf.at);
      const len = lf.len * L.U * f.size * e * (f.fade === undefined ? 1 : f.fade);
      const rot = ang + lf.side * lerp(SHAPE.leaf.fold, lf.open, clamp01(e));
      place(ctx, dpr, x, y, rot, 1, 1);
      ctx.drawImage(sprite, -len * ratio / 2, -len, len * ratio, len);
    }
  }
  resetTransform(ctx, dpr);
}
