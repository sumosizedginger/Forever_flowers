// Frame time stats and, with ?test only, window.__ff for the harness.
import { PERF } from './config.js';

export function makeStats() {
  return { dt: new Float32Array(PERF.samples), work: new Float32Array(PERF.samples), n: 0, i: 0, last: null };
}

export function recordFrame(stats, now, work) {
  if (stats.last !== null) {
    stats.dt[stats.i] = now - stats.last;
    stats.work[stats.i] = work;
    stats.i = (stats.i + 1) % PERF.samples;
    stats.n = Math.min(stats.n + 1, PERF.samples);
  }
  stats.last = now;
}

function pct(arr, n, p) {
  if (!n) return 0;
  const a = Array.from(arr.subarray(0, n)).sort((x, y) => x - y);
  return a[Math.min(n - 1, Math.floor(p * (n - 1) + 0.5))];
}

export function frameSummary(stats) {
  const n = stats.n;
  return {
    count: n,
    median: pct(stats.dt, n, 0.5), p95: pct(stats.dt, n, 0.95),
    workMedian: pct(stats.work, n, 0.5), workP95: pct(stats.work, n, 0.95),
  };
}

export function resetStats(stats) { stats.n = 0; stats.i = 0; stats.last = null; }

// extra is a map of getters and functions added by later modules.
export function installTestHooks(app, extra) {
  if (!app.params.test) return;
  const api = {
    get state() { return app.state; },
    get showTime() { return app.s; },
    get mode() { return app.show.mode; },
    get tod() { return app.tod; },
    get layout() { return app.L; },
    frames: () => frameSummary(app.stats),
    resetFrames: () => resetStats(app.stats),
  };
  for (const [k, d] of Object.entries(Object.getOwnPropertyDescriptors(extra))) Object.defineProperty(api, k, d);
  window.__ff = api;
}
