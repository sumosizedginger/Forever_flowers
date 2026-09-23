// Composition from the brief: U = min(w / 9, h / 12), ground at 88%, the
// fantasy head near 34%, the moon at 82% across and 14% down clear of the buttons.
import { LAYOUT, UI } from './config.js';

export function readSafe(el) {
  const cs = getComputedStyle(el);
  const px = (v) => parseFloat(v) || 0;
  return { t: px(cs.paddingTop), r: px(cs.paddingRight), b: px(cs.paddingBottom), l: px(cs.paddingLeft) };
}

export function computeLayout(W, H, safe) {
  const sw = W - safe.l - safe.r;
  const sh = H - safe.t - safe.b;
  const U = Math.min(sw / LAYOUT.unitW, sh / LAYOUT.unitH);
  const cx = safe.l + sw / 2;
  const fieldW = Math.min(sw * LAYOUT.fieldSpan, U * LAYOUT.fieldMaxU);
  const wildW = Math.min(sw * LAYOUT.wildSpan, U * LAYOUT.wildSpanMaxU);

  const right = W - safe.r - UI.margin;
  const top = safe.t + UI.margin;
  const zone = {
    x0: right - UI.size * 2 - UI.gap - UI.zonePad,
    y0: top - UI.zonePad,
    x1: right + UI.zonePad,
    y1: top + UI.size + UI.zonePad,
  };

  const mr = U * LAYOUT.moon.rU;
  const clear = mr + LAYOUT.moon.clearPx;
  let mx = W * LAYOUT.moon.x;
  let my = H * LAYOUT.moon.y;
  const hits = (x, y) => x + clear > zone.x0 && x - clear < zone.x1 && y + clear > zone.y0 && y - clear < zone.y1;
  if (hits(mx, my)) {
    const below = zone.y1 + clear;
    if (below < H * LAYOUT.branch.maxY) my = below;
    else mx = zone.x0 - clear;
  }
  mx = Math.min(Math.max(mx, safe.l + clear), W - safe.r - clear);
  my = Math.max(my, safe.t + clear);

  return {
    W, H, U, safe, sw, sh, cx,
    portrait: H >= W,
    groundY: H * LAYOUT.groundY,
    horizonY: H * LAYOUT.horizonY,
    fieldL: cx - fieldW / 2, fieldW,
    wildL: cx - wildW / 2, wildW,
    minX: safe.l + LAYOUT.edgeMarginPx,
    maxX: W - safe.r - LAYOUT.edgeMarginPx,
    minY: safe.t + LAYOUT.edgeMarginPx,
    zone,
    moon: { x: mx, y: my, r: mr },
    fantasy: { x: cx, headY: H * LAYOUT.fantasyY },
  };
}

// Keep a head of radius r (plus sway headroom) inside the safe viewport.
export function clampHeadX(L, x, r, headroom) {
  return Math.min(Math.max(x, L.minX + r + headroom), L.maxX - r - headroom);
}
