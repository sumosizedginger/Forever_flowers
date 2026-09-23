// Offscreen sprites prerendered once and drawn as cached images. Glows are
// radial gradients baked here, then drawn with additive blending.
import { SPRITE } from './config.js';
import { rgba, safe } from './util.js';

const glowCache = new Map();

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function radial(color, px, stops) {
  const c = makeCanvas(px, px);
  const g = c.getContext('2d');
  const r = px / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [at, a] of stops) grad.addColorStop(at, rgba(color, a));
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  return c;
}

export function glow(color, px = SPRITE.glowPx) {
  const key = `g${safe(color)}${px}`;
  if (!glowCache.has(key)) glowCache.set(key, radial(color, px, SPRITE.glowStops));
  return glowCache.get(key);
}

export function starSprite(color) {
  const key = `s${safe(color)}`;
  if (!glowCache.has(key)) glowCache.set(key, radial(color, SPRITE.smallGlowPx, SPRITE.starStops));
  return glowCache.get(key);
}

// A horizontal streak, bright at the right end, for shooting stars.
export function streakSprite(color) {
  const key = `k${safe(color)}`;
  if (glowCache.has(key)) return glowCache.get(key);
  const [w, h] = SPRITE.streak;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const lin = g.createLinearGradient(0, 0, w, 0);
  lin.addColorStop(0, rgba(color, 0));
  lin.addColorStop(0.7, rgba(color, 0.35));
  lin.addColorStop(1, rgba(color, 1));
  const v = g.createLinearGradient(0, 0, 0, h);
  g.fillStyle = lin;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(0.5, 'rgba(0,0,0,1)');
  v.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
  glowCache.set(key, c);
  return c;
}

// Draw an image centered at (x, y) with rotation and scale, in CSS px.
export function place(ctx, dpr, x, y, rot, sx, sy) {
  const c = Math.cos(rot), s = Math.sin(rot);
  ctx.setTransform(dpr * c * sx, dpr * s * sx, -dpr * s * sy, dpr * c * sy, dpr * x, dpr * y);
}

export function resetTransform(ctx, dpr) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

export function drawGlow(ctx, sprite, x, y, r, alpha) {
  if (alpha <= 0.002 || r <= 0) return;
  ctx.globalAlpha = alpha > 1 ? 1 : alpha;
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

// Per object cache for anything that has stopped changing. The draw function
// renders centered on the origin within radius r (CSS px).
export function makeHeadCache() { return { canvas: null, key: null, pending: null, stable: 0, r: 0 }; }

export function cachedImage(cache, key, r, dpr, draw) {
  if (cache.key === key && cache.canvas) return cache;
  if (cache.pending !== key) { cache.pending = key; cache.stable = 0; return null; }
  if (++cache.stable < SPRITE.stableFrames) return null;
  const rr = r * SPRITE.cachePad;
  const scale = dpr * SPRITE.cacheScale;
  const px = Math.ceil(rr * 2 * scale);
  if (!cache.canvas || cache.canvas.width !== px) cache.canvas = makeCanvas(px, px);
  const g = cache.canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, px, px);
  g.setTransform(scale, 0, 0, scale, px / 2, px / 2);
  draw(g);
  cache.key = key;
  cache.r = rr;
  return cache;
}

export function dropCache(cache) { cache.key = null; cache.pending = null; cache.stable = 0; }
