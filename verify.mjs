// Verification harness: contact sheet, performance under 4x CPU throttling,
// interaction tests, clipping, art checks (verify-art.mjs), the
// shadowBlur/filter grep and console errors.
// Usage: node verify.mjs            (writes harness/contact.png and harness/report.json)
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { gardenAndSleep, artChecks } from './verify-art.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SITE = join(ROOT, 'site');
const OUT = join(ROOT, 'harness');
const PHONE = { width: 390, height: 844, dpr: 2 };
const DESK = { width: 1280, height: 800, dpr: 1 };
const LAND = { width: 844, height: 390, dpr: 2 };
const WIDE = { width: 1864, height: 953, dpr: 1 };   // the owner's own window
const LIMITS = { median: 20, p95: 33, lightness: 0.95 };
const TIMES = [1, 3, 6, 9, 12, 14, 16, 18];

const results = [];
const errors = [];
const check = (group, name, ok, detail) => {
  results.push({ group, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${group}: ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
};

execFileSync(process.execPath, [join(ROOT, 'build.mjs')], { stdio: 'inherit' });
mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(SITE, p);
  if (!f.startsWith(SITE) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(0);
const BASE = `http://localhost:${server.address().port}/`;

let browser;
try { browser = await chromium.launch({ channel: 'chrome', headless: true }); }
catch (e) { browser = await chromium.launch({ headless: true }); }

async function open(vp, query, ctx) {
  const context = ctx || await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr });
  const page = await context.newPage();
  const tag = query;
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${tag}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${tag}: request failed ${r.url()}`));
  page.on('request', (r) => { if (!r.url().startsWith(BASE)) errors.push(`${tag}: external request ${r.url()}`); });
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__ff && window.__ff.frames().count > 4);
  return { page, context };
}

const ffv = (page, expr) => page.evaluate(expr);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// node verify.mjs --preview : render the link preview still and stop.
if (process.argv.includes('--preview')) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`preview: ${e.message}`));
  await page.goto(BASE + '?preview&tod=night&seed=1');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(SITE, 'preview.png'), type: 'png' });
  await browser.close();
  server.close();
  console.log(errors.length ? errors.join('\n') : 'wrote site/preview.png (1200x630)');
  process.exit(errors.length ? 1 : 0);
}

// ---------- contact sheet ----------
const frames = [];
async function capture(label, vp, query, prep) {
  const { page, context } = await open(vp, query);
  if (prep) { await page.evaluate(prep); await page.waitForFunction(() => window.__ff.frames().count > 8); await sleep(120); }
  const png = await page.screenshot({ type: 'png' });
  const light = await page.evaluate(() => {
    const c = document.getElementById('c');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let over = 0, max = 0, at = 0;
    for (let i = 0; i < d.length; i += 4) {
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const l = (mx + mn) / 510;
      if (l > max) { max = l; at = i / 4; }
      if (l > 0.95) over++;
    }
    const dpr = c.width / innerWidth;
    return { max: +max.toFixed(4), over, at: [Math.round((at % c.width) / dpr), Math.round(Math.floor(at / c.width) / dpr)] };
  });
  frames.push({ label, png, vp, light });
  console.log(`      frame ${label}: max lightness ${light.max} at ${light.at}, pixels over 95%: ${light.over}`);
  await context.close();
  return light;
}

for (const t of TIMES) await capture(`t=${t}`, PHONE, `?full&seed=1&test&tod=night&t=${t}`);
await capture('1280x800 finished', DESK, '?full&seed=1&test&tod=night&t=40');
await capture('1864x953 day', WIDE, '?full&seed=1&test&tod=day&t=40');
for (const tod of ['night', 'dawn', 'day', 'eve']) await capture(tod, PHONE, `?full&seed=1&test&tod=${tod}&t=40`);
await capture('golden rose', PHONE, '?full&seed=1&test&tod=night&gold&t=40');
await capture('heart mid hold', PHONE, '?full&seed=1&test&tod=night&t=40', '__ff.triggerHeart(3.65)');
await capture('day 60 garden', PHONE, '?full&seed=1&test&tod=night&t=40&day=60');
await capture('asleep', PHONE, '?full&seed=1&test&tod=night&t=40', '__ff.setDim(1)');

const worst = frames.reduce((a, f) => (f.light.max > a.light.max ? f : a), frames[0]);
const overTotal = frames.reduce((a, f) => a + f.light.over, 0);
check('palette', 'no pixel above 95% lightness', overTotal === 0, { maxL: worst.light.max, worst: worst.label, pixelsOver: overTotal });

{
  const cell = 232;
  const img = (f) => {
    const w = f.vp.width > f.vp.height ? cell * 2 + 12 : cell;
    return `<figure><img src="data:image/png;base64,${f.png.toString('base64')}" style="width:${w}px"><figcaption>${f.label}</figcaption></figure>`;
  };
  const row1 = frames.slice(0, TIMES.length).map(img).join('');
  const row2 = frames.slice(TIMES.length).map(img).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#111;color:#ddd;font:14px system-ui,sans-serif">
  <div style="padding:12px 12px 4px">Forever Flowers contact sheet</div>
  <div style="display:flex;gap:12px;padding:8px 12px;align-items:flex-start">${row1}</div>
  <div style="display:flex;flex-wrap:wrap;gap:12px;padding:8px 12px 16px;align-items:flex-start">${row2}</div>
  <style>figure{margin:0}figcaption{padding-top:4px;text-align:center}img{display:block;border-radius:6px}</style></body></html>`;
  const context = await browser.newContext({ viewport: { width: 1900, height: 600 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(html);
  await page.waitForLoadState('load');
  await page.screenshot({ path: join(OUT, 'contact.png'), fullPage: true });
  await context.close();
  console.log('contact sheet: harness/contact.png');
}

// ---------- performance ----------
async function perf(vp, label, query = '?preview&seed=1&test') {
  const { page, context } = await open(vp, query);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await sleep(1500);
  await page.evaluate(() => window.__ff.resetFrames());
  await sleep(10000);
  const f = await page.evaluate(() => window.__ff.frames());
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await context.close();
  const stats = { frames: f.count, median: +f.median.toFixed(2), p95: +f.p95.toFixed(2), workMedian: +f.workMedian.toFixed(2), workP95: +f.workP95.toFixed(2) };
  check('performance', `${label} median <= ${LIMITS.median}ms`, f.median <= LIMITS.median, stats);
  check('performance', `${label} p95 <= ${LIMITS.p95}ms`, f.p95 <= LIMITS.p95, { p95: stats.p95 });
  return stats;
}
const perfPhone = await perf(PHONE, '390x844@2x 4x throttle');
const perfDesk = await perf(DESK, '1280x800 4x throttle');
const perfGarden = await perf(PHONE, '390x844@2x 4x throttle, 120 day garden', '?preview&seed=1&test&day=120');
const perfWide = await perf(WIDE, '1864x953 4x throttle');

// ---------- interactions ----------
async function tap(page, x, y, ms = 60) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
  await sleep(60);
}
async function live(vp = PHONE) {
  return open(vp, '?preview&seed=1&test');
}
{
  const { page, context } = await live();
  const heads = await ffv(page, () => window.__ff.heads);
  const rose = heads.find((h) => h.kind === 'rose');
  const before = await ffv(page, () => window.__ff.hearts);
  await tap(page, rose.x + rose.w / 2, rose.y + rose.h / 2);
  const after = await ffv(page, () => window.__ff.hearts);
  check('interaction', 'short tap on a flower makes hearts', after > before, { before, after });

  const W = PHONE.width, H = PHONE.height;
  const gx = W * 0.3, gy = H * 0.84;
  const p0 = await ffv(page, () => window.__ff.planted);
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(gx + i * 10, gy); await sleep(25); }
  await page.mouse.up();
  await sleep(80);
  const p1 = await ffv(page, () => window.__ff.planted);
  check('interaction', 'a drag plants nothing', p1 === p0, { before: p0, after: p1 });

  await tap(page, gx, gy);
  const p2 = await ffv(page, () => window.__ff.planted);
  check('interaction', 'a short tap on the ground plants one flower', p2 === p1 + 1, { before: p1, after: p2 });

  await page.mouse.move(gx + 40, gy);
  await page.mouse.down();
  await sleep(650);
  await page.mouse.up();
  await sleep(80);
  const p3 = await ffv(page, () => window.__ff.planted);
  check('interaction', 'a slow press (>500ms) is not a tap', p3 === p2, { before: p2, after: p3 });

  const fan = await ffv(page, () => window.__ff.fantasy);
  await page.mouse.move(fan.x, fan.y);
  await page.mouse.down();
  await sleep(300);
  const charging = await ffv(page, () => window.__ff.state);
  await sleep(650);
  await page.mouse.up();
  await sleep(150);
  const st = await ffv(page, () => ({ state: window.__ff.state, phase: window.__ff.heartPhase }));
  check('interaction', 'long press on the fantasy flower charges then reaches NOVA', charging === 'CHARGING' && st.state === 'NOVA', { during: charging, after: st });
  await sleep(2400);
  const hold = await ffv(page, () => window.__ff.heartPhase);
  check('interaction', 'the heart reaches its hold', hold === 'hold', { phase: hold });
  await page.waitForFunction(() => window.__ff.state === 'LIVE', null, { timeout: 12000 });
  check('interaction', 'NOVA returns to LIVE after the heart sequence', true);

  const h0 = await ffv(page, () => window.__ff.hearts);
  await page.mouse.move(fan.x, fan.y);
  await page.mouse.down();
  await sleep(200);
  await page.mouse.up();
  await sleep(100);
  const early = await ffv(page, () => ({ state: window.__ff.state, hearts: window.__ff.hearts, phase: window.__ff.heartPhase }));
  check('interaction', 'an early release counts as a tap', early.hearts > h0 && early.state === 'LIVE' && early.phase === 'idle', { before: h0, after: early });
  await sleep(2700);
  const h1 = await ffv(page, () => window.__ff.hearts);
  await page.mouse.move(fan.x, fan.y);
  await page.mouse.down();
  await sleep(450);
  await page.mouse.up();
  await sleep(100);
  const mid = await ffv(page, () => ({ state: window.__ff.state, hearts: window.__ff.hearts, phase: window.__ff.heartPhase }));
  check('interaction', 'letting go of the fantasy flower at 450ms, mid charge, is a tap', mid.hearts > h1 && mid.state === 'LIVE' && mid.phase === 'idle', { before: h1, after: mid });

  await ffv(page, () => window.__ff.forceDim());
  await sleep(100);
  const d0 = await ffv(page, () => ({ state: window.__ff.state, planted: window.__ff.planted, hearts: window.__ff.hearts }));
  await tap(page, gx - 30, gy);
  const d1 = await ffv(page, () => ({ state: window.__ff.state, planted: window.__ff.planted }));
  await tap(page, gx - 60, gy);
  const d2 = await ffv(page, () => window.__ff.planted);
  await sleep(700);
  await tap(page, gx - 90, gy);
  const d3 = await ffv(page, () => window.__ff.planted);
  check('interaction', 'the first touch while DIM only wakes', d0.state === 'DIM' && d1.state === 'LIVE' && d1.planted === d0.planted && d2 === d0.planted, { dim: d0, afterFirst: d1, within600ms: d2 });
  check('interaction', 'touches work again after the 600ms wake window', d3 === d0.planted + 1, { planted: d3 });

  for (let i = 0; i < 24; i++) await tap(page, 24 + i * 14, H * (0.83 + (i % 3) * 0.015), 40);
  await sleep(200);
  const cap = await ffv(page, () => window.__ff.planted);
  check('interaction', 'planted flowers are capped at 20', cap <= 20, { planted: cap });
  await context.close();
}
{
  // intro rules: bloomed flowers answer, planting stays disabled
  const { page, context } = await open(PHONE, '?full&seed=1&test&tod=night');
  await page.waitForFunction(() => window.__ff.showTime > 8.2, null, { timeout: 20000 });
  const heads = await ffv(page, () => window.__ff.heads);
  const rose = heads.filter((h) => h.kind === 'rose')[0];
  const h0 = await ffv(page, () => window.__ff.hearts);
  await tap(page, rose.x + rose.w / 2, rose.y + rose.h / 2);
  await tap(page, PHONE.width * 0.3, PHONE.height * 0.84);
  const r = await ffv(page, () => ({ state: window.__ff.state, hearts: window.__ff.hearts, planted: window.__ff.planted, buttons: window.__ff.buttons }));
  check('interaction', 'in INTRO a bloomed flower gives hearts and planting is off', r.state === 'INTRO' && r.hearts > h0 && r.planted === 0 && !r.buttons, r);
  await page.waitForFunction(() => window.__ff.state === 'LIVE', null, { timeout: 20000 });
  await sleep(1400);
  const b = await ffv(page, () => window.__ff.buttons);
  check('living', 'buttons appear only after the intro', b === true, { buttons: b });
  await page.waitForFunction(() => window.__ff.showTime > 20.4, null, { timeout: 10000 });
  const auto = await ffv(page, () => ({ state: window.__ff.state, phase: window.__ff.heartPhase, s: +window.__ff.showTime.toFixed(2) }));
  await page.waitForFunction(() => window.__ff.state === 'LIVE', null, { timeout: 12000 });
  const after = await ffv(page, () => ({ state: window.__ff.state, found: window.__ff.heartFound }));
  check('living', 'the first full show ends with the heart playing by itself, then LIVE', auto.state === 'NOVA' && after.state === 'LIVE' && after.found === false, { auto, after });
  await context.close();
}
{
  // living with it: first visit full, return visit wakes, sound starts off, replay
  const context = await browser.newContext({ viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.dpr });
  const a = await open(PHONE, '?test', context);
  const first = await ffv(a.page, () => ({ mode: window.__ff.mode, sound: window.__ff.sound, visits: window.__ff.visits }));
  await a.page.close();
  const b = await open(PHONE, '?test', context);
  const second = await ffv(b.page, () => ({ mode: window.__ff.mode, visits: window.__ff.visits }));
  check('living', 'first visit plays the full show, return visit wakes up', first.mode === 'full' && second.mode === 'wake', { first, second });
  check('living', 'sound starts off', first.sound === false, { sound: first.sound });
  await b.page.waitForFunction(() => window.__ff.state === 'LIVE', null, { timeout: 12000 });
  await sleep(1400);
  await b.page.click('#snd');
  await sleep(200);
  const snd = await ffv(b.page, () => ({ on: window.__ff.sound, pressed: document.getElementById('snd').getAttribute('aria-pressed') }));
  check('living', 'the sound button turns sound on', snd.on === true && snd.pressed === 'true', snd);
  await sleep(2200);
  const music = await ffv(b.page, () => window.__ff.music);
  check('music', 'with sound on the lullaby schedules notes on a running audio context', music.notes > 0 && music.state === 'running', music);
  await tap(b.page, PHONE.width * 0.3, PHONE.height * 0.84);
  const planted = await ffv(b.page, () => window.__ff.planted);
  await b.page.click('#rep');
  await sleep(200);
  const rep = await ffv(b.page, () => ({ state: window.__ff.state, planted: window.__ff.planted, mode: window.__ff.mode, t: window.__ff.showTime }));
  check('living', 'replay returns to INTRO and keeps her planted flowers', rep.state === 'INTRO' && planted > 0 && rep.planted === planted && rep.t < 1, { planted, rep });
  await b.page.reload();
  await b.page.waitForFunction(() => window.__ff && window.__ff.frames().count > 4);
  const kept = await ffv(b.page, () => ({ planted: window.__ff.planted, wake: window.__ff.wakeLock }));
  check('living', 'planted flowers are still there after a reload', kept.planted === planted, { planted, kept });
  check('living', 'the wake lock is requested without errors', ['held', 'denied', 'unsupported', 'released'].includes(kept.wake), { wakeLock: kept.wake });
  const tune = await b.page.evaluate(() => !!document.getElementById('tune'));
  check('living', 'no tuning panel without ?tune', !tune, { panel: tune });
  await context.close();
  const blocked = await browser.newContext({ viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.dpr });
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  const c = await open(PHONE, '?test', blocked);
  const m = await ffv(c.page, () => window.__ff.mode);
  check('living', 'works with storage blocked', m === 'full', { mode: m });
  await blocked.close();
}
const H = { open, check, ffv, sleep, PHONE, DESK, WIDE };
await gardenAndSleep(H);

// ---------- tuning panel ----------
{
  const context = await browser.newContext({ viewport: { width: PHONE.width, height: PHONE.height }, deviceScaleFactor: PHONE.dpr });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const { page } = await open(PHONE, '?preview&seed=1&test&tune', context);
  const sliders = await page.evaluate(() => document.querySelectorAll('#tune input[type=range]').length);
  await page.evaluate(() => {
    const s = [...document.querySelectorAll('#tune input[type=range]')][3];
    s.value = '2';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const tuned = await ffv(page, () => window.__ff.tune.swayAmp);
  await page.click('#tune button');
  await sleep(200);
  let copied = null;
  try { copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())); } catch (e) { copied = null; }
  check('tuning', '?tune shows eight sliders that apply live and copy JSON', sliders === 8 && tuned === 2 && copied && copied.swayAmp === 2 && Object.keys(copied).length === 8, { sliders, tuned, copied });
  await context.close();
}

// ---------- clipping ----------
async function clipping(vp, label) {
  const bad = [];
  for (const t of [18, 24, 40]) {
    const { page, context } = await open(vp, `?full&seed=1&test&tod=night&t=${t}&day=120`);
    const d = await page.evaluate(() => {
      const r = document.getElementById('snd').getBoundingClientRect();
      const r2 = document.getElementById('rep').getBoundingClientRect();
      return {
        heads: window.__ff.heads, moon: window.__ff.moonBox, heart: window.__ff.heartBox,
        safe: window.__ff.layout.safe, W: innerWidth, H: innerHeight,
        zone: { x: Math.min(r.left, r2.left), y: Math.min(r.top, r2.top), x1: Math.max(r.right, r2.right), y1: Math.max(r.bottom, r2.bottom) },
      };
    });
    const boxes = d.heads.concat([{ ...d.moon, kind: 'moon' }, { ...d.heart, kind: 'heart' }]);
    for (const b of boxes) {
      const inside = b.x >= d.safe.l && b.y >= d.safe.t && b.x + b.w <= d.W - d.safe.r && b.y + b.h <= d.H - d.safe.b;
      const under = b.x < d.zone.x1 && b.x + b.w > d.zone.x && b.y < d.zone.y1 && b.y + b.h > d.zone.y;
      if (!inside || under) bad.push({ t, kind: b.kind, idx: b.idx, box: [b.x, b.y, b.w, b.h].map((v) => Math.round(v)), inside, under });
    }
    await context.close();
  }
  check('clipping', `${label}: heads, moon and heart inside the safe viewport and clear of the buttons`, bad.length === 0, bad.length ? bad.slice(0, 6) : { checked: 'ok' });
}
await clipping(PHONE, '390x844');
await clipping(DESK, '1280x800');
await clipping(LAND, '844x390 landscape');
await clipping(WIDE, '1864x953');
await artChecks(H);

// ---------- grep ----------
{
  const hits = [];
  for (const f of readdirSync(join(ROOT, 'src'))) {
    if (!f.endsWith('.js')) continue;
    readFileSync(join(ROOT, 'src', f), 'utf8').split('\n').forEach((line, i) => {
      if (/\bshadowBlur\b/.test(line) || /\.filter\s*=(?!=)/.test(line) || /\[\s*['"]filter['"]\s*\]\s*=(?!=)/.test(line)) hits.push(`${f}:${i + 1}`);
    });
  }
  check('grep', 'no shadowBlur and no canvas filter assignments in src', hits.length === 0, hits.length ? hits : { hits: 0 });
}

check('console', 'zero console errors, page errors or external requests across every run', errors.length === 0, errors.length ? errors.slice(0, 8) : { errors: 0 });

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ when: new Date().toISOString(), perf: { phone: perfPhone, desktop: perfDesk, garden: perfGarden, wide: perfWide }, results, errors }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed${failed.length ? ', FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`);
process.exit(failed.length ? 1 : 0);
