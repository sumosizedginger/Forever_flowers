// Shared air: the slow breeze, the outward bow when the seed lands, and the
// exhale gust that rolls left to right.
import { MOTION, BEATS } from './config.js';
import { TAU, clamp01, smoothstep } from './util.js';

export function breeze(x, T) {
  const s = MOTION.sway;
  return 1 + s.breezeDepth * Math.sin(TAU * s.breezeHz * T - x * s.phasePerPx);
}

// Outward lean, as a fraction of blade height, while the seed's pulse spreads.
export function seedBow(app, x) {
  if (app.show.mode !== 'full') return 0;
  const b = BEATS.grassBow;
  const L = app.L;
  const dist = Math.abs(x - L.cx) / L.U;
  if (dist > b.reachU) return 0;
  const speed = BEATS.pulse.radiusU / BEATS.pulse.dur;
  const tau = app.s - BEATS.seed.land - dist / speed;
  if (tau <= 0 || tau >= b.dur) return 0;
  const env = (1 - Math.exp(-tau / b.attack)) * Math.pow(1 - tau / b.dur, 2);
  const fall = 1 - smoothstep(0, b.reachU, dist);
  return Math.sign(x - L.cx) * b.lean * env * fall;
}

// Gust strength 0..1 at x (positive bows to the right), with a small rebound.
export function gust(app, x) {
  if (app.show.mode !== 'full') return 0;
  const e = BEATS.exhale;
  const p = (app.s - e.start) / e.dur;
  if (p < 0 || p > 2) return 0;
  const L = app.L;
  const sigma = e.widthU * L.U;
  const x0 = -sigma * 2, x1 = L.W + sigma * 2;
  const front = x0 + (x1 - x0) * p;
  const u = (front - x) / sigma;
  return Math.exp(-u * u) - e.rebound * Math.exp(-(u - 2) * (u - 2)) * clamp01(p);
}

