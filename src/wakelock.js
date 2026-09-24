// Keep the screen on while she is watching; let it go once the field has slept
// for a while, so a phone left on the pillow can still turn itself off.
export function makeWakeLock() {
  return { sentinel: null, want: false, pending: false, state: 'none' };
}

export function holdAwake(app, want) {
  const w = app.wake;
  w.want = want;
  const api = typeof navigator !== 'undefined' ? navigator.wakeLock : null;
  if (!api || typeof api.request !== 'function') { w.state = 'unsupported'; return; }
  if (want) {
    if (w.sentinel || w.pending || document.visibilityState !== 'visible') return;
    w.pending = true;
    let req;
    try { req = api.request('screen'); } catch (e) { w.pending = false; w.state = 'denied'; return; }
    req.then((s) => {
      w.pending = false;
      w.sentinel = s;
      w.state = 'held';
      s.addEventListener('release', () => { if (w.sentinel === s) w.sentinel = null; w.state = 'released'; });
      if (!w.want) holdAwake(app, false);
    }).catch(() => { w.pending = false; w.state = 'denied'; });
  } else if (w.sentinel) {
    const s = w.sentinel;
    w.sentinel = null;
    w.state = 'released';
    s.release().catch(() => { /* already released */ });
  }
}
