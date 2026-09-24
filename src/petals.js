// Falling petals. Every petal is a pure function of time from its spawn, so a
// frozen frame shows exactly where each one is. Three sources: the ambient
// sakura stream, the petals the exhale lifts, and petals shaken loose by a tap.
import { MOTION, BEATS, WAKE, TUNE, SHAPE, PALETTE, INPUT } from './config.js';
import { TAU, makeRng, lerp, clamp01, easeOutCubic, darker, mix } from './util.js';
import { makeCanvas, place, resetTransform } from './sprites.js';

const sprites = new Map();

export function petalSprite(color, notched) {
  const key = color + (notched ? 'n' : 'r');
  if (sprites.has(key)) return sprites.get(key);
  const S = SHAPE.petal;
  const [w, h] = S.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  const [a, b, cc, d] = S.ctrl;
  const grad = g.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, darker(color, S.base));
  grad.addColorStop(1, mix(color, SHAPE.rose.edgeTo, S.rim));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(m, h);
  g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, notched ? m * (1 + S.notch) : m, 0);
  if (notched) g.lineTo(m, h * S.notch);
  g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
  g.fill();
  sprites.set(key, c);
  return c;
}

function fallSpec(rng) {
  const P = MOTION.petals;
  return {
    v: rng.range(P.fallU[0], P.fallU[1]), hz: rng.range(P.driftHz[0], P.driftHz[1]),
    amp: rng.range(P.driftU[0], P.driftU[1]), flip: rng.range(P.flip[0], P.flip[1]) * rng.sign(),
    ph: rng.range(0, TAU), rot: rng.range(0, TAU), size: rng.range(P.sizeU[0], P.sizeU[1]),
    land: rng.range(P.landU[0], P.landU[1]), gap: rng.range(SHAPE.petal.gap[0], SHAPE.petal.gap[1]),
  };
}

export function buildPetals(app) {
  const rng = makeRng(app.seed ^ 0x9e7a);
  const P = MOTION.petals;
  const ambient = [];
  for (let i = 0; i < P.ambient; i++) ambient.push({ i, ...fallSpec(rng) });
  const e = BEATS.exhale;
  const fl = app.flowers;
  const sources = fl.roses.concat(fl.wilds);
  const n = rng.int(e.petalsMin, e.petalsMax);
  const exhale = [];
  const L = app.L;
  const sigma = e.widthU * L.U;
  const lift = SHAPE.petal.lift;
  for (let k = 0; k < n; k++) {
    const f = k < sources.length ? sources[k] : rng.pick(sources);
    const hx = f.x + f.bend * f.h * SHAPE.stem.restLean, hy = f.baseY - f.h;
    const pass = (hx + sigma * 2) / (L.W + sigma * 4);
    const color = f.kind === 'rose' ? (f.gold ? PALETTE.gold.mid : app.theme.roses[f.colorName]) : app.theme.wild[f.type];
    exhale.push({
      t0: e.start + e.dur * pass, x0: hx + rng.range(-1, 1) * f.r * SHAPE.petal.srcSpread, y0: hy,
      sprite: petalSprite(color, false), ...fallSpec(rng),
      lift: {
        dur: lift.dur, dx: L.U * rng.range(lift.dxU[0], lift.dxU[1]), dy: L.U * rng.range(lift.dyU[0], lift.dyU[1]),
        swirl: L.U * rng.range(lift.swirlU[0], lift.swirlU[1]), w: rng.range(lift.w[0], lift.w[1]),
      },
    });
  }
  const sakura = [petalSprite(app.theme.sakuraEdge, true), petalSprite(mix(app.theme.sakuraEdge, app.theme.sakuraCenter, SHAPE.blossom.midMix), true)];
  return { ambient, exhale, sakura };
}

// Petals shaken loose from the branch by a tap.
export function shakePetals(app) {
  const ch = app.cherry;
  const open = ch.blossoms.filter((b) => !b.bud);
  if (!open.length) return;
  const r = app.live;
  const n = r.int(INPUT.shake[0], INPUT.shake[1]);
  const B = SHAPE.petal.burst;
  const U = app.L.U;
  for (let k = 0; k < n; k++) {
    const b = r.pick(open);
    const ang = r.range(0, TAU);
    const v = U * r.range(B.vU[0], B.vU[1]);
    app.fx.petals.push({
      t0: app.clock.T, x0: b.x, y0: b.y, ...fallSpec(r),
      sprite: r.pick(app.petals.sakura),
      burst: { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - v * B.up, tau: B.tau },
    });
  }
  const cap = MOTION.petals.max - MOTION.petals.ambient - BEATS.exhale.petalsMax;
  if (app.fx.petals.length > cap) app.fx.petals.splice(0, app.fx.petals.length - cap);
}

// Position of petal p at age seconds, or null once it has faded on the ground.
function pose(p, age, U, groundY, out) {
  const P = MOTION.petals;
  const S = SHAPE.petal;
  let ox = 0, oy = 0, fall = age, lifted = 0;
  if (p.lift) {
    const l = p.lift;
    const A = clamp01(age / l.dur);
    const e = easeOutCubic(A);
    const fade = 1 - A;
    ox = l.dx * e + l.swirl * Math.sin(l.w * age) * fade;
    oy = -l.dy * e + l.swirl * (1 - Math.cos(l.w * age)) * fade;
    lifted = l.dur;
    fall = Math.max(0, age - l.dur);
  }
  if (p.burst) {
    const k = 1 - Math.exp(-age / p.burst.tau);
    ox += p.burst.vx * p.burst.tau * k;
    oy += p.burst.vy * p.burst.tau * k;
  }
  const vel = p.v * U * TUNE.petalFall;
  const y0 = p.y0 + oy;
  const yLand = groundY + p.land * U;
  const landAt = Math.max(0, (yLand - y0) / vel);
  const landed = fall >= landAt && age >= lifted;
  const ft = landed ? landAt : fall;
  out.x = p.x0 + ox + p.amp * U * Math.sin(TAU * p.hz * ft + p.ph) + P.windU * U * ft;
  out.y = landed ? yLand : y0 + vel * ft;
  const since = landed ? fall - landAt : 0;
  if (since > P.landFade) return null;
  out.a = landed ? 1 - since / P.landFade : clamp01(age / S.fadeIn);
  out.th = p.rot + p.flip * ft;
  out.size = p.size * U;
  return out;
}

const tmp = { x: 0, y: 0, a: 0, th: 0, size: 0 };

function drawPose(ctx, dpr, sprite, q) {
  const S = SHAPE.petal;
  const flip = Math.max(S.flipMin, Math.abs(Math.cos(q.th)));
  const rot = q.th * MOTION.petals.spinWobble;
  place(ctx, dpr, q.x, q.y, rot, 1, flip);
  ctx.globalAlpha = q.a;
  ctx.drawImage(sprite, -q.size / 2, (-q.size * S.aspect) / 2, q.size, q.size * S.aspect);
}

export function drawPetals(ctx, app) {
  const pet = app.petals;
  const ch = app.cherry;
  if (!pet || !ch) return;
  const { dpr, L } = app;
  const U = L.U;
  const P = MOTION.petals;
  const wake = app.show.mode === 'wake';
  const s = wake ? app.s + WAKE.petalHead : app.s;
  const sources = ch.blossoms.filter((b) => !b.bud);
  if (sources.length && s >= BEATS.petalFall) {
    const top = Math.min(...sources.map((b) => b.y));
    for (const p of pet.ambient) {
      const vel = p.v * U * TUNE.petalFall;
      const period = (L.groundY + p.land * U - top) / vel + P.landFade + p.gap;
      const start = BEATS.petalFall + (p.i / P.ambient) * period;
      if (s < start) continue;
      const k = Math.floor((s - start) / period);
      const age = s - start - k * period;
      const [h1, h2] = P.hash;
      const b = sources[(((p.i + 1) * h1 + k * h2) >>> 0) % sources.length];
      p.x0 = b.x;
      p.y0 = b.y;
      const q = pose(p, age, U, L.groundY, tmp);
      if (q) drawPose(ctx, dpr, pet.sakura[p.i % pet.sakura.length], q);
    }
  }
  if (!wake) {
    for (const p of pet.exhale) {
      const age = app.s - p.t0;
      if (age < 0) continue;
      const q = pose(p, age, U, L.groundY, tmp);
      if (q) drawPose(ctx, dpr, p.sprite, q);
    }
  }
  const T = app.clock.T;
  const dyn = app.fx.petals;
  for (let i = dyn.length - 1; i >= 0; i--) {
    const p = dyn[i];
    const q = pose(p, T - p.t0, U, L.groundY, tmp);
    if (!q) { dyn.splice(i, 1); continue; }
    drawPose(ctx, dpr, p.sprite, q);
  }
  resetTransform(ctx, dpr);
  ctx.globalAlpha = 1;
}

export function petalCount(app) {
  return app.fx.petals.length;
}
