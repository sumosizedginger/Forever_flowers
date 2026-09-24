// Two butterflies by day, two luna moths by night. Each follows a planned
// route that is a pure function of time: it enters from its side, lands on a
// flower, slowly fans its wings, then arcs over the field to the next one,
// never through a bloom. One keeps to the left of the field and one to the
// right, so they never crowd each other. Wings are one sprite per creature,
// mirrored and flapped.
import { WINGS } from './config-wings.js';
import { BEATS, WAKE, PALETTE, SHAPE, SIZE } from './config.js';
import { TAU, makeRng, lerp, clamp, smooth, mix, darker, rgba, mod } from './util.js';
import { makeCanvas, glow, drawGlow, resetTransform } from './sprites.js';
import { headBox } from './species.js';
import { fantasyBox } from './fantasy.js';

const H_ROOT = 1.2;   // the wing root sits this many wing sizes from the sprite's top
const H_ALL = 2.9;    // sprite height in wing sizes, room for the moth's tails

function outline(g, px, [c1, c2, end, q]) {
  const P = ([x, y]) => [px * x, px * (H_ROOT + y)];
  const r = [0, px * H_ROOT];
  g.moveTo(...r);
  g.bezierCurveTo(...P(c1), ...P(c2), ...P(end));
  g.quadraticCurveTo(...P(q), ...r);
}

function butterflySprite(colors) {
  const W = WINGS, B = W.butterfly;
  const px = W.px;
  const c = makeCanvas(px * 1.1, px * H_ALL);
  const g = c.getContext('2d');
  const root = [0, px * H_ROOT];
  const grad = g.createRadialGradient(...root, 0, ...root, px * 1.05);
  grad.addColorStop(0, darker(colors[1], B.rootDark));
  grad.addColorStop(0.35, colors[1]);
  grad.addColorStop(B.flushAt, mix(colors[0], PALETTE.fantasyEdge, 0.2));
  grad.addColorStop(1, colors[0]);
  g.fillStyle = grad;
  g.beginPath();
  outline(g, px, B.fore);
  outline(g, px, B.hind);
  g.fill();
  // a darker margin just inside the edge, the wing's own color deepened, never black
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = rgba(darker(colors[1], B.edgeDark), W.edgeAlpha);
  g.lineWidth = px * W.edge * 2;
  g.beginPath();
  outline(g, px, B.fore);
  outline(g, px, B.hind);
  g.stroke();
  g.strokeStyle = rgba(darker(colors[1], B.rootDark), W.veinAlpha);
  g.lineWidth = W.veinW;
  g.beginPath();
  for (const [x, y] of [B.fore[1], B.fore[2], B.hind[1], B.hind[2]]) {
    g.moveTo(...root);
    g.quadraticCurveTo(px * x * 0.45, px * (H_ROOT + y * 0.3), px * x * 0.86, px * (H_ROOT + y * 0.86));
  }
  g.stroke();
  g.fillStyle = rgba(PALETTE.fantasyEdge, B.spotAlpha);
  g.beginPath();
  for (const [x, y] of B.spots) { g.moveTo(px * x + B.spotR, px * (H_ROOT + y)); g.arc(px * x, px * (H_ROOT + y), B.spotR, 0, TAU); }
  g.fill();
  g.globalCompositeOperation = 'source-over';
  return c;
}

function mothSprite(colors) {
  const W = WINGS, M = W.moth;
  const px = W.px;
  const c = makeCanvas(px * 1.1, px * H_ALL);
  const g = c.getContext('2d');
  const root = [0, px * H_ROOT];
  const grad = g.createRadialGradient(...root, 0, ...root, px * 1.6);
  grad.addColorStop(0, colors[1]);
  grad.addColorStop(0.6, colors[0]);
  grad.addColorStop(1, mix(colors[0], M.glow, 0.4));
  g.fillStyle = grad;
  g.beginPath();
  outline(g, px, M.fore);
  outline(g, px, M.hind);
  g.fill();
  g.globalCompositeOperation = 'source-atop';
  g.strokeStyle = rgba(darker(colors[1], 0.25), W.veinAlpha);
  g.lineWidth = W.veinW;
  g.beginPath();
  for (const [x, y] of [M.fore[1], M.fore[2], M.hind[1], M.hind[2]]) {
    g.moveTo(...root);
    g.quadraticCurveTo(px * x * 0.45, px * (H_ROOT + y * 0.3), px * x * 0.86, px * (H_ROOT + y * 0.86));
  }
  g.stroke();
  // the maroon leading edge of the forewing
  g.strokeStyle = M.costa;
  g.lineWidth = M.costaW;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(...root);
  const [c1, c2, end] = M.fore;
  g.bezierCurveTo(px * c1[0], px * (H_ROOT + c1[1]), px * c2[0], px * (H_ROOT + c2[1]), px * end[0], px * (H_ROOT + end[1]));
  g.stroke();
  for (const [x, y, r] of M.eyes) {
    g.fillStyle = M.eye;
    g.strokeStyle = M.eyeRing;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(px * x, px * (H_ROOT + y), px * r, px * r * 1.25, 0.4, 0, TAU);
    g.fill();
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

// ---- routes ----
const restHead = (f) => [f.x + f.bend * f.h * SHAPE.stem.restLean, f.baseY - f.h];

function perchPoint(app, f, live) {
  const b = headBox(f, app.theme);
  const [hx, hy] = live && f.hx !== undefined ? [f.hx, f.hy] : restHead(f);
  return [hx + ((b.x0 + b.x1) / 2) * f.r, hy + (b.y0 + (b.y1 - b.y0) * WINGS.perchLift) * f.r];
}

function pools(app) {
  const fl = app.flowers;
  const L = app.L;
  // nothing under the glass flower, so no flight has to climb through it
  const gap = SIZE.fantasy.rU * L.U + WINGS.poolGapU * L.U;
  const all = fl.roses.concat(fl.favs, fl.side.filter((f) => !f.hidden));
  const left = all.filter((f) => restHead(f)[0] < L.cx - gap);
  const right = all.filter((f) => restHead(f)[0] > L.cx + gap);
  return [left.length ? left : all, right.length ? right : all];
}

function plan(app, rng, pool, side) {
  const W = WINGS;
  const L = app.L;
  const U = L.U;
  const legs = [];
  let t = 0;
  let at = [side < 0 ? -W.enterU * U : L.W + W.enterU * U, L.H * W.enterY];
  let prev = null;
  const pick = () => {
    for (let k = 0; k < 8; k++) {
      const f = rng.pick(pool);
      if (f === prev && pool.length > 1) continue;
      const p = perchPoint(app, f, false);
      if (Math.hypot(p[0] - at[0], p[1] - at[1]) >= W.minHop * U || k === 7) return f;
    }
    return rng.pick(pool);
  };
  const fly = (to) => {
    const p = perchPoint(app, to, false);
    const d = Math.hypot(p[0] - at[0], p[1] - at[1]);
    const dur = Math.max(W.minFly, d / (U * rng.range(W.speedU[0], W.speedU[1])));
    legs.push({ fly: true, t0: t, dur, from: at, fromF: prev, to, lift: clamp(d * W.liftK, W.liftU[0] * U, W.liftU[1] * U), ph: rng.range(0, TAU) });
    t += dur;
    at = p;
    prev = to;
  };
  const first = pick();
  fly(first);
  for (let k = 0; k < W.legs; k++) {
    const dur = rng.range(W.perch[0], W.perch[1]);
    legs.push({ fly: false, t0: t, dur, flower: prev, tilt: rng.range(W.bodyTilt[0], W.bodyTilt[1]), ph: rng.range(0, TAU) });
    t += dur;
    fly(k === W.legs - 1 ? first : pick());
  }
  return { legs, cycleFrom: legs[1].t0, total: t };
}

export function buildButterflies(app) {
  const rng = makeRng(app.seed ^ 0xb077);
  const night = app.theme.stars >= 0.5;
  const [left, right] = pools(app);
  return [0, 1].map((i) => {
    const colors = night ? WINGS.moth.colors[i] : PALETTE.butterflies[i];
    const side = i === 0 ? -1 : 1;
    return {
      i, night, colors, sprite: night ? mothSprite(colors) : butterflySprite(colors),
      flap: rng.range(WINGS.flapHz[0], WINGS.flapHz[1]), route: plan(app, rng, i === 0 ? left : right, side),
    };
  });
}

function legAt(route, tt) {
  let t = tt;
  if (t >= route.total) t = route.cycleFrom + mod(t - route.cycleFrom, route.total - route.cycleFrom);
  const legs = route.legs;
  let lo = 0, hi = legs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (legs[m].t0 <= t) lo = m; else hi = m - 1; }
  return [legs[lo], t - legs[lo].t0];
}

// Where a creature is at time tt since it entered, and whether it is perched.
function pose(app, b, tt, T) {
  const W = WINGS;
  const U = app.L.U;
  const [leg, dt] = legAt(b.route, tt);
  if (!leg.fly) {
    const [x, y] = perchPoint(app, leg.flower, true);
    return { x, y, tilt: leg.tilt, perched: true, ph: leg.ph };
  }
  const p = smooth(dt / leg.dur);
  const to = perchPoint(app, leg.to, false), toLive = perchPoint(app, leg.to, true);
  const from = leg.from;
  const fromLive = leg.fromF ? perchPoint(app, leg.fromF, true) : from;
  // arc over the field, and over the glass flower if the way crosses it
  let top = Math.min(from[1], to[1]) - leg.lift;
  const fb = fantasyBox(app);
  const pad = W.clearU * U;
  if (fb && Math.max(from[0], to[0]) > fb.x - pad && Math.min(from[0], to[0]) < fb.x + fb.w + pad) top = Math.min(top, fb.y - pad);
  const cx1 = lerp(from[0], to[0], 0.3), cx2 = lerp(from[0], to[0], 0.7);
  const u = 1 - p;
  let x = u * u * u * from[0] + 3 * u * u * p * cx1 + 3 * u * p * p * cx2 + p * p * p * to[0];
  let y = u * u * u * from[1] + 3 * u * u * p * top + 3 * u * p * p * top + p * p * p * to[1];
  x += (toLive[0] - to[0]) * p + (fromLive[0] - from[0]) * u;
  y += (toLive[1] - to[1]) * p + (fromLive[1] - from[1]) * u;
  const env = Math.sin(Math.PI * p);
  for (const [hz, a] of W.flutter) { x += Math.sin(TAU * hz * T + leg.ph) * a * U * env; y += Math.cos(TAU * hz * T * 1.3 + leg.ph) * a * U * env; }
  const vx = (to[0] - from[0]) / leg.dur;
  return { x, y, tilt: clamp(vx / (U * 2), -1, 1) * 0.35, perched: false };
}

// Where each creature is at show time s (now by default), for the harness: null until it has entered.
export function butterflySpots(app, s) {
  const times = app.show.mode === 'wake' ? WAKE.butterflies : BEATS.butterflies;
  const at0 = s === undefined ? app.s : s;
  return (app.butterflies || []).map((b) => {
    const tt = at0 - times[b.i];
    if (tt < 0) return null;
    const at = pose(app, b, tt, app.clock.T + (at0 - app.s));
    return { x: at.x, y: at.y, perched: at.perched };
  });
}

export function drawButterflies(ctx, app) {
  const list = app.butterflies;
  if (!list) return;
  const { dpr, L } = app;
  const T = app.clock.T;
  const times = app.show.mode === 'wake' ? WAKE.butterflies : BEATS.butterflies;
  const W = WINGS;
  const span = L.U * W.spanU;
  const px = W.px;
  for (const b of list) {
    const tt = app.s - times[b.i];
    if (tt < 0) continue;
    const at = pose(app, b, tt, T);
    let open;
    if (at.perched) {
      const k = (1 + Math.sin(TAU * W.perchFlap.hz * T + at.ph)) / 2;
      open = lerp(W.perchFlap.min, 1, Math.pow(k, W.perchFlap.pow));
    } else open = lerp(W.fold, 1, Math.abs(Math.sin(Math.PI * b.flap * T)));
    if (b.night) {
      // moths catch the moonlight: a faint pale light around them, blended normally
      drawGlow(ctx, glow(W.moth.glow), at.x, at.y, L.U * W.glowU, W.glowAlpha * app.theme.fireflies);
      ctx.globalAlpha = 1;
    }
    const cs = Math.cos(at.tilt), sn = Math.sin(at.tilt);
    const k = span / px;
    for (const side of [1, -1]) {
      const sx = side * open * k;
      ctx.setTransform(dpr * cs * sx, dpr * sn * sx, -dpr * sn * k, dpr * cs * k, dpr * at.x, dpr * at.y);
      ctx.drawImage(b.sprite, 0, -px * H_ROOT, b.sprite.width, b.sprite.height);
    }
    drawBody(ctx, app, b, at, span, cs, sn);
    resetTransform(ctx, dpr);
  }
}

function drawBody(ctx, app, b, at, span, cs, sn) {
  const { dpr } = app;
  const Bd = WINGS.body;
  const col = b.night ? WINGS.moth.body : WINGS.butterfly.body;
  ctx.setTransform(dpr * cs, dpr * sn, -dpr * sn, dpr * cs, dpr * at.x, dpr * at.y);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(0, span * Bd.l * 0.35, span * Bd.w, span * Bd.l * 0.6, 0, 0, TAU);
  ctx.moveTo(span * Bd.head, -span * Bd.l * 0.3);
  ctx.arc(0, -span * Bd.l * 0.3, span * Bd.head, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = WINGS.body.antennaW;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(0, -span * Bd.l * 0.34);
    ctx.quadraticCurveTo(s * span * Bd.antenna * Bd.bend, -span * (Bd.l * 0.34 + Bd.antenna * 0.7), s * span * Bd.antenna * 0.55, -span * (Bd.l * 0.34 + Bd.antenna));
  }
  ctx.stroke();
  ctx.beginPath();
  for (const s of [-1, 1]) {
    const x = s * span * Bd.antenna * 0.55, y = -span * (Bd.l * 0.34 + Bd.antenna);
    ctx.moveTo(x + span * Bd.club, y);
    ctx.arc(x, y, span * Bd.club, 0, TAU);
  }
  ctx.fill();
}
