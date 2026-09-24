// Web Audio only, no files, off until she turns it on. Bells are a sine plus an
// inharmonic partial through a feedback delay into a lowpass; a soft triangle
// pad drifts through C, Am, F, G underneath.
import { AUDIO, BEATS, WAKE, TUNE, FANTASY } from './config.js';
import { wakeStart } from './choreo.js';

export function makeAudio(app) {
  const A = AUDIO;
  let ctx = null;
  let master, bells, padBus;
  let on = false;
  let nextChord = 0, chordIdx = 0, padVoices = [];

  function init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = A.lowpass;
    lp.connect(master);
    bells = ctx.createGain();
    bells.connect(lp);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = A.delay;
    const fb = ctx.createGain();
    fb.gain.value = A.feedback;
    bells.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(lp);
    const padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass';
    padLp.frequency.value = A.pad.lowpass;
    padBus = ctx.createGain();
    padBus.gain.value = A.pad.gain;
    padLp.connect(padBus);
    padBus.connect(master);
    padBus.input = padLp;
    return true;
  }

  // One bell voice; the two partials together never exceed the voice ceiling.
  function bell(name, scale, when) {
    if (!on || !ctx) return;
    const f = A.notes[name];
    if (!f) return;
    const t = Math.max(ctx.currentTime, when || 0);
    const peak = Math.min(A.bellGain * (scale || 1), A.voiceMax);
    const parts = [[1, 1], [A.partial, A.partialGain]];
    const sum = parts.reduce((s, p) => s + p[1], 0);
    for (const [ratio, g] of parts) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * ratio;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime((peak * g) / sum, t + A.attack);
      env.gain.exponentialRampToValueAtTime(A.floor, t + A.attack + A.decay);
      osc.connect(env);
      env.connect(bells);
      osc.start(t);
      osc.stop(t + A.attack + A.decay + A.tail);
    }
  }

  function arp(names, spacing, scale) {
    if (!on || !ctx) return;
    names.forEach((n, i) => bell(n, scale, ctx.currentTime + i * spacing));
  }

  function chord(freqs, at) {
    const P = A.pad;
    const voices = freqs.map((fr, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = fr;
      osc.detune.value = (i - 1) * P.detune;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(1 / freqs.length, at + P.attack);
      osc.connect(g);
      g.connect(padBus.input);
      osc.start(at);
      return { osc, g };
    });
    for (const v of padVoices) {
      v.g.gain.cancelScheduledValues(at);
      v.g.gain.setValueAtTime(v.g.gain.value, at);
      v.g.gain.linearRampToValueAtTime(0, at + P.release);
      v.osc.stop(at + P.release + A.tail);
    }
    padVoices = voices;
  }

  function tickPad() {
    if (!on || !ctx) return;
    const now = ctx.currentTime;
    if (now + A.lookahead >= nextChord) {
      chord(A.chords[chordIdx % A.chords.length], Math.max(now, nextChord));
      chordIdx++;
      nextChord = Math.max(now, nextChord) + A.pad.chordS;
    }
  }

  function setOn(v) {
    if (v && !ctx && !init()) return false;
    on = v;
    if (!ctx) return false;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    if (v) {
      if (ctx.state !== 'running') ctx.resume();
      master.gain.linearRampToValueAtTime(A.master, now + A.fadeS);
      nextChord = now;
    } else {
      master.gain.linearRampToValueAtTime(0, now + A.fadeS);
    }
    return on;
  }

  // Notes tied to the show: the rose phrase, wildflower shimmer, the fantasy arpeggio.
  function showEvents() {
    const list = [];
    const fl = app.flowers;
    const wake = app.show.mode === 'wake';
    const byOrder = fl.roses.slice().sort((a, b) => a.order - b.order);
    byOrder.forEach((f, j) => {
      const at = wake ? wakeStart(f.order, fl.roses.length) : BEATS.roseBloom.start + j * TUNE.bloomStagger;
      list.push([at, () => bell(A.rosePhrase[j % A.rosePhrase.length])]);
    });
    fl.wilds.forEach((f) => {
      const at = wake ? wakeStart(f.order, fl.wilds.length) : BEATS.wildPop.start + f.order * BEATS.wildPop.stagger;
      list.push([at, () => bell(A.scale[f.order % A.scale.length], A.wildScale)]);
    });
    const fAt = wake ? WAKE.fantasy[0] : BEATS.fantasyOpen.start;
    list.push([fAt, () => arp(A.fantasyArp, A.fantasySpacing)]);
    return list;
  }

  function step() {
    tickPad();
    if (!on) return;
    const s = app.s, prev = app.prevS;
    if (s <= prev) return;
    for (const [at, play] of showEvents()) if (prev < at && s >= at && s - at < A.pingWindow) play();
  }

  const pickNote = () => A.scale[Math.floor(app.live.next() * A.scale.length)];

  return {
    get on() { return on; },
    setOn,
    step,
    suspend(hidden) {
      if (!ctx) return;
      if (hidden) ctx.suspend();
      else if (on) ctx.resume();
    },
    tap: () => bell(pickNote()),
    gold: () => arp(A.goldChime, A.goldSpacing),
    fantasy: () => arp(A.fantasyArp, A.fantasySpacing),
    shake: () => arp(A.shakeNotes, A.goldSpacing, A.wildScale),
    plant: () => bell(pickNote(), A.wildScale),
    star: () => bell(A.starNote, A.wildScale),
    nova: () => arp(A.novaChord, A.novaSpacing),
  };
}
