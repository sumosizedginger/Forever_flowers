// Time of day. Night is the hero palette; the others tint the field toward
// their sky and stay soft and dim.
import { TOD, PALETTE } from './config.js';
import { FAV_PALETTE, MEADOW } from './config-garden.js';
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
    cosmos: FAV_PALETTE.cosmos.map((c) => ({ base: tint(c.base), deep: tint(c.deep), light: tint(c.light) })),
    daisy: { tip: tint(FAV_PALETTE.daisy.tip), mid: tint(FAV_PALETTE.daisy.mid), shade: tint(FAV_PALETTE.daisy.shade) },
    favCenter: FAV_PALETTE.center.map(tint), bud: safe(FAV_PALETTE.bud), moonRim: tint(FAV_PALETTE.moonRim),
    cosmosStem: safe(FAV_PALETTE.cosmosStem), daisyStem: safe(FAV_PALETTE.daisyStem), feather: safe(FAV_PALETTE.feather),
  };
}

// The far meadow sits in haze: every color leans toward the air near the hills.
export function buildHazeTheme(theme) {
  const air = mix(theme.hills, theme.horizon, MEADOW.air);
  const h = (hex) => mix(hex, air, MEADOW.haze);
  return {
    ...theme,
    name: `${theme.name}-haze`,
    wild: theme.wild.map(h), wildCenter: theme.wildCenter.map(h),
    cosmos: theme.cosmos.map((c) => ({ base: h(c.base), deep: h(c.deep), light: h(c.light) })),
    daisy: { tip: h(theme.daisy.tip), mid: h(theme.daisy.mid), shade: h(theme.daisy.shade) },
    favCenter: theme.favCenter.map(h), bud: h(theme.bud), stem: h(theme.stem), moonRim: h(theme.moonRim),
    grass: theme.grass.map(h),
  };
}
