// Touch. One pointer at a time; taps resolve on release; the states are
// INTRO, LIVE, DIM, CHARGING and NOVA exactly as the brief lays them out.
import { INPUT, MOTION } from './config.js';
import { SLEEP } from './config-garden.js';
import { clamp, lerp, smooth, smoothstep } from './util.js';
import { hitFantasy, fantasyRadius } from './fantasy.js';
import { hitFlower, kick, plant, allFlowers, stemBases } from './flowers.js';
import { hitCherry, kickCherry } from './cherry.js';
import { shakePetals } from './petals.js';
import { spawnShootingStar } from './sky.js';
import { spawnHearts } from './hearts.js';
import { buildGrass } from './grass.js';
import { pressHeart, cancelHeart, startNova } from './heart.js';

export function makeInput() {
  return {
    p: null, idle: 0, ignoreUntil: -Infinity, leaning: false, leanX: 0, leanY: 0,
    dimFrom: 0, dimTo: 0, dimT0: 0, dimDur: 1, nextShoot: null,
  };
}

const sound = (app, name, ...args) => { if (app.audio && app.audio[name]) app.audio[name](...args); };

function pos(app, e) {
  const r = app.canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

function animateDim(app, to, dur) {
  const inp = app.input;
  inp.dimFrom = app.dimLevel;
  inp.dimTo = to;
  inp.dimT0 = app.clock.T;
  inp.dimDur = dur;
}

export function enterDim(app) {
  app.state = 'DIM';
  animateDim(app, 1, INPUT.dimS);
}

export function wake(app) {
  app.state = 'LIVE';
  app.input.idle = 0;
  app.input.ignoreUntil = app.clock.T + INPUT.dimIgnoreS;
  animateDim(app, 0, INPUT.wakeS);
}

function tapFantasy(app) {
  const f = app.fantasy;
  kick(f, app.live.sign());
  spawnHearts(app, f, f.hx, f.hy, fantasyRadius(app), false);
  sound(app, 'fantasy');
}

function tapFlower(app, f, x) {
  kick(f, x < f.hx ? 1 : -1);
  spawnHearts(app, f, f.hx, f.hy, f.r, f.gold);
  sound(app, f.gold ? 'gold' : 'tap', f);
}

export function resolveTap(app, x, y) {
  const st = app.state;
  if (st === 'CHARGING' || st === 'DIM') return;
  if (hitFantasy(app, x, y)) { tapFantasy(app); return; }
  const f = hitFlower(app, x, y);
  if (f) { tapFlower(app, f, x); return; }
  if (hitCherry(app, x, y)) {
    kickCherry(app);
    shakePetals(app);
    sound(app, 'shake');
    return;
  }
  if (st === 'NOVA') return;
  if (y < app.L.horizonY) {
    spawnShootingStar(app, x, y);
    sound(app, 'star');
    return;
  }
  if (st === 'LIVE') {
    plant(app, x, y);
    app.grass = buildGrass(app, stemBases(app).concat(app.fantasy.x));
    sound(app, 'plant');
  }
}

function onDown(app, e) {
  const inp = app.input;
  if (inp.p) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const [x, y] = pos(app, e);
  inp.idle = 0;
  const p = { id: e.pointerId, x0: x, y0: y, x, y, t0: app.clock.T, moved: 0, mode: 'normal', fantasy: false };
  inp.p = p;
  try { app.canvas.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
  if (app.state === 'DIM') { wake(app); p.mode = 'wake'; return; }
  if (app.clock.T < inp.ignoreUntil) { p.mode = 'ignored'; return; }
  const h = app.heart;
  const open = app.fantasy.open >= 1 && app.fantasy.grow >= 1;
  if (app.state === 'LIVE' && open && h.phase !== 'nova' && hitFantasy(app, x, y)) {
    pressHeart(app);
    p.fantasy = true;
  }
}

function onMove(app, e) {
  const inp = app.input;
  const p = inp.p;
  if (!p || e.pointerId !== p.id) return;
  const [x, y] = pos(app, e);
  p.x = x;
  p.y = y;
  p.moved = Math.max(p.moved, Math.hypot(x - p.x0, y - p.y0));
  inp.idle = 0;
  if (p.mode !== 'normal') return;
  const ph = app.heart.phase;
  if (p.fantasy && (ph === 'press' || ph === 'charging')) {
    const f = app.fantasy;
    if (Math.hypot(x - f.hx, y - f.hy) > fantasyRadius(app) * INPUT.hitPad * INPUT.cancelRadius) {
      cancelHeart(app);
      p.fantasy = false;
    }
    return;
  }
  inp.leaning = true;
  inp.leanX = x;
  inp.leanY = y;
}

function onUp(app, e) {
  const inp = app.input;
  const p = inp.p;
  if (!p || e.pointerId !== p.id) return;
  inp.p = null;
  inp.leaning = false;
  inp.idle = 0;
  if (p.mode !== 'normal') return;
  const held = app.clock.T - p.t0;
  const isTap = held < INPUT.tapMaxS && p.moved < INPUT.tapMovePx;
  const h = app.heart;
  if (p.fantasy && (h.phase === 'press' || h.phase === 'charging')) {
    if (h.phase === 'charging' && h.full) {
      startNova(app);
      sound(app, 'nova');
      return;
    }
    cancelHeart(app);
    if (isTap) tapFantasy(app);
    return;
  }
  if (isTap) resolveTap(app, p.x0, p.y0);
}

function onCancel(app, e) {
  const inp = app.input;
  const p = inp.p;
  if (!p || e.pointerId !== p.id) return;
  inp.p = null;
  inp.leaning = false;
  const ph = app.heart.phase;
  if (ph === 'press' || ph === 'charging') cancelHeart(app);
}

export function attachInput(app) {
  const cv = app.canvas;
  cv.addEventListener('pointerdown', (e) => onDown(app, e));
  cv.addEventListener('pointermove', (e) => onMove(app, e));
  cv.addEventListener('pointerup', (e) => onUp(app, e));
  cv.addEventListener('pointercancel', (e) => onCancel(app, e));
}

export function updateInput(app, dt) {
  const inp = app.input;
  const T = app.clock.T;
  if (app.state === 'LIVE' && !inp.p) {
    inp.idle += dt;
    if (inp.idle >= INPUT.idleS) enterDim(app);
  }
  app.dimLevel = lerp(inp.dimFrom, inp.dimTo, smooth((T - inp.dimT0) / inp.dimDur));
  app.darken = SLEEP.dim * app.dimLevel;

  const L = MOTION.lean;
  const U = app.L.U;
  const tau = inp.leaning ? L.response : L.decay / L.decayTaus;
  const k = 1 - Math.exp(-dt / tau);
  for (const f of allFlowers(app).concat(app.fantasy)) {
    let target = 0;
    if (inp.leaning) {
      const dx = inp.leanX - f.hx;
      const w = 1 - smoothstep(0, L.reachU * U, Math.hypot(dx, inp.leanY - f.hy));
      target = L.max * f.h * clamp(dx / (L.fullU * U), -1, 1) * w;
    }
    f.leanPx += (target - f.leanPx) * k;
  }

  const auto = app.theme.autoShooting && (app.state === 'LIVE' || app.state === 'DIM');
  if (!auto) { inp.nextShoot = null; return; }
  const [a, b] = INPUT.autoShooting;
  if (inp.nextShoot === null) inp.nextShoot = T + app.live.range(a, b);
  if (T >= inp.nextShoot) {
    const Lo = app.L;
    spawnShootingStar(app, app.live.range(Lo.minX, Lo.maxX), app.live.range(Lo.minY, Lo.fantasy.headY) );
    inp.nextShoot = T + app.live.range(a, b);
  }
}
