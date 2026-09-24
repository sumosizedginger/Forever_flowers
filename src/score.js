// The score as events in show time: { t, voice, notes, dur, vel, pan }, times
// and lengths in seconds. The intro and wake cues are fixed lists built once
// per show; the lullaby is arranged bar by bar from the show clock, so turning
// sound on joins the music already playing.
import { MUSIC, CHORDS, ROCK, LULLABY, FORM, PASSES, INTRO, WAKE_CUE, HEART_CUE, SLEEP_MUSIC } from './config-music.js';
import { BEATS, TUNE, HEART } from './config.js';

export const BEAT = 60 / MUSIC.bpm;
export const BAR = BEAT * MUSIC.beatsPerBar;
const T_HOLD = HEART.flarePeak + HEART.stagger + HEART.fly;
const T_FADE = T_HOLD + HEART.hold;

const ev = (t, voice, notes, dur, vel, pan) => ({ t, voice, notes, dur, vel, pan: pan || 0 });

export function lullabyStart(mode) {
  return mode === 'wake' ? MUSIC.wakeBars : MUSIC.introBars + MUSIC.finaleBars;
}

export function chordAt(mode, s) {
  const b = Math.max(0, Math.floor(s / BAR));
  const start = lullabyStart(mode);
  if (b >= start) return LULLABY[(b - start) % LULLABY.length][0];
  if (mode === 'wake') return WAKE_CUE.chords[Math.min(b, WAKE_CUE.chords.length - 1)];
  if (b < MUSIC.introBars) return INTRO.chords[b];
  return HEART_CUE.finaleChords[b - MUSIC.introBars];
}

// The chord's tones placed in the octave that starts at base.
export function chordTones(chord, base) {
  const pcs = [...new Set(CHORDS[chord].map((n) => n % 12))];
  return pcs.map((pc) => base + ((pc - (base % 12) + 12) % 12)).sort((a, b) => a - b);
}

function rock(list, b, chord, vel) {
  const v = CHORDS[chord];
  for (const [beat, i, beats, g] of ROCK) list.push(ev(b * BAR + beat * BEAT, 'piano', [v[i]], beats * BEAT, g * vel));
}

// A run of notes spread evenly across a span, optionally panning as it goes.
function run(list, voice, from, dur, notes, vel, pan) {
  notes.forEach((n, i) => {
    const k = notes.length > 1 ? i / (notes.length - 1) : 0;
    list.push(ev(from + k * dur, voice, [n], 1, vel, pan ? pan[0] + (pan[1] - pan[0]) * k : 0));
  });
}

// Everything the full intro plays, keyed to the beat sheet and to the field's own bloom order.
export function introCue(app) {
  const I = INTRO;
  const list = I.events.map(([t, voice, notes, dur, vel, pan]) => ev(t, voice, notes, dur, vel, pan));
  const fl = app.flowers;
  fl.roses.slice().sort((a, b) => a.order - b.order).forEach((f, j) => {
    list.push(ev(BEATS.roseBloom.start + j * TUNE.bloomStagger, 'piano', [I.rosePhrase[j % I.rosePhrase.length]], BEAT, I.roseVel));
  });
  fl.favs.slice().sort((a, b) => a.order - b.order).forEach((f, j) => {
    list.push(ev(BEATS.favBloom.start + j * BEATS.favBloom.stagger, 'box', [I.favPhrase[j % I.favPhrase.length]], 1, I.favVel));
  });
  fl.wilds.slice().sort((a, b) => a.order - b.order).forEach((f, j) => {
    if (j % I.wildEvery) return;
    list.push(ev(BEATS.wildPop.start + j * BEATS.wildPop.stagger, 'box', [I.wildNotes[(j / I.wildEvery) % I.wildNotes.length]], 1, I.wildVel, 0));
  });
  const nb = app.cherry ? app.cherry.blossoms.length : 0;
  for (let i = 0, k = 0; i < nb; i += I.blossomEvery, k++) {
    list.push(ev(BEATS.blossoms.start + i * BEATS.blossoms.stagger, 'harp', [I.blossomNotes[k % I.blossomNotes.length]], 1, I.blossomVel, -0.5));
  }
  const S = I.shimmer;
  for (let t = S.from, k = 0; t < S.to; t += S.step, k++) {
    list.push(ev(t, 'box', [S.notes[k % S.notes.length]], 1, S.vel[0] + (S.vel[1] - S.vel[0]) * ((t - S.from) / (S.to - S.from))));
  }
  run(list, 'harp', I.climb.from, I.climb.dur, I.climb.notes, I.climb.vel);
  run(list, 'harp', I.exhale.from, I.exhale.dur, I.exhale.notes, I.exhale.vel, I.exhale.pan);
  // the theme arrives with the fantasy flower, rocking underneath from the roses on
  for (let k = 0; k < I.themeBars; k++) {
    const b = I.themeFrom + k;
    for (const [beat, n, beats, g] of LULLABY[k][1]) {
      const t = b * BAR + beat * BEAT;
      list.push(ev(t, 'piano', [n], beats * BEAT, g));
      list.push(ev(t, 'box', [n + I.themeBoxUp], beats * BEAT, g * I.themeBox));
    }
  }
  for (let b = I.rockFrom; b < MUSIC.introBars; b++) rock(list, b, I.chords[b], I.rockVel);
  return list;
}

export function wakeCue(app) {
  const W = WAKE_CUE;
  const list = W.events.map(([t, voice, notes, dur, vel, pan]) => ev(t, voice, notes, dur, vel, pan));
  W.chime.times.forEach((t, i) => list.push(ev(t, 'box', [W.chime.notes[i % W.chime.notes.length]], 1, W.chime.vel)));
  if (app.flowers.daily.some((f) => f.isNew)) {
    W.newFlower.notes.forEach((n, i) => list.push(ev(W.newFlower.at + i * W.newFlower.step, 'celesta', [n], 1, W.newFlower.vel)));
  }
  for (let b = W.rockFrom; b < MUSIC.wakeBars; b++) rock(list, b, W.chords[b], W.rockVel);
  return list;
}

// One bar after the intro: the finale bars, then the lullaby arranged by pass
// and by what the scene is doing (asleep it thins, the heart takes the melody).
export function barEvents(mode, b, opts) {
  const list = [];
  const start = lullabyStart(mode);
  if (b < start) {
    if (mode === 'full' && b >= MUSIC.introBars) rock(list, b, HEART_CUE.finaleChords[b - MUSIC.introBars], HEART_CUE.finaleRock);
    return list;
  }
  const L = b - start;
  const pass = PASSES[Math.floor(L / LULLABY.length) % PASSES.length];
  const k = L % LULLABY.length;
  const [chord, melody] = LULLABY[k];
  const t0 = b * BAR;
  rock(list, b, chord, opts.dim ? SLEEP_MUSIC.rock : pass.rock);
  if (opts.dim || opts.heart) return list;
  const inB = k >= FORM.bSection[0] && k < FORM.bSection[1];
  if (pass.strings === 'all' || (pass.strings === 'B' && inB)) {
    list.push(ev(t0, 'strings', CHORDS[chord].slice(1).map((n) => n + 12), BAR, pass.stringsVel));
  }
  for (const [beat, n, beats, g] of melody) {
    const t = t0 + beat * BEAT;
    if (pass.melody === 'piano') list.push(ev(t, 'piano', [n], beats * BEAT, g));
    if (pass.melody === 'box') list.push(ev(t, 'box', [n + 12], beats * BEAT, g * pass.boxVel));
    if (pass.box === 'double-last' && k >= FORM.lastSection) list.push(ev(t, 'box', [n + 12], beats * BEAT, g * pass.boxVel, pass.boxPan));
  }
  if (pass.box === 'echo' && k % 2 === 0 && melody.length) {
    const [beat, n, beats, g] = melody[0];
    list.push(ev(t0 + (beat + pass.echoBeats) * BEAT, 'box', [n + 12], beats * BEAT, g * pass.boxVel));
  }
  if (pass.box === 'harp-ends' && k % pass.phrase === pass.phrase - 1) {
    run(list, 'harp', t0 + pass.harpAt * BEAT, pass.harpBeats * BEAT, chordTones(chord, pass.harpBase).concat(chordTones(chord, pass.harpBase + 12)), pass.harpVel);
  }
  return list;
}

// The heart's own cue, from the moment of release at show time sR.
export function heartCue(sR, chord) {
  const C = HEART_CUE;
  const list = [];
  C.bloom.notes.forEach((n, i) => list.push(ev(sR + i * C.bloom.roll, 'piano', [n], BAR, C.bloom.vel)));
  list.push(ev(sR, 'strings', chordTones(chord, C.bloom.stringsBase), C.bloom.strings, C.bloom.stringsVel));
  run(list, 'harp', sR + C.fly.from, C.fly.dur, C.fly.notes, C.fly.vel, C.fly.pan);
  const first = Math.ceil((sR + T_HOLD) / BEAT) * BEAT;
  for (let t = first; t < sR + T_FADE; t += BEAT) {
    list.push(ev(t, 'piano', C.lub, BEAT, C.lubVel));
    list.push(ev(t + C.dubAt * BEAT, 'piano', C.dub, BEAT, C.dubVel));
  }
  for (const [beat, n, beats] of C.motif.notes) list.push(ev(first + beat * BEAT, 'box', [n], beats * BEAT, C.motif.vel));
  const F = C.fade;
  F.notes.forEach((n, i) => list.push(ev(sR + F.from + i * F.step, 'box', [n], 1, F.vel[0] + (F.vel[1] - F.vel[0]) * (i / (F.notes.length - 1)))));
  list.push(ev(sR + F.chordAt, 'piano', F.chord, BAR, F.chordVel));
  return list;
}

// While she holds the flower: a rising shimmer that stops if she lets go early.
export function chargeCue(sC) {
  const S = HEART_CUE.shimmer;
  return S.notes.map((n, i) => ev(sC + i * S.step, 'box', [n], 1, S.vel[0] + (S.vel[1] - S.vel[0]) * (i / (S.notes.length - 1)), 0));
}

// The sleep timer's goodbye, at a bar line.
export function closeCue(t) {
  const C = SLEEP_MUSIC.close;
  const list = C.chord.map((n, i) => ev(t + i * C.roll, 'piano', [n], BAR * 2, C.vel));
  C.box.forEach((n, i) => list.push(ev(t + (i + 1) * C.step, 'box', [n], 1, C.boxVel)));
  return list;
}

