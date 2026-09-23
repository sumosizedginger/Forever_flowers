// Every number the piece uses lives here. Times are seconds, sizes are in
// flower units U unless the name says Px, fractions are of width or height.

// Tunable feel. The ?tune panel edits these live and copies them back as JSON.
export const TUNE = {
  bloomStagger: 0.42,   // s between rose blooms
  bloomDuration: 2.4,   // s per rose bloom
  overshoot: 1,         // multiplier on bloom and pop overshoot
  swayAmp: 1,           // multiplier on idle sway amplitude
  swaySpeed: 1,         // multiplier on idle sway frequency
  glow: 1,              // multiplier on halo alphas (still capped)
  petalFall: 1,         // multiplier on petal fall speed and spawn rate
  exhale: 0.06,         // gust bow as a fraction of stem height
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
  moon: '#FFF4EA', moonHalo: '#FFE1F0', moonHaloAlpha: 0.2,
  roses: { crimson: '#B3122E', blush: '#F29BB2', coral: '#FF8A6B', lavender: '#B79CE8', peach: '#F7C39B' },
  wild: ['#C9B3F2', '#A9D3F5', '#FFD66B', '#FFF1E4', '#F7B6DA'],
  wildCenter: ['#FFD66B', '#F7C39B', '#B3122E'],
  sakuraEdge: '#FFE3EC', sakuraCenter: '#E86A92', stamen: '#FFE07A', branch: '#2C1A26',
  fantasy: ['#5FF3FF', '#9B7CFF', '#FF7AD9'], fantasyEdge: '#FFE8FF',
  core: ['#FFF6D6', '#FFC857'],
  gold: { base: '#C8922E', mid: '#E8B64C', edge: '#FFE7A3', glint: '#FFF3C4' },
  firefly: '#FFE08A', hearts: ['#FF6F91', '#FF8FAB'], goldHearts: ['#E8B64C', '#FFE7A3'],
  seed: '#FFC857', seedCore: '#FFF6D6', pollen: '#FFF1E4',
  stars: ['#FFF1E4', '#FFE1F0', '#A9D3F5'],
  butterflies: [['#A9D3F5', '#9B7CFF'], ['#F7B6DA', '#FF7AD9']],
  buttonInk: '#FFE1F0', buttonBg: '#16103A',
  maxLightness: 0.95,   // nothing anywhere above 95% HSL lightness
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
    },
    dawn: {
      sky: ['#34406E', '#9A7FA4', '#EFB39A'], horizon: '#EFB39A',
      hills: '#2E2A4E', ground: '#120F22', grass: ['#141C2A', '#223A38'],
      stem: '#2F5A3E', leaf: ['#22473A', '#3E7456'], tint: '#EFB39A', tintAmt: 0.1,
      stars: 0.25, moon: 0.5, fireflies: 0.3, pollen: 0, sun: 0.6, sunColor: '#EFB39A',
      glow: 0.85, darken: 0.08, autoShooting: false, themeColor: '#34406E',
    },
    day: {
      sky: ['#6D9CC4', '#9DBED4', '#D2D8CD'], horizon: '#D2D8CD',
      hills: '#6F8C99', ground: '#16241E', grass: ['#17281F', '#2A4A36'],
      stem: '#335F38', leaf: ['#244C2E', '#44804E'], tint: '#9DBED4', tintAmt: 0.06,
      stars: 0, moon: 0, fireflies: 0, pollen: 1, sun: 0, sunColor: '#D2D8CD',
      glow: 0.6, darken: 0.14, autoShooting: false, themeColor: '#2A3F52',
    },
    eve: {
      sky: ['#2F2C5C', '#95506E', '#E8996A'], horizon: '#E8996A',
      hills: '#34203C', ground: '#120A18', grass: ['#131820', '#22322C'],
      stem: '#2F5A36', leaf: ['#20452C', '#3C7248'], tint: '#E8996A', tintAmt: 0.1,
      stars: 0.35, moon: 0.5, fireflies: 0.75, pollen: 0, sun: 1, sunColor: '#E8996A',
      glow: 0.9, darken: 0.05, autoShooting: false, themeColor: '#2F2C5C',
    },
  },
  skyStops: [0, 0.5, 0.86],      // zenith, mid, low as fractions of the ground line
  horizonBand: [0.62, 0.93],     // horizon glow band, fraction of ground line
  horizonAlpha: 0.55,
  sunRadiusU: 5, sunAlpha: 0.5, sunX: 0.28,
  nearHillMix: 0.55,             // near hills blend from far hills toward ground
};

// Seconds from load for the full show.
export const BEATS = {
  fadeIn: [0, 1.2],
  starsSpread: 1.8,
  seed: { appear: 0.8, land: 2, startY: 0.04, trailU: 0.9 },
  pulse: { start: 2, dur: 0.9, radiusU: 1.5, alpha: 0.35 },
  grassBow: { dur: 1.6, reachU: 3.2, maxPx: 0.35 },
  fantasyStem: [2.2, 3.6],
  roseStems: { start: 2.5, stagger: 0.26, dur: 2.2 },
  wildStems: { start: 3.2, stagger: 0.11, dur: 1.4 },
  branch: [3.4, 2.6],
  roseBloom: { start: 4.9 },     // stagger and duration live in TUNE
  wildPop: { start: 5.6, stagger: 0.09, dur: 0.7 },
  blossoms: { start: 6, stagger: 0.07, dur: 0.6 },
  petalFall: 8,
  budSwell: [9.8, 1.6],
  breath: { start: 11.4, dur: 0.5, amp: 0.3, ease: 0.2, recover: 1.6 },
  fantasyOpen: { start: 11.9, dur: 2.6, ringDelays: [0, 0.35, 0.7] },
  // The beat sheet asks for a single swell to 40%, the one moment above the 35% cap.
  ignite: { start: 13.6, peak: 0.4, settle: 0.28, rise: 0.35, fall: 1.2 },
  exhale: { start: 14.6, dur: 1.6, petalsMin: 12, petalsMax: 18, widthU: 1.6, rebound: 0.3 },
  fireflies: [16.4, 2],
  butterflies: [17.5, 19.5],
  introEnd: 18,
  buttonsFade: 1.2,
  leafUnfurl: 0.6,
};

// Return visits: a 5 second wake up.
export const WAKE = {
  total: 5, startOpen: 0.35, fadeIn: 0.9, span: 3, dur: 1.2,
  fantasy: [2.4, 4.6], fantasyDim: 0.2, ignite: 3.8,
  fireflies: [0.4, 2], butterflies: [3, 5.5], petalHead: 120, buttons: 5,
};

// Preview jumps to this show time, fully grown and settled.
export const PREVIEW = { showTime: 40 };

export const MOTION = {
  bloomBezier: [0.34, 1.56, 0.64, 1],
  popOvershoot: 1.7,
  sway: {
    hz: [0.22, 0.42], amp: [0.018, 0.03], phasePerPx: 0.004, phaseRand: 0.6,
    breezeHz: 0.05, breezeDepth: 0.4, headFollow: 0.6,
  },
  lean: { max: 0.07, response: 0.35, decay: 2, reachU: 5, fullU: 1.2 },
  spring: { k: 140, c: 7, scale: 0.14, tiltDeg: 12, peak: 0.057, rest: 0.0005 },
  variance: { size: 0.08, bloomDur: 0.15, tiltDeg: 6, roseLayers: [5, 6] },
  petals: {
    fallU: [0.3, 0.5], driftHz: [0.3, 0.5], driftU: [0.25, 0.7], flip: [2, 5],
    max: 90, landFade: 6, ambient: 44, sizeU: [0.1, 0.15], landU: [0, 0.07],
    windU: 0.06, spinWobble: 0.6,
  },
  fireflies: { count: [14, 22], hz: [0.25, 0.5], driftU: [1, 2], wanderHz: [0.03, 0.08], sizeU: [0.18, 0.3] },
  pollen: { count: 26, driftU: [0.6, 1.6], riseU: 0.05, sizeU: [0.05, 0.1], alpha: 0.35 },
  glowMax: 0.35,
  dtMax: 0.1,
};

export const INPUT = {
  tapMovePx: 10, tapMaxS: 0.35, chargeDelay: 0.12, chargeFull: 0.75, cancelRadius: 1.4,
  dimIgnoreS: 0.6, plantCap: 20, plantFade: 1.2, hearts: [5, 9], shake: [6, 10],
  idleS: 60, dimS: 6, wakeS: 1.2, dimOpen: 0.5, dimDark: 0.38, dimFireflies: 0.4,
  autoShooting: [18, 34], hitPad: 1.15, blossomHit: 1.8, branchHitU: 0.35,
  plantMinU: 0.7, plantMaxU: 5.5,
};

export const HEART = {
  ringRU: 1.75, ringWidth: 1.5, chargeMotes: 8, chargeMoteRU: 2.6, stretch: 0.3,
  flarePetals: 0.45, flareHalo: 0.6, flareCore: 0.9, flarePeak: 0.6, flareRelax: 0.9,
  motes: 64, fly: 1.2, stagger: 0.35, widthU: 5.2, hold: 3, bpm: 72,
  lub: 0.05, dub: 0.035, dubAt: 0.28, beatAttack: 0.05, beatDecay: 0.16,
  lineAlpha: 0.25, lineWidthPx: 1, fade: 1.8, fallU: 1.1, notchU: 0.45,
  curveU: 1.6, moteRU: 0.16, moteAlpha: 0.9,
};

export const GOLD = { chance: 1 / 8, guaranteeBy: 4, glints: 6, glintHz: 0.55, spinHz: 0.03, glowAlpha: 0.3 };

export const SHOOTING = { dur: 1.1, lengthU: 2.6, travelU: 4.2, alpha: 0.75, dayAlpha: 0.35, angle: [0.35, 0.75] };

export const LAYOUT = {
  unitW: 9, unitH: 12, dprMax: 2,
  groundY: 0.88, horizonY: 0.76,
  fantasyY: 0.34, fieldSpan: 0.85, fieldMaxU: 14, wildSpanMaxU: 18, wildSpan: 0.9,
  moon: { x: 0.82, y: 0.14, rU: 0.42, haloU: 2.4, clearPx: 10 },
  // Five roses: fx across the field span, hy is head height as a fraction of H.
  roses: [
    { color: 'coral', fx: 0.05, hy: 0.515 },
    { color: 'crimson', fx: 0.25, hy: 0.455 },
    { color: 'peach', fx: 0.39, hy: 0.6 },
    { color: 'blush', fx: 0.73, hy: 0.47 },
    { color: 'lavender', fx: 0.95, hy: 0.505 },
  ],
  roseOrder: [0, 4, 1, 3, 2],   // outside in, alternating left and right
  wildCount: [10, 14], wildY: [0.66, 0.8], wildAvoidU: 0.5,
  branch: { anchorY: 0.07, maxY: 0.25, reachW: 0.45, reachU: 6 },
  edgeMarginPx: 6, swayMargin: 0.05,
};

// The two round buttons, top right. Sizes in CSS px.
export const UI = {
  size: 44, gap: 8, margin: 12, icon: 20, zonePad: 8,
  opacity: 0.62, dimOpacity: 0.3, bgAlpha: 0.34, lineAlpha: 0.16, inkAlpha: 0.72, focusAlpha: 0.85,
};

export const SIZE = {
  rose: { rU: 0.62, stemW: 0.07 },
  fantasy: { rU: 1.3, stemW: 0.11, hitU: 1.2, haloU: 3.3, coreU: 0.3 },
  wild: { rU: [0.2, 0.3], stemW: 0.04 },
  blossomU: [0.17, 0.23], budU: 0.08,
  leafU: [0.45, 0.75], heartU: [0.18, 0.28],
  butterflyU: 0.36, starPx: [0.8, 2.1],
};

export const COUNTS = {
  starsPerPx: 1 / 2600, stars: [70, 220], starTwinkleHz: [0.08, 0.35],
  blossoms: [18, 24], budShare: 0.25,
  grassPerPx: 0.28, grassClump: 5, backGrassPerPx: 0.5, heartsLife: 2.6,
};

export const AUDIO = {
  partial: 2.76, partialGain: 0.32, attack: 0.01, decay: 2.6,
  delay: 0.33, feedback: 0.35, lowpass: 2400, voiceMax: 0.12, wildScale: 0.5,
  bellGain: 0.1, fantasySpacing: 0.12, master: 0.9, fadeS: 0.4, pingWindow: 0.25,
  pad: { lowpass: 650, gain: 0.045, chordS: 8, attack: 2.6, release: 3.2, detune: 4 },
  notes: {
    C5: 523.25, D5: 587.33, E5: 659.26, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98,
  },
  scale: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'],
  rosePhrase: ['E5', 'G5', 'A5', 'C6', 'D6'],
  fantasyArp: ['C5', 'E5', 'G5', 'C6', 'E6'],
  goldChime: ['G5', 'C6', 'E6', 'G6'], goldSpacing: 0.07,
  novaChord: ['C5', 'G5', 'E6'],
  chords: [
    [130.81, 164.81, 196], [110, 130.81, 164.81], [87.31, 110, 130.81], [98, 123.47, 146.83],
  ],
};

export const STORAGE = { visits: 'ff.visits', gold: 'ff.goldSeen', seed: 'ff.seed' };

export const PERF = { samples: 1200 };
