// The only interface: two quiet round buttons, sound and replay, top right.
// Hidden during the intro, real buttons with labels and keyboard focus.
import { UI, BEATS, PALETTE, STORAGE } from './config.js';
import { store } from './life.js';
import { rgba } from './util.js';
import { wake } from './input.js';

export function setupUI(app, onReplay) {
  const css = document.documentElement.style;
  const px = (v) => `${v}px`;
  css.setProperty('--btn-size', px(UI.size));
  css.setProperty('--btn-gap', px(UI.gap));
  css.setProperty('--btn-margin', px(UI.margin));
  css.setProperty('--btn-icon', px(UI.icon));
  css.setProperty('--btn-fade', `${BEATS.buttonsFade}s`);
  css.setProperty('--btn-opacity', String(UI.opacity));
  css.setProperty('--btn-dim-opacity', String(UI.dimOpacity));
  css.setProperty('--btn-bg', rgba(PALETTE.buttonBg, UI.bgAlpha));
  css.setProperty('--btn-line', rgba(PALETTE.buttonInk, UI.lineAlpha));
  css.setProperty('--btn-ink', rgba(PALETTE.buttonInk, UI.inkAlpha));
  css.setProperty('--btn-focus', rgba(PALETTE.buttonInk, UI.focusAlpha));
  css.setProperty('--invite-dur', `${UI.invite.dur}s`);
  css.setProperty('--invite-delay', `${BEATS.buttonsFade}s`);
  css.setProperty('--invite-count', String(UI.invite.count));
  css.setProperty('--invite-bg', rgba(PALETTE.buttonInk, UI.invite.bgAlpha));
  css.setProperty('--invite-glow', rgba(PALETTE.buttonInk, UI.invite.glowAlpha));
  css.setProperty('--invite-line', rgba(PALETTE.buttonInk, UI.invite.lineAlpha));

  const el = document.getElementById('ui');
  const snd = document.getElementById('snd');
  const rep = document.getElementById('rep');
  // The first touch while dim only wakes, buttons included.
  el.addEventListener('pointerdown', () => {
    app.input.idle = 0;
    app.input.since = 0;
    if (app.state === 'DIM') wake(app);
  }, true);
  const blocked = () => {
    if (app.state === 'DIM') { wake(app); return true; }
    return app.clock.T < app.input.ignoreUntil;
  };
  const sync = () => {
    const on = !!((app.audio && app.audio.on) || app.soundWanted);
    snd.setAttribute('aria-pressed', on ? 'true' : 'false');
    snd.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  };
  snd.addEventListener('click', () => {
    if (blocked()) return;
    app.input.idle = 0;
    const want = !((app.audio && app.audio.on) || app.soundWanted);
    app.soundWanted = want;
    if (app.audio) app.audio.setOn(want);
    store.set(STORAGE.sound, want ? '1' : '0');
    if (!app.soundUsed) { app.soundUsed = true; store.set(STORAGE.soundUsed, '1'); }
    snd.classList.remove('invite');
    sync();
  });
  rep.addEventListener('click', () => {
    if (blocked()) return;
    rep.blur();
    onReplay();
  });
  sync();
  return { el, shown: false, dim: false };
}

export function updateUI(app) {
  const ui = app.ui;
  if (!ui) return;
  const show = app.introDone && app.state !== 'INTRO' && !app.params.preview;
  if (show !== ui.shown) {
    ui.shown = show;
    ui.el.classList.toggle('on', show);
    // until she has tried it once, the sound button glows softly as it appears
    if (show && !app.soundUsed) document.getElementById('snd').classList.add('invite');
  }
  const dim = app.state === 'DIM';
  if (dim !== ui.dim) {
    ui.dim = dim;
    ui.el.classList.toggle('dim', dim);
  }
}
