// Boot, layout, and the render loop.
import { LAYOUT, PREVIEW, TUNE, BEATS } from './config.js';
import { readParams } from './params.js';
import { makeRng } from './util.js';
import { makeClock, tick, pauseClock, resumeClock } from './clock.js';
import { readSafe, computeLayout } from './layout.js';
import { currentTod, buildTheme, buildHazeTheme } from './theme.js';
import { buildBackground, buildStars, buildMoon } from './sky.js';
import { buildGrass } from './grass.js';
import { buildLeafSprite, buildFeatherSprite } from './stem.js';
import { createFlowers, placeFlowers, stemBases, updateFlowers, drawRoseLayer, drawCosmosLayer, drawFrontLayer, drawMeadowLayer, headBoxes } from './flowers.js';
import { createMeadow, createDaily, loadPlanted, regrowPlanted, drawNewSparkle } from './garden.js';
import { drawHint, hintPose } from './hint.js';
import { buildFront, drawFront } from './front.js';
import { buildCherry, cherryTimes, updateCherry, drawCherry, blossomBoxes } from './cherry.js';
import { buildPetals, drawPetals } from './petals.js';
import { createFantasy, placeFantasy, fantasyTimes, updateFantasy, drawFantasy, drawFantasyHalo, fantasyBox } from './fantasy.js';
import { drawSeed, buildFireflies, drawFireflies, drawPollen } from './fx.js';
import { buildButterflies, drawButterflies } from './butterflies.js';
import { drawHearts, heartCount } from './hearts.js';
import { makeHeart, layoutHeart, updateHeart, drawHeartSecret, heartPhase, startNova, heartBox, NOVA_LENGTH } from './heart.js';
import { makeInput, attachInput, updateInput, enterDim } from './input.js';
import { plantedCount, allFlowers } from './flowers.js';
import { fantasyRadius } from './fantasy.js';
import { flowerTimes, showTimes } from './choreo.js';
import { bootLife, watchClock, setThemeColor } from './life.js';
import { makeAudio } from './audio.js';
import { setupUI, updateUI } from './ui.js';
import { setupTune } from './tune.js';
import { render, addLayer } from './render.js';
import { update, addStep } from './update.js';
import { makeStats, recordFrame, installTestHooks } from './testhooks.js';

const params = readParams(location.search);
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const life = bootLife(params);
const seed = life.seed;

const app = {
  params, canvas, ctx, seed, reduced: life.reduced, visits: life.visits,
  days: life.days, newToday: life.newToday, heartFound: life.heartFound,
  dpr: 1, L: null, tod: null, theme: null,
  live: makeRng(seed ^ 0x11fe),
  clock: makeClock(params.t),
  show: { mode: life.mode, start: 0 },
  state: 'INTRO', s: 0, prevS: 0, fadeIn: 0, overlay: 1, darken: 0, skyVis: 1, starReveal: 0,
  bg: null, bgPrev: null, bgMix: 1,
  stars: [], moon: null, grass: null, leafSprite: null,
  flowers: null, cherry: null, petals: null, fantasy: null, fireflies: null, butterflies: null,
  breath: 1, dimLevel: 0, openDim: 1, gold: life.gold, introDone: false,
  fx: { shooting: [], petals: [], hearts: [] },
  input: makeInput(), heart: makeHeart(),
  stats: makeStats(),
  needsLayout: true,
};
if (params.preview && params.t === null) app.show.start = -PREVIEW.showTime;

app.tod = currentTod(params);
app.theme = buildTheme(app.tod);
setThemeColor(app.theme.themeColor);
app.flowers = createFlowers(app);
createMeadow(app);
createDaily(app);
loadPlanted(app);
app.fantasy = createFantasy(app);
app.audio = makeAudio(app);

function rebuildWorld() {
  app.bg = buildBackground(app);
  app.stars = buildStars(app);
  app.moon = buildMoon(app);
  app.leafSprite = buildLeafSprite(app.theme);
  app.featherSprite = buildFeatherSprite(app.theme);
  app.hazeTheme = buildHazeTheme(app.theme);
  placeFlowers(app);
  placeFantasy(app);
  app.cherry = buildCherry(app);
  app.petals = buildPetals(app);
  app.fireflies = buildFireflies(app);
  app.butterflies = buildButterflies(app);
  app.grass = buildGrass(app, stemBases(app).concat(app.fantasy.x));
  app.front = buildFront(app);
  layoutHeart(app);
}

// Replay returns to the intro; her planted flowers grow back with everything else.
function replay() {
  app.show.mode = app.reduced ? 'wake' : 'full';
  app.show.start = app.clock.T;
  app.s = 0;
  app.prevS = 0;
  app.state = 'INTRO';
  app.introDone = false;
  regrowPlanted(app, app.clock.T + BEATS.wildStems.start);
  app.fx.hearts.length = 0;
  app.fx.petals.length = 0;
  app.fx.shooting.length = 0;
  app.heart = makeHeart();
  app.input = makeInput();
  app.dimLevel = 0;
  app.darken = 0;
  for (const f of allFlowers(app).concat(app.fantasy)) { f.spring.x = 0; f.spring.v = 0; f.leanPx = 0; }
  rebuildWorld();
}

app.ui = setupUI(app, replay);
setupTune(app);
const clockStep = watchClock(app, rebuildWorld);

addStep(showTimes);
addStep(updateInput);
addStep(updateHeart);
addStep(flowerTimes);
addStep(fantasyTimes);
addStep(cherryTimes);
addStep(updateFlowers);
addStep(updateFantasy);
addStep(updateCherry);
addStep(() => app.audio.step());
addStep(updateUI);
addStep(clockStep);
addLayer('mid', drawCherry);
addLayer('mid', drawPollen);
addLayer('mid', drawFireflies);
addLayer('mid', drawMeadowLayer);
addLayer('mid', drawFantasyHalo);
addLayer('mid', drawCosmosLayer);
addLayer('mid', drawFantasy);
addLayer('mid', drawRoseLayer);
addLayer('mid', drawFrontLayer);
addLayer('mid', drawPetals);
addLayer('front', drawFront);
addLayer('front', drawHint);
addLayer('front', drawNewSparkle);
addLayer('front', drawButterflies);
addLayer('front', drawHearts);
addLayer('front', drawHeartSecret);
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
  app.audio.suspend(document.hidden);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

installTestHooks(app, {
  get heads() { return [fantasyBox(app)].filter(Boolean).concat(headBoxes(app), blossomBoxes(app)); },
  get planted() { return plantedCount(app); },
  get heartPhase() { return heartPhase(app); },
  get hearts() { return heartCount(app); },
  get petals() { return app.fx.petals.length; },
  get dim() { return app.dimLevel; },
  get heartBox() { return heartBox(app); },
  get moonBox() { const m = app.L.moon; return { x: m.x - m.r, y: m.y - m.r, w: m.r * 2, h: m.r * 2 }; },
  get fantasy() { return { x: app.fantasy.hx, y: app.fantasy.hy, r: fantasyRadius(app) }; },
  get gold() { return app.gold; },
  get sound() { return app.audio.on; },
  get buttons() { return app.ui.shown; },
  get visits() { return app.visits; },
  get garden() { const fl = app.flowers; return { days: fl.daily.length, mid: fl.daily.filter((f) => !f.far).length, far: fl.daily.filter((f) => f.far).length, meadow: fl.meadow.length, newToday: fl.daily.some((f) => f.isNew) }; },
  get heartFound() { return app.heartFound; },
  get hint() { return hintPose(app); },
  get tune() { return { ...TUNE }; },
  replay: () => replay(),
  novaLength: NOVA_LENGTH,
  triggerHeart: (at) => startNova(app, at || 0),
  forceDim: () => enterDim(app),
});
attachInput(app);
requestAnimationFrame(frame);
