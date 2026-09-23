// App clock in seconds. Pauses completely while hidden and resumes exactly
// where it left off. ?t freezes it.
import { MOTION } from './config.js';

export function makeClock(frozenAt) {
  return { T: frozenAt === null ? 0 : frozenAt, frozen: frozenAt !== null, paused: false, last: null };
}

export function tick(clock, nowMs) {
  if (clock.paused || clock.last === null) {
    clock.last = nowMs;
    return 0;
  }
  const raw = (nowMs - clock.last) / 1000;
  clock.last = nowMs;
  if (clock.frozen) return 0;
  const dt = Math.min(Math.max(raw, 0), MOTION.dtMax);
  clock.T += dt;
  return dt;
}

export function pauseClock(clock) { clock.paused = true; }
export function resumeClock(clock) { clock.paused = false; clock.last = null; }
