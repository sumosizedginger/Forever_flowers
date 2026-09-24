// Butterflies by day and luna moths at night. Wing outlines are [x, y]
// multiples of the wing size from the body: bezier control, control, end.
// Flight and perching times are seconds, distances flower units U.

export const WINGS = {
  px: 96, spanU: 0.52,
  flapHz: [4.5, 6], fold: 0.22, perchFlap: { hz: 0.35, min: 0.35, pow: 0.6 },
  // a flight arcs over the field, never through a bloom; perches last a few seconds
  speedU: [1.2, 1.7], minFly: 1.6, liftU: [0.9, 1.6], liftK: 0.35, clearU: 0.9,
  perch: [3.2, 7.5], perchLift: 0.22, legs: 40, bodyTilt: [-0.35, 0.35],
  flutter: [[2.3, 0.1], [1.1, 0.08]], enterY: 0.52, enterU: 2.2, poolGapU: 0.35, minHop: 1.2,
  body: { w: 0.075, l: 0.46, head: 0.07, antenna: 0.34, antennaW: 1.1, club: 0.035, bend: 0.3 },
  edge: 0.07, edgeAlpha: 0.85, veinAlpha: 0.22, veinW: 1.4, glowAlpha: 0.12, glowU: 1,
  // day: forewing and hindwing, then marginal spots
  butterfly: {
    fore: [[0.25, -0.95], [0.95, -1.12], [1.02, -0.52], [0.72, 0.02]],
    hind: [[0.62, 0.12], [0.98, 0.5], [0.72, 0.92], [0.18, 0.62]],
    spots: [[0.82, -0.62], [0.72, -0.34], [0.66, 0.62], [0.48, 0.74]], spotR: 3.2, spotAlpha: 0.75,
    rootDark: 0.35, flushAt: 0.7, edgeDark: 0.55, body: '#3A2436',
  },
  // night: luna moths, pale green with long tails, a maroon leading edge and eyespots
  moth: {
    colors: [['#CDEBC4', '#9FD3A6'], ['#C4E8D2', '#96CFB2']],
    fore: [[0.3, -0.88], [0.88, -1.02], [0.98, -0.62], [0.66, 0.02]],
    hind: [[0.66, 0.16], [0.82, 0.56], [0.62, 1.62], [0.14, 0.52]],
    costa: '#7A4A68', costaW: 5, eye: '#E8D27A', eyeRing: '#6A4A5A', eyes: [[0.5, -0.36, 0.09], [0.4, 0.4, 0.08]],
    body: '#EDE6DA', glow: '#DCEFD6',
  },
};
