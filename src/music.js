// The music, off until she turns it on. A scheduler reads the score in show
// time a moment ahead and hands each note to the synth at an exact audio time,
// so the heart's lub-dub and the roses land on the beat. Touches answer
// straight away in the chord that is playing.
import { MUSIC, TAPS, VOICES } from './config-music.js';
import { INPUT } from './config.js';
import { lerp, makeRng } from './util.js';
import { makeSynth, piano, musicBox, harp, strings, celesta } from './synth.js';
import { BAR, chordAt, chordTones, introCue, wakeCue, barEvents, heartCue, chargeCue, closeCue } from './score.js';

const VOICE = {
  piano: (syn, t, e) => e.notes.forEach((n) => piano(syn, t, n, e.vel, e.dur, e.pan)),
  box: (syn, t, e, cents) => e.notes.forEach((n) => musicBox(syn, t, n, e.vel, e.pan, cents)),
  harp: (syn, t, e) => e.notes.forEach((n) => harp(syn, t, n, e.vel, e.pan)),
  celesta: (syn, t, e) => e.notes.forEach((n) => celesta(syn, t, n, e.vel, e.pan)),
  strings: (syn, t, e) => strings(syn, t, e.notes, e.vel, e.dur),
};

export function makeAudio(app) {
  let syn = null;
  let on = false;
  let schedTo = 0;
  let offset = null;
  let cue = null, cueKey = null;
  let extra = [];
  let lastRelease = null, lastPress = null, closedAt = null;
  const stats = { notes: 0, bar: 0 };

  // its own randomness, so turning sound on never changes what she sees
  const rng = makeRng(app.seed ^ MUSIC.seedMix);
  const cents = () => rng.range(-1, 1) * VOICES.box.detuneCents;

  function play(e) {
    const at = e.t + offset + MUSIC.latency;
    if (at < syn.ctx.currentTime - MUSIC.lookahead) return;
    VOICE[e.voice](syn, Math.max(syn.ctx.currentTime, at), e, cents());
    stats.notes++;
  }

  // Something played right now, from a touch: show time is now, offset applies.
  function now(list) {
    if (!on || !syn) return;
    if (offset === null) offset = syn.ctx.currentTime - app.s;
    for (const e of list) play({ ...e, t: app.s + (e.t || 0) });
  }

  // a bar's events depend on the scene, so they are cached by bar and state
  const bars = new Map();
  function barList(b, opts) {
    const key = `${app.show.mode}|${app.show.start}|${b}|${opts.dim}|${opts.heart}`;
    if (!bars.has(key)) {
      if (bars.size > MUSIC.barCache) bars.clear();
      bars.set(key, barEvents(app.show.mode, b, opts));
    }
    return bars.get(key);
  }

  function showCue() {
    const key = `${app.show.mode}|${app.show.start}`;
    if (cueKey !== key) {
      cueKey = key;
      cue = app.show.mode === 'full' ? introCue(app) : wakeCue(app);
    }
    return cue;
  }

  function fade(to, dur) {
    const g = syn.master.gain;
    const t = syn.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + dur);
  }

  function setOn(v) {
    if (v && !syn) {
      syn = makeSynth();
      if (!syn) return false;
    }
    on = v;
    if (!syn) return false;
    if (v) {
      // on iPhone, let the music play even when the ringer switch is on silent
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
      if (syn.ctx.state !== 'running') syn.ctx.resume().catch(() => {});
      schedTo = app.s;
      offset = null;
      closedAt = null;
      fade(MUSIC.master, MUSIC.fadeIn);
    } else fade(0, MUSIC.fadeOut);
    return on;
  }

  function watchHeart(list, until) {
    const h = app.heart;
    const start = app.show.start;
    if (h.phase === 'charging' && h.pressT !== lastPress) {
      lastPress = h.pressT;
      list.push(...chargeCue(h.pressT - start + INPUT.chargeDelay));
    }
    if (h.phase === 'nova' && h.releaseT !== lastRelease) {
      lastRelease = h.releaseT;
      const sR = h.releaseT - start;
      list.push(...heartCue(sR, chordAt(app.show.mode, sR)));
    }
    return list.filter((e) => e.t < until + BAR * MUSIC.cueBars);
  }

  function step() {
    if (!on || !syn) return;
    const s = app.s;
    const target = syn.ctx.currentTime - s;
    if (offset === null || Math.abs(target - offset) > MUSIC.sync) offset = target;
    else offset = lerp(offset, target, MUSIC.smooth);
    if (s < schedTo - BAR) { schedTo = s; extra = []; lastRelease = null; lastPress = null; }
    if (schedTo < s) schedTo = s;
    const until = s + MUSIC.lookahead;
    if (until <= schedTo) return;
    extra = watchHeart(extra, until);
    // the sleep timer: a closing phrase on the next bar line, then quiet until she wakes it
    if (app.asleep) {
      if (closedAt === null) {
        closedAt = Math.ceil(s / BAR) * BAR;
        extra.push(...closeCue(closedAt));
        const g = syn.master.gain;
        g.setTargetAtTime(0, syn.ctx.currentTime + (closedAt - s) + BAR, MUSIC.closeFade / 3);
      }
    } else if (closedAt !== null) {
      closedAt = null;
      fade(MUSIC.master, MUSIC.fadeIn);
    }
    const inWindow = (e) => e.t >= schedTo && e.t < until;
    if (closedAt === null) {
      for (const e of showCue()) if (inWindow(e)) play(e);
      const opts = { dim: app.state === 'DIM', heart: app.heart.phase === 'nova' || app.heart.phase === 'charging' };
      for (let b = Math.max(0, Math.floor(schedTo / BAR)); b * BAR < until; b++) {
        for (const e of barList(b, opts)) if (inWindow(e)) play(e);
      }
    }
    for (const e of extra) if (inWindow(e)) play(e);
    extra = extra.filter((e) => e.t >= until);
    stats.bar = Math.floor(s / BAR);
    schedTo = until;
  }

  const chord = () => chordAt(app.show.mode, app.s);
  const pick = (list) => list[Math.floor(rng.next() * list.length)];

  return {
    get on() { return on; },
    get stats() { return { on, notes: stats.notes, bar: stats.bar, voices: syn ? syn.count : 0, state: syn ? syn.ctx.state : 'none' }; },
    setOn,
    step,
    suspend(hidden) {
      if (!syn) return;
      if (hidden) syn.ctx.suspend().catch(() => {});
      else if (on) syn.ctx.resume().catch(() => {});
    },
    tap(f) {
      const T = f && f.species === 'rose' ? TAPS.rose : TAPS.flower;
      now([{ voice: T.voice, notes: [pick(chordTones(chord(), T.octave))], dur: BAR, vel: T.vel, pan: 0 }]);
    },
    fantasy() {
      const F = TAPS.fantasy;
      now(chordTones(chord(), F.octave).map((n, i) => ({ t: i * F.step, voice: F.voice, notes: [n], dur: 1, vel: F.vel, pan: 0 })));
    },
    gold() {
      now(TAPS.gold.notes.map(([t, n, dur]) => ({ t, voice: 'celesta', notes: [n], dur, vel: TAPS.gold.vel, pan: 0 })));
    },
    shake() {
      const S = TAPS.shake;
      now(chordTones(chord(), S.octave).slice(0, S.n).map((n, i) => ({ t: i * S.step, voice: 'box', notes: [n], dur: 1, vel: S.vel, pan: -0.5 })));
    },
    plant() {
      const P = TAPS.plant;
      now([{ voice: P.voice, notes: [pick(chordTones(chord(), P.octave))], dur: BAR, vel: P.vel, pan: 0 }]);
    },
    star(x) {
      const S = TAPS.star;
      const tones = chordTones(chord(), S.top - 12).concat(chordTones(chord(), S.top)).reverse().slice(0, S.n);
      const from = x !== undefined && app.L ? (x / app.L.W) * 2 - 1 : 0;
      now(tones.map((n, i) => ({ t: (i / (tones.length - 1)) * S.dur, voice: 'harp', notes: [n], dur: 1, vel: S.vel, pan: lerp(from, -from, i / (tones.length - 1)) })));
    },
    nova() { /* the heart's cue follows the heart itself, see watchHeart */ },
  };
}
