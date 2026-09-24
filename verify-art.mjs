// Harness checks that look at the picture the way a person would, plus the
// garden and sleep checks, split out of verify.mjs to keep it short.
// Each takes the harness helpers: { open, check, ffv, sleep, PHONE, DESK, WIDE }.

// The garden: one flower per day, eight in the middle then the far meadow, capped at 120.
// Asleep: the field folds and dims, the fantasy flower stays lit, frames drop to half rate.
export async function gardenAndSleep({ open, check, ffv, sleep, PHONE }) {
  const g = {};
  for (const d of [0, 5, 60, 500]) {
    const { page, context } = await open(PHONE, '?preview&seed=1&test&day=' + d);
    g[d] = await ffv(page, () => window.__ff.garden);
    await context.close();
  }
  const ok = g[0].days === 0 && g[5].days === 5 && g[5].mid === 5 && g[60].mid === 8 && g[60].far === 52 && g[500].days === 120;
  check('garden', 'one new flower per day: first eight mid field, then the far meadow, capped at 120', ok, { day0: g[0].days, day5: g[5], day60: g[60], day500: g[500].days });

  const { page, context } = await open(PHONE, '?preview&seed=1&test&tod=night');
  await sleep(600);
  const lum = () => page.evaluate(() => {
    const c = document.getElementById('c');
    const gc = c.getContext('2d');
    const box = (x, y, r) => {
      const d = gc.getImageData((x - r) * 2, (y - r) * 2, r * 4, r * 4).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += (Math.max(d[i], d[i + 1], d[i + 2]) + Math.min(d[i], d[i + 1], d[i + 2])) / 510;
      return s / (d.length / 4);
    };
    const f = window.__ff.fantasy;
    const r = window.__ff.heads.find((h) => h.kind === 'rose');
    return { fantasy: box(f.x, f.y, f.r * 0.4), rose: box(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3) };
  });
  const awake = await lum();
  await ffv(page, () => window.__ff.forceDim());
  await sleep(6800);
  await ffv(page, () => window.__ff.resetFrames());
  await sleep(1500);
  const slept = await lum();
  const fr = await ffv(page, () => ({ frames: window.__ff.frames(), dim: window.__ff.dim, low: window.__ff.lowPower }));
  const keep = slept.fantasy / awake.fantasy, fold = slept.rose / awake.rose;
  check('sleep', 'asleep, the field dims and the fantasy flower stays lit as a nightlight', fr.dim === 1 && keep > 0.85 && fold < 0.9, { fantasyKept: +keep.toFixed(2), roseKept: +fold.toFixed(2) });
  check('sleep', 'asleep, frames drop to half rate', fr.low === true && fr.frames.median > 25, { median: +fr.frames.median.toFixed(1), low: fr.low });
  await context.close();
}

// What a numbers-only harness misses: small flowers growing out of tall stems,
// butterflies crowding each other or flying through the glass flower, black
// cutouts under a light sky, and flowers that all face the same way.
export async function artChecks({ open, check, ffv, PHONE, DESK, WIDE }) {
  for (const [vp, label] of [[PHONE, '390x844'], [DESK, '1280x800'], [WIDE, '1864x953']]) {
    const { page, context } = await open(vp, '?full&seed=1&test&tod=night&t=40');
    const st = await ffv(page, () => window.__ff.stems);
    const bad = [];
    for (const f of st.small) {
      for (const x of st.heroes) {
        const gap = Math.max(0.42 * st.U, 1.05 * f.r);
        if (Math.abs(f.x - x) < gap * 0.98) bad.push({ kind: f.kind, x: Math.round(f.x), stem: Math.round(x) });
      }
    }
    check('art', `${label}: no small flower grows out of a tall stem`, bad.length === 0, bad.length ? bad.slice(0, 5) : { small: st.small.length });
    // five minutes of flight, sampled four times a second
    const fly = await ffv(page, () => {
      const f = window.__ff.heads.find((h) => h.kind === 'fantasy');
      const inner = { x: f.x + f.w * 0.1, y: f.y + f.h * 0.1, w: f.w * 0.8, h: f.h * 0.8 };
      let through = 0, minSep = Infinity, n = 0;
      for (let s = 20; s < 320; s += 0.25) {
        const b = window.__ff.butterfliesAt(s).filter(Boolean);
        for (const p of b) if (p.x > inner.x && p.x < inner.x + inner.w && p.y > inner.y && p.y < inner.y + inner.h) through++;
        if (b.length === 2) minSep = Math.min(minSep, Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y));
        n++;
      }
      return { through, minSep: Math.round(minSep), samples: n, U: Math.round(window.__ff.stems.U) };
    });
    check('art', `${label}: butterflies keep apart and never fly through the glass flower`, fly.through === 0 && fly.minSep >= fly.U, fly);
    await context.close();
  }
  // under a light sky the grass, leaves and the out of focus corners stay green, never near black
  for (const [vp, label, tod] of [[PHONE, '390x844', 'day'], [WIDE, '1864x953', 'day'], [PHONE, '390x844', 'dawn']]) {
    const { page, context } = await open(vp, `?full&seed=1&test&tod=${tod}&t=40`);
    const low = await page.evaluate(() => {
      const c = document.getElementById('c');
      const y0 = Math.floor(c.height * 0.7);
      const d = c.getContext('2d').getImageData(0, y0, c.width, c.height - y0).data;
      const ls = [];
      for (let i = 0; i < d.length; i += 16) ls.push((Math.max(d[i], d[i + 1], d[i + 2]) + Math.min(d[i], d[i + 1], d[i + 2])) / 510);
      ls.sort((a, b) => a - b);
      return +ls[Math.floor(ls.length * 0.01)].toFixed(3);
    });
    check('art', `${label} ${tod}: nothing near black low in the field under a light sky`, low >= 0.12, { darkest1pct: low });
    await context.close();
  }
  // the roses, cosmos and daisies each face their own way
  const { page, context } = await open(PHONE, '?full&seed=1&test&tod=night&t=40');
  const poses = await ffv(page, () => window.__ff.poses);
  const sd = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };
  const yawSd = sd(poses.map((p) => p.yaw)), pitchSd = sd(poses.map((p) => p.pitch));
  check('art', 'the flowers face their own ways', yawSd > 0.2 && pitchSd > 0.1, { yawSd: +yawSd.toFixed(2), pitchSd: +pitchSd.toFixed(2), n: poses.length });
  await context.close();
}
