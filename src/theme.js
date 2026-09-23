// Time of day. Night is the hero palette; the others tint the field toward
// their sky and stay soft and dim.
import { TOD, PALETTE } from './config.js';
import { mix, safe } from './util.js';

const ORDER = ['night', 'dawn', 'day', 'eve'];

export function todFromHour(h) {
  for (const name of ORDER) {
    const [a, b] = TOD.hours[name];
    if (a < b ? h >= a && h < b : h >= a || h < b) return name;
  }
  return 'night';
}

export function currentTod(params) {
  return params.tod || todFromHour(new Date().getHours());
}

export function buildTheme(name) {
  const th = TOD.themes[name];
  const tint = (hex) => (th.tintAmt > 0 ? mix(hex, th.tint, th.tintAmt) : safe(hex));
  const roses = {};
  for (const k of Object.keys(PALETTE.roses)) roses[k] = tint(PALETTE.roses[k]);
  return {
    name,
    ...th,
    tint,
    roses,
    wild: PALETTE.wild.map(tint),
    wildCenter: PALETTE.wildCenter.map(tint),
    sakuraEdge: tint(PALETTE.sakuraEdge), sakuraCenter: tint(PALETTE.sakuraCenter),
    stamen: tint(PALETTE.stamen), branch: tint(PALETTE.branch),
    grass: th.grass.map(safe), leaf: th.leaf.map(safe), stem: safe(th.stem),
  };
}
