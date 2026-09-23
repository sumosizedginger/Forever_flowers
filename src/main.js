// Boot, layout, and the render loop.
import { LAYOUT, PREVIEW } from './config.js';
import { readParams } from './params.js';
import { makeRng } from './util.js';
import { makeClock, tick, pauseClock, resumeClock } from './clock.js';
import { readSafe, computeLayout } from './layout.js';
import { currentTod, buildTheme } from './theme.js';
import { buildBackground, buildStars, buildMoon } from './sky.js';
import { buildGrass } from './grass.js';
import { render } from './render.js';
import { update } from './update.js';
import { makeStats, recordFrame, installTestHooks } from './testhooks.js';

const params = readParams(location.search);
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const seed = params.seed !== null ? params.seed >>> 0 : (Math.random() * 4294967296) >>> 0;

const app = {
  params, canvas, ctx, seed,
  dpr: 1, L: null, tod: null, theme: null,
  live: makeRng(seed ^ 0x11fe),
  clock: makeClock(params.t),
  show: { mode: 'full', start: 0 },
  state: 'INTRO', s: 0, prevS: 0, fadeIn: 0, overlay: 1, darken: 0, skyVis: 1, starReveal: 0,
  bg: null, bgPrev: null, bgMix: 1,
  stars: [], moon: null, grass: null,
  fx: { shooting: [] },
  stats: makeStats(),
  needsLayout: true,
};
if (params.preview && params.t === null) app.show.start = -PREVIEW.showTime;

app.tod = currentTod(params);
app.theme = buildTheme(app.tod);

function rebuildWorld() {
  app.bg = buildBackground(app);
  app.stars = buildStars(app);
  app.moon = buildMoon(app);
  app.grass = buildGrass(app, []);
}

function relayout() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  app.dpr = Math.min(window.devicePixelRatio || 1, LAYOUT.dprMax);
  canvas.width = Math.round(W * app.dpr);
  canvas.height = Math.round(H * app.dpr);
  app.L = computeLayout(W, H, readSafe(document.getElementById('safe')));
  rebuildWorld();
}

function frame(now) {
  requestAnimationFrame(frame);
  if (app.needsLayout) { app.needsLayout = false; relayout(); }
  const t0 = performance.now();
  const dt = tick(app.clock, now);
  update(app, dt);
  render(app);
  recordFrame(app.stats, now, performance.now() - t0);
}

const onResize = () => { app.needsLayout = true; };
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseClock(app.clock);
  else resumeClock(app.clock);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

installTestHooks(app, {});
requestAnimationFrame(frame);
