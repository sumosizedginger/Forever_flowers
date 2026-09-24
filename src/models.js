// The flower models: petals, sepals and centers in 3D for a given opening.
// Random choices are made once per flower (the *Model functions) and kept,
// so a head renders the same way every time it is drawn.
import { ROSE3D, DAISY3D, COSMOS3D, WILD3D, WILD_COMMON, SAKURA3D, MATERIAL } from './config-flora.js';
import { PALETTE } from './config.js';
import { GOLDEN, TAU, lerp, clamp01, smooth, mix, darker } from './util.js';
import { rgbOf, mixc } from './light3d.js';

const ramp = (a, b, c) => (u) => (u < 0.5 ? mixc(a, b, u * 2) : mixc(b, c, (u - 0.5) * 2));

// ---- roses ----
export function roseModel(rng) {
  const S = ROSE3D;
  const n = rng.int(S.petals[0], S.petals[1]);
  const J = S.jitter;
  const side = rng.chance(S.pose.sideChance);
  return {
    n,
    jit: Array.from({ length: n }, () => ({ az: rng.range(-J.az, J.az), len: rng.range(-J.len, J.len), open: rng.range(-J.open, J.open) })),
    pitch: side ? S.pose.side[0] : rng.range(S.pose.pitch[0], S.pose.pitch[1]),
    yaw: (side ? S.pose.side[1] : rng.range(0, S.pose.yaw[1])) * rng.sign(),
  };
}

// Colors for a rose: deep at the base, its color, a light lip; gold is metal.
export function rosePalette(theme, name, gold) {
  const S = ROSE3D.shade;
  if (gold) {
    const G = PALETTE.gold;
    const deep = rgbOf(darker(G.base, ROSE3D.shade.goldDeep)), mid = rgbOf(G.base), edge = rgbOf(G.mid);
    return {
      front: ramp(deep, mid, edge), back: ramp(mid, edge, edge),
      lip: rgbOf(G.edge), lipBack: rgbOf(G.glint), shadow: rgbOf(G.shadow), leaf: rgbOf(theme.leaf[1]),
      mat: { ...MATERIAL.gold, metal: { ...MATERIAL.gold.metal, hiRgb: rgbOf(MATERIAL.gold.metal.hi) } },
    };
  }
  const c = theme.roses[name];
  const deep = rgbOf(darker(c, S.deep)), mid = rgbOf(c), edge = rgbOf(mix(c, S.edgeTo, S.edge));
  const back = rgbOf(mix(c, S.edgeTo, S.back));
  return {
    front: ramp(deep, mid, edge), back: ramp(mixc(deep, back, 0.5), back, mixc(back, edge, 0.5)),
    lip: rgbOf(mix(mix(c, S.edgeTo, S.edge), S.edgeTo, S.lip)), lipBack: back, shadow: rgbOf(darker(c, ROSE3D.shadow)),
    mat: MATERIAL.petal, leaf: rgbOf(theme.leaf[1]),
  };
}

export function roseParts(f, e, pal, lod) {
  const S = ROSE3D;
  const m = f.model;
  const parts = [];
  const sep = S.sepals;
  const se = smooth(clamp01(e / S.stagger));
  const green = pal.leaf;
  for (let i = 0; i < sep.n; i++) {
    parts.push({
      kind: 'petal', az: f.petalRot + ((i + 0.5) * TAU) / sep.n, r0: sep.ring, z0: sep.z, len: sep.len, wid: sep.wid,
      open: lerp(sep.open[0], sep.open[1], se), curl: lerp(sep.curl[0], sep.curl[1], se), curlPow: S.curlPow,
      cup0: sep.cup[0], cup1: sep.cup[1], shape: sep.shape, strips: 1, ao: sep.ao,
      front: () => green, back: () => mixc(green, pal.shadow, sep.backDark), mat: MATERIAL.leafy, contact: 0, lip: 0, bias: sep.bias, noDew: true,
    });
  }
  parts.push({ kind: 'ball', z: S.hip.z, rad: S.hip.rad, rgb: green, mat: MATERIAL.leafy, bias: S.hip.bias });
  const n = m.n;
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 1;
    const j = m.jit[i];
    const local = smooth(clamp01((e - (1 - k) * S.stagger) / (1 - S.stagger)));
    const open = lerp(lerp(S.open.bud[0], S.open.bud[1], k), lerp(S.open.full[0], S.open.full[1], Math.pow(k, S.open.pow)), local) + j.open * local;
    parts.push({
      kind: 'petal',
      az: f.petalRot + i * GOLDEN + j.az,
      r0: lerp(S.ring[0], S.ring[1], k),
      z0: lerp(S.lift[0], S.lift[1], k),
      len: lerp(S.len[0], S.len[1], Math.pow(k, S.lenPow)) * (1 + j.len) * lerp(S.budLen, 1, local),
      wid: lerp(S.wid[0], S.wid[1], k),
      open,
      curl: lerp(S.curl[0], S.curl[1], Math.pow(k, S.curlShape)) * local,
      curlPow: S.curlPow,
      cup0: lerp(S.cup.base[0], S.cup.base[1], k),
      cup1: lerp(S.cup.bud, lerp(S.cup.tip[0], S.cup.tip[1], k), local),
      shape: S.shape, strips: lod ? 1 : (k < 0.5 ? S.strips[0] : S.strips[1]),
      ao: lerp(S.ao[0], S.ao[1], k),
      front: pal.front, back: pal.back, mat: pal.mat,
      contact: S.contact, shadowRgb: pal.shadow, lip: S.lip, lipW: S.lipW, lipFrom: S.lipFrom, lipRgb: pal.lip, lipBackRgb: pal.lipBack,
    });
  }
  return parts;
}

// ---- shared: a whorl of like petals ----
function jitters(rng, n, J, delay) {
  return Array.from({ length: n }, () => ({
    az: rng.range(-J.az, J.az), len: rng.range(-J.len, J.len), open: rng.range(-J.open, J.open), delay: rng.range(0, delay || 0),
  }));
}

function whorl(parts, w, e) {
  const maxD = w.delay || 0;
  for (let i = 0; i < w.n; i++) {
    const j = w.jit[i % w.jit.length];
    const local = smooth(clamp01((e - j.delay) / (1 - maxD)));
    parts.push({
      kind: 'petal', az: w.az0 + (i * TAU) / w.n + j.az, r0: w.ring, z0: w.z0 || 0,
      len: w.len * (1 + j.len) * lerp(w.budLen, 1, local), wid: w.wid,
      open: lerp(w.open[0], w.open[1], local) + j.open * local, curl: w.curl * local, curlPow: w.curlPow,
      cup0: w.cup[0], cup1: w.cup[1], shape: w.shape, teeth: w.teeth, teethDepth: w.teethDepth, tipOpen: !!w.teeth || w.shape.tipW > 0,
      strips: w.strips, ao: w.ao, front: w.front, back: w.back, mat: w.mat, bias: w.bias,
      contact: w.contact, shadowRgb: w.shadowRgb, veins: w.veins, veinRgb: w.veinRgb, lip: 0, noDew: w.noDew,
    });
  }
}

function discPart(spec, rad, e, rgb, dark, floretRgb, ringRgb) {
  return {
    kind: 'disc', z: spec.z + spec.lift * e, rad: rad * lerp(DISC_BUD, 1, e), rgb, mat: MATERIAL.disc, bias: rad,
    florets: spec.florets, floretR: spec.floretR, floretAt: spec.floretAt, floretRgb, floretAlpha: spec.floretAlpha,
    midAt: spec.midAt, midMix: spec.midMix, rimDark: spec.rimDark, ring: spec.ring || 0, ringRgb, ringAlpha: spec.ringAlpha, dark,
  };
}
const DISC_BUD = WILD_COMMON.discBud;

function posed(rng, pose) {
  return { pitch: rng.range(pose.pitch[0], pose.pitch[1]), yaw: rng.range(pose.yaw[0], pose.yaw[1]) };
}

const bractsOf = (B, jit, az0, green, e) => ({
  n: B.n, jit, az0, ring: B.ring, z0: B.z, len: B.len, wid: B.wid, budLen: 1, open: B.open, curl: 0, curlPow: 2,
  cup: B.cup, shape: ROSE3D.sepals.shape, strips: 1, ao: B.ao, front: () => green, back: () => green,
  mat: MATERIAL.leafy, contact: 0, bias: B.bias, noDew: true, e: smooth(clamp01(e * B.early)),
});

// ---- daisies ----
export function daisyModel(rng) {
  const D = DAISY3D;
  const n = rng.int(D.rays[0], D.rays[1]);
  return { n, jit: jitters(rng, n, D.jitter, D.delay), blush: rng.chance(D.blushChance), ...posed(rng, D.pose) };
}

export function daisyParts(f, e, th, lod) {
  const D = DAISY3D;
  const m = f.model;
  const c = th.daisy;
  const tip = rgbOf(m.blush ? mix(c.tip, th.wild[4], D.blush) : c.tip);
  const mid = rgbOf(c.mid), base = rgbOf(c.shade);
  const green = rgbOf(th.leaf[1]);
  const parts = [];
  const br = bractsOf(D.bracts, m.jit, f.petalRot, green, e);
  whorl(parts, br, br.e);
  const front = ramp(base, mid, tip), back = ramp(base, mixc(mid, base, D.backShade), mixc(tip, base, D.backShade));
  const half = Math.ceil(m.n / 2);
  const row = (k, off, len, openAdd, bias) => whorl(parts, {
    n: k, jit: m.jit, az0: f.petalRot + off, ring: D.ring, len: D.len * len, wid: D.wid, budLen: D.budLen,
    open: [D.open[0], D.open[1] + openAdd], curl: D.curl, curlPow: D.curlPow, cup: D.cup, shape: D.shape, teeth: D.teeth, teethDepth: D.teethDepth,
    strips: 1, ao: D.ao, front, back, mat: MATERIAL.petal, contact: lod ? 0 : D.contact, shadowRgb: base, bias, delay: D.delay,
  }, e);
  row(half, Math.PI / half, D.backRow.len, D.backRow.open, D.backRow.bias);
  row(m.n - half, 0, 1, 0, 0);
  const fc = th.favCenter;
  parts.push(discPart(D.disc, D.disc.rad, e, rgbOf(fc[0]), rgbOf(fc[1]), rgbOf(fc[1]), rgbOf(fc[2])));
  return parts;
}

// ---- cosmos ----
export function cosmosModel(rng) {
  const C = COSMOS3D;
  return { jit: jitters(rng, C.petals, C.jitter, C.delay), ...posed(rng, C.pose) };
}

export function cosmosParts(f, e, th, lod) {
  const C = COSMOS3D;
  const col = th.cosmos[f.color % th.cosmos.length];
  const deep = rgbOf(col.deep), base = rgbOf(col.base), light = rgbOf(col.light);
  const green = rgbOf(th.leaf[1]);
  const parts = [];
  const br = bractsOf(C.bracts, f.model.jit, f.petalRot + C.bracts.turn, green, e);
  whorl(parts, br, br.e);
  whorl(parts, {
    n: C.petals, jit: f.model.jit, az0: f.petalRot, ring: C.ring, len: C.len, wid: C.wid, budLen: C.budLen, open: C.open,
    curl: C.curl, curlPow: C.curlPow, cup: C.cup, shape: C.shape, teeth: C.teeth, teethDepth: C.teethDepth,
    strips: lod ? 1 : C.strips, ao: C.ao, front: ramp(deep, base, light), back: ramp(deep, mixc(base, light, C.backLight), light),
    mat: MATERIAL.petal, contact: lod ? 0 : C.contact, shadowRgb: deep, veins: lod ? 0 : C.veins, veinRgb: deep, delay: C.delay,
  }, e);
  const fc = th.favCenter;
  parts.push(discPart(C.disc, C.disc.rad, e, rgbOf(fc[0]), rgbOf(fc[1]), rgbOf(fc[1]), rgbOf(fc[2])));
  return parts;
}

// ---- wildflowers ----
export function wildModel(rng, type) {
  const W = WILD3D[type];
  return { jit: jitters(rng, W.n, WILD_COMMON.jitter, 0), pitch: rng.range(W.pitch[0], W.pitch[1]), yaw: rng.range(WILD_COMMON.yaw[0], WILD_COMMON.yaw[1]) };
}

export function wildParts(f, e, th, lod) {
  const W = WILD3D[f.type];
  const K = WILD_COMMON;
  const col = rgbOf(th.wild[f.type]);
  const deep = mixc(col, rgbOf(th.stem), K.deep), tip = mixc(col, rgbOf(ROSE3D.shade.edgeTo), K.tip);
  const parts = [];
  const mat = W.gloss ? { ...MATERIAL.petal, gloss: W.gloss } : MATERIAL.petal;
  whorl(parts, {
    n: W.n, jit: f.model.jit, az0: f.petalRot, ring: W.ring, len: W.len, wid: W.wid, budLen: K.budLen, open: W.open,
    curl: W.curl, curlPow: K.curlPow, cup: W.cup, shape: W.shape, strips: lod ? 1 : (W.strips || 1), ao: K.ao,
    front: ramp(deep, col, tip), back: ramp(deep, mixc(col, deep, K.backDark), col), mat, contact: lod ? 0 : K.contact, shadowRgb: deep,
  }, e);
  if (W.disc > 0) {
    const cen = rgbOf(th.wildCenter[W.center]);
    const spec = W.dome ? { ...K.disc, lift: W.dome } : K.disc;
    const d = discPart(spec, W.disc, e, W.eye ? rgbOf(W.eye) : cen, mixc(cen, deep, K.discDark), mixc(cen, deep, K.floretDark), cen);
    if (W.eye) { d.ring = K.eyeRing; d.ringRgb = cen; d.florets = 0; }
    parts.push(d);
  }
  return parts;
}

// ---- sakura ----
export function sakuraModel(rng) {
  return { jit: jitters(rng, SAKURA3D.n, WILD_COMMON.jitter, 0), ...posed(rng, SAKURA3D.pose) };
}

export function sakuraParts(b, e, th) {
  const S = SAKURA3D;
  const edge = rgbOf(th.sakuraEdge), center = rgbOf(th.sakuraCenter);
  const parts = [];
  whorl(parts, {
    n: S.n, jit: b.model.jit, az0: b.rot, ring: S.ring, len: S.len, wid: S.wid, budLen: S.budLen, open: S.open,
    curl: S.curl, curlPow: S.curlPow, cup: S.cup, shape: S.shape, teeth: S.teeth, teethDepth: S.teethDepth,
    strips: 1, ao: S.ao, front: ramp(center, mixc(center, edge, S.midMix), edge), back: ramp(center, edge, edge),
    mat: MATERIAL.petal, contact: S.contact, shadowRgb: center,
  }, e);
  const T = S.stamens;
  parts.push({ kind: 'stamens', n: T.n, len: T.len * e, spread: T.spread, dot: T.dot, lineRgb: mixc(center, edge, T.lineMix), dotRgb: rgbOf(th.stamen), az0: b.rot, bias: T.bias });
  return parts;
}
