// Posing and lighting a flower head: the rotation that turns it to face its
// own way, and the shading of a surface by the time of day's key light, sky
// light and rim. Views: x right, y toward her, z up.
import { PETAL, LIGHTS } from './config-flora.js';
import { lerp, hexToRgb } from './util.js';

// ---- pose ----
// pitch tips the axis from straight up toward her, yaw turns it left or right.
export function makePose(pitch, yaw) {
  const sp = Math.sin(pitch);
  const a = [sp * Math.sin(yaw), sp * Math.cos(yaw), Math.cos(pitch)];
  const h = Math.abs(a[2]) < PETAL.poleGuard ? [0, 0, 1] : [0, 1, 0];
  let e1 = [h[1] * a[2] - h[2] * a[1], h[2] * a[0] - h[0] * a[2], h[0] * a[1] - h[1] * a[0]];
  const n = Math.hypot(e1[0], e1[1], e1[2]) || 1;
  e1 = [e1[0] / n, e1[1] / n, e1[2] / n];
  const e2 = [a[1] * e1[2] - a[2] * e1[1], a[2] * e1[0] - a[0] * e1[2], a[0] * e1[1] - a[1] * e1[0]];
  return { x: e1, y: e2, z: a };
}

export function view(M, x, y, z, out, o) {
  out[o] = M.x[0] * x + M.y[0] * y + M.z[0] * z;
  out[o + 1] = M.x[1] * x + M.y[1] * y + M.z[1] * z;
  out[o + 2] = M.x[2] * x + M.y[2] * y + M.z[2] * z;
}

// ---- color ----
export const rgbOf = (hex) => hexToRgb(hex);

// The scene's light for a time of day, ready for shading.
export function makeLight(tod) {
  const L = LIGHTS[tod] || LIGHTS.night;
  const n = Math.hypot(L.dir[0], L.dir[1], L.dir[2]);
  return {
    ...L, dir: L.dir.map((v) => v / n),
    rimRgb: rgbOf(L.rimColor), skyRgb: rgbOf(L.sky), groundRgb: rgbOf(L.ground),
  };
}
export const cap = (c) => {
  const mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]);
  const l = (mx + mn) / 510;
  if (l <= PETAL.capL) return c;
  const k = PETAL.capL / l;
  return [c[0] * k, c[1] * k, c[2] * k];
};
export const css = (c, a) => {
  const [r, g, b] = cap(c);
  return a === undefined ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`;
};
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Light a surface color. N is the view space normal of the side she sees.
export function shade(alb, nx, ny, nz, light, mat) {
  const [lx, ly, lz] = light.dir;
  const ndl = nx * lx + ny * ly + nz * lz;
  const lam = ndl > 0 ? ndl : 0;
  const tr = ndl < 0 ? -ndl * mat.trans : 0;
  const amb = lerp(light.ambLow, light.ambTop, (nz + 1) / 2);
  const k = light.key;
  let c;
  if (mat.metal) {
    // metal: dark where it faces away, the sky mirrored above, a sharp highlight
    const env = nz > 0 ? light.skyRgb : light.groundRgb;
    const hy = ly + 1, hn = Math.hypot(lx, hy, lz);
    const spec = Math.pow(Math.max(0, (nx * lx + ny * hy + nz * lz) / hn), mat.metal.pow) * mat.metal.spec;
    const f = mat.metal.dark + mat.metal.lit * lam;
    c = [alb[0] * f, alb[1] * f, alb[2] * f];
    c = mixc(c, env, mat.metal.env * (0.5 + 0.5 * nz));
    c = mixc(c, mat.metal.hiRgb, Math.min(1, spec));
  } else {
    const f = amb + k * (lam + tr);
    if (mat.gloss) {
      const hy = ly + 1, hn = Math.hypot(lx, hy, lz);
      const sp = Math.pow(Math.max(0, (nx * lx + ny * hy + nz * lz) / hn), PETAL.glossPow) * mat.gloss;
      return shadeRim(mixc([alb[0] * f, alb[1] * f, alb[2] * f], light.rimRgb, Math.min(1, sp)), alb, nx, ny, nz, light, mat);
    }
    c = [alb[0] * f * lerp(1, light.keyRgb[0], lam * k), alb[1] * f * lerp(1, light.keyRgb[1], lam * k), alb[2] * f * lerp(1, light.keyRgb[2], lam * k)];
  }
  return shadeRim(c, alb, nx, ny, nz, light, mat);
}

// A thin rim where the surface turns away from her toward the light, colored by the surface.
function shadeRim(c, alb, nx, ny, nz, light, mat) {
  const [lx, , lz] = light.dir;
  const edge = 1 - Math.abs(ny);
  const toward = nx * lx + nz * lz;
  if (toward > 0 && mat.rim > 0) {
    const a = Math.min(1, mat.rim * light.rim * edge * edge * toward);
    const R = light.rimRgb;
    c = [c[0] + (R[0] * alb[0] / 255) * a, c[1] + (R[1] * alb[1] / 255) * a, c[2] + (R[2] * alb[2] / 255) * a];
  }
  return c;
}
