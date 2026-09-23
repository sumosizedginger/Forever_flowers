// Boot and render loop.
import { LAYOUT } from './config.js';
import { readParams } from './params.js';

const params = readParams(location.search);
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });

function size() {
  const dpr = Math.min(window.devicePixelRatio || 1, LAYOUT.dprMax);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
size();
addEventListener('resize', size);
if (params.test) window.__ff = { state: 'INTRO' };
