// The music: a lullaby at 72 bpm in 3/4, C major, synthesized in the page.
// Notes are MIDI numbers. Bar positions and lengths are in beats; cue times
// are seconds from the cue's start. Gains are peak voice gains; none exceeds
// the 0.12 ceiling.

export const MUSIC = {
  bpm: 72, beatsPerBar: 3, lookahead: 0.25, latency: 0.04, sync: 0.08, smooth: 0.05, cueBars: 4, seedMix: 0x5a5a, barCache: 8,
  master: 0.85, fadeIn: 3, fadeOut: 1.2, closeFade: 6, dry: 1, wet: 0.34, highpass: 90,
  comp: { threshold: -20, knee: 12, ratio: 5, attack: 0.006, release: 0.28 },
  voiceMax: 0.12,
  // bars of the show: the full intro cue, the heart finale bars, then the lullaby
  introBars: 8, finaleBars: 3, wakeBars: 2,
};

export const REVERB = {
  seconds: 2.8, tau: 0.62, pre: 0.018, bright: 0.55, dark: 0.08, norm: 0.3, seed: [3, 7],
  early: [[11, 0.35], [19, 0.28], [29, 0.22], [41, 0.17], [53, 0.12], [67, 0.08]],
};

export const VOICES = {
  piano: {
    // harmonic amplitudes for the felt piano's wave, from the fundamental up
    wave: [1, 0.55, 0.3, 0.17, 0.1, 0.06, 0.035, 0.02],
    gain: 0.11, detune: [-3, 3], attack: 0.006, sustain: 0.38, fastTau: 0.09, fastHold: 0.12,
    tau: [1.5, 0.55], tauRange: [36, 96], release: 0.14,
    cut: [4, 9], cutMax: 7000, cutEnd: 2.2, cutFloor: 380, cutTau: 0.35, q: 0.5,
    hammer: 0.22, hammerMul: 3, hammerQ: 1.1, hammerTau: 0.012, hammerLen: 0.05, send: 0.8,
  },
  box: {
    gain: 0.075, attack: 0.002, detuneCents: 5, send: 1,
    parts: [[1, 1, 1.9], [2, 0.12, 0.5], [5.4, 0.22, 0.09]],   // [ratio, gain, decay seconds]
  },
  harp: {
    wave: [1, 0.42, 0.22, 0.13, 0.08, 0.05, 0.03, 0.02, 0.012, 0.008],
    gain: 0.06, attack: 0.003, tau: 0.55, cut: 8, cutEnd: 2, cutTau: 0.12, send: 0.9,
  },
  celesta: {
    gain: 0.07, attack: 0.002, send: 1,
    parts: [[1, 1, 1.6], [4, 0.16, 0.25], [2, 0.1, 0.7]],
  },
  strings: {
    gain: 0.012, detune: 7, cut: 1300, q: 0.4, attack: 1.4, release: 1.6, vibHz: 4.6, vibCents: 5, send: 1.2,
  },
};

// Chord voicings: [bass, then three tones above it for the rocking accompaniment].
export const CHORDS = {
  C: [48, 55, 60, 64], GB: [47, 55, 62, 67], Am: [45, 52, 60, 64], EmG: [43, 52, 59, 64],
  F: [41, 53, 57, 60], CE: [52, 55, 60, 67], Dm7: [50, 57, 60, 65], G: [43, 55, 59, 62],
  CG: [43, 52, 55, 60], G7: [43, 53, 59, 62], Fmaj7: [53, 57, 60, 64], Em7: [52, 55, 59, 62],
  Gsus: [43, 55, 60, 62], Am7: [45, 55, 60, 64],
};

// Pentatonic tones of each chord's color, for harp runs and tap-along notes.
export const SCALE = [0, 2, 4, 7, 9];

// The rocking accompaniment: six eighths per bar, as [beat, voicing index, beats, velocity].
export const ROCK = [[0, 0, 3, 0.62], [0.5, 1, 1.5, 0.36], [1, 2, 1.5, 0.4], [1.5, 3, 1.5, 0.42], [2, 2, 1, 0.37], [2.5, 1, 1, 0.34]];

// The lullaby, 32 bars: A, A', B, A''. Each bar is [chord, melody], melody as
// [beat, note, beats, velocity]. The last eighth of a bar may carry the pickup
// into the next. Built on a short-long "heartbeat" figure.
const A1 = [
  ['C', [[0, 76, 1.5, 0.8], [1.5, 74, 0.5, 0.6], [2, 72, 1, 0.7]]],
  ['GB', [[0, 74, 2, 0.74], [2.5, 67, 0.5, 0.55]]],
  ['Am', [[0, 72, 1.5, 0.78], [1.5, 71, 0.5, 0.58], [2, 69, 1, 0.68]]],
  ['EmG', [[0, 71, 2, 0.7], [2, 67, 1, 0.55]]],
  ['F', [[0, 69, 0.5, 0.6], [0.5, 72, 0.5, 0.66], [1, 77, 2, 0.86]]],
  ['CE', [[0, 76, 1.5, 0.78], [1.5, 74, 0.5, 0.6], [2, 72, 1, 0.7]]],
  ['Dm7', [[0, 74, 1.5, 0.74], [1.5, 76, 0.5, 0.62], [2, 77, 1, 0.76]]],
  ['G', [[0, 74, 2.5, 0.72], [2.5, 67, 0.5, 0.55]]],
];
const A2 = A1.slice(0, 4).concat([
  ['F', [[0, 69, 0.5, 0.6], [0.5, 72, 0.5, 0.66], [1, 77, 1.5, 0.86], [2.5, 76, 0.5, 0.6]]],
  ['CG', [[0, 76, 1, 0.72], [1, 74, 1, 0.64], [2, 72, 1, 0.66]]],
  ['G7', [[0, 77, 1.5, 0.76], [1.5, 76, 0.5, 0.6], [2, 74, 1, 0.66]]],
]);
const B = [
  ['Fmaj7', [[0, 84, 1.5, 0.8], [1.5, 83, 0.5, 0.62], [2, 81, 1, 0.72]]],
  ['G', [[0, 83, 2, 0.74], [2.5, 74, 0.5, 0.55]]],
  ['Em7', [[0, 83, 1.5, 0.78], [1.5, 81, 0.5, 0.6], [2, 79, 1, 0.68]]],
  ['Am', [[0, 81, 2, 0.72], [2.5, 72, 0.5, 0.55]]],
  ['Dm7', [[0, 81, 1.5, 0.78], [1.5, 79, 0.5, 0.6], [2, 77, 1, 0.68]]],
  ['Em7', [[0, 79, 1.5, 0.74], [1.5, 76, 0.5, 0.58], [2, 74, 1, 0.64]]],
  ['Fmaj7', [[0, 72, 1, 0.62], [1, 76, 1, 0.68], [2, 81, 1, 0.74]]],
  ['Gsus', [[0, 79, 2, 0.7], [2.5, 67, 0.5, 0.55]]],
];
export const LULLABY = [
  ...A1,
  ...A2, ['C', [[0, 72, 2, 0.72], [2.5, 76, 0.5, 0.58]]],
  ...B,
  ...A2, ['C', [[0, 72, 2, 0.7], [2.5, 67, 0.5, 0.52]]],
];

// How each pass through the lullaby is arranged, cycling: melody voice (or none),
// accompaniment level, strings, and whether the music box doubles or echoes.
const PASS = { stringsVel: 0.8, boxVel: 0.8, boxPan: 0.2, echoBeats: 1, phrase: 8, harpAt: 1.5, harpBeats: 1.25, harpBase: 72, harpVel: 0.2 };
export const PASSES = [
  { ...PASS, melody: 'piano', rock: 1, strings: 'B', box: 'double-last', boxVel: 0.45 },
  { ...PASS, melody: 'box', rock: 0.85, strings: 'B', box: 'none' },
  { ...PASS, melody: 'none', rock: 0.8, strings: 'none', box: 'echo', boxVel: 0.55 },
  { ...PASS, melody: 'piano', rock: 0.95, strings: 'all', box: 'harp-ends', stringsVel: 0.6 },
];

// Where the B section and the last A sit in the 32 bars.
export const FORM = { bSection: [16, 24], lastSection: 24 };

// The intro, scored to the beat sheet. [seconds, voice, notes, seconds long, velocity, pan]
export const INTRO = {
  chords: ['C', 'C', 'Fmaj7', 'Am7', 'Gsus', 'C', 'GB', 'Am'],      // one per bar of the intro
  events: [
    [0.833, 'box', [88], 1.5, 0.4, 0],
    [1.25, 'harp', [86], 1, 0.34, -0.1], [1.667, 'harp', [84], 1, 0.32, 0], [2.083, 'harp', [81], 1, 0.3, 0.1],
    [2.5, 'piano', [48, 55, 64], 4, 0.6, 0], [2.5, 'strings', [60, 64, 67], 7.3, 0.7, 0],
    [2.917, 'harp', [67], 1, 0.3, -0.4], [3.333, 'harp', [72], 1, 0.32, -0.2], [3.75, 'harp', [76], 1, 0.34, 0],
    [4.167, 'harp', [79], 1, 0.36, 0.2], [4.583, 'harp', [84], 1, 0.38, 0.4],
    [5, 'piano', [53, 60, 69], 2.5, 0.42, 0], [7.5, 'piano', [45, 52, 60], 2.5, 0.42, 0],
    [10, 'piano', [43, 60, 62], 2, 0.4, 0], [10, 'strings', [55, 60, 62, 67], 2, 1.2, 0],
    [12.083, 'piano', [67], 0.5, 0.52, 0],
    [12.5, 'strings', [60, 64, 67], 7.5, 0.6, 0],
    [12.917, 'box', [91], 1, 0.26, 0.3], [13.333, 'box', [96], 1, 0.24, -0.3],
    [14.167, 'harp', [60, 64, 67, 72], 2, 0.34, 0],
  ],
  // theme bars 1 to 3 as the fantasy flower opens, bars 6 to 8 of the show, piano doubled by music box
  themeFrom: 5, themeBars: 3, themeBoxUp: 12, themeBox: 0.55,
  shimmer: { from: 10, to: 11.9, step: 0.2083, notes: [86, 91], vel: [0.1, 0.3] },
  climb: { from: 10, dur: 1.4, notes: [67, 69, 71, 74, 76, 79, 81, 83, 86], vel: 0.26 },
  exhale: { from: 15, dur: 1.6, notes: [96, 93, 91, 88, 86, 84, 81, 79, 76, 74, 72], vel: 0.28, pan: [-0.7, 0.7] },
  rosePhrase: [76, 79, 81, 84, 86], roseVel: 0.66,
  favPhrase: [88, 86, 84, 81, 79, 76, 74, 72, 69, 67, 64], favVel: 0.34,
  wildNotes: [84, 86, 88, 91, 93, 96], wildVel: 0.16, wildEvery: 2,
  blossomNotes: [77, 79, 81, 84, 86, 89, 91, 93], blossomVel: 0.18, blossomEvery: 3,
  rockFrom: 5, rockVel: 0.6,
};

// The two bars before the lullaby on a return visit.
export const WAKE_CUE = {
  chords: ['C', 'GB'],
  events: [[0, 'strings', [60, 64, 67], 5, 0.5, 0]],
  chime: { times: [0.2, 0.6, 1.0, 1.5, 2.0, 2.4], notes: [79, 84, 86, 88, 91, 96], vel: 0.2 },
  newFlower: { at: 3.4, notes: [91, 96, 100], step: 0.1, vel: 0.26 },
  rockFrom: 1, rockVel: 0.5,
};

// The heart's own cue, seconds from release. Heartbeats sit on the global beat grid.
export const HEART_CUE = {
  shimmer: { notes: [79, 84, 88, 91, 96, 100], step: 0.1, vel: [0.14, 0.34] },
  bloom: { notes: [72, 76, 79, 84], roll: 0.04, vel: 0.55, strings: 5.2, stringsBase: 72, stringsVel: 0.9 },
  fly: { from: 0.6, dur: 1.2, notes: [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96], vel: 0.24, pan: [-0.5, 0.5] },
  lub: [48, 60], dub: [55, 67], lubVel: 0.58, dubVel: 0.38, dubAt: 0.28,
  motif: { notes: [[0, 79, 0.5], [0.5, 88, 1.5], [2, 86, 0.5], [2.5, 84, 1]], vel: 0.42 },
  fade: { from: 5.3, step: 0.3, notes: [96, 93, 91, 88, 86, 84], vel: [0.36, 0.12], chord: [48, 55, 64], chordAt: 6.1, chordVel: 0.36 },
  finaleChords: ['F', 'CE', 'G'], finaleRock: 0.55,
};

// Tap-along: which voice and register answers each touch.
export const TAPS = {
  rose: { voice: 'piano', octave: 72, vel: 0.5 }, flower: { voice: 'box', octave: 84, vel: 0.34 },
  fantasy: { voice: 'box', octave: 84, step: 0.09, vel: 0.34 },
  gold: { notes: [[0, 79, 0.2], [0.16, 88, 0.9], [0.5, 96, 0.6]], vel: 0.42 },
  shake: { octave: 91, n: 3, step: 0.07, vel: 0.24 }, plant: { voice: 'piano', octave: 60, vel: 0.34 },
  star: { n: 7, top: 96, dur: 0.6, vel: 0.22 },
};

// Asleep, then the sleep timer's goodbye.
export const SLEEP_MUSIC = { rock: 0.62, close: { chord: [48, 55, 64, 72], roll: 0.06, vel: 0.4, box: [88, 91, 96], step: 0.45, boxVel: 0.22 } };
