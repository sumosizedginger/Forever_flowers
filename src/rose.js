// Roses seen a little from above: a cup of petals around a spiral heart, with
// rolled lips that catch the moon. A tall bud opens into the cup. Once a bloom
// holds still the head is served from a cached sprite.
import { PALETTE, GOLD, TUNE, SHAPE } from './config.js';
import { CUP } from './config-garden.js';
import { TAU, mix, darker, rgba, lerp, smooth } from './util.js';

export function roseColors(theme, name, gold) {
  const S = CUP.shade;
  if (gold) {
    const G = PALETTE.gold;
    return { deep: G.shadow, base: G.base, mid: G.mid, edge: G.edge, rim: G.glint, throat: darker(G.base, S.throat), gold: true };
  }
  const c = theme.roses[name];
  const edge = mix(c, SHAPE.rose.edgeTo, S.edge);
  return {
    deep: darker(c, S.deep), base: darker(c, S.base), mid: c, edge,
    rim: mix(edge, theme.moonRim, S.rim), throat: darker(c, S.throat), gold: false,
  };
}

// Per flower shape variance, drawn once at creation.
export function roseDetails(rng, f) {
  const K = CUP.crown;
  f.lobes = f.layers - 1 >= K.lobes[1] ? K.lobes[1] : K.lobes[0];
  f.lobeJit = Array.from({ length: K.lobes[1] }, () => rng.range(-1, 1));
  f.frontFirst = rng.sign();
}

function sepals(g, r, e, theme) {
  const S = CUP.sepals;
  const by = r * CUP.baseY;
  const spread = lerp(S.hug, S.reflex, e);
  g.fillStyle = theme.leaf[1];
  g.beginPath();
  for (let i = 0; i < S.n; i++) {
    const t = S.n === 1 ? 0 : (i / (S.n - 1)) * 2 - 1;
    const a = -Math.PI / 2 + t * spread;
    const len = r * S.len, half = r * S.w;
    const cs = Math.cos(a), sn = Math.sin(a);
    g.moveTo(0, by);
    g.quadraticCurveTo(cs * len / 2 - sn * half, by + sn * len / 2 + cs * half, cs * len, by + sn * len);
    g.quadraticCurveTo(cs * len / 2 + sn * half, by + sn * len / 2 - cs * half, 0, by);
  }
  g.fill();
}

// Back petals rising behind the mouth. We see their inner faces, so they run light toward the lip.
function crown(g, f, r, m, e, col) {
  const K = CUP.crown;
  const n = f.lobes;
  const idx = Array.from({ length: n }, (_, j) => j).sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2));
  for (const j of idx) {
    const t = n === 1 ? 0 : j / (n - 1) - 0.5;
    const th = -Math.PI / 2 + t * 2 * K.spread + f.lobeJit[j] * K.vary;
    const lift = r * lerp(K.lift[0], K.lift[1], e) * (1 + f.lobeJit[j] * K.vary);
    const P = (a, k) => [m.x + Math.cos(a) * m.w * k, m.y + Math.sin(a) * m.h * k];
    const [x0, y0] = P(th - K.width, 1);
    const [x1, y1] = P(th + K.width, 1);
    const [px, py0] = P(th, K.out);
    const py = py0 - lift;
    const lip = () => {
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + (px - x0) * K.lipCtrl, py, px, py);
      g.quadraticCurveTo(x1 + (px - x1) * K.lipCtrl, py, x1, y1);
    };
    const grad = g.createLinearGradient(m.x, m.y, px, py);
    grad.addColorStop(0, col.base);
    grad.addColorStop(K.midAt, col.mid);
    grad.addColorStop(1, col.edge);
    g.fillStyle = grad;
    g.beginPath();
    lip();
    g.lineTo(m.x, m.y);
    g.closePath();
    g.fill();
    g.lineWidth = r * CUP.edgeW;
    g.strokeStyle = Math.cos(th) > 0 ? rgba(col.rim, CUP.rimAlpha) : col.edge;
    g.beginPath();
    lip();
    g.stroke();
  }
}

// Outer guard petals peeling away at the sides as the rose opens.
function sides(g, r, m, e, col) {
  const S = CUP.side;
  const k = smooth((e - S.from) / (1 - S.from));
  if (k <= 0) return;
  const by = r * CUP.baseY;
  for (const s of [-1, 1]) {
    const tx = s * m.w * S.top[0], ty = m.y + m.h * S.top[1];
    const ox = s * m.w * lerp(S.out[0], S.out[1], k), oy = ty + r * lerp(S.drop[0], S.drop[1], k) * S.dropMul;
    const cx = s * m.w * lerp(S.curl[0], S.curl[1], k), cy = m.y - m.h * S.curlY;
    const grad = g.createLinearGradient(0, ty, 0, by);
    grad.addColorStop(0, col.mid);
    grad.addColorStop(1, col.deep);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(cx, cy, ox, oy);
    g.quadraticCurveTo(s * m.w * S.hip, (oy + by) / 2 + r * S.hang, s * m.w * S.foot, by - r * S.footUp);
    g.lineTo(0, by);
    g.lineTo(s * m.w * S.inner, m.y);
    g.closePath();
    g.fill();
    g.lineWidth = r * S.lipW * k;
    g.strokeStyle = s > 0 ? rgba(col.rim, CUP.rimAlpha) : col.edge;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(cx, cy, ox, oy);
    g.stroke();
  }
}

// The mouth of the cup and the spiral of curled petals inside it.
function heart(g, f, r, m, e, col) {
  const S = CUP.spiral;
  const throat = g.createRadialGradient(m.x, m.y + m.h * CUP.throatY, 0, m.x, m.y, m.w);
  throat.addColorStop(0, col.throat);
  throat.addColorStop(1, col.base);
  g.fillStyle = throat;
  g.beginPath();
  g.ellipse(m.x, m.y, m.w, m.h, 0, 0, TAU);
  g.fill();
  const K = Math.max(2, f.layers - 2);
  for (let k = 0; k < K; k++) {
    const s = 1 - (k + 1) * S.shrink;
    const a = f.petalRot + k * S.turn;
    const cx = m.x + m.w * S.drift * Math.cos(a);
    const cy = m.y + m.h * S.drift * Math.sin(a) - r * S.rise * k * e;
    const ew = m.w * s, eh = m.h * s * (1 + k * S.tall);
    const grad = g.createLinearGradient(cx, cy - eh, cx, cy + eh);
    grad.addColorStop(0, col.mid);
    grad.addColorStop(1, col.throat);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, ew, eh, 0, 0, TAU);
    g.fill();
    g.strokeStyle = rgba(col.edge, S.edgeAlpha);
    g.lineWidth = r * S.edgeW;
    g.beginPath();
    g.ellipse(cx, cy, ew, eh, 0, a, a + S.arc);
    g.stroke();
  }
}

// Two front petals wrapping the cup. Each lip runs from high at the cup's side
// down toward the middle, where the petals overlap, so together they open in a
// soft V that shows the heart; the lips roll back a little as it opens.
function front(g, f, r, m, e, col) {
  const F = CUP.front;
  const by = r * CUP.baseY;
  const dip = m.h * lerp(F.dip[0], F.dip[1], e);
  const lipW = r * lerp(F.lipW[0], F.lipW[1], e);
  const ye = m.y + m.h * F.sideY;
  for (const s of [f.frontFirst, -f.frontFirst]) {
    const xo = s * m.w * F.reach;             // outer end, high on the cup's side
    const xi = -s * m.w * F.overlap;          // inner end, tucked past the middle
    const yi = ye + dip;
    const lip = (dy) => {
      g.moveTo(xo, ye + dy);
      g.bezierCurveTo(xo - s * m.w * F.shoulder, ye + dy, xi + s * m.w * F.belly, yi + dy, xi, yi + dy);
    };
    const bx = xi * F.foot;
    const grad = g.createLinearGradient(0, ye, 0, by);
    grad.addColorStop(0, col.mid);
    grad.addColorStop(F.midAt, col.base);
    grad.addColorStop(1, col.deep);
    g.fillStyle = grad;
    g.beginPath();
    lip(0);
    g.bezierCurveTo(xi - s * m.w * F.tuck, (yi + by) / 2, bx, by, bx, by);
    g.bezierCurveTo(xo * F.hip, by, xo + s * m.w * F.bulge, ye + (by - ye) * F.bulgeAt, xo, ye);
    g.closePath();
    g.fill();
    g.lineCap = 'round';
    g.strokeStyle = rgba(col.deep, F.shadowAlpha);
    g.lineWidth = lipW * F.shadowW;
    g.beginPath();
    lip(lipW);
    g.stroke();
    g.strokeStyle = rgba(s > 0 ? col.rim : col.edge, F.lipAlpha);
    g.lineWidth = lipW;
    g.beginPath();
    lip(0);
    g.stroke();
  }
}

// Draw a rose head centered at the origin, radius r, opening 0 (bud) to 1 (and a little past).
export function drawRose(g, f, r, open, col, theme) {
  const o = Math.max(0, open);
  const e = smooth(Math.min(o, 1));
  const over = o > 1 ? o - 1 : 0;
  g.save();
  g.scale(1 + over, 1 + over);
  sepals(g, r, e, theme);
  const mw = r * lerp(CUP.mouthW[0], CUP.mouthW[1], e);
  const m = { x: 0, y: -r * lerp(CUP.mouthY[0], CUP.mouthY[1], e), w: mw, h: mw * lerp(CUP.mouthH[0], CUP.mouthH[1], e) };
  crown(g, f, r, m, e, col);
  sides(g, r, m, e, col);
  heart(g, f, r, m, e, col);
  front(g, f, r, m, e, col);
  g.restore();
}

export function roseKey(f, open, theme) {
  return `${open.toFixed(3)}|${theme.name}|${f.gold ? 1 : 0}|${f.r.toFixed(2)}|${TUNE.overshoot}`;
}

// Gold glints: four point stars slowly turning over the cup and its lips.
export function drawGlints(ctx, app, f, sprite) {
  const T = app.clock.T;
  const spin = T * GOLD.spinHz * TAU;
  for (const gl of f.glints) {
    const tw = Math.pow(0.5 + 0.5 * Math.sin(TAU * GOLD.glintHz * T + gl.ph), GOLD.glintPow);
    if (tw < GOLD.glintCut) continue;
    const ang = spin + gl.ang;
    const x = f.hx + Math.cos(ang) * gl.rr * f.r;
    const y = f.hy + f.r * GOLD.glintY + Math.sin(ang) * gl.rr * f.r * GOLD.glintSquash;
    const s = f.r * GOLD.glintSize * lerp(GOLD.glintMin, 1, tw);
    ctx.globalAlpha = tw * Math.min(1, f.openEff);
    ctx.drawImage(sprite, x - s, y - s, s * 2, s * 2);
  }
}
