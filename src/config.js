// Every number the piece uses lives here. Times are seconds, sizes are in
// flower units U unless the name says Px, fractions are of width or height.

// Tunable feel. The ?tune panel edits these live and copies them back as JSON.
export const TUNE = {
  bloomStagger: 0.4167, // s between rose blooms, an eighth note at 72 bpm
  bloomDuration: 2.4,   // s per rose bloom
  overshoot: 1,         // multiplier on bloom and pop overshoot
  swayAmp: 1,           // multiplier on idle sway amplitude
  swaySpeed: 1,         // multiplier on idle sway frequency
  glow: 1,              // multiplier on halo alphas (still capped)
  petalFall: 1,         // multiplier on petal fall speed and spawn rate
  exhale: 0.08,         // gust bow as a fraction of stem height
};

export const TUNE_RANGES = {
  bloomStagger: [0.1, 1, 0.01],
  bloomDuration: [0.8, 4.5, 0.05],
  overshoot: [0, 2.5, 0.05],
  swayAmp: [0, 3, 0.05],
  swaySpeed: [0.25, 3, 0.05],
  glow: [0, 1.6, 0.05],
  petalFall: [0.25, 3, 0.05],
  exhale: [0, 0.15, 0.005],
};

export const PALETTE = {
  zenith: '#07061A', skyMid: '#16103A', skyLow: '#3A1A4A', horizon: '#7A2F5C',
  ground: '#0C0814', hills: '#1A1230',
  grass: ['#0F1A1C', '#16302A'], stem: '#2F5E34', leaf: ['#1F4A2A', '#3E7A48'],
  moon: '#FFF4EA', moonHalo: '#FFE1F0', moonHaloAlpha: 0.14,
  moonDisc: ['#EFE4E6', '#D2C3D2'],   // the disc sits below the fantasy flower's brightness
  roses: { crimson: '#B3122E', blush: '#F29BB2', coral: '#FF8A6B', lavender: '#B79CE8', peach: '#F7C39B' },
  wild: ['#C9B3F2', '#A9D3F5', '#FFD66B', '#FFF1E4', '#F7B6DA'],
  wildCenter: ['#FFD66B', '#F7C39B', '#B3122E'],
  sakuraEdge: '#FFE3EC', sakuraCenter: '#E86A92', stamen: '#FFE07A', branch: '#2C1A26',
  fantasy: ['#5FF3FF', '#9B7CFF', '#FF7AD9'], fantasyEdge: '#FFE8FF',
  core: ['#FFF6D6', '#FFC857'],
  gold: { base: '#C8922E', mid: '#E8B64C', edge: '#FFE7A3', glint: '#FFF3C4', shadow: '#6E4C18' },
  firefly: '#FFE08A', hearts: ['#FF6F91', '#FF8FAB'], goldHearts: ['#E8B64C', '#FFE7A3'],
  black: '#000000', lead: '#1A1030',
  seed: '#FFC857', seedCore: '#FFF6D6', pollen: '#FFF1E4',
  stars: ['#FFF1E4', '#FFE1F0', '#A9D3F5'],
  butterflies: [['#A9D3F5', '#9B7CFF'], ['#F7B6DA', '#FF7AD9']],
  buttonInk: '#FFE1F0', buttonBg: '#16103A',
  maxLightness: 0.95,   // nothing anywhere above 95% HSL lightness
  capLightness: 0.94,   // colors are capped a little lower so 8 bit rounding never crosses it
};

// Time of day. Hours are [from, to) on her local clock.
export const TOD = {
  hours: { night: [21, 5], dawn: [5, 8], day: [8, 17], eve: [17, 21] },
  recheckS: 60,
  crossfadeS: 3,
  themes: {
    night: {
      sky: [PALETTE.zenith, PALETTE.skyMid, PALETTE.skyLow], horizon: PALETTE.horizon,
      hills: PALETTE.hills, ground: PALETTE.ground, grass: PALETTE.grass,
      stem: PALETTE.stem, leaf: PALETTE.leaf, tint: PALETTE.zenith, tintAmt: 0,
      stars: 1, moon: 1, fireflies: 1, pollen: 0, sun: 0, sunColor: PALETTE.horizon,
      glow: 1, darken: 0, autoShooting: true, themeColor: PALETTE.zenith,
      // glows add light against the night; against lighter skies they blend so nothing reaches white
      glowBlend: 'lighter',
    },
    dawn: {
      sky: ['#34406E', '#9A7FA4', '#EFB39A'], horizon: '#EFB39A',
      hills: '#4A4570', ground: '#1C1B30', grass: ['#20293A', '#3A5646'],
      stem: '#355F42', leaf: ['#2A4E3E', '#4A7E5E'], tint: '#EFB39A', tintAmt: 0.12,
      stars: 0.25, moon: 0.32, fireflies: 0.3, pollen: 0, sun: 0.6, sunColor: '#EFB39A',
      glow: 0.85, darken: 0, autoShooting: false, themeColor: '#34406E', glowBlend: 'source-over',
    },
    day: {
      sky: ['#6D9CC4', '#9DBED4', '#D2D8CD'], horizon: '#D2D8CD',
      hills: '#7E98A6', ground: '#34483A', grass: ['#2E4636', '#557A56'],
      stem: '#3F6C44', leaf: ['#33603C', '#5E9262'], tint: '#9DBED4', tintAmt: 0.14,
      stars: 0, moon: 0, fireflies: 0, pollen: 1, sun: 0, sunColor: '#D2D8CD',
      glow: 0.6, darken: 0, autoShooting: false, themeColor: '#4F7390', glowBlend: 'source-over',
    },
    eve: {
      sky: ['#2F2C5C', '#95506E', '#E8996A'], horizon: '#E8996A',
      hills: '#4A2F4E', ground: '#1C1422', grass: ['#1E2530', '#344C3E'],
      stem: '#33603A', leaf: ['#244A30', '#44784E'], tint: '#E8996A', tintAmt: 0.12,
      stars: 0.35, moon: 0, fireflies: 0.75, pollen: 0, sun: 1, sunColor: '#E8996A',
      glow: 0.9, darken: 0, autoShooting: false, themeColor: '#2F2C5C', glowBlend: 'source-over',
    },
  },
  sunRadiusU: 5, sunAlpha: 0.5, sunX: 0.28,
  nearHillMix: 0.55,             // near hills blend from far hills toward ground
};

// Prerendered sprites. Glow stops approximate a soft gaussian falloff.
export const SPRITE = {
  glowPx: 128, smallGlowPx: 40,
  glowStops: [[0, 1], [0.18, 0.78], [0.36, 0.46], [0.54, 0.22], [0.72, 0.08], [0.86, 0.025], [1, 0]],
  starStops: [[0, 1], [0.2, 0.7], [0.5, 0.16], [1, 0]],
  stableFrames: 2, cacheScale: 1.15, cachePad: 1.35,
  sparklePx: 48, sparkleW: 0.09, sparkleStops: [[0, 1], [0.25, 0.55], [1, 0]],
  streak: [256, 10],
};

// Landscape shapes as fractions of height. Waves are [cycles across width, weight].
export const WORLD = {
  skyStops: [0, 0.36, 0.6, 0.745],
  horizonGlow: { y: 0.745, rx: 0.85, ry: 0.16, alpha: 0.5 },
  farHill: { y: 0.735, amp: 0.024, waves: [[1.3, 1], [3.1, 0.45], [7.3, 0.18]] },
  nearHill: { y: 0.778, amp: 0.016, waves: [[1.9, 1], [4.3, 0.4], [9.1, 0.15]] },
  bands: [{ y: 0.806, amp: 0.006, mix: 0.2, waves: [[2.3, 1], [6.1, 0.3]] }, { y: 0.842, amp: 0.005, mix: 0.62, waves: [[2.9, 1], [7.7, 0.3]] }],
  bandHillMix: 0.45,
  backBlades: { perPx: 0.55, hU: [0.1, 0.26], wU: 0.03, alpha: 0.5, lift: 0.12, lean: 0.3, depth: 0.6, ctrl: [0.4, 0.6, 0.3, 0.5] },
  groundFade: 0.45, groundTopU: 0.3, groundStop: 0.18,
  ridgeStepPx: 6,
  stars: { maxY: 0.66, pow: 1.35, moonClear: 2.6, sizeGlow: 3.2, depth: [0.25, 0.7], alpha: [0.35, 0.95], delay: [0, 1.8], topBias: 0.5, twinkleUp: 1, spacing: 1.1 },
  front: {
    perPx: 0.75, hU: [0.3, 1.1], wU: [0.06, 0.12], rootY: [0.874, 1.02], rootPow: 1.6,
    shades: [[0.75, 0.12], [0.45, 0.3], [0.15, 0.5]],   // [grass mix, darken toward ground]
    swayU: 0.06, swayHz: [0.25, 0.5], clumpSpreadU: 0.32, clumpHU: [0.6, 1.15], clumpRootY: [0.876, 0.9],
    bowLean: 0.5, gustLean: 0.55, tipCurve: 0.45, baseCurve: 0.3,
  },
  moon: {
    haloStops: [[0, 1], [0.35, 0.35], [1, 0]], haloInner: 0.9,
    light: [-0.3, -0.3, 0.1], edgeMix: 0.62,
    craters: [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.13], [-0.05, 0.38, 0.1], [0.35, -0.32, 0.08]],
    craterDark: 0.35, craterAlpha: 0.07, rimAlpha: 0.35, rimW: 0.04, rimAt: 0.98, edgeDark: 0.07,
  },
};

// Seconds from load for the full show.
export const BEATS = {
  fadeIn: [0, 1.2],
  starsSpread: 1.8,
  seed: { appear: 0.833, land: 2.5, startY: 0.04, trailU: 1.6 },
  pulse: { start: 2.5, dur: 0.9, radiusU: 1.5, alpha: 0.35 },
  grassBow: { dur: 1.8, reachU: 2.6, lean: 0.4, attack: 0.06 },
  fantasyStem: [2.7, 3.6],
  roseStems: { start: 3, stagger: 0.28, dur: 2.2 },
  favStems: { start: 3.4, stagger: 0.14, dur: 1.8 },
  wildStems: { start: 3.6, stagger: 0.11, dur: 1.4 },
  branch: [3.9, 2.6],
  roseBloom: { start: 5 },       // stagger and duration live in TUNE
  wildPop: { start: 5.833, stagger: 0.09, dur: 0.7 },
  blossoms: { start: 6.25, stagger: 0.07, dur: 0.6 },
  favBloom: { start: 7.5, stagger: 0.2083, dur: 1.6 },   // sixteenth notes, answering the roses
  petalFall: 8.333,
  budSwell: [10, 1.6],
  breath: { start: 12, dur: 0.5, amp: 0.3, ease: 0.2, recover: 1.6 },
  fantasyOpen: { start: 12.5, dur: 2.6, ringDelays: [0, 0.4167, 0.8333] },
  // The beat sheet asks for a single swell to 40%, the one moment above the 35% cap.
  ignite: { start: 14.167, peak: 0.4, settle: 0.28, rise: 0.35, fall: 1.2 },
  exhale: { start: 15, dur: 1.6, petalsMin: 20, petalsMax: 26, widthU: 1.6, rebound: 0.3 },
  fireflies: [16.667, 2],
  butterflies: [17.5, 20],
  introEnd: 18.333,
  buttonsFade: 1.2,
  leafUnfurl: 0.6,
};

// Return visits: a 5 second wake up.
export const WAKE = {
  total: 5, startOpen: 0.35, fadeIn: 0.9, span: 3, dur: 1.2,
  fantasy: [2.5, 4.6], fantasyDim: 0.2, ignite: 3.75,
  fireflies: [0.4, 2], butterflies: [3, 5.5], petalHead: 120, buttons: 5,
};

// Preview jumps to this show time, fully grown and settled.
export const PREVIEW = { showTime: 40 };

export const MOTION = {
  bloomBezier: [0.25, 1.12, 0.45, 1],
  popOvershoot: 0.9,
  sway: {
    hz: [0.22, 0.42], amp: [0.018, 0.03], phasePerPx: 0.004, phaseRand: 0.6,
    breezeHz: 0.05, breezeDepth: 0.4, headFollow: 0.6,
  },
  lean: { max: 0.07, response: 0.35, decay: 2, decayTaus: 4, reachU: 5, fullU: 1.2 },
  spring: { k: 140, c: 7, scale: 0.14, tiltDeg: 12, peak: 0.057, rest: 0.0005, step: 0.008 },
  variance: { size: 0.08, bloomDur: 0.15, tiltDeg: 6, roseLayers: [5, 6] },
  petals: {
    fallU: [0.3, 0.5], driftHz: [0.3, 0.5], driftU: [0.25, 0.7], flip: [2, 5],
    max: 90, landFade: 6, ambient: 40, sizeU: [0.1, 0.15], landU: [0, 0.07],
    windU: 0.06, spinWobble: 0.6, hash: [2654435761, 40503],
  },
  fireflies: { count: [14, 22], hz: [0.25, 0.5], driftU: [1, 2], wanderHz: [0.03, 0.08], sizeU: [0.18, 0.3] },
  pollen: { count: 26, driftU: [0.6, 1.6], riseU: 0.05, sizeU: [0.05, 0.1], alpha: 0.35 },
  glowMax: 0.35,
  dtMax: 0.1,
};

export const INPUT = {
  tapMovePx: 10, tapMaxS: 0.5, chargeDelay: 0.12, chargeFull: 0.75, cancelRadius: 1.4,
  dimIgnoreS: 0.6, plantCap: 20, plantFade: 1.2, hearts: [5, 9], shake: [6, 10],
  idleS: 60, dimS: 6, wakeS: 1.2, dimFireflies: 0.4,
  autoShooting: [18, 34], hitPad: 1.15, blossomHit: 1.8, branchHitU: 0.35,
  plantMinU: 0.7, plantMaxU: 5.5, plantPopAt: 0.8, bloomedAt: 0.9,
  plantSpecies: ['daisy', 'cosmos', 'daisy', 'cosmos', 'wild'],
};

export const HEART = {
  ringRU: 1.75, ringWidth: 1.5, chargeMotes: 8, chargeMoteRU: 2.6, stretch: 0.3,
  flarePetals: 0.45, flareHalo: 0.6, flareCore: 0.9, flarePeak: 0.6, flareRelax: 0.9,
  motes: 64, fly: 1.2, stagger: 0.35, widthU: 5.8, hold: 3, bpm: 72,
  lub: 0.05, dub: 0.035, dubAt: 0.28, beatAttack: 0.05, beatDecay: 0.16,
  lineAlpha: 0.35, lineWidthPx: 1, fade: 1.8, fallU: 1.1, notchU: 1.45,
  curveU: 1.6, curveMin: 0.5, moteRU: 0.16, moteAlpha: 0.9, showR: [1.25, 1.65],
  ringAlpha: 0.55, ringColor: '#FFE08A', dotU: 0.22, dotAlpha: 0.6, spin: 1.25, chargeInner: 1.3,
  relaxS: 0.12, beatGlow: 0.5, driftU: 0.3, samples: 720, coreU: 0.05, coreAlpha: 0.85, coreMix: 0.5,
  leanMax: 0.05, leanFullU: 3, fireflyBoost: 0.5,   // the field turning toward the heart
};

export const GOLD = {
  chance: 1 / 8, guaranteeBy: 4, glints: 6, glintHz: 0.55, spinHz: 0.03, glowAlpha: 0.3, glowU: 1.5,
  sheen: { period: 4.5, band: 0.16, alpha: 0.42, pause: 0.35 },
  glintR: [0.3, 0.82], glintY: -0.12, glintSquash: 0.45, glintSize: 0.24, glintPow: 4, glintMin: 0.6, glintCut: 0.02, deep: 0.37,
};

export const SHOOTING = {
  dur: 1.1, lengthU: 2.6, travelU: 4.2, alpha: 0.75, dayAlpha: 0.35, angle: [0.35, 0.75],
  headU: 0.18, headAlpha: 0.9, grow: 3, shrink: 0.5, thick: 0.5,
};

export const LAYOUT = {
  unitW: 9, unitH: 12, dprMax: 2,
  groundY: 0.88, horizonY: 0.76,
  fantasyY: 0.34, fieldSpan: 0.85, fieldMaxU: 14, wildSpanMaxU: 18, wildSpan: 0.9,
  moon: { x: 0.82, y: 0.14, rU: 0.38, haloU: 2.2, clearPx: 10 },
  // Five roses: fx across the field span, hy is head height as a fraction of H.
  roses: [
    { color: 'coral', fx: 0.05, hy: 0.515 },
    { color: 'crimson', fx: 0.25, hy: 0.455 },
    { color: 'peach', fx: 0.39, hy: 0.6 },
    { color: 'blush', fx: 0.73, hy: 0.47 },
    { color: 'lavender', fx: 0.95, hy: 0.505 },
  ],
  roseOrder: [0, 4, 1, 3, 2],   // outside in, alternating left and right
  wildCount: [10, 14], wildY: [0.745, 0.815], wildJitter: 0.3,
  branch: { anchorY: 0.07, tipY: 0.14, maxY: 0.2, reachW: 0.56, reachU: 7.4, anchorU: 0.6, c1: [0.35, 0.06], c2: [0.3, -0.035] },
  edgeMarginPx: 6, swayMargin: 0.05,
};

// The two round buttons, top right. Sizes in CSS px.
export const UI = {
  size: 44, gap: 8, margin: 12, icon: 20, zonePad: 8,
  opacity: 0.62, dimOpacity: 0.3, bgAlpha: 0.34, lineAlpha: 0.16, inkAlpha: 0.72, focusAlpha: 0.85,
  invite: { dur: 2.4, count: 2, bgAlpha: 0.22, glowAlpha: 0.3, lineAlpha: 0.42 },
};

export const SIZE = {
  rose: { rU: 0.7, stemW: 0.07 },
  // the heart outline is 5.2U wide and must clear the petals, which caps the head at 1.3U
  fantasy: { rU: 1.3, stemW: 0.11, haloU: 4.2, coreU: 0.3 },
  wild: { rU: [0.25, 0.36], stemW: 0.04 },
  blossomU: [0.17, 0.25], budU: 0.08,
  leafU: [0.45, 0.75], heartU: [0.18, 0.28],
  butterflyU: 0.36, starPx: [0.8, 2.1],
};

export const COUNTS = {
  starsPerPx: 1 / 2600, stars: [70, 220], starTwinkleHz: [0.08, 0.35],
  blossoms: [32, 42], budShare: 0.22,
  grassPerPx: 0.28, grassClump: 5, backGrassPerPx: 0.5, heartsLife: 2.6,
};

// Drawing proportions. Rose and wildflower sizes are fractions of head radius.
export const SHAPE = {
  stem: {
    restLean: 0.06, c1Bend: 0.09, c1Follow: 0.15, c1Y: 0.34, c2Rest: 0.55, c2Follow: 0.58, c2Y: 0.7,
    arcDrop: 0.9, headFollow: 0.6, budScale: 0.55, lineRatio: 1,
  },
  stemRim: { alpha: 0.32, w: 0.4, dx: 0.28, mix: 0.4 },
  stemTaper: { steps: 10, rose: [0.095, 0.05], fantasy: [0.15, 0.08] },
  leaf: {
    rose: { count: [3, 4], at: [0.18, 0.66], lenU: [0.5, 0.72] },
    wild: { count: [0, 1], at: [0.25, 0.5], lenU: [0.24, 0.36] },
    fantasy: { count: [3, 3], at: [0.16, 0.52], lenU: [0.8, 1.05] },
    unfurlSpan: 0.28, fold: 0.12, open: [0.7, 1.05],
    sprite: [48, 128], ctrl: [0.92, 0.78, 0.83, 0.23], rib: 0.85, ribAlpha: 0.35, ribW: 2.5, ribDark: 0.35,
  },
  rose: { edgeTo: '#FFF1E4' },   // the cup itself is shaped by CUP in config-garden.js
  // Wildflower types by palette index: petals, length, width, roundness of tip.
  wild: [
    { petals: 8, len: 1, w: 0.2, round: 0.6, center: 0.26, c: 0 },
    { petals: 5, len: 0.95, w: 0.52, round: 1, center: 0.24, c: 0 },
    { petals: 5, len: 0.92, w: 0.5, round: 0.9, center: 0.3, c: 1 },
    { petals: 11, len: 1, w: 0.15, round: 0.5, center: 0.28, c: 0 },
    { petals: 6, len: 1, w: 0.36, round: 0.2, center: 0.24, c: 1 },
  ],
  wildShade: { base: 0.3, edge: 0.18, dots: 5, dotR: 0.05, dotAt: 0.55, spin: 0.35 },
  wildPetal: [0.3, 0.85, 0.35, 0.5],
  blossom: {
    petals: 5, notch: 0.2, w: 0.66, stamens: 7, stamenLen: 0.62, dotR: 0.075, stamenRot: 0.22,
    lineW: 0.05, budLen: 1.5, budW: 0.8, budMix: 0.22, midAt: 0.44, midMix: 0.45, budBulge: [0.2, 0.3], calyx: [0.36, 0.3, 0.17],
    ctrl: [0.3, 0.92, 1.15, 0.3],
  },
  branch: {
    widthU: [0.34, 0.04], steps: 40, sag: 0.1, rise: 0.05,
    twigs: [[0.2, -0.6, 0.26], [0.33, 0.5, 0.26], [0.46, -0.5, 0.32], [0.58, 0.55, 0.24], [0.7, -0.45, 0.26], [0.84, 0.5, 0.18]],
    twigSteps: 12, twigWidth: 0.55, rimAlpha: 0.22, rimW: 0.35, rimMix: 0.3, rimAt: 0.45,
    swayDeg: 0.6, swayHz: 0.13, shakeDeg: 2.2, blossomSide: 0.35, pad: 1.2,
    mainShare: 0.45, tMin: [0.24, 0.2], spacing: 0.72, cluster: [2, 4], clusterU: 0.34, clusterSquash: 0.8, hang: 0.08, squash: [0.62, 1],
  },
  petal: {
    sprite: [30, 38], notch: 0.16, flipMin: 0.18, aspect: 1.27, fadeIn: 0.4, gap: [0.5, 3], srcSpread: 0.5,
    ctrl: [0.95, 0.72, 0.9, 0.12], rim: 0.3, base: 0.28,
    lift: { dur: 1.7, dxU: [0.8, 2.2], dyU: [0.9, 1.9], swirlU: [0.25, 0.6], w: [4, 7] },
    burst: { vU: [0.6, 1.6], tau: 0.35, up: 0.4 },
  },
};

// The flower that could never exist.
export const FANTASY = {
  // rings back to front: petal count, length and width as fractions of head radius, angle offset
  rings: [
    { n: 7, len: 1, w: 0.44, off: 0.22, shape: [0.95, 0.74, 0.78, 0.16] },
    { n: 7, len: 0.8, w: 0.46, off: 0.67, shape: [1, 0.7, 0.9, 0.24] },
    { n: 5, len: 0.5, w: 0.5, off: 0.1, shape: [0.92, 0.72, 0.86, 0.3] },
  ],
  squash: 0.9, budSpread: 0.13, budLen: 0.42, budSwell: 0.22, ringDur: 1.9,
  sprite: [72, 180], alpha: 1, cycleS: 14, petalPhase: 0.55, ringPhase: 0.33,
  deep: 0.28, midAt: 0.45, edgeMix: 0.42,
  glass: {
    baseLight: 0.38, tipMix: 0.5, paneLight: 0.1, paneDark: 0.3, paneShade: 0.12, innerAlpha: 0.32, innerW: 9,
    leadAlpha: 0.78, leadW: 3.6, paneW: 2.2, spineTo: 0.14, cross: [[0.36, 0.03], [0.66, 0.035]], crossReach: 0.95,
  },
  budHalo: [0.05, 0.16], budGlowAlpha: 0.5,
  coreStops: [[0, 1], [0.5, 0.95], [1, 0]], corePx: 64, coreGlowU: 1, coreGlowAlpha: 0.35, coreFlareSize: 0.5,
  flicker: [[1.7, 0.05], [3.1, 0.03]],
  stemGlowMix: 0.35, stemGlowAlpha: 0.32, stemGlowW: 0.3,
  motes: 7, moteRU: [1.5, 1.95], moteHz: [0.08, 0.16], moteSizeU: [0.07, 0.12], moteAlpha: 0.75, moteFade: 1,
  moteColor: '#FFE08A', moteTwinkle: 2, moteGrow: 0.5, moteDim: 0.5, breathe: [0.07, 0.02],
  stillness: 0.3,
};

// The classic parametric heart: x = a sin^3 t, y = b0 cos t - b1 cos 2t - b2 cos 3t - b3 cos 4t.
export const HEART_CURVE = { a: 16, b: [13, 5, 2, 1], width: 32, box: 34, center: 0.46, steps: 48 };

// Floating hearts released by a tap.
export const HEARTS = {
  life: 2.6, riseU: [0.9, 1.5], swayU: [0.15, 0.35], swayHz: [0.6, 1.1], spreadR: 0.35, startR: 0.3,
  popS: 0.22, stagger: 0.055, fadeFrom: 0.6, wobble: 0.25, max: 60, px: 64,
  highlight: [0.35, 0.3, 0.5], lightMix: 0.35, shadeMix: 0.25,
};

export const SEED = {
  appearS: 0.25, glowU: 0.8, glowAlpha: 0.6, coreU: 0.08, flashS: 0.35, flashAlpha: 0.5, flashGrow: 0.8,
  sink: 1.4, trailW: 0.12, ringSquash: 0.34, ringW: 1.6, ringColor: '#FFE08A',
};

export const FIREFLY = { haloMul: 2.4, haloAlpha: 0.3, coreMul: 0.55, coreAlpha: 0.85, pulsePow: 1.5, yRange: [0.44, 0.86], ySquash: 0.6 };
export const POLLEN = { yRange: [0.3, 0.86], hz: [0.03, 0.07], riseU: 0.12, riseMul: [0.5, 1], sizeU: [0.035, 0.07], alpha: 0.35 };

export const BUTTERFLY = {
  flapHz: [4.5, 6], spanU: 0.62, enterS: 4.5, region: [0.28, 0.66], wanderHz: [[0.043, 0.071], [0.052, 0.089]],
  bob: [0.9, 0.12], tilt: 0.35, glowAlpha: 0.14, glowU: 1.1, bodyW: 0.07, bodyL: 0.42,
  wing: {
    reach: 1.05, root: 0.35, colorAt: 0.35, flushAt: 0.72, borderAlpha: 0.75, borderW: 7, veinAlpha: 0.3, veinW: 1.6,
    veinBend: 0.45, veinLift: 0.6, veinReach: 0.85, spotAlpha: 0.7, spotR: 3.2, spotAt: 0.9,
  },
  upper: [1, 0.72], lower: [0.68, 0.55], fold: 0.22, edgeMix: 0.22, body: '#2C1A26', px: 96,
  // wing outlines as [x, y] multiples of the wing size: bezier c1, c2, end, then quadratic control
  up: [[0.4, -1], [1, -1.1], [0.9, -0.3], [0.6, 0]],
  low: [[0.6, 0.2], [1, 1], [0.5, 0.95], [0.2, 0.6]],
  wander: { ax: 0.42, mixX: [0.65, 0.35], mulX: 2.3, mixY: [0.6, 0.4], mulY: 1.7, jitter: 0.15 },
};

export const STORAGE = {
  visits: 'ff.visits', gold: 'ff.goldSeen', seed: 'ff.seed', firstDay: 'ff.firstDay', lastDay: 'ff.lastDay',
  planted: 'ff.planted', heartFound: 'ff.heartFound', sound: 'ff.sound', soundUsed: 'ff.soundUsed',
};

export const PERF = { samples: 1200 };
