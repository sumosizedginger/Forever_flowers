// Small wildflowers, low in the field, facing her. Each palette color has its
// own petal shape. Popped heads are served from a cached sprite.
import { SHAPE, TUNE } from './config.js';
import { TAU, mix, darker, clamp01, lerp } from './util.js';

function petal(g, len, half, round, rot) {
  const [a, b, c, d] = SHAPE.wildPetal;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const X = (u, v) => u * cs - v * sn;
  const Y = (u, v) => u * sn + v * cs;
  const tip = half * lerp(c, c + d, round);
  g.moveTo(0, 0);
  g.bezierCurveTo(X(len * a, -half), Y(len * a, -half), X(len * b, -tip), Y(len * b, -tip), X(len, 0), Y(len, 0));
  g.bezierCurveTo(X(len * b, tip), Y(len * b, tip), X(len * a, half), Y(len * a, half), 0, 0);
}

// open is the pop progress, 0 to 1 with a little overshoot.
export function drawWild(g, f, r, open, theme) {
  const spec = SHAPE.wild[f.type];
  const sh = SHAPE.wildShade;
  const o = Math.max(0, open);
  if (o <= 0.001) return;
  const color = theme.wild[f.type];
  const center = theme.wildCenter[spec.c];
  const rad = r * o;
  const len = rad * spec.len;
  const half = rad * spec.w;
  const rot0 = f.petalRot - sh.spin * (1 - clamp01(o));
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, len);
  grad.addColorStop(0, darker(color, sh.base));
  grad.addColorStop(spec.center, color);
  grad.addColorStop(1, mix(color, SHAPE.rose.edgeTo, sh.edge));
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < spec.petals; i++) petal(g, len, half, spec.round, rot0 + (i * TAU) / spec.petals);
  g.fill();
  g.fillStyle = center;
  g.beginPath();
  g.arc(0, 0, rad * spec.center, 0, TAU);
  g.fill();
  g.fillStyle = darker(center, sh.base);
  const dr = rad * sh.dotR;
  for (let i = 0; i < sh.dots; i++) {
    const a = f.petalRot + (i * TAU) / sh.dots;
    g.beginPath();
    g.arc(Math.cos(a) * rad * spec.center * sh.dotAt, Math.sin(a) * rad * spec.center * sh.dotAt, dr, 0, TAU);
    g.fill();
  }
}

export function wildKey(f, open, theme) {
  return `${open.toFixed(3)}|${theme.name}|${f.r.toFixed(2)}|${TUNE.overshoot}`;
}
