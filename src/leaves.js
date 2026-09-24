// Leaf sprites, built once per time of day and drawn with a transform as the
// leaves unfurl along their stems. Roses carry compound leaves of toothed
// leaflets, cosmos a fine thread of foliage, everything else a plain blade.
import { LEAVES } from './config-flora.js';
import { mix, rgba, lerp } from './util.js';
import { makeCanvas } from './sprites.js';

// One ovate leaflet with a serrated edge, drawn upward from its base at the origin.
function leaflet(g, len, wid, teeth, tooth, theme, rim) {
  const n = teeth * 2;
  const side = (s) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const half = wid * Math.pow(Math.sin(Math.PI * Math.pow(t, LEAVES.ovate)), LEAVES.round);
      const k = i % 2 && i < n ? 1 + tooth : 1;
      pts.push([s * half * k, -len * t]);
    }
    return pts;
  };
  const right = side(1), left = side(-1).reverse();
  const grad = g.createLinearGradient(-wid, 0, wid, 0);
  grad.addColorStop(0, theme.leaf[0]);
  grad.addColorStop(LEAVES.ribAt, mix(theme.leaf[0], theme.leaf[1], LEAVES.ribLift));
  grad.addColorStop(1, mix(theme.leaf[1], rim, LEAVES.rimMix));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 0);
  for (const [x, y] of right) g.lineTo(x, y);
  for (const [x, y] of left) g.lineTo(x, y);
  g.closePath();
  g.fill();
  g.strokeStyle = rgba(mix(theme.leaf[1], rim, LEAVES.rimMix), LEAVES.ribAlpha);
  g.lineWidth = LEAVES.ribW;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(0, -len * LEAVES.ribTo);
  for (let i = 1; i <= LEAVES.veins; i++) {
    const y = -len * (i / (LEAVES.veins + 1));
    for (const s of [-1, 1]) { g.moveTo(0, y); g.lineTo(s * wid * LEAVES.veinReach, y - len * LEAVES.veinRise); }
  }
  g.stroke();
}

// A rose leaf: a stalk with a leaflet at its tip and pairs of leaflets below.
export function roseLeafSprite(theme, rim) {
  const R = LEAVES.rose;
  const [w, h] = R.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  const at = (t) => [m + Math.sin(Math.PI * t) * w * R.bow, h * (1 - t * (1 - R.top))];
  g.strokeStyle = mix(theme.leaf[0], theme.leaf[1], R.stalkMix);
  g.lineWidth = R.stalkW;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(m, h);
  for (let i = 1; i <= R.stalkSteps; i++) { const [x, y] = at(i / R.stalkSteps); g.lineTo(x, y); }
  g.stroke();
  for (const [t, ang, len, wid] of R.leaflets) {
    const [x, y] = at(t);
    for (const s of ang === 0 ? [1] : [-1, 1]) {
      g.save();
      g.translate(x, y);
      g.rotate(s * ang);
      leaflet(g, len * h, wid * w, R.teeth, R.tooth, theme, rim);
      g.restore();
    }
  }
  return c;
}

// Cosmos foliage: a stalk with curving threadlike leaflets, themselves divided.
export function featherSprite(theme, rim) {
  const F = LEAVES.feather;
  const [w, h] = F.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const m = w / 2;
  const bow = w * F.bow;
  const at = (t) => [m + bow * Math.sin(Math.PI * t), h * (1 - t)];
  g.lineCap = 'round';
  g.strokeStyle = rgba(mix(theme.leaf[0], theme.leaf[1], F.stalkMix), 1);
  g.lineWidth = F.stalkW;
  g.beginPath();
  g.moveTo(m, h);
  for (let i = 1; i <= F.steps; i++) { const [x, y] = at(i / F.steps); g.lineTo(x, y); }
  g.stroke();
  g.strokeStyle = rgba(mix(theme.leaf[1], rim, F.rimMix), F.alpha);
  for (let i = 1; i <= F.pinnae; i++) {
    const t = i / (F.pinnae + 1);
    const [x, y] = at(t);
    const len = m * F.len * (1 - t * F.taper);
    for (const s of [-1, 1]) {
      const ex = x + s * len, ey = y - len * F.rise;
      const cx = x + s * len * F.ctrl[0], cy = y - len * F.ctrl[1];
      g.lineWidth = F.w1;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(cx, cy, ex, ey);
      g.stroke();
      g.lineWidth = F.w2;
      g.beginPath();
      for (const k of F.forks) {
        const px = lerp(lerp(x, cx, k), lerp(cx, ex, k), k), py = lerp(lerp(y, cy, k), lerp(cy, ey, k), k);
        const fl = len * F.forkLen;
        g.moveTo(px, py);
        g.quadraticCurveTo(px + s * fl * F.forkCtrl, py - fl * F.forkRise, px + s * fl, py - fl * F.forkUp);
      }
      g.stroke();
    }
  }
  return c;
}

// A plain blade: lighter along the midrib, the light's color on one edge.
export function plainLeafSprite(theme, rim, spec) {
  const [w, h] = spec.sprite;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const [a, b, cc, d] = spec.ctrl;
  const m = w / 2;
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, theme.leaf[0]);
  grad.addColorStop(LEAVES.ribAt, mix(theme.leaf[0], theme.leaf[1], LEAVES.ribLift));
  grad.addColorStop(1, mix(theme.leaf[1], rim, LEAVES.rimMix));
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(m, h);
  g.bezierCurveTo(m + m * a, h * b, m + m * cc, h * d, m, 0);
  g.bezierCurveTo(m - m * cc, h * d, m - m * a, h * b, m, h);
  g.fill();
  g.strokeStyle = rgba(mix(theme.leaf[1], rim, LEAVES.rimMix), LEAVES.ribAlpha);
  g.lineWidth = LEAVES.ribW;
  g.beginPath();
  g.moveTo(m, h);
  g.lineTo(m, h * (1 - spec.rib));
  g.stroke();
  return c;
}

export function buildLeaves(theme, light) {
  const rim = light.rimColor;
  return {
    rose: roseLeafSprite(theme, rim),
    feather: featherSprite(theme, rim),
    plain: plainLeafSprite(theme, rim, LEAVES.plain),
    blade: plainLeafSprite(theme, rim, LEAVES.blade),
  };
}

