// Sky, horizon glow, far hills and the layered field, baked once per layout
// and time of day. Stars, moon and shooting stars are drawn per frame from sprites.
import { WORLD, TOD, SHOOTING, COUNTS, SIZE, PALETTE, SPRITE, LAYOUT } from './config.js';
import { TAU, mix, rgba, darker, clamp, clamp01, win, easeOutCubic, makeRng } from './util.js';
import { makeCanvas, starSprite, streakSprite, glow, place, resetTransform, drawGlow } from './sprites.js';

function ridgePath(g, W, H, spec, phases) {
  const total = spec.waves.reduce((a, w) => a + w[1], 0);
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W + WORLD.ridgeStepPx; x += WORLD.ridgeStepPx) {
    let v = 0;
    spec.waves.forEach(([f, w], i) => { v += w * Math.sin((x / W) * f * TAU + phases[i]); });
    g.lineTo(x, H * (spec.y + (spec.amp * v) / total));
  }
  g.lineTo(W, H);
  g.closePath();
}

function ellipseGlow(g, x, y, rx, ry, color, alpha) {
  g.save();
  g.translate(x, y);
  g.scale(1, ry / rx);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  SPRITE.glowStops.forEach(([at, a]) => grad.addColorStop(at, rgba(color, a * alpha)));
  g.fillStyle = grad;
  g.fillRect(-rx, -rx, rx * 2, rx * 2);
  g.restore();
}

function backBlades(g, rng, W, H, U, band, col, theme) {
  const bb = WORLD.backBlades;
  const [cx, cy, cw, cy2] = bb.ctrl;
  g.fillStyle = rgba(mix(col, theme.grass[1], bb.lift * (1 + band.mix)), bb.alpha);
  g.beginPath();
  const n = Math.round(W * bb.perPx);
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, W);
    const y = H * band.y + rng.range(-1, 1) * H * band.amp + U * rng.range(0, bb.hU[0]);
    const h = U * rng.range(bb.hU[0], bb.hU[1]) * (bb.depth + band.mix);
    const w = U * bb.wU;
    const lean = rng.range(-1, 1) * h * bb.lean;
    g.moveTo(x - w, y);
    g.quadraticCurveTo(x + lean * cx, y - h * cy, x + lean, y - h);
    g.quadraticCurveTo(x + lean * cx + w * cw, y - h * cy2, x + w, y);
  }
  g.fill();
}

export function buildBackground(app) {
  const { L, theme, dpr } = app;
  const { W, H, U } = L;
  const rng = makeRng(app.seed ^ 0x5eed);
  const c = makeCanvas(W * dpr, H * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const stops = WORLD.skyStops;
  const last = stops[stops.length - 1];
  const sky = g.createLinearGradient(0, 0, 0, H * last);
  const cols = [theme.sky[0], theme.sky[1], theme.sky[2], theme.horizon];
  stops.forEach((s, i) => sky.addColorStop(s / last, cols[i]));
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const hg = WORLD.horizonGlow;
  ellipseGlow(g, L.cx, H * hg.y, W * hg.rx, H * hg.ry, theme.horizon, hg.alpha);
  if (theme.sun > 0) {
    const r = U * TOD.sunRadiusU;
    ellipseGlow(g, W * TOD.sunX, H * hg.y, r, r * hg.ry * 2, theme.sunColor, TOD.sunAlpha * theme.sun);
  }

  const phases = (spec) => spec.waves.map(() => rng.range(0, TAU));
  g.fillStyle = theme.hills;
  ridgePath(g, W, H, WORLD.farHill, phases(WORLD.farHill));
  g.fill();
  const nearHill = mix(theme.hills, theme.ground, TOD.nearHillMix);
  g.fillStyle = nearHill;
  ridgePath(g, W, H, WORLD.nearHill, phases(WORLD.nearHill));
  g.fill();

  for (const band of WORLD.bands) {
    const col = mix(mix(theme.grass[0], theme.grass[1], band.mix), nearHill, WORLD.bandHillMix * (1 - band.mix));
    g.fillStyle = col;
    ridgePath(g, W, H, band, phases(band));
    g.fill();
    backBlades(g, rng, W, H, U, band, col, theme);
  }

  const top = L.groundY - U * WORLD.groundTopU;
  const ground = g.createLinearGradient(0, top, 0, H);
  ground.addColorStop(0, rgba(theme.ground, 0));
  ground.addColorStop(WORLD.groundStop, theme.ground);
  ground.addColorStop(1, darker(theme.ground, WORLD.groundFade));
  g.fillStyle = ground;
  g.fillRect(0, top, W, H - top);
  return c;
}

// ---- stars ----
export function buildStars(app) {
  const { L } = app;
  const { W, H } = L;
  const rng = makeRng(app.seed ^ 0x57a2);
  const st = WORLD.stars;
  const n = clamp(Math.round(W * H * COUNTS.starsPerPx), COUNTS.stars[0], COUNTS.stars[1]);
  const stars = [];
  for (let i = 0; i < n * 2 && stars.length < n; i++) {
    const x = rng.range(0, W);
    const y = Math.pow(rng.next(), st.pow) * H * st.maxY;
    if (Math.hypot(x - L.moon.x, y - L.moon.y) < L.moon.r * st.moonClear) continue;
    const core = rng.range(SIZE.starPx[0], SIZE.starPx[1]);
    // stars add light, so two never overlap
    if (stars.some((o) => Math.hypot(o.x - x, o.y - y) < (o.r + core * st.sizeGlow) * st.spacing)) continue;
    stars.push({
      x, y, r: core * st.sizeGlow,
      a: rng.range(st.alpha[0], st.alpha[1]) * (1 - (y / (H * st.maxY)) * st.topBias),
      hz: rng.range(COUNTS.starTwinkleHz[0], COUNTS.starTwinkleHz[1]),
      ph: rng.range(0, TAU), depth: rng.range(st.depth[0], st.depth[1]),
      delay: rng.range(st.delay[0], st.delay[1]),
      sprite: starSprite(rng.pick(PALETTE.stars)),
    });
  }
  return stars;
}

// reveal is seconds since the stars started twinkling up, or null when settled.
export function drawStars(ctx, app, reveal) {
  const vis = app.theme.stars * app.skyVis;
  if (vis <= 0.01) return;
  const T = app.clock.T;
  for (const s of app.stars) {
    const up = reveal === null ? 1 : win(reveal, s.delay, WORLD.stars.twinkleUp);
    if (up <= 0) continue;
    const tw = 1 - s.depth + s.depth * (0.5 + 0.5 * Math.sin(TAU * s.hz * T + s.ph));
    drawGlow(ctx, s.sprite, s.x, s.y, s.r, s.a * tw * up * vis);
  }
}

// ---- moon ----
export function buildMoon(app) {
  const { dpr, L } = app;
  const m = WORLD.moon;
  const r = L.moon.r;
  const R = Math.max(L.U * LAYOUT.moon.haloU, r);
  const c = makeCanvas(R * 2 * dpr, R * 2 * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, R * dpr, R * dpr);
  const halo = g.createRadialGradient(0, 0, r * m.haloInner, 0, 0, R);
  m.haloStops.forEach(([at, a]) => halo.addColorStop(at, rgba(PALETTE.moonHalo, PALETTE.moonHaloAlpha * a)));
  g.fillStyle = halo;
  g.fillRect(-R, -R, R * 2, R * 2);
  const [lx, ly, li] = m.light;
  const disc = g.createRadialGradient(lx * r, ly * r, li * r, 0, 0, r);
  // a softer disc than the brief's moon white, so the fantasy flower stays the brightest thing
  disc.addColorStop(0, rgba(PALETTE.moonDisc[0], 1));
  disc.addColorStop(1, PALETTE.moonDisc[1]);
  g.fillStyle = disc;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fill();
  g.fillStyle = rgba(darker(PALETTE.moonHalo, m.craterDark), m.craterAlpha);
  for (const [cx, cy, cr] of m.craters) {
    g.beginPath();
    g.arc(cx * r, cy * r, cr * r, 0, TAU);
    g.fill();
  }
  g.strokeStyle = rgba(darker(PALETTE.moonHalo, m.edgeDark), m.rimAlpha);
  g.lineWidth = r * m.rimW;
  g.beginPath();
  g.arc(0, 0, r * m.rimAt, 0, TAU);
  g.stroke();
  return { canvas: c, R };
}

export function drawMoon(ctx, app) {
  const a = app.theme.moon * app.skyVis;
  if (a <= 0.01 || !app.moon) return;
  const { x, y } = app.L.moon;
  const R = app.moon.R;
  ctx.globalAlpha = a;
  ctx.drawImage(app.moon.canvas, x - R, y - R, R * 2, R * 2);
}

// ---- shooting stars ----
export function spawnShootingStar(app, x, y) {
  const r = app.live;
  const dir = x > app.L.cx ? -1 : 1;
  const ang = r.range(SHOOTING.angle[0], SHOOTING.angle[1]);
  app.fx.shooting.push({ t0: app.clock.T, x, y, dx: Math.cos(ang) * dir, dy: Math.sin(ang) });
}

export function drawShooting(ctx, app) {
  const list = app.fx.shooting;
  if (!list.length) return;
  const { dpr, L } = app;
  const T = app.clock.T;
  const streak = streakSprite(PALETTE.stars[0]);
  const head = glow(PALETTE.stars[0]);
  const base = app.theme.stars > 0 ? SHOOTING.alpha : SHOOTING.dayAlpha;
  const thick = SPRITE.streak[1] * SHOOTING.thick;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    const p = (T - s.t0) / SHOOTING.dur;
    if (p >= 1) { list.splice(i, 1); continue; }
    if (p < 0) continue;
    const e = easeOutCubic(p);
    const hx = s.x + s.dx * L.U * SHOOTING.travelU * e;
    const hy = s.y + s.dy * L.U * SHOOTING.travelU * e;
    const a = Math.sin(Math.PI * p) * base * app.skyVis;
    const len = L.U * SHOOTING.lengthU * clamp01(p * SHOOTING.grow) * (1 - p * SHOOTING.shrink);
    place(ctx, dpr, hx, hy, Math.atan2(s.dy, s.dx), 1, 1);
    ctx.globalAlpha = a;
    ctx.drawImage(streak, -len, -thick / 2, len, thick);
    resetTransform(ctx, dpr);
    drawGlow(ctx, head, hx, hy, L.U * SHOOTING.headU, a * SHOOTING.headAlpha);
  }
}
