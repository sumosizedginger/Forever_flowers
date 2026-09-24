// The ground and the air: foreground grass, mist lying in the valleys, and the
// lens layer of soft out of focus leaves, flowers and lights low in the corners.
// Sizes are in flower units U, positions fractions of width and height.

export const GRASS = {
  perPx: 1.6, hU: [0.24, 1.2], wU: [0.022, 0.05], nearWide: 1.8, rootY: [0.872, 1.03], rootPow: 1.5,
  // back to front: [mix toward the light green, darken toward the ground]
  shades: [[0.85, 0.04], [0.62, 0.14], [0.4, 0.26], [0.2, 0.38]],
  tipMix: [0.24, 0.19, 0.14, 0.1], shineMix: 0.14, shineOver: 1.24, tip: 0.28,
  curve: [-0.28, 0.28], swayU: 0.06, swayHz: [0.25, 0.5],
  clumpSpreadU: 0.3, clumpHU: [0.55, 1.1], clumpRootY: [0.876, 0.9],
  bowLean: 0.5, gustLean: 0.55, tipCurve: 0.5, bendCurve: 0.35, edge: 0.3,
  stillShades: 3, liveMax: 520,   // far rows drawn once; the moving row capped
};

// Mist in the valleys between the hills: [x, y, half width (of W), half height (of H), alpha].
export const MIST = {
  banks: [[0.22, 0.752, 0.32, 0.018, 1], [0.72, 0.758, 0.36, 0.02, 0.9], [0.5, 0.79, 0.6, 0.016, 0.7], [0.1, 0.8, 0.25, 0.012, 0.6]],
  alpha: { night: 0.2, dawn: 0.34, day: 0.26, eve: 0.26 },
};

// Out of focus foreground: blades and two flowers right at the lens, rendered
// small and scaled up so they blur, tinted by the time of day, never black.
export const LENS = {
  fronds: [[-0.03, 1.01, 0.42, 2.7], [0.07, 1.03, 0.18, 2.1], [0.95, 1.02, -0.3, 2.4], [1.03, 1, -0.5, 2.9]],
  frondSway: 0.04, frondHz: 0.11,
  small: [10, 34], sprite: [60, 200],     // blade rendered at small, drawn into sprite size: the blur
  night: { mix: 0.35, lift: 0.1, rim: 0.3 }, day: { mix: 0.5, lift: 0.28, rim: 0.2 },
  flowers: [
    { species: 'daisy', x: 0.04, y: 0.985, rU: 1.05, rot: 0.3 },
    { species: 'cosmos', x: 0.97, y: 0.975, rU: 1.2, rot: -0.4 },
  ],
  flowerPx: 14, flowerAlpha: { night: 0.7, day: 0.62 }, flowerSway: 0.03, flowerHz: 0.09,
  bokeh: 7, bokehU: [0.3, 0.75], bokehAlpha: [0.08, 0.16], bokehY: [0.88, 0.99], bokehHz: [0.015, 0.04], bokehDriftU: 1.2,
  bokehColors: { night: ['#FFE08A', '#C9B3F2', '#F7B6DA'], day: ['#FFF1E4', '#FFE08A'] },
};

export const GROUND = { lift: 0.35, fade: 0.2 };

// The finish: a soft darkening toward the edges in the sky's own deepest color,
// and a fine grain in the sky so its gradient never breaks into bands.
export const FINISH = {
  vignettePx: 64, inner: 0.52, darken: 0.45, alpha: { night: 0.34, dawn: 0.22, day: 0.14, eve: 0.24 },
  grain: 1.5,
};
