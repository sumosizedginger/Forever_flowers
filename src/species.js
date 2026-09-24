// One place that knows how to draw each kind of head, its cache key and its
// reach. Roses, cosmos, daisies and the small wildflowers.
import { SHAPE } from './config.js';
import { CUP, FAVS } from './config-garden.js';
import { drawRose, roseColors, roseKey } from './rose.js';
import { drawWild, wildKey } from './wild.js';
import { drawCosmos, drawDaisy, favKey } from './favs.js';

export function drawHead(g, f, open, theme) {
  if (f.species === 'rose') {
    if (f.colTheme !== theme.name || f.colGold !== f.gold) {
      f.col = roseColors(theme, f.colorName, f.gold);
      f.colTheme = theme.name;
      f.colGold = f.gold;
    }
    drawRose(g, f, f.r, open, f.col, theme);
  } else if (f.species === 'cosmos') drawCosmos(g, f, f.r, open, theme);
  else if (f.species === 'daisy') drawDaisy(g, f, f.r, open, theme);
  else drawWild(g, f, f.r, open, theme);
}

export function headKey(f, open, theme) {
  if (f.species === 'rose') return roseKey(f, open, theme);
  if (f.species === 'cosmos' || f.species === 'daisy') return favKey(f, open, theme);
  return wildKey(f, open, theme);
}

// How far the open head reaches, as a multiple of its radius.
export function headExtent(f) {
  if (f.species === 'rose') return CUP.ext;
  if (f.species === 'cosmos') return FAVS.cosmos.open[1] * FAVS.cosmos.reach;
  if (f.species === 'daisy') return FAVS.daisy.open[1];
  return SHAPE.wild[f.type].len;
}

// Wildflowers pop from nothing; the others show a bud while closed.
export const hasBud = (f) => f.species !== 'wild';
