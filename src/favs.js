// Her favorites. Cosmos: eight broad petals with toothed tips around a small
// gold heart. Daisies: many slender cream petals around a domed gold center.
// Both are seen a little from above, drawn on the origin at radius r, and
// served from the head cache once they hold still.
import { FAVS, FAV_PALETTE } from './config-garden.js';
import { TAU, GOLDEN, lerp, smooth, mix, rgba } from './util.js';

function rotor(rot) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return [(u, v) => u * cs - v * sn, (u, v) => u * sn + v * cs];
}

function cosmosPetal(g, len, wid, rot) {
  const C = FAVS.cosmos;
  const [X, Y] = rotor(rot);
  const P = (u, v) => [X(u * len, v * wid), Y(u * len, v * wid)];
  const [b0, b1] = C.base;
  const [[c1u, c1v], [c2u, c2v], [eu, ev]] = C.side;
  g.moveTo(...P(b0, -b1));
  g.bezierCurveTo(...P(c1u, -c1v), ...P(c2u, -c2v), ...P(eu, -ev));
  for (let i = C.teeth.length - 1; i >= 0; i--) {
    const [u, v] = C.teeth[i];
    g.lineTo(...P(u, v));
  }
  g.bezierCurveTo(...P(c2u, c2v), ...P(c1u, c1v), ...P(b0, b1));
  g.closePath();
}

// A small green bud with the petal color showing at its tip, while the head is still closed.
function bud(g, r, o, color, th, spec) {
  const a = 1 - smooth(o / spec.budUntil);
  if (a <= 0.01) return;
  const br = r * spec.budR;
  g.globalAlpha = a;
  g.fillStyle = th.bud;
  g.beginPath();
  g.ellipse(0, 0, br, br * FAVS.budTall, 0, 0, TAU);
  g.fill();
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(0, -br * (1 - spec.budCap), br * spec.budCap, br * spec.budCap * FAVS.budCapH, 0, Math.PI, TAU);
  g.fill();
  g.globalAlpha = 1;
}

function center(g, cr, th, spec, dots, seed) {
  const [hx, hy] = spec.highlight || spec.dome;
  const grad = g.createRadialGradient(cr * hx, cr * hy, 0, 0, 0, cr);
  grad.addColorStop(0, th.favCenter[0]);
  grad.addColorStop(1, th.favCenter[1]);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, cr, 0, TAU);
  g.fill();
  g.fillStyle = th.favCenter[2];
  g.beginPath();
  const dr = cr * spec.floretR;
  for (let i = 0; i < dots; i++) {
    const a = seed + i * GOLDEN;
    const rr = cr * spec.floretAt * Math.sqrt((i + 0.5) / dots);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    g.moveTo(x + dr, y);
    g.arc(x, y, dr, 0, TAU);
  }
  g.fill();
}

export function drawCosmos(g, f, r, open, th) {
  const C = FAVS.cosmos;
  const o = Math.max(0, open);
  const e = smooth(Math.min(o, 1));
  const over = Math.max(0, o - 1);
  const col = th.cosmos[f.color % th.cosmos.length];
  bud(g, r, o, col.base, th, C);
  if (o <= 0.02) return;
  g.save();
  g.scale(1, lerp(C.budSquash, C.squash, e));
  const len = r * lerp(C.open[0], C.open[1], e) * (1 + over);
  const wid = len * lerp(C.width[0], C.width[1], e);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, len);
  const [s0, s1, s2, s3] = C.stops;
  grad.addColorStop(s0, col.deep);
  grad.addColorStop(s1, col.deep);
  grad.addColorStop(s2, col.base);
  grad.addColorStop(s3, col.light);
  g.globalAlpha = smooth(o / C.budUntil);
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < C.petals; i++) cosmosPetal(g, len, wid, f.petalRot + (i * TAU) / C.petals + f.jit[i % f.jit.length]);
  g.fill();
  g.strokeStyle = rgba(th.moonRim, C.rimAlpha * e);
  g.lineWidth = r * C.rimW;
  g.stroke();
  g.strokeStyle = rgba(col.deep, C.veinAlpha);
  g.lineWidth = r * C.veinW;
  g.beginPath();
  for (let i = 0; i < C.petals; i++) {
    const [X, Y] = rotor(f.petalRot + (i * TAU) / C.petals + f.jit[i % f.jit.length]);
    for (const v of C.veins) {
      g.moveTo(X(len * C.veinFrom, v * wid * C.veinFrom), Y(len * C.veinFrom, v * wid * C.veinFrom));
      g.lineTo(X(len * C.veinTo, v * wid * C.veinSpread), Y(len * C.veinTo, v * wid * C.veinSpread));
    }
  }
  g.stroke();
  g.globalAlpha = 1;
  center(g, r * C.center * lerp(C.centerBud, 1, e), th, C, C.florets, f.petalRot);
  g.restore();
}

export function drawDaisy(g, f, r, open, th) {
  const D = FAVS.daisy;
  const o = Math.max(0, open);
  const e = smooth(Math.min(o, 1));
  const over = Math.max(0, o - 1);
  const col = th.daisy;
  bud(g, r, o, col.tip, th, D);
  if (o <= 0.02) return;
  g.save();
  g.scale(1, lerp(D.budSquash, D.squash, e));
  const len = r * lerp(D.open[0], D.open[1], e) * (1 + over);
  const w = r * D.w * lerp(D.width[0], D.width[1], e);
  const inner = r * D.inner;
  const n = f.nPetals;
  g.globalAlpha = smooth(o / D.budUntil);
  for (const back of [true, false]) {
    const L = back ? len * D.backLen : len;
    const grad = g.createRadialGradient(0, 0, inner * D.shadeFrom, 0, 0, L);
    grad.addColorStop(0, col.shade);
    grad.addColorStop(D.shadeAt, back ? mix(col.mid, col.shade, D.backShade) : col.mid);
    grad.addColorStop(1, back ? mix(col.tip, col.shade, D.backShade) : col.tip);
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = f.petalRot + ((i + (back ? 0.5 : 0)) * TAU) / n + f.jit[i % f.jit.length];
      const l = L * (1 - f.lenJit[i % f.lenJit.length]);
      const mid = (inner + l) / 2;
      const x = Math.cos(a) * mid, y = Math.sin(a) * mid;
      g.moveTo(x + Math.cos(a) * (l - inner) / 2, y + Math.sin(a) * (l - inner) / 2);
      g.ellipse(x, y, (l - inner) / 2, w / 2, a, 0, TAU);
    }
    g.fill();
  }
  g.strokeStyle = rgba(th.moonRim, D.rimAlpha * e);
  g.lineWidth = r * FAVS.cosmos.rimW;
  g.stroke();
  g.globalAlpha = 1;
  center(g, r * D.center * lerp(D.centerBud, 1, e), th, D, D.florets, f.petalRot);
  g.restore();
}

// Per flower randomness for a favorite, drawn once at creation.
export function favDetails(rng, f) {
  const C = f.species === 'daisy' ? FAVS.daisy : FAVS.cosmos;
  f.nPetals = f.species === 'daisy' ? rng.int(FAVS.daisy.petals[0], FAVS.daisy.petals[1]) : FAVS.cosmos.petals;
  f.jit = Array.from({ length: FAVS.jitN }, () => rng.range(-C.jitter, C.jitter));
  f.lenJit = Array.from({ length: FAVS.lenJitN }, () => rng.range(0, FAVS.daisy.lenJitter));
  f.color = rng.int(0, FAV_PALETTE.cosmos.length - 1);
}

export function favKey(f, open, theme) {
  return `${open.toFixed(3)}|${theme.name}|${f.r.toFixed(2)}|${f.species}`;
}

