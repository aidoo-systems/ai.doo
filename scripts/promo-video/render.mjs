// Renders the promo videos: the pour game (pour.html, from /play/pour/) and the stamp card
// (stamps.html, from /stamps/). It serves the repo on a free local port, plays the real
// page on a virtual clock (clock.js), screenshots every frame at 2x, and encodes an MP4 with
// ffmpeg. Output goes to out/ beside this file. No gate runs it.
//
//   node render.mjs pour                     the full pour video, 9:16
//   node render.mjs pour --cut short --land  the 15s cut, 16:9
//   node render.mjs stamps --shop "shop=Gelatory&icon=icecream&reward=free%20scoop&color=D74000&stamps=10"
//   node render.mjs all                      every public version: pour and stamps, both cuts, both shapes
//   --frames 0,90,300                        only these frames, as PNGs, for checking a layout
//
// Needs Node, `npm install` here (Playwright), and ffmpeg on the PATH. PW_CHANNEL=msedge uses
// the installed Edge instead of Playwright's own Chromium.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FPS = 30;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };

// The repo at /, and this folder at /__v/, so the video and the games share an origin.
function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = url.startsWith('/__v/') ? path.join(HERE, url.slice(5)) : path.join(ROOT, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end(); return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

function args(argv) {
  const a = { film: argv[0], cut: 'full', land: false, shop: '', frames: null };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--cut') a.cut = argv[++i];
    else if (argv[i] === '--land') a.land = true;
    else if (argv[i] === '--shop') a.shop = argv[++i];
    else if (argv[i] === '--frames') a.frames = new Set(argv[++i].split(',').map(Number));
    else throw new Error('unknown option ' + argv[i]);
  }
  if (!['pour', 'stamps', 'all'].includes(a.film)) throw new Error('say which video: pour, stamps or all');
  if (!['full', 'short'].includes(a.cut)) throw new Error('--cut is full or short');
  if (a.shop && a.film !== 'stamps') throw new Error('--shop is for the stamps video');
  return a;
}

// pour: the pub's first pour is on the line at this hold; the second pub game is played
// through off camera to its results screen ("25 more to pass Juan and win the pint").
const HOLD = 1.66;
const HOLDS = [1.68, 1.02, 1.62, 0.86, 1.40];
const SRC = { pub: '/play/pour/', pubwin: '/play/pour/?take=win', cafe: '/play/pour/?skin=dozy-otter', dairy: '/play/pour/?skin=sleepy-cow', icecream: '/play/pour/?skin=giddy-puffin' };

async function pour(page, base, frame) {
  const game = id => page.frames().find(f => f.url() === base + SRC[id]);
  const step = async ms => { for (const f of page.frames()) await f.evaluate(ms => window.__step(ms), ms); };
  const secs = async s => { for (let k = 0; k < Math.round(s * FPS); k++) await step(1000 / FPS); };
  const press = f => f.evaluate(() => { const b = document.getElementById('pour'); b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); });
  const release = f => f.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })));
  const click = (f, id) => f.evaluate(id => document.getElementById(id).click(), id);
  const text = (f, id) => f.evaluate(id => document.getElementById(id).textContent, id);
  const measure = async (f, key, id) => {
    const r = await f.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, id);
    await page.evaluate(([k, r]) => { window.RECTS[k] = r; }, [key, r]);
  };

  await secs(0.4);
  await click(game('pubwin'), 'start');
  await secs(0.6);
  for (const h of HOLDS) { await press(game('pubwin')); await secs(h); await release(game('pubwin')); await secs(3.5); }
  console.log('  results screen:', await text(game('pubwin'), 'total'), '|', await text(game('pubwin'), 'goal'));
  await measure(game('pubwin'), 'pubwin:goal', 'goal');
  await click(game('pubwin'), 'claimOpen'); await secs(0.6);
  await measure(game('pubwin'), 'pubwin:claimMark', 'claimMark');
  await click(game('pubwin'), 'claimBack'); await secs(0.6);
  await measure(game('pub'), 'pub:offer', 'offer');

  const C = await page.evaluate(() => window.CUT);
  const events = [
    [C.start, () => click(game('pub'), 'start')],
    [C.start + 0.1, () => measure(game('pub'), 'pub:scene', 'stage')],
    [C.press, () => press(game('pub'))],
    [C.press + HOLD, () => release(game('pub'))],
    [C.press + HOLD + 0.4, async () => console.log('  first pour:', await text(game('pub'), 'say'))],
    [C.claim, () => click(game('pubwin'), 'claimOpen')],
    [C.tap, () => click(game('pubwin'), 'claimMark')],
  ];
  const n = Math.round(C.dur * FPS);
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    for (const e of events) if (!e.done && t >= e[0]) { e.done = true; await e[1](); }
    await page.evaluate(t => window.render(t), t);
    await frame(i);
    await step(1000 / FPS);
  }
}

// stamps: only the phones, cut out of the demo's page; its clock stands still until its
// loop is due, so the first beat starts on cue. The short cut skips from the first stamp to
// the full card (the demo's caption 4).
async function stamps(page, base, frame) {
  const demo = page.frames().find(f => f !== page.mainFrame());
  await demo.addStyleTag({ content: 'html,body{background:transparent !important}.intro,.caption,.controls,.end,footer,.bar,.sr{display:none !important}' });
  const C = await page.evaluate(() => window.CUT);
  const n = Math.round(C.dur * FPS);
  let skipped = false;
  for (let i = 0; i < n; i++) {
    const t = i / FPS;
    if (C.skip && !skipped && t >= C.skip) {
      skipped = true;
      await demo.evaluate(() => {
        const st = document.getElementById('stage'), cap = document.getElementById('caption');
        for (let k = 0; cap.dataset.cap !== '4' && k < 20; k++) st.click();
      });
    }
    await page.evaluate(t => window.render(t), t);
    await frame(i);
    await page.evaluate(ms => window.__step(ms), 1000 / FPS);
    if (t >= C.loop) await demo.evaluate(ms => window.__step(ms), 1000 / FPS);
  }
}

async function render(browser, port, a) {
  const shop = new URLSearchParams(a.shop).get('shop');
  const name = [a.film, shop && shop.toLowerCase().replace(/[^a-z0-9]+/g, '-'), a.cut, a.land ? '16x9' : '9x16'].filter(Boolean).join('-');
  const dir = path.join(HERE, 'out', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  console.log(name);

  const base = 'http://127.0.0.1:' + port;
  const page = await browser.newPage({ viewport: a.land ? { width: 960, height: 540 } : { width: 540, height: 960 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  await page.addInitScript({ path: path.join(HERE, 'clock.js') });
  page.on('console', m => { if (m.type() === 'error') console.log('  page error:', m.text()); });
  await page.goto(base + '/__v/' + a.film + '.html?cut=' + a.cut + (a.land ? '&land' : '') + (a.shop ? '&' + a.shop : ''));
  await page.waitForLoadState('networkidle');
  for (const f of page.frames()) await f.evaluate(() => document.fonts.ready);

  const frame = async i => {
    if (!a.frames || a.frames.has(i)) await page.screenshot({ path: path.join(dir, 'f' + String(i).padStart(4, '0') + '.png') });
  };
  await (a.film === 'pour' ? pour : stamps)(page, base, frame);
  await page.close();

  if (a.frames) { console.log('  stills in', dir); return; }
  const mp4 = path.join(HERE, 'out', name + '.mp4');
  const ff = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  if (ff.error || ff.status !== 0) { console.log('  ffmpeg failed or is missing; the frames are in', dir); return; }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('  ->', mp4);
}

const a = args(process.argv.slice(2));
const server = await serve();
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
try {
  const port = server.address().port;
  if (a.film === 'all') {
    for (const film of ['pour', 'stamps']) for (const cut of ['full', 'short']) for (const land of [false, true]) {
      await render(browser, port, { ...a, film, cut, land });
    }
  } else await render(browser, port, a);
} finally {
  await browser.close();
  server.close();
}
