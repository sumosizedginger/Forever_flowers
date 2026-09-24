// Small shared helpers: seeded randomness, easing, math, color.
import { PALETTE, HEART_CURVE } from './config.js';

export const TAU = Math.PI * 2;

// Point on the heart curve in curve units; y grows downward, the notch is at t = 0.
export function heartXY(t) {
  const { a, b } = HEART_CURVE;
  const s = Math.sin(t);
  return [a * s * s * s, -(b[0] * Math.cos(t) - b[1] * Math.cos(2 * t) - b[2] * Math.cos(3 * t) - b[3] * Math.cos(4 * t))];
}

export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    fork: () => makeRng(Math.floor(next() * 4294967296)),
  };
}

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp01((x - a) / (b - a));
export const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
export const mod = (x, m) => ((x % m) + m) % m;
export const hyp = Math.hypot;

export const easeInOutSine = (x) => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2;
export const easeInQuad = (x) => { const t = clamp01(x); return t * t; };
export const easeInCubic = (x) => { const t = clamp01(x); return t * t * t; };
export const easeOutCubic = (x) => { const t = 1 - clamp01(x); return 1 - t * t * t; };
export const easeInOutCubic = (x) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export function easeOutBack(x, c1) {
  const t = clamp01(x);
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// CSS style cubic-bezier(x1, y1, x2, y2) as a function of progress.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const EPS = 1e-6;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < EPS) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < EPS) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < EPS) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

// Progress of a window [start, start + dur] at time t, 0..1.
export const win = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp01((t - start) / dur));

// ---- color ----
const HEX_RE = /^#?([0-9a-f]{6})$/i;
export function hexToRgb(hex) {
  const m = HEX_RE.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const h2 = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
export const rgbToHex = (r, g, b) => '#' + h2(r) + h2(g) + h2(b);

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = mod(t, 1);
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// Clamp a color to the brief's lightness ceiling.
export function safe(hex) {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  if (l <= PALETTE.maxLightness) return rgbToHex(r, g, b);
  const [r2, g2, b2] = hslToRgb(h, s, PALETTE.maxLightness);
  return rgbToHex(r2, g2, b2);
}
export function lightnessOf(r, g, b) { return rgbToHsl(r, g, b)[2]; }

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return safe(rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)));
}
export const darker = (hex, t) => mix(hex, '#000000', t);
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(safe(hex));
  return `rgba(${r},${g},${b},${clamp01(a)})`;
}
