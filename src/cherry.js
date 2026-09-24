// The cherry branch reaching in from the top left, its sakura, and the shake
// on tap. Once grown and in full bloom the whole branch becomes one sprite.
import { LAYOUT, SHAPE, SIZE, COUNTS, BEATS, WAKE, MOTION, TUNE, INPUT } from './config.js';
import { TAU, makeRng, lerp, clamp, clamp01, win, easeInOutSine, easeOutBack, rgba, mix, darker } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

const DEG = Math.PI / 180;

function cubicAt(p, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
}

function sample(p, n, w0, w1) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const [x, y] = cubicAt(p, t);
    pts.push({ x, y, w: lerp(w0, w1, t), t });
  }
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    pts[i].nx = -(b.y - a.y) / len;
    pts[i].ny = (b.x - a.x) / len;
  }
  return pts;
}

export function buildCherry(app) {
  const { L } = app;
  const { U, H } = L;
  const B = SHAPE.branch;
  const LB = LAYOUT.branch;
  const rng = makeRng(app.seed ^ 0xc4e7);
  const reach = Math.min(L.W * LB.reachW, U * LB.reachU);
  const ax = L.safe.l - U * LB.anchorU, ay = H * LB.anchorY;
  const tx = L.safe.l + reach, ty = H * LB.tipY;
  const main = [ax, ay, ax + reach * LB.c1[0], ay + H * LB.c1[1], tx - reach * LB.c2[0], ty + H * LB.c2[1], tx, ty];
  const w0 = U * B.widthU[0], w1 = U * B.widthU[1];
  const limbs = [{ at: 0, pts: sample(main, B.steps, w0, w1), span: 1 }];
  for (const [at, ang, lenF] of B.twigs) {
    const [bx, by] = cubicAt(main, at);
    const base = limbs[0].pts[Math.round(at * B.steps)];
    const dirA = Math.atan2(base.ny, base.nx) - Math.PI / 2 + ang;
    const len = reach * lenF;
    const ex = bx + Math.cos(dirA) * len, ey = by + Math.sin(dirA) * len;
    const bend = rng.range(-1, 1) * len * B.sag;
    const twig = [bx, by, bx + (ex - bx) / 3 + bend, by + (ey - by) / 3 - len * B.rise, bx + ((ex - bx) * 2) / 3 + bend, by + ((ey - by) * 2) / 3, ex, ey];
    limbs.push({ at, pts: sample(twig, B.twigSteps, base.w * B.twigWidth, w1), span: lenF });
  }
  // blossoms along the limbs, kept on screen and in the top band
  const n = rng.int(COUNTS.blossoms[0], COUNTS.blossoms[1]);
  const blossoms = [];
  const maxY = H * LB.maxY;
  for (let i = 0; i < n * 3 && blossoms.length < n; i++) {
    const li = rng.next() < B.mainShare ? 0 : rng.int(1, limbs.length - 1);
    const limb = limbs[li];
    const t = rng.range(B.tMin[li === 0 ? 0 : 1], 1);
    const p = limb.pts[Math.round(t * (limb.pts.length - 1))];
    const r = U * rng.range(SIZE.blossomU[0], SIZE.blossomU[1]);
    const off = rng.range(-1, 1) * U * B.blossomSide;
    const x = p.x + p.nx * off, y = p.y + p.ny * off;
    if (x - r < L.minX || y - r < L.minY || y + r > maxY) continue;
    if (blossoms.some((b) => Math.hypot(b.x - x, b.y - y) < (b.r + r) * B.spacing)) continue;
    blossoms.push({
      x, y, r, rot: rng.range(0, TAU), bud: rng.next() < COUNTS.budShare,
      path: li === 0 ? t : limb.at + t * limb.span, pop: 0,
    });
  }
  blossoms.sort((a, b) => a.path - b.path);
  blossoms.forEach((b, i) => { b.order = i; });
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, r) => { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const l of limbs) for (const p of l.pts) grow(p.x, p.y, p.w);
  for (const b of blossoms) grow(b.x, b.y, b.r * B.pad);
  return {
    ax, ay, limbs, blossoms, grow: 0,
    box: { x0, y0, x1, y1 },
    spring: { x: 0, v: 0 }, cache: null, cacheKey: null,
  };
}

function limbPath(ctx, pts, upto) {
  const m = Math.max(1, Math.floor(upto * (pts.length - 1)));
  ctx.moveTo(pts[0].x + pts[0].nx * pts[0].w / 2, pts[0].y + pts[0].ny * pts[0].w / 2);
  for (let i = 1; i <= m; i++) ctx.lineTo(pts[i].x + pts[i].nx * pts[i].w / 2, pts[i].y + pts[i].ny * pts[i].w / 2);
  const e = pts[m];
  ctx.arc(e.x, e.y, e.w / 2, Math.atan2(e.ny, e.nx), Math.atan2(e.ny, e.nx) + Math.PI);
  for (let i = m; i >= 0; i--) ctx.lineTo(pts[i].x - pts[i].nx * pts[i].w / 2, pts[i].y - pts[i].ny * pts[i].w / 2);
  ctx.closePath();
}

function drawBranch(ctx, app, ch) {
  const th = app.theme;
  const B = SHAPE.branch;
  ctx.fillStyle = th.branch;
  ctx.beginPath();
  for (const l of ch.limbs) {
    const g = l.at === 0 ? ch.grow : clamp01((ch.grow - l.at) / (1 - l.at));
    if (g > 0) limbPath(ctx, l.pts, g);
  }
  ctx.fill();
  ctx.strokeStyle = rgba(mix(th.branch, th.sakuraEdge, B.rimMix), B.rimAlpha);
  ctx.lineWidth = app.L.U * B.widthU[1] * B.rimW;
  ctx.beginPath();
  for (const l of ch.limbs) {
    const g = l.at === 0 ? ch.grow : clamp01((ch.grow - l.at) / (1 - l.at));
    const m = Math.floor(g * (l.pts.length - 1));
    for (let i = 0; i <= m; i++) {
      const p = l.pts[i];
      const x = p.x - p.nx * p.w * B.rimAt, y = p.y - p.ny * p.w * B.rimAt;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function blossomPetal(g, r, w, rot) {
  const n = SHAPE.blossom.notch;
  const [a, b, c, d] = SHAPE.blossom.ctrl;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const X = (u, v) => u * cs - v * sn;
  const Y = (u, v) => u * sn + v * cs;
  g.moveTo(0, 0);
  g.bezierCurveTo(X(r * a, -w), Y(r * a, -w), X(r * b, -w * c), Y(r * b, -w * c), X(r, -w * d), Y(r, -w * d));
  g.lineTo(X(r * (1 - n), 0), Y(r * (1 - n), 0));
  g.lineTo(X(r, w * d), Y(r, w * d));
  g.bezierCurveTo(X(r * b, w * c), Y(r * b, w * c), X(r * a, w), Y(r * a, w), 0, 0);
}

export function drawBlossom(g, b, p, th) {
  const S = SHAPE.blossom;
  const s = Math.max(0, p);
  if (s <= 0.001) return;
  const r = b.r * s;
  g.save();
  g.translate(b.x, b.y);
  g.rotate(b.rot);
  if (b.bud) {
    g.fillStyle = mix(th.sakuraCenter, th.sakuraEdge, S.budMix);
    g.beginPath();
    g.ellipse(0, 0, r * S.budW / 2, r * S.budLen / 2, 0, 0, TAU);
    g.fill();
    g.restore();
    return;
  }
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, th.sakuraCenter);
  grad.addColorStop(S.midAt, mix(th.sakuraCenter, th.sakuraEdge, S.midMix));
  grad.addColorStop(1, th.sakuraEdge);
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < S.petals; i++) blossomPetal(g, r, (r * S.w) / 2, (i * TAU) / S.petals);
  g.fill();
  g.strokeStyle = th.stamen;
  g.fillStyle = th.stamen;
  g.lineWidth = r * S.lineW;
  g.beginPath();
  for (let i = 0; i < S.stamens; i++) {
    const a = (i * TAU) / S.stamens + S.stamenRot;
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * r * S.stamenLen, Math.sin(a) * r * S.stamenLen);
  }
  g.stroke();
  for (let i = 0; i < S.stamens; i++) {
    const a = (i * TAU) / S.stamens + S.stamenRot;
    g.beginPath();
    g.arc(Math.cos(a) * r * S.stamenLen, Math.sin(a) * r * S.stamenLen, r * S.dotR, 0, TAU);
    g.fill();
  }
  g.restore();
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

function settled(ch) {
  return ch.grow >= 1 && ch.blossoms.every((b) => Math.abs(b.pop - 1) < 1e-4);
}

export function drawCherry(ctx, app) {
  const ch = app.cherry;
  if (!ch || ch.grow <= 0) return;
  const { dpr, L } = app;
  const B = SHAPE.branch;
  const rot = (Math.sin(TAU * B.swayHz * app.clock.T) * B.swayDeg * TUNE.swayAmp + ch.spring.x * B.shakeDeg) * DEG;
  const key = `${app.theme.name}|${L.W}x${L.H}|${dpr}`;
  if (settled(ch)) {
    if (ch.cacheKey !== key) {
      const bx = ch.box;
      const c = makeCanvas((bx.x1 - bx.x0) * dpr, (bx.y1 - bx.y0) * dpr);
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, -bx.x0 * dpr, -bx.y0 * dpr);
      drawBranch(g, app, ch);
      for (const b of ch.blossoms) drawBlossom(g, b, 1, app.theme);
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
  for (const b of ch.blossoms) if (b.pop > 0) drawBlossom(ctx, b, b.pop, app.theme);
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
