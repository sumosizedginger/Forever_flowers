// Living with it: visits, the wake up on return, the golden rose roll, her
// local clock, and replay. Storage is optional; everything works without it.
import { STORAGE, GOLD, TOD } from './config.js';
import { todFromHour, buildTheme } from './theme.js';

export const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked is fine */ } },
};

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
  const testing = params.seed !== null || params.t !== null || params.preview;
  let gold = params.gold;
  if (!gold && !testing) {
    const seen = store.get(STORAGE.gold) === '1';
    gold = Math.random() < GOLD.chance || (!seen && visits >= GOLD.guaranteeBy);
    if (gold) store.set(STORAGE.gold, '1');
  }

  let mode = 'full';
  if (!params.full && !params.preview && (reduced || visits > 1)) mode = 'wake';
  return { seed, visits, gold, mode, reduced };
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
