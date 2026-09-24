// Her favorites, the rose cup, the growing garden, depth, sleep and the night
// helpers. Numbers only. Sizes are in flower units U unless named Px, shapes
// are fractions of head radius, times are seconds.

export const FAV_PALETTE = {
  cosmos: [
    { base: '#E98BB8', deep: '#B24A80', light: '#F6CFE2' },
    { base: '#CC5A9C', deep: '#8A2A63', light: '#E89BC4' },
    { base: '#EFDAE6', deep: '#C893B2', light: '#F6ECF1' },
  ],
  daisy: { tip: '#F2EDE6', mid: '#E2DBE0', shade: '#ACA2C2' },
  center: ['#F7D160', '#C98A1E', '#8C5712'],
  bud: '#35603A',
  cosmosStem: '#3D6B3F', daisyStem: '#36623A', feather: '#467A48',
  moonRim: '#DCD8FF',
};

export const FAVS = {
  cosmos: {
    petals: 8, squash: 0.74, budSquash: 0.95, open: [0.3, 1], width: [0.45, 1], center: 0.2, reach: 1.01,
    stops: [0, 0.2, 0.46, 1], jitter: 0.07,
    // petal outline as fractions of its length: base point, side curve c1 c2 end, then the teeth across the tip
    base: [0.1, 0.05], side: [[0.3, 0.13], [0.6, 0.35], [0.93, 0.3]],
    teeth: [[1, 0.19], [0.955, 0.1], [1.01, 0], [0.955, -0.1], [1, -0.19], [0.93, -0.3]],
    veins: [-0.13, 0, 0.13], veinFrom: 0.3, veinTo: 0.84, veinAlpha: 0.2, veinW: 0.02, veinSpread: 1.6, centerBud: 0.6,
    florets: 16, floretR: 0.13, floretAt: 0.78, highlight: [0.3, -0.35],
    budR: 0.3, budCap: 0.62, budUntil: 0.22, rimAlpha: 0.4, rimW: 0.022,
  },
  daisy: {
    petals: [21, 26], squash: 0.72, budSquash: 0.95, open: [0.28, 1], width: [0.55, 1], inner: 0.2, w: 0.14,
    backLen: 0.9, backShade: 0.18, shadeAt: 0.42, center: 0.3, dome: [0.3, -0.38],
    florets: 30, floretR: 0.085, floretAt: 0.86, jitter: 0.05, lenJitter: 0.09, centerBud: 0.7, shadeFrom: 0.5,
    budR: 0.28, budCap: 0.55, budUntil: 0.22, rimAlpha: 0.35,
  },
  budTall: 1.15, budCapH: 0.9, jitN: 8, lenJitN: 7, popScale: 2.5,
  rU: { cosmos: [0.4, 0.48], daisy: [0.32, 0.38] },
  stemW: { cosmos: 0.032, daisy: 0.038 },
  // hero spots: fx across the field span, fy head height as a fraction of H
  cosmosSpots: [[0.15, 0.6], [0.35, 0.64], [0.585, 0.575], [0.67, 0.625], [0.865, 0.585]],
  daisySpots: [[0.02, 0.705], [0.215, 0.69], [0.425, 0.725], [0.545, 0.71], [0.785, 0.695], [0.98, 0.715]],
  leaves: {
    cosmos: { count: [3, 4], at: [0.2, 0.7], lenU: [0.42, 0.6] },
    daisy: { count: [1, 2], at: [0.12, 0.4], lenU: [0.26, 0.36] },
  },
  feather: { sprite: [56, 128], leaflets: 7, leafletLen: 0.9, leafletW: 2.2, rachisW: 2.6, droop: 0.18, taper: 0.5, curl: [0.6, 0.2, 0.55] },
};

// The rose seen a little from above: a cup with a spiral heart and rolled lips.
export const CUP = {
  mouthW: [0.3, 0.8], mouthY: [0.55, 0.2], mouthH: [0.26, 0.42], baseY: 0.52,
  crown: { lobes: [4, 5], spread: 1.35, width: 0.55, lift: [0.08, 0.36], out: 1.12, vary: 0.18, lipCtrl: 0.1, midAt: 0.6 },
  side: {
    from: 0.35, out: [0.95, 1.32], drop: [0.2, 0.42], dropMul: 0.5, lipW: 0.04, top: [0.96, 0.2], curl: [1, 1.3], curlY: 0.3,
    hip: 1.05, hang: 0.08, foot: 0.35, footUp: 0.04, inner: 0.3,
  },
  throatY: 0.25,
  spiral: { shrink: 0.2, drift: 0.1, rise: 0.09, turn: 2.2, arc: 3.4, edgeW: 0.022, edgeAlpha: 0.75, tall: 0.25 },
  front: {
    overlap: 0.12, reach: 1.06, sideY: 0.05, dip: [0.1, 0.95], lipW: [0.02, 0.05], lipAlpha: 0.85, shadowAlpha: 0.35, shadowW: 0.5,
    shoulder: 0.35, belly: 0.3, tuck: 0.1, foot: 0.3, hip: 0.4, bulge: 0.1, bulgeAt: 0.45, midAt: 0.55,
  },
  shade: { deep: 0.5, base: 0.22, edge: 0.34, rim: 0.45, throat: 0.45 }, rimAlpha: 0.55, rimW: 0.028, edgeW: 0.034,
  sepals: { n: 5, len: 0.52, w: 0.15, hug: 0.5, reflex: 2.2, fadeAt: 1.4 },
  ext: 1.06,
};

// Distant flowers near the hills. She starts with a few; the daily ones join them.
export const MEADOW = {
  base: 16, band: [0.792, 0.836], lift: [0.018, 0.042], rU: [0.1, 0.17], haze: 0.36, air: 0.5,
  species: ['daisy', 'cosmos', 'wild'],
  stemW: 0.018, swayMul: 0.35, tufts: 3, tuftU: [0.06, 0.14], tuftW: 0.025, tuftLean: 0.4, edge: 0.03, jitter: 0.4,
};

// One new flower for every calendar day since her first visit.
export const GARDEN = {
  maxDaily: 120, species: ['daisy', 'cosmos'], dayHash: 0x9e3779b1, dayMs: 86400000,
  // the first eight days fill these gaps in the middle of the field, alternating sides
  midSlots: [[0.12, 0.66], [0.88, 0.665], [0.31, 0.7], [0.68, 0.705], [0.06, 0.745], [0.94, 0.74], [0.37, 0.765], [0.62, 0.76]],
  midJitter: 0.02, midJitterY: 0.008, farStart: 0.5, golden: 0.6180339887,
  // the newest flower on a new day: stem [start, dur], bloom [start, dur], seconds into the wake up
  grow: [2, 1.4], bloom: [3.4, 1.2],
  // in a full show the whole garden grows inside these windows [start, spread]
  fullGrow: [3.6, 1.8], fullPop: [5.9, 1.6],
  sparkleU: 0.9, sparkleDur: 1.3, sparkleAlpha: 0.5, sparkleW: 1.5, sparkleSquash: 0.5,
  glints: 4, glintSize: 0.35, glintSpin: 1.2, glintBoost: 1.6,
  savePrecision: 10000, regrowStagger: 0.09,
};

// Foreground framing: dark fronds low in the corners and soft out of focus lights.
export const FRONT = {
  fronds: [[-0.03, 1.01, 0.42, 2.7], [0.07, 1.03, 0.18, 2.1], [0.95, 1.02, -0.3, 2.4], [1.03, 1.0, -0.5, 2.9]],
  frondDark: 0.5, frondSway: 0.04, frondHz: 0.11, rimMix: 0.3, rimAlpha: 0.22, rimW: 3,
  bokeh: 6, bokehU: [0.35, 0.7], bokehAlpha: [0.07, 0.13], bokehY: [0.9, 0.99], bokehHz: [0.015, 0.04], bokehDriftU: 1.2,
};

export const LIGHT = {
  pool: { rU: 2.8, squash: 0.26, alpha: 0.18 },
  stem: { start: 10, dur: 1.4, trail: [0.035, 0.07, 0.11], sizeU: 0.26, alpha: 0.75, trailFade: 0.55, trailShrink: 0.18 },
};

export const SLEEP = {
  fold: 0.3, fantasyFold: 0.7, dim: 0.25, breatheHz: 0.1, breatheMin: 0.6, glowU: 2.2, glowAlpha: 0.22,
  timerS: 600, lowPowerS: 30,
};

// A firefly that settles on the fantasy flower and pulses on the beat, until she finds the heart.
export const HINT = {
  startS: 8, cycle: 45, flyIn: 2.6, stay: 5.2, flyOut: 2.2, fade: 0.6, fromU: 3.5, fromDrop: 0.35, wobble: 0.5, arc: 0.6,
  sizeU: 0.17, halo: 2.8, haloAlpha: 0.5, pulseMin: 0.5, pulseDecay: 4, perch: [0.86, -0.66],
};

export const AUTOHEART = { charge: 19.37, giveUp: 21 };

// Wide screens: groups of flowers on each side of the field, as many as the
// width allows, and small flowers kept clear of the tall stems.
export const SIDE = {
  perSide: 9, species: ['cosmos', 'daisy', 'wild', 'daisy', 'cosmos', 'wild', 'daisy', 'wild', 'cosmos'],
  minU: 1.2, marginU: 0.35, jitter: 0.3, orderMod: 10, densityU: 1.05,
  fy: { cosmos: [0.56, 0.66], daisy: [0.66, 0.75], wild: [0.745, 0.815] },
};
export const CLEAR = { gapU: 0.42, gapR: 1.05, passes: 2 };
