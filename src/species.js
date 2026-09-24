// One place that knows every kind of head: its 3D model, its palette, and the
// cached image it is drawn from. A head is rendered into its own canvas when
// its opening changes, in a lighter pass while it moves and in full once it
// holds still, and is otherwise drawn as that image.
import { PETAL, HEADS } from './config-flora.js';
import { SPRITE } from './config.js';
import { makeCanvas } from './sprites.js';
import { headBounds, renderHead } from './petal3d.js';
import { makePose } from './light3d.js';
import { roseModel, rosePalette, roseParts, daisyModel, daisyParts, cosmosModel, cosmosParts, wildModel, wildParts } from './models.js';

export function makeModel(rng, f) {
  if (f.species === 'rose') f.model = roseModel(rng);
  else if (f.species === 'daisy') f.model = daisyModel(rng);
  else if (f.species === 'cosmos') f.model = cosmosModel(rng);
  else f.model = wildModel(rng, f.type);
  f.pose = makePose(f.model.pitch, f.model.yaw);
  f.box = null;
}

function parts(f, e, theme, lod) {
  if (f.species === 'rose') {
    const key = `${theme.name}|${f.gold ? 1 : 0}`;
    if (f.palKey !== key) { f.pal = rosePalette(theme, f.colorName, f.gold); f.palKey = key; }
    return roseParts(f, e, f.pal, lod);
  }
  if (f.species === 'daisy') return daisyParts(f, e, theme, lod);
  if (f.species === 'cosmos') return cosmosParts(f, e, theme, lod);
  return wildParts(f, e, theme, lod);
}

// The head's reach in head radii around the stem tip, over its whole opening.
export function headBox(f, theme) {
  if (f.box) return f.box;
  let b = null;
  for (const e of HEADS.boundAt) {
    const k = headBounds(parts(f, e, theme, true), f.pose);
    b = b ? { x0: Math.min(b.x0, k.x0), y0: Math.min(b.y0, k.y0), x1: Math.max(b.x1, k.x1), y1: Math.max(b.y1, k.y1) } : k;
  }
  f.box = b;
  return b;
}

// How far the open head reaches sideways, as a multiple of its radius.
export function headExtent(f, theme) {
  const b = headBox(f, theme);
  return Math.max(-b.x0, b.x1);
}

// Wildflowers pop from nothing; the others show a bud while closed.
export const hasBud = (f) => f.species !== 'wild';

// The head's image for this opening: re-rendered only when the opening, the
// light or the size changes; lighter while it is still opening.
export function headImage(f, open, theme, light, dpr) {
  const c = f.cache;
  const q = Math.round(Math.min(1, Math.max(0, open)) / PETAL.openStep) * PETAL.openStep;
  if (c.q !== q) { c.q = q; c.still = 0; } else if (c.still < HEADS.settle) c.still++;
  const lod = c.still < HEADS.settle;
  const key = `${q}|${theme.name}|${f.gold ? 1 : 0}|${f.r.toFixed(2)}|${dpr}`;
  if (c.key === key && (c.lod === lod || !c.lod)) return c;
  const b = headBox(f, theme);
  const m = HEADS.pad;
  const r = f.r;
  const w = (b.x1 - b.x0 + m * 2) * r, h = (b.y1 - b.y0 + m * 2) * r;
  const scale = dpr * SPRITE.cacheScale;
  const pw = Math.ceil(w * scale), ph = Math.ceil(h * scale);
  if (!c.canvas || c.canvas.width !== pw || c.canvas.height !== ph) c.canvas = makeCanvas(pw, ph);
  const g = c.canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, pw, ph);
  g.setTransform(scale, 0, 0, scale, (m - b.x0) * r * scale, (m - b.y0) * r * scale);
  renderHead(g, parts(f, q, theme, lod), f.pose, light, r);
  c.key = key;
  c.lod = lod;
  c.x = (b.x0 - m) * r; c.y = (b.y0 - m) * r; c.w = w; c.h = h;
  return c;
}
