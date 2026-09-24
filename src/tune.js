// With ?tune only: sliders for the eight constants that shape the feel. They
// write straight into TUNE, so every change applies live. The copy button puts
// the values on the clipboard as JSON to paste back into config.js.
import { TUNE, TUNE_RANGES } from './config.js';

const LABELS = {
  bloomStagger: 'bloom stagger', bloomDuration: 'bloom duration', overshoot: 'overshoot',
  swayAmp: 'sway amplitude', swaySpeed: 'sway speed', glow: 'glow intensity',
  petalFall: 'petal fall rate', exhale: 'exhale strength',
};

function copyText(text, done) {
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* nothing else to try */ }
    ta.remove();
    done();
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  } catch (e) { fallback(); }
}

export function setupTune(app) {
  if (!app.params.tune) return null;
  const panel = document.createElement('div');
  panel.id = 'tune';
  const rows = {};
  for (const key of Object.keys(TUNE)) {
    const [min, max, step] = TUNE_RANGES[key];
    const row = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = LABELS[key] || key;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(TUNE[key]);
    const out = document.createElement('output');
    out.textContent = String(TUNE[key]);
    input.addEventListener('input', () => {
      TUNE[key] = parseFloat(input.value);
      out.textContent = input.value;
    });
    row.append(name, input, out);
    panel.appendChild(row);
    rows[key] = input;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'copy JSON';
  btn.addEventListener('click', () => {
    copyText(JSON.stringify(TUNE, null, 2), () => {
      btn.textContent = 'copied';
      setTimeout(() => { btn.textContent = 'copy JSON'; }, 1200);
    });
  });
  panel.appendChild(btn);
  for (const t of ['pointerdown', 'pointerup', 'pointermove']) panel.addEventListener(t, (e) => e.stopPropagation());
  document.body.appendChild(panel);
  return { panel, rows };
}
