// The cherry branch reaching in from the top left: a crooked, tapering main
// limb whose side limbs fork again, bark with a lit edge and the fine
// horizontal marks cherry bark carries, and clusters of blossoms on short
// stalks at the nodes with buds at the tips. Blossoms are 3D (models.js).
// Once grown and in full bloom the whole branch becomes one sprite.
import { LAYOUT, BEATS, WAKE, MOTION, TUNE, INPUT, SPRITE } from './config.js';
import { BRANCH, PETAL } from './config-flora.js';
import { TAU, makeRng, lerp, clamp, clamp01, win, easeInOutSine, easeOutBack, rgba, mix } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';
import { makePose, rgbOf } from './light3d.js';
import { renderHead } from './petal3d.js';
import { sakuraModel, sakuraParts } from './models.js';

const DEG = Math.PI / 180;

// A limb as a guided random walk: it turns a little at every step, pulled toward a target.
function walk(rng, x, y, dir, len, steps, kink, curl, target, pull) {
  const pts = [{ x, y }];
  let a = dir;
  const seg = len / steps;
  for (let i = 0; i < steps; i++) {
    a += rng.range(-kink, kink) + curl;
    if (target) {
      const want = Math.atan2(target[1] - y, target[0] - x);
      a += Math.atan2(Math.sin(want - a), Math.cos(want - a)) * pull;
    }
    x += Math.cos(a) * seg;
    y += Math.sin(a) * seg;
    pts.push({ x, y });
  }
  return pts;
}

function finish(pts, w0, w1) {
  const n = pts.length - 1;
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    p.nx = -(b.y - a.y) / len;
    p.ny = (b.x - a.x) / len;
    p.w = lerp(w0, w1, i / n);
    p.t = i / n;
  });
  return pts;
}

// Keep a limb inside the branch's band at the top of the screen, cutting it short if it strays.
function inBand(pts, L, maxY) {
  const out = [];
  for (const p of pts) {
    if (p.y > maxY || p.y < L.minY || p.x > L.W - L.U) break;
    out.push(p);
  }
  return out;
}

export function buildCherry(app) {
  const { L } = app;
  const { U, H } = L;
  const B = BRANCH;
  const LB = LAYOUT.branch;
  const rng = makeRng(app.seed ^ 0xc4e7);
  const reach = Math.min(L.W * LB.reachW, U * LB.reachU);
  const maxY = H * LB.maxY;
  const ax = L.safe.l - U * LB.anchorU, ay = H * LB.anchorY;
  const tip = [L.safe.l + reach, H * LB.tipY];
  const M = B.main;
  const main = finish(walk(rng, ax, ay, Math.atan2(tip[1] - ay, tip[0] - ax), reach + U * LB.anchorU, M.steps, M.kink, 0, tip, M.pull), M.w[0] * U, M.w[1] * U);
  const limbs = [{ at: 0, pts: main, depth: 0 }];
  const S = B.sides;
  const n = clamp(Math.round(reach / (U * S.perU)), S.n[0], S.n[1]);
  let side = rng.sign();
  for (let k = 0; k < n; k++) {
    const t = lerp(S.from, S.to, (k + rng.range(0.2, 0.8)) / n);
    const base = main[Math.round(t * (main.length - 1))];
    const dir = Math.atan2(base.ny, base.nx) - Math.PI / 2 + side * rng.range(S.angle[0], S.angle[1]);
    const len = reach * rng.range(S.len[0], S.len[1]) * (1 - t * S.shrink);
    const pts = inBand(walk(rng, base.x, base.y, dir, len, S.steps, S.kink, -side * S.curl, null, 0), L, maxY);
    if (pts.length > 2) {
      const limb = { at: t, pts: finish(pts, base.w * S.w, U * S.tipW), depth: 1 };
      limbs.push(limb);
      const F = B.forks;
      const ft = rng.range(F.at[0], F.at[1]);
      const fb = limb.pts[Math.round(ft * (limb.pts.length - 1))];
      const fdir = Math.atan2(fb.ny, fb.nx) - Math.PI / 2 - side * rng.range(F.angle[0], F.angle[1]);
      const fpts = inBand(walk(rng, fb.x, fb.y, fdir, len * rng.range(F.len[0], F.len[1]), F.steps, S.kink, side * S.curl, null, 0), L, maxY);
      if (fpts.length > 2) limbs.push({ at: t + ft * (1 - t) * F.lag, pts: finish(fpts, fb.w * S.w, U * S.tipW), depth: 2 });
    }
    side = -side;
  }
  // blossoms: clusters on short stalks at the nodes of each limb, buds at the tips
  const blossoms = [];
  const want = rng.int(B.blossoms[0], B.blossoms[1]);
  const place1 = (node, limb, isTip) => {
    const k = isTip ? rng.int(B.tipCluster[0], B.tipCluster[1]) : rng.int(B.cluster[0], B.cluster[1]);
    for (let j = 0; j < k && blossoms.length < want; j++) {
      const r = U * rng.range(B.rU[0], B.rU[1]);
      const a = rng.range(0, TAU);
      const len = U * rng.range(B.pedicelU[0], B.pedicelU[1]);
      const x = node.x + Math.cos(a) * len, y = node.y + Math.sin(a) * len * B.hang;
      if (x - r < L.minX || y - r < L.minY || y + r > maxY) continue;
      if (blossoms.some((b) => Math.hypot(b.x - x, b.y - y) < (b.r + r) * B.spacing)) continue;
      const bud = isTip ? rng.chance(B.tipBud) : rng.chance(B.budShare);
      const b = { x, y, r, nx: node.x, ny: node.y, bud, rot: rng.range(0, TAU), path: limb.at + node.t * (1 - limb.at) * B.pathLag, pop: 0, cache: {} };
      b.model = sakuraModel(rng);
      blossoms.push(b);
    }
  };
  // every node of every limb, taken in a shuffled order so the blossoms spread over the whole branch
  const nodes = [];
  for (const limb of limbs) {
    const pts = limb.pts;
    const step = Math.max(1, Math.round((B.nodeU * U) / Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)));
    for (let i = Math.round(pts.length * B.nodeFrom); i < pts.length - 1; i += step) nodes.push([pts[i], limb, false, rng.next()]);
    nodes.push([pts[pts.length - 1], limb, true, rng.next()]);
  }
  nodes.sort((a, b) => a[3] - b[3]);
  for (const [node, limb, isTip] of nodes) place1(node, limb, isTip);
  // fine marks across the bark, scattered along the thicker limbs
  const marks = [];
  limbs.forEach((l, li) => {
    if (l.depth > 1) return;
    const n = Math.round(l.pts.length * B.lenticels.per * (l.depth ? 1 : 2));
    for (let k = 0; k < n; k++) marks.push({ limb: li, t: rng.next(), off: rng.range(-1, 1) * B.lenticels.off });
  });
  blossoms.sort((a, b) => a.path - b.path);
  blossoms.forEach((b, i) => { b.order = i; });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const l of limbs) for (const p of l.pts) grow(p.x, p.y, p.w);
  for (const b of blossoms) grow(b.x, b.y, b.r * B.pad);
  return {
    ax, ay, limbs, blossoms, marks, grow: 0,
    box: { x0, y0, x1, y1 },
    spring: { x: 0, v: 0 }, cache: null, cacheKey: null,
  };
}

// One side of a limb as a smooth curve through the midpoints of its samples.
function edge(ctx, pts, m, s, first) {
  const P = (i) => [pts[i].x + (s * pts[i].nx * pts[i].w) / 2, pts[i].y + (s * pts[i].ny * pts[i].w) / 2];
  const idx = s > 0 ? [...Array(m + 1).keys()] : [...Array(m + 1).keys()].reverse();
  const [x0, y0] = P(idx[0]);
  if (first) ctx.moveTo(x0, y0); else ctx.lineTo(x0, y0);
  for (let k = 1; k < idx.length - 1; k++) {
    const [x, y] = P(idx[k]), [nx, ny] = P(idx[k + 1]);
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const [xl, yl] = P(idx[idx.length - 1]);
  ctx.lineTo(xl, yl);
}

function limbPath(ctx, pts, upto) {
  const m = Math.max(1, Math.floor(upto * (pts.length - 1)));
  edge(ctx, pts, m, 1, true);
  const e = pts[m];
  ctx.arc(e.x, e.y, e.w / 2, Math.atan2(e.ny, e.nx), Math.atan2(e.ny, e.nx) + Math.PI);
  edge(ctx, pts, m, -1, false);
  ctx.closePath();
}

const grownOf = (ch, l) => (l.at === 0 ? ch.grow : clamp01((ch.grow - l.at) / (1 - l.at)));

function drawBranch(ctx, app, ch) {
  const th = app.theme;
  const B = BRANCH;
  const U = app.L.U;
  ctx.fillStyle = th.branch;
  ctx.beginPath();
  for (const l of ch.limbs) { const g = grownOf(ch, l); if (g > 0) limbPath(ctx, l.pts, g); }
  ctx.fill();
  // the edge that faces the moon or sun, and the fine marks across the bark
  const lit = mix(th.branch, app.light.rimColor, B.rimMix);
  const up = app.light.dir[2] >= 0 ? -1 : 1;
  ctx.strokeStyle = rgba(lit, B.rimAlpha);
  ctx.lineCap = 'round';
  for (const l of ch.limbs) {
    const g = grownOf(ch, l);
    const m = Math.floor(g * (l.pts.length - 1));
    if (m < 1) continue;
    ctx.lineWidth = Math.max(1, l.pts[0].w * B.rimW);
    ctx.beginPath();
    for (let i = 0; i <= m; i++) {
      const p = l.pts[i];
      const s = p.ny < 0 ? -up : up;
      const x = p.x + p.nx * p.w * s * B.rimAt, y = p.y + p.ny * p.w * s * B.rimAt;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const K = B.lenticels;
  ctx.strokeStyle = rgba(mix(th.branch, app.light.rimColor, K.mix), K.alpha);
  ctx.lineWidth = U * K.w;
  ctx.beginPath();
  for (const d of ch.marks) {
    const l = ch.limbs[d.limb];
    if (d.t > grownOf(ch, l)) continue;
    const i = Math.floor(d.t * (l.pts.length - 1));
    const p = l.pts[i], q = l.pts[Math.min(l.pts.length - 1, i + 1)];
    const f = d.t * (l.pts.length - 1) - i;
    const x = lerp(p.x, q.x, f) + p.nx * p.w * d.off, y = lerp(p.y, q.y, f) + p.ny * p.w * d.off;
    const h = p.w * K.len * 0.5;
    ctx.moveTo(x - p.nx * h, y - p.ny * h);
    ctx.lineTo(x + p.nx * h, y + p.ny * h);
  }
  ctx.stroke();
}

// A blossom's image for this opening, re-rendered only when the opening or the light changes.
function blossomImage(b, e, app) {
  const c = b.cache;
  const q = Math.round(clamp(e, 0, 1) / PETAL.openStep) * PETAL.openStep;
  const key = `${q}|${app.theme.name}|${b.r.toFixed(2)}|${app.dpr}`;
  if (c.key === key) return c;
  const scale = app.dpr * SPRITE.cacheScale;
  const px = Math.ceil(b.r * BRANCH.pad * 2 * scale);
  if (!c.canvas || c.canvas.width !== px) c.canvas = makeCanvas(px, px);
  const g = c.canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, px, px);
  g.setTransform(scale, 0, 0, scale, px / 2, px / 2);
  if (!b.pose) b.pose = makePose(b.model.pitch, b.model.yaw);
  const parts = sakuraParts(b, b.bud ? BRANCH.budOpen * q : q, app.theme);
  if (b.bud) parts.push({ kind: 'ball', z: BRANCH.calyx.z, rad: BRANCH.calyx.rad, rgb: rgbOf(mix(app.theme.branch, app.theme.sakuraCenter, BRANCH.calyx.mix)), mat: { trans: 0, rim: 0.4 }, bias: -1 });
  renderHead(g, parts, b.pose, app.light, b.r);
  c.key = key;
  c.size = px / scale;
  return c;
}

function drawBlossoms(ctx, app, ch, settled) {
  const B = BRANCH;
  const U = app.L.U;
  // the short stalks from each node
  ctx.strokeStyle = mix(app.theme.branch, app.theme.leaf[1], B.pedicelMix);
  ctx.lineWidth = U * B.pedicelW;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const b of ch.blossoms) {
    const p = settled ? 1 : b.pop;
    if (p <= 0) continue;
    ctx.moveTo(b.nx, b.ny);
    ctx.lineTo(lerp(b.nx, b.x, clamp01(p)), lerp(b.ny, b.y, clamp01(p)));
  }
  ctx.stroke();
  for (const b of ch.blossoms) {
    const p = settled ? 1 : b.pop;
    if (p <= 0.001) continue;
    const c = blossomImage(b, p, app);
    const s = c.size * Math.max(p, B.popMin) * (1 + Math.max(0, p - 1));
    ctx.drawImage(c.canvas, b.x - s / 2, b.y - s / 2, s, s);
  }
}

// Branch growth and blossom pops from show time.
export function cherryTimes(app) {
  const ch = app.cherry;
  const s = app.s;
  const pop = (x) => easeOutBack(x, MOTION.popOvershoot * TUNE.overshoot);
  if (app.show.mode === 'wake') {
    ch.grow = 1;
    const n = ch.blossoms.length;
    for (const b of ch.blossoms) {
      const start = n > 1 ? (b.order / (n - 1)) * (WAKE.span - WAKE.dur) : 0;
      b.pop = lerp(WAKE.startOpen, 1, pop(win(s, start, WAKE.dur)));
    }
    return;
  }
  ch.grow = easeInOutSine(win(s, BEATS.branch[0], BEATS.branch[1]));
  const bl = BEATS.blossoms;
  for (const b of ch.blossoms) b.pop = pop(win(s, bl.start + b.order * bl.stagger, bl.dur));
}

export function kickCherry(app) {
  app.cherry.spring.v = 1 / MOTION.spring.peak;
}

export function updateCherry(app, dt) {
  const s = app.cherry.spring;
  const sp = MOTION.spring;
  if (s.x === 0 && s.v === 0) return;
  const n = Math.max(1, Math.ceil(dt / sp.step));
  const h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (-sp.k * s.x - sp.c * s.v) * h; s.x += s.v * h; }
  if (Math.abs(s.x) < sp.rest && Math.abs(s.v) < sp.rest) { s.x = 0; s.v = 0; }
}

function settledOf(ch) {
  return ch.grow >= 1 && ch.blossoms.every((b) => Math.abs(b.pop - 1) < 1e-4);
}

export function drawCherry(ctx, app) {
  const ch = app.cherry;
  if (!ch || ch.grow <= 0) return;
  const { dpr, L } = app;
  const B = BRANCH;
  const rot = (Math.sin(TAU * B.swayHz * app.clock.T) * B.swayDeg * TUNE.swayAmp + ch.spring.x * B.shakeDeg) * DEG;
  const key = `${app.theme.name}|${L.W}x${L.H}|${dpr}`;
  if (settledOf(ch)) {
    if (ch.cacheKey !== key) {
      const bx = ch.box;
      const c = makeCanvas((bx.x1 - bx.x0) * dpr, (bx.y1 - bx.y0) * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, -bx.x0 * dpr, -bx.y0 * dpr);
      drawBranch(g, app, ch);
      drawBlossoms(g, app, ch, true);
      ch.cache = c;
      ch.cacheKey = key;
    }
    place(ctx, dpr, ch.ax, ch.ay, rot, 1, 1);
    const bx = ch.box;
    ctx.drawImage(ch.cache, bx.x0 - ch.ax, bx.y0 - ch.ay, bx.x1 - bx.x0, bx.y1 - bx.y0);
    resetTransform(ctx, dpr);
    return;
  }
  ch.cacheKey = null;
  place(ctx, dpr, ch.ax, ch.ay, rot, 1, 1);
  ctx.translate(-ch.ax, -ch.ay);
  drawBranch(ctx, app, ch);
  drawBlossoms(ctx, app, ch, false);
  resetTransform(ctx, dpr);
}

export function hitCherry(app, x, y) {
  const ch = app.cherry;
  if (!ch || ch.grow < 1) return false;
  for (const b of ch.blossoms) if (b.pop > 0.5 && Math.hypot(x - b.x, y - b.y) < b.r * INPUT.blossomHit) return true;
  const lim = app.L.U * INPUT.branchHitU;
  for (const l of ch.limbs) for (const p of l.pts) if (Math.hypot(x - p.x, y - p.y) < lim + p.w / 2) return true;
  return false;
}

export function blossomBoxes(app) {
  const ch = app.cherry;
  if (!ch) return [];
  return ch.blossoms.filter((b) => b.pop > 0).map((b, i) => ({ kind: 'blossom', idx: i, x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }));
}
