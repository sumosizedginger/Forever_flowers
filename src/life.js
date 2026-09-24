// Living with it: visits, the wake up on return, the golden rose roll, her
// local clock, and replay. Storage is optional; everything works without it.
import { STORAGE, GOLD, TOD } from './config.js';
import { GARDEN } from './config-garden.js';
import { todFromHour, buildTheme } from './theme.js';

export const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked is fine */ } },
};

// Her local calendar day as a whole number, so the garden counts days, not hours.
const localDay = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / GARDEN.dayMs);

// Calendar days since her first visit, and whether this is the first open today.
function gardenDays(params) {
  if (params.day !== null) {
    const days = Math.max(0, Math.floor(params.day));
    return { days, newToday: days > 0 && !params.preview };
  }
  const today = localDay(new Date());
  const first = parseInt(store.get(STORAGE.firstDay), 10);
  const days = Number.isFinite(first) ? Math.max(0, today - first) : 0;
  if (!Number.isFinite(first)) store.set(STORAGE.firstDay, String(today));
  const last = parseInt(store.get(STORAGE.lastDay), 10);
  store.set(STORAGE.lastDay, String(today));
  return { days, newToday: days > 0 && last !== today };
}

export function markHeartFound(app) {
  if (app.heartFound) return;
  app.heartFound = true;
  store.set(STORAGE.heartFound, '1');
}

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

export function bootLife(params) {
  const reduced = prefersReducedMotion();
  const visits = (parseInt(store.get(STORAGE.visits) || '0', 10) || 0) + 1;
  store.set(STORAGE.visits, String(visits));

  let seed;
  if (params.seed !== null) seed = params.seed >>> 0;
  else {
    const kept = parseInt(store.get(STORAGE.seed), 10);
    seed = Number.isFinite(kept) ? kept >>> 0 : (Math.random() * 4294967296) >>> 0;
    store.set(STORAGE.seed, String(seed));
  }

  // Test params never roll gold on their own, so frozen frames stay comparable.
  // Never on the first visit, so she knows the crimson rose first.
  const testing = params.seed !== null || params.t !== null || params.preview;
  let gold = params.gold;
  if (!gold && !testing && visits > 1) {
    const seen = store.get(STORAGE.gold) === '1';
    gold = Math.random() < GOLD.chance || (!seen && visits >= GOLD.guaranteeBy);
    if (gold) store.set(STORAGE.gold, '1');
  }

  let mode = 'full';
  if (!params.full && !params.preview && (reduced || visits > 1)) mode = 'wake';
  const { days, newToday } = gardenDays(params);
  return {
    seed, visits, gold, mode, reduced, days, newToday,
    heartFound: store.get(STORAGE.heartFound) === '1',
    soundOn: store.get(STORAGE.sound) === '1',
    soundUsed: store.get(STORAGE.soundUsed) === '1',
  };
}

// Recheck her clock every minute; crossfade the sky when the time of day turns.
export function watchClock(app, rebuild) {
  let last = performance.now();
  return () => {
    if (app.params.tod) return;
    const now = performance.now();
    if (now - last < TOD.recheckS * 1000) return;
    last = now;
    const tod = todFromHour(new Date().getHours());
    if (tod === app.tod) return;
    app.bgPrev = app.bg;
    app.bgMix = 0;
    app.tod = tod;
    app.theme = buildTheme(tod);
    setThemeColor(app.theme.themeColor);
    rebuild();
  };
}

export function setThemeColor(color) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color);
}
