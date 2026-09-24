// Boot, layout, and the render loop.
import { LAYOUT, PREVIEW } from './config.js';
import { readParams } from './params.js';
import { makeRng } from './util.js';
import { makeClock, tick, pauseClock, resumeClock } from './clock.js';
import { readSafe, computeLayout } from './layout.js';
import { currentTod, buildTheme } from './theme.js';
import { buildBackground, buildStars, buildMoon } from './sky.js';
import { buildGrass } from './grass.js';
import { buildLeafSprite } from './stem.js';
import { createFlowers, placeFlowers, stemBases, updateFlowers, drawRoseLayer, drawWildLayer, headBoxes } from './flowers.js';
import { buildCherry, cherryTimes, updateCherry, drawCherry, blossomBoxes } from './cherry.js';
import { buildPetals, drawPetals } from './petals.js';
import { createFantasy, placeFantasy, fantasyTimes, updateFantasy, drawFantasy, fantasyBox } from './fantasy.js';
import { drawSeed, buildFireflies, drawFireflies, drawPollen } from './fx.js';
import { buildButterflies, drawButterflies } from './butterflies.js';
import { flowerTimes, showTimes } from './choreo.js';
import { render, addLayer } from './render.js';
import { update, addStep } from './update.js';
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
  stars: [], moon: null, grass: null, leafSprite: null,
  flowers: null, cherry: null, petals: null, fantasy: null, fireflies: null, butterflies: null,
  breath: 1, dimLevel: 0, openDim: 1, gold: params.gold,
  fx: { shooting: [], petals: [] },
  stats: makeStats(),
  needsLayout: true,
};
if (params.preview && params.t === null) app.show.start = -PREVIEW.showTime;

app.tod = currentTod(params);
app.theme = buildTheme(app.tod);
app.flowers = createFlowers(app);
app.fantasy = createFantasy(app);

function rebuildWorld() {
  app.bg = buildBackground(app);
  app.stars = buildStars(app);
  app.moon = buildMoon(app);
  app.leafSprite = buildLeafSprite(app.theme);
  placeFlowers(app);
  placeFantasy(app);
  app.cherry = buildCherry(app);
  app.petals = buildPetals(app);
  app.fireflies = buildFireflies(app);
  app.butterflies = buildButterflies(app);
  app.grass = buildGrass(app, stemBases(app).concat(app.fantasy.x));
}

addStep(showTimes);
addStep(flowerTimes);
addStep(fantasyTimes);
addStep(cherryTimes);
addStep(updateFlowers);
addStep(updateFantasy);
addStep(updateCherry);
addLayer('mid', drawCherry);
addLayer('mid', drawPollen);
addLayer('mid', drawFireflies);
addLayer('mid', drawFantasy);
addLayer('mid', drawRoseLayer);
addLayer('mid', drawWildLayer);
addLayer('mid', drawPetals);
addLayer('front', drawButterflies);
addLayer('top', drawSeed);

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

installTestHooks(app, {
  get heads() { return [fantasyBox(app)].filter(Boolean).concat(headBoxes(app), blossomBoxes(app)); },
});
requestAnimationFrame(frame);
