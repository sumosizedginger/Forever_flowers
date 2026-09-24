// The flowers as 3D models: the petal engine, the light for each time of day,
// and every species. Sizes are head radii, angles radians, colors hex. The
// petal's open angle is measured from the flower's axis (0 points along it,
// PI / 2 lies flat); cup bends the petal's edges toward its inner side.

export const PETAL = {
  poleGuard: 0.95, capL: 0.93,
  nu: 8, uPow: 1.3, topSamples: 4, seam: 0.05,
  shadeAt: [0, 0.5, 1], aoReach: 0.5,
  contactW: 0.05, veinW: 0.012, veinAt: [0.25, 0.5, 0.75], toothPow: 0.7,
  boundV: [-1, -0.5, 0, 0.5, 1], glossPow: 18, discHi: 0.4,
  stamenW: 0.012, stamenAlpha: 0.8, stamenMin: 0.55, stamenMix: 7,
  hashA: 12.9898, hashB: 78.233, hashC: 43758.5453, dewU: [0.45, 0.8], dewV: 0.5, dewHi: 0.35, dewCore: 0.3, dewDot: 0.28,
  lodStrips: 1,            // strips per petal while a head is still moving
  openStep: 1 / 48,        // opening is rendered in steps this fine
};

// Key light direction points from the flower toward the light, in view space
// (x right, y toward her, z up). key is its strength, amb the sky light from
// above and the bounce from below, rim the edge light where petals turn away.
export const LIGHTS = {
  night: { dir: [0.55, -0.5, 0.67], key: 0.34, keyRgb: [0.94, 0.94, 1.08], ambTop: 1, ambLow: 0.66, rim: 0.85, rimColor: '#D6D2FF', sky: '#2A2260', ground: '#0C0814' },
  dawn: {
    dir: [-0.75, -0.25, 0.4], key: 0.42, keyRgb: [1.08, 0.98, 0.9], ambTop: 0.98, ambLow: 0.7, rim: 0.7, rimColor: '#FFD2B8', sky: '#9A7FA4', ground: '#1C1B30',
    dew: { chance: 0.4, r: 0.06, shade: 0.4, shine: '#FFF1E4', shineAlpha: 1, rimAlpha: 0.6 },
  },
  day: { dir: [-0.42, 0.52, 0.74], key: 0.4, keyRgb: [1.05, 1.01, 0.95], ambTop: 0.97, ambLow: 0.72, rim: 0.4, rimColor: '#FFF1DE', sky: '#9DBED4', ground: '#34483A' },
  eve: { dir: [-0.7, -0.4, 0.35], key: 0.44, keyRgb: [1.1, 0.93, 0.82], ambTop: 0.96, ambLow: 0.66, rim: 0.9, rimColor: '#FFB27A', sky: '#95506E', ground: '#1C1422' },
};

// Head images: the openings sampled for bounds, frames of stillness before
// the full render, and the margin around the head in head radii.
export const HEADS = { boundAt: [0, 0.5, 1], settle: 2, pad: 0.08 };

export const MATERIAL = {
  petal: { trans: 0.5, rim: 1 },
  leafy: { trans: 0.25, rim: 0.6 },
  disc: { trans: 0, rim: 0.35 },
  gold: { trans: 0, rim: 0.8, metal: { dark: 0.38, lit: 0.95, env: 0.12, pow: 6, spec: 1.1, hi: '#FFF0C0' } },
};

// Roses: petals on the golden spiral, tight and upright inside, opening and
// rolling back outside. The outer ones open first.
export const ROSE3D = {
  petals: [18, 23],
  ring: [0.02, 0.2], lift: [0.2, 0.02],
  len: [0.34, 0.82], lenPow: 0.75, budLen: 0.82,
  wid: [0.24, 0.52],
  open: { bud: [0.03, 0.26], full: [0.1, 1.06], pow: 1.35 },
  curl: [-0.2, 0.4], curlPow: 2, curlShape: 2.2,
  cup: { base: [1.7, 1.0], bud: 1.5, tip: [1.1, -0.75] },
  stagger: 0.42,
  shape: { base: 0.3, peak: 0.6, rise: 0.75, blunt: 0.45, tipW: 0 },
  jitter: { az: 0.2, len: 0.07, open: 0.07 },
  strips: [2, 3],
  ao: [0.5, 0.92],
  shade: { deep: 0.42, edge: 0.3, back: 0.1, lip: 0.28, edgeTo: '#FFF1E4', goldDeep: 0.3 },
  lip: 0.5, lipW: 0.016, lipFrom: 0.66, contact: 0.16, shadow: 0.55,
  sepals: {
    n: 5, len: 0.6, wid: 0.075, open: [0.28, 2.35], curl: [0, 0.7], z: -0.03, ring: 0.08, cup: [0.5, 0.2], ao: 0.8, backDark: 0.35, bias: -0.6,
    shape: { base: 0.5, peak: 0.22, rise: 0.8, blunt: 1.8, tipW: 0 },
  },
  hip: { z: -0.1, rad: 0.12, bias: -1 },
  pose: { pitch: [0.62, 1.05], yaw: [-0.5, 0.5], sideChance: 0.25, side: [1.2, 0.85] },
};

// Daisies: many slender rays in two rows around a domed gold center, green bracts beneath.
export const DAISY3D = {
  rays: [24, 32], ring: 0.19, len: 0.8, wid: 0.075, backRow: { len: 0.93, open: 0.1, bias: -0.02 },
  open: [0.16, 1.42], curl: 0.3, curlPow: 2, cup: [0.35, 0.12], budLen: 0.55, delay: 0.25,
  shape: { base: 0.5, peak: 0.18, rise: 0.6, blunt: 0.35, tipW: 0.35 }, teeth: 2, teethDepth: 0.05,
  jitter: { az: 0.06, len: 0.1, open: 0.12 },
  bracts: { n: 12, len: 0.24, wid: 0.06, open: [0.2, 1.5], z: -0.02, ring: 0.14, cup: [0.4, 0.2], ao: 0.8, bias: -0.5, early: 2 },
  disc: { z: 0.03, rad: 0.21, lift: 0.03, florets: 46, floretR: 0.07, floretAt: 0.9, floretAlpha: 0.55, midAt: 0.55, midMix: 0.45, rimDark: 0.62 },
  blushChance: 0.35, blush: 0.28, backShade: 0.22, ao: 0.7,
  contact: 0.16, lip: 0,
  pose: { pitch: [0.35, 1.25], yaw: [-0.7, 0.7] },
};

// Cosmos: eight broad wedge petals with toothed tips, a shallow bowl, a small gold button.
export const COSMOS3D = {
  petals: 8, ring: 0.1, len: 0.88, wid: 0.25, open: [0.22, 1.36], curl: 0.22, curlPow: 2, cup: [0.35, 0.1],
  budLen: 0.5, delay: 0.3,
  shape: { base: 0.16, peak: 0.94, rise: 1.1, blunt: 0.3, tipW: 0.8 }, teeth: 3, teethDepth: 0.09,
  jitter: { az: 0.1, len: 0.06, open: 0.1 },
  veins: 0.22, contact: 0.18, lip: 0, strips: 2, ao: 0.75, backLight: 0.4,
  disc: { z: 0.05, rad: 0.13, lift: 0.03, florets: 24, floretR: 0.1, floretAt: 0.85, floretAlpha: 0.55, midAt: 0.5, midMix: 0.4, rimDark: 0.55, ring: 0.14, ringAlpha: 0.8 },
  bracts: { n: 8, len: 0.2, wid: 0.07, open: [0.25, 1.7], z: -0.02, ring: 0.08, cup: [0.5, 0.2], ao: 0.8, bias: -0.5, early: 2, turn: 0.3 },
  pose: { pitch: [0.4, 1.3], yaw: [-0.8, 0.8] },
};

// The small wildflowers, by palette index: aster, forget-me-not, buttercup,
// chamomile and a nodding bellflower.
export const WILD3D = [
  { n: 16, ring: 0.15, len: 0.82, wid: 0.06, open: [0.2, 1.5], curl: 0.15, cup: [0.3, 0.1], shape: { base: 0.5, peak: 0.2, rise: 0.6, blunt: 0.4, tipW: 0 }, disc: 0.17, center: 0, pitch: [0.5, 1.2] },
  { n: 5, ring: 0.05, len: 0.58, wid: 0.29, open: [0.3, 1.5], curl: 0.05, cup: [0.12, 0], shape: { base: 0.22, peak: 0.62, rise: 0.8, blunt: 0.55, tipW: 0 }, disc: 0.13, center: 0, eye: '#FFF1E4', pitch: [0.7, 1.35] },
  { n: 5, ring: 0.05, len: 0.6, wid: 0.33, open: [0.25, 1.08], curl: 0, cup: [0.5, 0.3], shape: { base: 0.25, peak: 0.62, rise: 0.8, blunt: 0.6, tipW: 0 }, disc: 0.14, center: 0, gloss: 0.5, pitch: [0.45, 1.0] },
  { n: 13, ring: 0.2, len: 0.6, wid: 0.085, open: [0.3, 1.95], curl: 0.2, cup: [0.3, 0.1], shape: { base: 0.5, peak: 0.2, rise: 0.6, blunt: 0.35, tipW: 0.3 }, disc: 0.2, dome: 0.12, center: 0, pitch: [0.4, 1.1] },
  { n: 5, ring: 0.1, len: 0.8, wid: 0.3, open: [0.1, 0.3], curl: 0.9, cup: [0.75, 0.2], shape: { base: 0.75, peak: 0.7, rise: 0.8, blunt: 1.4, tipW: 0 }, disc: 0, center: 0, strips: 3, pitch: [2.2, 2.6] },
];
export const WILD_COMMON = {
  curlPow: 2, budLen: 0.5, contact: 0.14, yaw: [-0.8, 0.8], jitter: { az: 0.08, len: 0.08, open: 0.1 },
  deep: 0.25, tip: 0.15, backDark: 0.2, ao: 0.75, discDark: 0.4, floretDark: 0.5, eyeRing: 0.45, discBud: 0.7,
  disc: { z: 0.03, lift: 0.02, florets: 18, floretR: 0.12, floretAt: 0.85, floretAlpha: 0.55, midAt: 0.5, midMix: 0.4, rimDark: 0.6, ringAlpha: 0.8 },
};

// Sakura: five notched petals, a shallow cup, a spray of stamens.
export const SAKURA3D = {
  n: 5, ring: 0.05, len: 0.62, wid: 0.34, open: [0.2, 1.22], curl: 0.15, curlPow: 2, cup: [0.35, 0.1],
  shape: { base: 0.3, peak: 0.62, rise: 0.8, blunt: 0.5, tipW: 0.35 }, teeth: 1, teethDepth: 0.16,
  stamens: { n: 14, len: 0.42, spread: 0.55, dot: 0.035, lineMix: 0.3, bias: 0.3 },
  bud: { rad: 0.3 }, contact: 0.12, budLen: 0.4, ao: 0.8, midMix: 0.6,
  pose: { pitch: [0.2, 1.4], yaw: [-1.2, 1.2] },
};

// The glass flower: a lily of stained glass, three rings cupped around the
// core, seen a little from above. Leads cross each petal at u = c + rise |v|.
export const GLASS = {
  pitch: 0.6, coreZ: 0.22, reach: 1,
  rings: [
    { n: 6, off: 0, ring: 0.1, z: 0, len: 1, wid: 0.4, open: [0.12, 1.3], curl: 0.22, cup: [0.55, 0.25] },
    { n: 6, off: 0.5236, ring: 0.08, z: 0.03, len: 0.84, wid: 0.37, open: [0.1, 0.92], curl: 0.24, cup: [0.75, 0.35] },
    { n: 5, off: 0.3, ring: 0.05, z: 0.06, len: 0.62, wid: 0.33, open: [0.06, 0.48], curl: 0.36, cup: [0.95, 0.5] },
  ],
  shape: { base: 0.3, peak: 0.45, rise: 0.75, blunt: 1.3, tipW: 0 },
  curlPow: 2, budLen: 0.62, budWid: 0.8, budCup: 1.2,
  petalPhase: 0.55, ringPhase: 0.33,
  cross: [[0.3, 0.2], [0.58, 0.22]], crossJitter: 0.05, riseJitter: 0.3, crossMax: 0.92, paneJitter: 0.07,
  glow: [0.5, 0.2, 0.02], outerGlow: 0.3, deep: 0.34, deepColor: '#1A1030', budGlow: 0.3,
  faceAt: 0.5, outerFace: 0.9,
  leadW: 0.02, leadAlpha: 0.8, ghostAlpha: 0.1, ghostW: 0.8,
  spill: { rU: 0.75, alpha: 0.32 },
  leadSamples: 6, paneSamples: 3, ribFrom: 0.04, ribTo: 0.94,
  streak: [0.22, 0.66], streakV: 0.5, streakW: 0.018, streakAlpha: 0.28,
  depthAt: 0.55, step: 1 / 40, settle: 2, pad: 0.06,
};

// Leaves. Rose leaflets are [place along the stalk 0 base to 1 tip, angle off
// the stalk, length as a fraction of sprite height, half width of sprite width].
export const LEAVES = {
  ovate: 0.65, round: 1.1, ribAt: 0.5, ribLift: 0.55, rimMix: 0.18, ribAlpha: 0.45, ribW: 1.6, ribTo: 0.92,
  veins: 3, veinReach: 0.7, veinRise: 0.12,
  rose: {
    sprite: [112, 168], bow: 0.03, top: 0.06, stalkMix: 0.3, stalkW: 3, stalkSteps: 8, teeth: 7, tooth: 0.1,
    leaflets: [[0.98, 0, 0.34, 0.15], [0.64, 0.78, 0.3, 0.13], [0.32, 0.86, 0.26, 0.12]],
  },
  feather: {
    sprite: [104, 168], bow: 0.05, stalkMix: 0.4, stalkW: 2.4, steps: 10, rimMix: 0.15, alpha: 0.9,
    pinnae: 8, len: 0.85, taper: 0.5, rise: 0.55, ctrl: [0.45, 0.4], w1: 1.8, w2: 1.3,
    forks: [0.35, 0.65], forkLen: 0.32, forkCtrl: 0.4, forkRise: 0.5, forkUp: 0.8,
  },
  plain: { sprite: [48, 128], ctrl: [0.92, 0.78, 0.83, 0.23], rib: 0.85 },
  blade: { sprite: [36, 128], ctrl: [0.9, 0.8, 0.7, 0.2], rib: 0.9 },
};

// The cherry branch: a crooked main limb from the left edge (a walk pulled
// toward its tip), side limbs that fork once, blossom clusters on stalks.
export const BRANCH = {
  main: { steps: 14, kink: 0.12, pull: 0.3, w: [0.4, 0.05] },
  sides: { n: [5, 10], perU: 1.25, from: 0.14, to: 0.88, angle: [0.45, 0.95], len: [0.2, 0.34], shrink: 0.35, steps: 7, kink: 0.2, curl: 0.04, w: 0.6, tipW: 0.03 },
  forks: { at: [0.4, 0.7], angle: [0.4, 0.8], len: [0.35, 0.55], steps: 4, lag: 0.6 },
  nodeU: 0.34, nodeFrom: 0.22, cluster: [3, 5], tipCluster: [2, 3], tipBud: 0.45, hang: 0.8,
  pedicelU: [0.1, 0.26], pedicelW: 0.018, pedicelMix: 0.35, pathLag: 1,
  budShare: 0.18, budOpen: 0.24, calyx: { rad: 0.11, z: -0.1, mix: 0.6 },
  blossoms: [54, 68], spacing: 0.6, rU: [0.17, 0.25], popMin: 0.2,
  rimAlpha: 0.4, rimW: 0.3, rimAt: 0.38, rimMix: 0.45, lenticels: { per: 0.9, len: 0.22, w: 0.022, alpha: 0.2, mix: 0.4, off: 0.3 },
  swayDeg: 0.6, swayHz: 0.13, shakeDeg: 2.2, pad: 1.3,
};

// The glass flower's light on the flowers around it, and the heart's pink on all of them.
export const FIELD_LIGHT = { rangeU: 6, fall: 1.5, alpha: 0.5, far: 0.08, flareBoost: 1, heartFloor: 0.5, min: 0.004, dirSteps: 8 };
