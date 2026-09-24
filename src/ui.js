// The only interface: two quiet round buttons, sound and replay, top right.
// Hidden during the intro, real buttons with labels and keyboard focus.
import { UI, BEATS, PALETTE } from './config.js';
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

  const el = document.getElementById('ui');
  const snd = document.getElementById('snd');
  const rep = document.getElementById('rep');
  // The first touch while dim only wakes, buttons included.
  el.addEventListener('pointerdown', () => {
    app.input.idle = 0;
    if (app.state === 'DIM') wake(app);
  }, true);
  const blocked = () => {
    if (app.state === 'DIM') { wake(app); return true; }
    return app.clock.T < app.input.ignoreUntil;
  };
  const sync = () => {
    const on = !!(app.audio && app.audio.on);
    snd.setAttribute('aria-pressed', on ? 'true' : 'false');
    snd.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
  };
  snd.addEventListener('click', () => {
    if (blocked()) return;
    app.input.idle = 0;
    if (app.audio) app.audio.setOn(!app.audio.on);
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
  }
  const dim = app.state === 'DIM';
  if (dim !== ui.dim) {
    ui.dim = dim;
    ui.el.classList.toggle('dim', dim);
  }
}
