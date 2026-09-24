// The instruments, all synthesized: a felt piano, a music box, a soft harp,
// a celesta and warm strings, through a generated room reverb and a gentle
// limiter. Every voice schedules itself at an exact audio time and cleans up.
import { MUSIC, REVERB, VOICES } from './config-music.js';
import { clamp, lerp } from './util.js';

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function periodic(ctx, amps) {
  const real = new Float32Array(amps.length + 1);
  const imag = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => { imag[i + 1] = a; });
  return ctx.createPeriodicWave(real, imag);
}

// A small room: decaying noise that darkens as it fades, after a few early reflections.
function roomImpulse(ctx) {
  const R = REVERB;
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * R.seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let s = R.seed[c];
    let lp = 0;
    let peak = 0;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const n = s / 2147483648 - 1;
      const t = i / rate;
      lp += lerp(R.bright, R.dark, t / R.seconds) * (n - lp);
      d[i] = t < R.pre ? 0 : lp * Math.exp(-t / R.tau);
      peak = Math.max(peak, Math.abs(d[i]));
    }
    for (const [ms, g] of R.early) d[Math.floor((ms / 1000) * rate)] += g * peak;
    for (let i = 0; i < len; i++) d[i] *= R.norm / peak;
  }
  return buf;
}

// Pass a context to render offline; by default a live one is made.
export function makeSynth(given) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!given && !AC) return null;
  const ctx = given || new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = MUSIC.highpass;
  const comp = ctx.createDynamicsCompressor();
  const C = MUSIC.comp;
  comp.threshold.value = C.threshold;
  comp.knee.value = C.knee;
  comp.ratio.value = C.ratio;
  comp.attack.value = C.attack;
  comp.release.value = C.release;
  master.connect(hp);
  hp.connect(comp);
  comp.connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = MUSIC.dry;
  dry.connect(master);
  const send = ctx.createGain();
  const verb = ctx.createConvolver();
  verb.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = MUSIC.wet;
  send.connect(verb);
  verb.connect(wet);
  wet.connect(master);
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * VOICES.piano.hammerLen), ctx.sampleRate);
  const nd = noise.getChannelData(0);
  let ns = 1;
  for (let i = 0; i < nd.length; i++) { ns = (Math.imul(ns, 1664525) + 1013904223) >>> 0; nd[i] = ns / 2147483648 - 1; }
  const waves = { piano: periodic(ctx, VOICES.piano.wave), harp: periodic(ctx, VOICES.harp.wave) };
  const syn = { ctx, master, dry, send, noise, waves, count: 0 };

  // A voice's output: its own gain, a pan, then dry and reverb.
  syn.out = (pan, sendAmt) => {
    const g = ctx.createGain();
    let node = g;
    if (ctx.createStereoPanner && pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      node = p;
    }
    node.connect(dry);
    const s = ctx.createGain();
    s.gain.value = sendAmt;
    node.connect(s);
    s.connect(send);
    return g;
  };
  return syn;
}

const peakOf = (v, gain) => Math.min(gain * clamp(v, 0, 1), MUSIC.voiceMax);

// Felt piano: two gently detuned strings, a lowpass that closes as the note
// fades (the felt), a quick drop after the strike, a soft hammer.
export function piano(syn, t, midi, vel, dur, pan) {
  const P = VOICES.piano;
  const { ctx } = syn;
  const f = mtof(midi);
  const peak = peakOf(vel, P.gain);
  const out = syn.out(pan, P.send);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = P.q;
  lp.frequency.setValueAtTime(Math.min(P.cutMax, f * lerp(P.cut[0], P.cut[1], vel)), t);
  lp.frequency.setTargetAtTime(Math.max(P.cutFloor, f * P.cutEnd), t + P.attack, P.cutTau);
  const env = ctx.createGain();
  const tau = lerp(P.tau[0], P.tau[1], clamp((midi - P.tauRange[0]) / (P.tauRange[1] - P.tauRange[0]), 0, 1));
  const slowAt = t + P.attack + P.fastHold;
  const end = t + Math.max(dur, P.attack + P.fastHold);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(peak, t + P.attack);
  env.gain.setTargetAtTime(peak * P.sustain, t + P.attack, P.fastTau);
  env.gain.setTargetAtTime(0, slowAt, tau);
  env.gain.setTargetAtTime(0, end, P.release);
  lp.connect(env);
  env.connect(out);
  const stop = end + P.release * 8;
  for (const det of P.detune) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(syn.waves.piano);
    o.frequency.value = f;
    o.detune.value = det;
    o.connect(lp);
    o.start(t);
    o.stop(stop);
  }
  const n = ctx.createBufferSource();
  n.buffer = syn.noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(P.cutMax, f * P.hammerMul);
  bp.Q.value = P.hammerQ;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(peak * P.hammer, t);
  ng.gain.setTargetAtTime(0, t, P.hammerTau);
  n.connect(bp);
  bp.connect(ng);
  ng.connect(out);
  n.start(t);
  syn.count++;
}

// Sine partials with their own decays: the music box and the celesta.
function bell(syn, spec, t, midi, vel, pan, cents) {
  const { ctx } = syn;
  const f = mtof(midi) * Math.pow(2, (cents || 0) / 1200);
  const peak = Math.min(spec.gain * clamp(vel, 0, 1), MUSIC.voiceMax);
  const out = syn.out(pan, spec.send);
  const sum = spec.parts.reduce((a, p) => a + p[1], 0);
  for (const [ratio, g, decay] of spec.parts) {
    const o = ctx.createOscillator();
    o.frequency.value = f * ratio;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0, t);
    e.gain.linearRampToValueAtTime((peak * g) / sum, t + spec.attack);
    e.gain.setTargetAtTime(0, t + spec.attack, decay / 3);
    o.connect(e);
    e.connect(out);
    o.start(t);
    o.stop(t + spec.attack + decay * 3);
  }
  syn.count++;
}

export const musicBox = (syn, t, midi, vel, pan, cents) => bell(syn, VOICES.box, t, midi, vel, pan, cents);
export const celesta = (syn, t, midi, vel, pan) => bell(syn, VOICES.celesta, t, midi, vel, pan, 0);

// A soft plucked string: bright at the pluck, mellowing fast.
export function harp(syn, t, midi, vel, pan) {
  const H = VOICES.harp;
  const { ctx } = syn;
  const f = mtof(midi);
  const out = syn.out(pan, H.send);
  const o = ctx.createOscillator();
  o.setPeriodicWave(syn.waves.harp);
  o.frequency.value = f;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(VOICES.piano.cutMax, f * H.cut), t);
  lp.frequency.setTargetAtTime(f * H.cutEnd, t, H.cutTau);
  const e = ctx.createGain();
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(Math.min(H.gain * clamp(vel, 0, 1), MUSIC.voiceMax), t + H.attack);
  e.gain.setTargetAtTime(0, t + H.attack, H.tau);
  o.connect(lp);
  lp.connect(e);
  e.connect(out);
  o.start(t);
  o.stop(t + H.attack + H.tau * 8);
  syn.count++;
}

// Warm strings under a chord: detuned saws through a lowpass, with a slow vibrato.
export function strings(syn, t, notes, vel, dur) {
  const S = VOICES.strings;
  const { ctx } = syn;
  const out = syn.out(0, S.send);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = S.cut;
  lp.Q.value = S.q;
  const e = ctx.createGain();
  const peak = Math.min(S.gain * clamp(vel, 0, 2), MUSIC.voiceMax);
  e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(peak, t + Math.min(S.attack, dur / 2));
  e.gain.setValueAtTime(peak, t + Math.max(dur, S.attack));
  e.gain.linearRampToValueAtTime(0, t + Math.max(dur, S.attack) + S.release);
  lp.connect(e);
  e.connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = S.vibHz;
  const depth = ctx.createGain();
  depth.gain.value = S.vibCents;
  lfo.connect(depth);
  const stop = t + Math.max(dur, S.attack) + S.release + 0.1;
  for (const m of notes) {
    for (const side of [-1, 1]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(m);
      o.detune.value = side * S.detune;
      depth.connect(o.detune);
      o.connect(lp);
      o.start(t);
      o.stop(stop);
    }
  }
  lfo.start(t);
  lfo.stop(stop);
  syn.count++;
}
