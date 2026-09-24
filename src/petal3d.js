// Flowers built from petals in 3D. A head is a list of parts in the flower's
// own frame (z along its axis, sizes in head radii): petals, centers, stamens
// and hips. It is posed and lit (light3d.js), sorted back to front and filled
// strip by strip with gradients.
import { PETAL } from './config-flora.js';
import { TAU, GOLDEN, lerp, smooth } from './util.js';
import { view, shade, css, mixc } from './light3d.js';

// ---- petals ----
function widthAt(sh, u) {
  if (u <= sh.peak) return lerp(sh.base, 1, Math.pow(Math.sin((Math.PI / 2) * (u / sh.peak)), sh.rise));
  const t = (u - sh.peak) / (1 - sh.peak);
  return lerp(sh.tipW, 1, Math.pow(Math.max(0, 1 - t * t), sh.blunt));
}

// How far the tip edge is cut back at v (teeth on cosmos, a notch on sakura).
function tipCut(p, v) {
  if (!p.teeth) return 0;
  return p.teethDepth * Math.pow(Math.abs(Math.sin((Math.PI / 2) * p.teeth * (v + 1))), PETAL.toothPow);
}

const US = [];
for (let i = 0; i <= PETAL.nu; i++) US.push(1 - Math.pow(1 - i / PETAL.nu, PETAL.uPow));

// The spine: position, direction and inner normal at every u sample, in the flower frame.
export function spine(p) {
  const n = US.length;
  const ca = Math.cos(p.az), sa = Math.sin(p.az);
  const sp = { x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), th: new Float32Array(n) };
  let x = p.r0 * ca, y = p.r0 * sa, z = p.z0;
  let prevTh = p.open, prevU = 0;
  for (let i = 0; i < n; i++) {
    const u = US[i];
    const th = p.open + p.curl * Math.pow(u, p.curlPow);
    if (i > 0) {
      const du = (u - prevU) * p.len;
      const tm = (th + prevTh) / 2;
      const s = Math.sin(tm) * du;
      x += s * ca; y += s * sa; z += Math.cos(tm) * du;
    }
    sp.x[i] = x; sp.y[i] = y; sp.z[i] = z; sp.th[i] = th;
    prevTh = th; prevU = u;
  }
  return sp;
}

// A point of the petal surface across from spine point (x, y, z) at angle th, in the flower frame.
function surfXYZ(p, x, y, z, th, u, v, out, o) {
  const w = p.wid * widthAt(p.shape, u);
  const beta = lerp(p.cup0, p.cup1, smooth(u));
  let a, b;
  if (Math.abs(beta) < 1e-4) { a = v * w; b = 0; } else { a = (w * Math.sin(beta * v)) / beta; b = (w * (1 - Math.cos(beta * v))) / beta; }
  const ca = Math.cos(p.az), sa = Math.sin(p.az);
  // tangential t = (-sa, ca, 0); inner normal n = sin th k - cos th rho
  const st = Math.sin(th), ct = Math.cos(th);
  out[o] = x - sa * a - ct * ca * b;
  out[o + 1] = y + ca * a - ct * sa * b;
  out[o + 2] = z + st * b;
}

function surf(p, sp, i, u, v, out, o) {
  surfXYZ(p, sp.x[i], sp.y[i], sp.z[i], sp.th[i], u, v, out, o);
}

// A point anywhere on the petal, the spine interpolated between its samples.
export function surfAt(p, sp, u, v, out, o) {
  const i = sampleIndex(u);
  const j = Math.min(US.length - 1, i + 1);
  const t = j > i ? Math.min(1, (u - US[i]) / (US[j] - US[i])) : 0;
  const k = (arr) => arr[i] + (arr[j] - arr[i]) * t;
  surfXYZ(p, k(sp.x), k(sp.y), k(sp.z), k(sp.th), u, v, out, o);
}

export function normalAt(p, sp, i, u, v, out) {
  const beta = lerp(p.cup0, p.cup1, smooth(u));
  const th = sp.th[i];
  const ca = Math.cos(p.az), sa = Math.sin(p.az);
  const st = Math.sin(th), ct = Math.cos(th);
  const cb = Math.cos(beta * v), sb = Math.sin(beta * v);
  // N = cos(bv) n - sin(bv) t
  out[0] = -cb * ct * ca + sb * sa;
  out[1] = -cb * ct * sa - sb * ca;
  out[2] = cb * st;
}

const tmp = new Float32Array(3);
const nrm = new Float32Array(3);

export function sampleIndex(u) {
  let i = 0;
  while (i < US.length - 1 && US[i + 1] <= u) i++;
  return i;
}

// Split one petal into strips across its width, each a polygon with its own light.
function petalStrips(p, M, light, R, out) {
  const sp = spine(p);
  const ns = p.strips;
  const nTop = PETAL.topSamples;
  const n = US.length;
  for (let s = 0; s < ns; s++) {
    const va = -1 + (2 * s) / ns, vb = -1 + (2 * (s + 1)) / ns;
    const ov = s < ns - 1 ? PETAL.seam : 0;
    const vbx = Math.min(1, vb + ov);
    const pts = [];
    let depth = 0;
    const push = (i, u, v) => {
      surf(p, sp, i, u, v, tmp, 0);
      view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
      pts.push(tmp[0] * R, -tmp[2] * R);
      depth += tmp[1];
    };
    for (let i = 0; i < n; i++) push(i, US[i], va);
    for (let k = 0; k <= nTop; k++) {
      const v = lerp(va, vbx, k / nTop);
      surfAt(p, sp, 1 - tipCut(p, v), v, tmp, 0);
      view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
      pts.push(tmp[0] * R, -tmp[2] * R);
      depth += tmp[1];
    }
    for (let i = n - 1; i >= 0; i--) push(i, US[i], vbx);
    // light along the strip's middle, base to tip
    const vm = (va + vb) / 2;
    const cols = [];
    let facing = 0;
    for (const u of PETAL.shadeAt) {
      const i = sampleIndex(u);
      normalAt(p, sp, i, u, vm, nrm);
      view(M, nrm[0], nrm[1], nrm[2], nrm, 0);
      let nx = nrm[0], ny = nrm[1], nz = nrm[2];
      const back = ny < 0;
      if (back) { nx = -nx; ny = -ny; nz = -nz; }
      facing += back ? -1 : 1;
      const alb = back ? p.back(u) : p.front(u);
      const ao = lerp(p.ao, 1, smooth(u / PETAL.aoReach));
      const c = shade(alb, nx, ny, nz, light, p.mat);
      cols.push([c[0] * ao, c[1] * ao, c[2] * ao]);
    }
    // gradient line: from the base middle to the tip middle
    const i0 = 0;
    surf(p, sp, i0, 0, vm, tmp, 0);
    view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
    const gx0 = tmp[0] * R, gy0 = -tmp[2] * R;
    surfAt(p, sp, 1 - tipCut(p, vm), vm, tmp, 0);
    view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
    const gx1 = tmp[0] * R, gy1 = -tmp[2] * R;
    out.push({
      kind: 'strip', p, pts, depth: depth / (pts.length / 2) + (p.bias || 0), cols, g: [gx0, gy0, gx1, gy1],
      edgeL: s === 0, edgeR: s === ns - 1, nSide: n, nTop: nTop + 1, back: facing < 0, lipFrom: sampleIndex(p.lipFrom || 0),
    });
  }
}

function tracePts(g, pts) {
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
}

// The outline pieces of a strip that are real petal edges: the sides at the
// petal's edge from spine sample `from` up, then the tip.
function traceEdges(g, st, from) {
  const pts = st.pts;
  const n = st.nSide, t = st.nTop;
  let started = false;
  const to = (k) => {
    if (started) g.lineTo(pts[k * 2], pts[k * 2 + 1]);
    else { g.moveTo(pts[k * 2], pts[k * 2 + 1]); started = true; }
  };
  if (st.edgeL) for (let k = from; k < n; k++) to(k);
  if (st.p.tipOpen || st.edgeL || st.edgeR) for (let k = n; k < n + t; k++) to(k);
  if (st.edgeR) for (let k = n + t; k < n + t + n - from; k++) to(k);
}

function drawStrip(g, st, R) {
  const p = st.p;
  // a soft shadow on whatever is already behind this petal's edges
  if (p.contact > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = css(p.shadowRgb, p.contact);
    g.lineWidth = R * PETAL.contactW;
    g.lineJoin = 'round';
    g.beginPath();
    traceEdges(g, st, 0);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  const [x0, y0, x1, y1] = st.g;
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  const c = st.cols;
  PETAL.shadeAt.forEach((u, k) => grad.addColorStop(u, css(c[k])));
  g.fillStyle = grad;
  g.beginPath();
  tracePts(g, st.pts);
  g.fill();
  if (p.veins && !st.back) drawVeins(g, st, R);
  if (p.lip > 0) {
    g.strokeStyle = css(st.back ? p.lipBackRgb : p.lipRgb, p.lip);
    g.lineWidth = R * p.lipW;
    g.lineCap = 'round';
    g.beginPath();
    traceEdges(g, st, st.lipFrom);
    g.stroke();
  }
}

// Fine veins from the base toward the tip, following the strip.
function drawVeins(g, st, R) {
  const p = st.p;
  const pts = st.pts;
  const n = st.nSide, t = st.nTop;
  g.strokeStyle = css(p.veinRgb, p.veins);
  g.lineWidth = R * PETAL.veinW;
  g.beginPath();
  for (const f of PETAL.veinAt) {
    for (let k = 1; k < n - 1; k++) {
      const l = k * 2, r = (n + t + (n - 1 - k)) * 2;
      const x = pts[l] + (pts[r] - pts[l]) * f, y = pts[l + 1] + (pts[r + 1] - pts[l + 1]) * f;
      if (k === 1) g.moveTo(x, y); else g.lineTo(x, y);
    }
  }
  g.stroke();
}

// ---- discs: flower centers, domes of florets seen in perspective ----
function discItem(d, M, light, R) {
  view(M, 0, 0, d.z, tmp, 0);
  const cx = tmp[0] * R, cy = -tmp[2] * R, depth = tmp[1];
  view(M, d.rad, 0, 0, tmp, 0);
  const ax = tmp[0] * R, ay = -tmp[2] * R;
  view(M, 0, d.rad, 0, tmp, 0);
  const bx = tmp[0] * R, by = -tmp[2] * R;
  // the dome's lit side: where the axis leans, plus the light
  const ny = M.z[1];
  const lit = shade(d.rgb, M.z[0], Math.abs(ny), M.z[2], light, d.mat);
  const dark = [lit[0] * d.rimDark, lit[1] * d.rimDark, lit[2] * d.rimDark];
  const [lx, ly, lz] = light.dir;
  const hi = [(lx * M.x[0] + ly * M.x[1] + lz * M.x[2]) * PETAL.discHi, (lx * M.y[0] + ly * M.y[1] + lz * M.y[2]) * PETAL.discHi];
  return { kind: 'disc', d, depth: depth + (d.bias || 0), m: [ax, ay, bx, by, cx, cy], lit, dark: d.dark || dark, facing: ny, hi };
}

function drawDisc(g, it) {
  const d = it.d;
  g.save();
  g.transform(...it.m);
  const [hx, hy] = it.hi;
  const grad = g.createRadialGradient(hx, hy, 0, 0, 0, 1);
  grad.addColorStop(0, css(it.lit));
  grad.addColorStop(d.midAt, css(mixc(it.lit, it.dark, d.midMix)));
  grad.addColorStop(1, css(it.dark));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, 1, 0, TAU);
  g.fill();
  if (d.florets) {
    g.fillStyle = css(d.floretRgb, d.floretAlpha);
    g.beginPath();
    for (let i = 0; i < d.florets; i++) {
      const a = i * GOLDEN;
      const rr = d.floretAt * Math.sqrt((i + 0.5) / d.florets);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      g.moveTo(x + d.floretR, y);
      g.arc(x, y, d.floretR, 0, TAU);
    }
    g.fill();
  }
  if (d.ring) {
    g.strokeStyle = css(d.ringRgb, d.ringAlpha);
    g.lineWidth = d.ring;
    g.beginPath();
    g.arc(0, 0, 1 - d.ring / 2, 0, TAU);
    g.stroke();
  }
  g.restore();
}

// ---- stamens: fine filaments with a bead of pollen at each tip ----
function stamenItem(st, M, light, R) {
  view(M, 0, 0, 0, tmp, 0);
  const depth = tmp[1];
  const lines = [];
  for (let i = 0; i < st.n; i++) {
    const a = st.az0 + i * GOLDEN;
    const sp = st.spread * lerp(PETAL.stamenMin, 1, ((i * PETAL.stamenMix) % st.n) / st.n);
    view(M, Math.sin(sp) * Math.cos(a) * st.len, Math.sin(sp) * Math.sin(a) * st.len, Math.cos(sp) * st.len, tmp, 0);
    lines.push(tmp[0] * R, -tmp[2] * R);
  }
  return { kind: 'stamens', st, depth: depth + (st.bias || 0), lines, R };
}

function drawStamens(g, it) {
  const st = it.st;
  g.strokeStyle = css(st.lineRgb, PETAL.stamenAlpha);
  g.lineWidth = it.R * PETAL.stamenW;
  g.beginPath();
  for (let i = 0; i < it.lines.length; i += 2) { g.moveTo(0, 0); g.lineTo(it.lines[i], it.lines[i + 1]); }
  g.stroke();
  g.fillStyle = css(st.dotRgb);
  g.beginPath();
  const r = st.dot * it.R;
  for (let i = 0; i < it.lines.length; i += 2) { g.moveTo(it.lines[i] + r, it.lines[i + 1]); g.arc(it.lines[i], it.lines[i + 1], r, 0, TAU); }
  g.fill();
}

// ---- balls: the rose hip, buds seen whole ----
function ballItem(b, M, light, R) {
  view(M, 0, 0, b.z, tmp, 0);
  const lit = shade(b.rgb, light.dir[0], Math.abs(light.dir[1]), light.dir[2], light, b.mat);
  const dark = [b.rgb[0] * light.ambLow, b.rgb[1] * light.ambLow, b.rgb[2] * light.ambLow];
  return { kind: 'ball', b, depth: tmp[1] + (b.bias || 0), x: tmp[0] * R, y: -tmp[2] * R, r: b.rad * R, lit, dark, lx: light.dir[0], lz: light.dir[2] };
}

function drawBall(g, it) {
  const grad = g.createRadialGradient(it.x + it.lx * it.r * 0.45, it.y - it.lz * it.r * 0.45, 0, it.x, it.y, it.r);
  grad.addColorStop(0, css(it.lit));
  grad.addColorStop(1, css(it.dark));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(it.x, it.y, it.r, 0, TAU);
  g.fill();
}

// Render a head's parts at head radius R, receptacle on the origin.
export function renderHead(g, parts, M, light, R) {
  const items = [];
  for (const part of parts) {
    if (part.kind === 'petal') petalStrips(part, M, light, R, items);
    else if (part.kind === 'disc') items.push(discItem(part, M, light, R));
    else if (part.kind === 'ball') items.push(ballItem(part, M, light, R));
    else if (part.kind === 'stamens') items.push(stamenItem(part, M, light, R));
  }
  items.sort((a, b) => a.depth - b.depth);
  g.lineJoin = 'round';
  for (const it of items) {
    if (it.kind === 'strip') drawStrip(g, it, R);
    else if (it.kind === 'disc') drawDisc(g, it);
    else if (it.kind === 'stamens') drawStamens(g, it);
    else drawBall(g, it);
  }
  g.globalCompositeOperation = 'source-over';
}

// The projected bounds of a head, in head radii, for caching and hit tests.
export function headBounds(parts, M) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const p of parts) {
    if (p.kind === 'stamens') continue;
    if (p.kind === 'disc' || p.kind === 'ball') {
      view(M, 0, 0, p.z, tmp, 0);
      grow(tmp[0] - p.rad, -tmp[2] - p.rad);
      grow(tmp[0] + p.rad, -tmp[2] + p.rad);
      continue;
    }
    const sp = spine(p);
    for (let i = 0; i < US.length; i++) {
      for (const v of PETAL.boundV) {
        surf(p, sp, i, US[i], v, tmp, 0);
        view(M, tmp[0], tmp[1], tmp[2], tmp, 0);
        grow(tmp[0], -tmp[2]);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

