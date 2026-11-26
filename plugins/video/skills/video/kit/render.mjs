// render.mjs: turns a film page into a silent video, stills or PNG frames, with headless Chrome and no npm packages.
// Needs Node 22 or newer (built-in WebSocket), ffmpeg, and Chrome, Chromium or Edge (set CHROME if it is not found).
//
//   node render.mjs film/index.html --out out/film.mp4 [--fps 30] [--size 1080x1920] [--workers 3]
//   node render.mjs film/index.html --out out/test.mp4 --from 4 --to 10          a part only (a moving test)
//   node render.mjs film/index.html --stills 1.5,6,12.2 --still-dir out/stills    full size PNG stills
//   node render.mjs --scene gallery/src/2d/x.js --png-dir out/frames [--every 2]  a kit scene to PNG frames
//
// The page contract (see kit/README.md):
//   window.DUR            length in seconds (required)
//   window.render(t)      draws the frame at t seconds; may return a promise. Pure function of t.
//   window.READY          optional promise: fonts, images and models are loaded
//   window.SIZE           optional [w, h]; --size wins
//   window.EV             optional sound events [{t, type, gain, pan}] or a function returning them
//   window.TEXTS(t)       optional: every text on screen at t: [{id, text, x0, y0, x1, y1, px}] in pixels
// Next to the video it writes <out>.meta.json: size, fps, frames, events and the text spans the checks read.
//
// The worker split, the output lock with stale-lock takeover, the cleanup of crashed segments and the WebGL-lost
// abort are adapted from lemo-opuscar core/render/video.mjs and browser.mjs:
//   Copyright (c) 2026 SecondFirst Pty Ltd, trading as LemoLab. MIT License.
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
//   permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
//   copyright notice and this permission notice shall be included in all copies or substantial portions of the
//   Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. See NOTICE.md.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flag = k => argv.includes(k);
const die = (msg, code = 1) => { console.error('render: ' + msg); process.exit(code); };
if (!globalThis.WebSocket) die('Node 22 or newer is needed (this is ' + process.version + ').', 2);

const sceneFile = opt('--scene');
const pageFile = sceneFile ? path.join(KIT, 'page.html') : argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!pageFile || !fs.existsSync(pageFile)) die('give a page: node render.mjs <page.html> --out film.mp4 (or --scene x.js --png-dir dir)', 2);
const ROOT = path.dirname(path.resolve(pageFile));
const FPS = +opt('--fps', 0) || 0, WK = Math.max(1, +opt('--workers', 3) | 0);
const sizeArg = opt('--size'); let W = 0, H = 0;
if (sizeArg) { [W, H] = sizeArg.split('x').map(Number); if (!(W > 0 && H > 0)) die('bad --size, use 1080x1920', 2); }
const out = opt('--out') && path.resolve(opt('--out'));
const stills = opt('--stills'), stillDir = opt('--still-dir', out ? path.join(path.dirname(out), 'stills') : 'stills');
const pngDir = opt('--png-dir'), every = Math.max(1, +opt('--every', 1) | 0);
const from = +opt('--from', 0), to = opt('--to') === undefined ? null : +opt('--to');
const QUALITY = +opt('--jpeg', 95), CRF = opt('--crf', '14');
if (!out && !stills && !pngDir) die('nothing to make: give --out, --stills or --png-dir', 2);

// ---------- Chrome ----------
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const L = process.env.LOCALAPPDATA || '', P = process.env.ProgramFiles || '', P86 = process.env['ProgramFiles(x86)'] || '', home = os.homedir(), list = [];
  for (const pw of [path.join(L, 'ms-playwright'), path.join(home, 'Library/Caches/ms-playwright'), path.join(home, '.cache/ms-playwright')]) {
    if (!fs.existsSync(pw)) continue;
    for (const d of fs.readdirSync(pw).sort().reverse()) if (d.startsWith('chromium')) for (const sub of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe', 'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell', 'chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome']) list.push(path.join(pw, d, sub));
  }
  list.push(path.join(L, 'Google/Chrome/Application/chrome.exe'), path.join(P, 'Google/Chrome/Application/chrome.exe'), path.join(P86, 'Google/Chrome/Application/chrome.exe'),
    path.join(P86, 'Microsoft/Edge/Application/msedge.exe'), path.join(P, 'Microsoft/Edge/Application/msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge');
  return list.find(p => p && fs.existsSync(p));
}
const CHROME = findChrome();
if (!CHROME) die('Chrome, Chromium or Edge was not found. Install one, or set CHROME to its path. Run scripts/doctor.py for help.', 2);
const GPU = process.platform === 'win32' ? ['--use-angle=vulkan'] : process.platform === 'linux' ? ['--use-angle=vulkan', '--enable-features=Vulkan'] : [];
const FLAGS = [...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ') : GPU), '--headless', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', '--font-render-hinting=none',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required'];

// ---------- a tiny file server: / is the page's folder, /kit/ is this kit ----------
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.hdr': 'application/octet-stream', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const server = createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const base = u.startsWith('/kit/') ? KIT : ROOT, rel = u.startsWith('/kit/') ? u.slice(5) : u.slice(1);
  const p = path.resolve(base, rel);
  if (!p.startsWith(path.resolve(base)) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { connection: 'close', 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' }); r.end(fs.readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const PORT = server.address().port;
const pageUrl = `http://127.0.0.1:${PORT}/${sceneFile ? 'kit/page.html' : encodeURIComponent(path.basename(pageFile))}`;

// Runs before any page script: a seeded Math.random (the same in every worker), a virtual clock, and a watch for a
// lost WebGL context, which would make every later frame blank.
const PRELUDE = `(() => {
  let s = 0x9E3779B9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__T = 0; const D0 = 1767225600000; Date.now = () => D0 + window.__T * 1000; performance.now = () => window.__T * 1000;
  const lost = new Set(), name = c => c && c.id ? 'canvas#' + c.id : 'canvas';
  addEventListener('webglcontextlost', e => { lost.add(e.target); window.__glLost = name(e.target); }, true);
  addEventListener('webglcontextrestored', e => { lost.delete(e.target); window.__glLost = lost.size ? name([...lost][0]) : null; }, true);
})();`;

const procs = new Set(), profiles = [];
async function openBrowser() {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-chrome-')); profiles.push(prof);
  const ch = spawn(CHROME, [...FLAGS, '--user-data-dir=' + prof, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] }); procs.add(ch);
  const wsUrl = await new Promise((ok, no) => { let b = ''; ch.stderr.on('data', d => { b += d; const m = b.match(/ws:\/\/\S+/); if (m) ok(m[0]); }); ch.on('exit', c => no(Error('Chrome exited early (' + c + '): ' + b.slice(-300)))); setTimeout(() => no(Error('Chrome did not start: ' + b.slice(-300))), 30000); });
  const ws = new WebSocket(wsUrl); await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  let id = 0; const wait = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); } };
  const send = (method, params = {}, sessionId) => new Promise(ok => { wait.set(++id, ok); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = async (method, params) => { const r = await send(method, params, sessionId); if (r.error) throw Error(method + ': ' + r.error.message); return r.result; };
  const ev = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
    return r.result.value;
  };
  await call('Page.enable', {}); await call('Runtime.enable', {});
  await call('Page.addScriptToEvaluateOnNewDocument', { source: PRELUDE });
  return { ch, ws, call, ev, close: () => { try { ws.close(); } catch {} ch.kill(); procs.delete(ch); } };
}

async function openPage() {
  const b = await openBrowser();
  if (W) await b.call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await b.call('Page.navigate', { url: pageUrl });
  for (let k = 0; k < 300 && await b.ev('document.readyState') !== 'complete'; k++) await new Promise(r => setTimeout(r, 50));
  if (sceneFile) {
    await b.ev(`window.onerror = (m, u, l) => window.ERR = m + ' line ' + l; 0`);
    await b.ev(fs.readFileSync(sceneFile, 'utf8') + '\n;0');
    if (process.env.SPPK) await b.ev(`window.SPPK=${+process.env.SPPK}`);
  }
  await b.ev(`(async () => { if (window.READY) await window.READY; if (document.fonts) await document.fonts.ready; return 1; })()`);
  const info = await b.ev(`({ dur: window.DUR, fps: window.FPS || 0, size: window.SIZE || null, hasTexts: typeof window.TEXTS === 'function', hasRender: typeof window.render === 'function', err: window.ERR || null })`);
  if (info.err) throw Error('page error: ' + info.err);
  if (!info.hasRender) throw Error('the page has no window.render(t). See kit/README.md for the contract.');
  if (!(info.dur > 0)) throw Error('window.DUR must be a positive number of seconds (got ' + info.dur + ')');
  if (!W) { [W, H] = info.size || [1080, 1920]; await b.call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false }); }
  return { ...b, info };
}

// Draw the frame at t: set the virtual clock, run render(t), park every CSS animation at t, seek videos, then read the
// texts on screen.
const DRAW = t => `(async () => {
  window.__T = ${t};
  await window.render(${t});
  for (const a of document.getAnimations ? document.getAnimations() : []) { a.pause(); a.currentTime = ${t * 1000}; }
  const vids = [...document.querySelectorAll('video')];
  await Promise.all(vids.map(v => v.dataset.vsManual ? 0 : new Promise(ok => { const want = ${t} - (+v.dataset.start || 0); if (want < 0) return ok(); const t2 = Math.min(want, (v.duration || 1e9) - 0.001); if (Math.abs(v.currentTime - t2) < 0.0005) return ok(); v.addEventListener('seeked', ok, { once: true }); v.currentTime = t2; setTimeout(ok, 3000); })));
  await Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise(r => setTimeout(r, 120))]);
  return { texts: typeof window.TEXTS === 'function' ? (window.TEXTS(${t}) || []) : null, lost: window.__glLost || null, err: window.ERR || null };
})()`;

const kill = () => { for (const p of procs) try { p.kill(); } catch {} server.close(); setTimeout(() => { for (const p of profiles) try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {} }, 300); };
process.on('SIGINT', () => { kill(); process.exit(130); });

async function shot(b, fmt) {
  const r = await b.call('Page.captureScreenshot', { format: fmt, quality: fmt === 'jpeg' ? QUALITY : undefined, clip: { x: 0, y: 0, width: W, height: H, scale: 1 }, captureBeyondViewport: false, optimizeForSpeed: fmt === 'jpeg' });
  return Buffer.from(r.data, 'base64');
}

// ---------- stills ----------
if (stills) {
  const b = await openPage(); fs.mkdirSync(stillDir, { recursive: true });
  for (const s of stills.split(',').map(Number)) {
    const r = await b.ev(DRAW(s)); if (r.err) die('page error: ' + r.err);
    const f = path.join(stillDir, `still_${s.toFixed(2).replace('.', '_')}s.png`); fs.writeFileSync(f, await shot(b, 'png')); console.log('still', f);
  }
  b.close(); if (!out && !pngDir) { kill(); setTimeout(() => process.exit(0), 400); }
}

// ---------- PNG frames (gallery and tests) ----------
if (pngDir) {
  const b = await openPage(); const fps = FPS || b.info.fps || 30, n = Math.round(b.info.dur * fps);
  fs.rmSync(pngDir, { recursive: true, force: true }); fs.mkdirSync(pngDir, { recursive: true });
  for (let i = 0; i < n; i += every) { const r = await b.ev(DRAW(i / fps)); if (r.err) die('page error: ' + r.err); fs.writeFileSync(path.join(pngDir, String(i).padStart(4, '0') + '.png'), await shot(b, 'png')); }
  fs.writeFileSync(path.join(pngDir, 'info.json'), JSON.stringify({ n, fps, w: W, h: H }));
  b.close(); if (!out) { kill(); setTimeout(() => process.exit(0), 400); }
}

// ---------- the video ----------
if (out) {
  const outDir = path.dirname(out), base = path.basename(out, path.extname(out));
  fs.mkdirSync(outDir, { recursive: true });
  const alive = pid => { if (!Number.isInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const lock = out + '.lock';
  try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); } catch {
    const other = Number(fs.readFileSync(lock, 'utf8')), age = Date.now() - fs.statSync(lock).mtimeMs;
    if (alive(other) && age < 12 * 3600e3) die(`another render (pid ${other}) is writing ${out}. Give this one its own --out.`, 2);
    fs.writeFileSync(lock, String(process.pid));
  }
  const tick = setInterval(() => { try { const n = new Date(); fs.utimesSync(lock, n, n); } catch {} }, 600e3); tick.unref();
  for (const n of fs.readdirSync(outDir)) if (n.startsWith(`.${base}_segs-`)) { try { if (!alive(Number(fs.readFileSync(path.join(outDir, n, 'pid'), 'utf8')))) fs.rmSync(path.join(outDir, n), { recursive: true, force: true }); } catch {} }
  const segDir = fs.mkdtempSync(path.join(outDir, `.${base}_segs-`)); fs.writeFileSync(path.join(segDir, 'pid'), String(process.pid));
  const ffs = new Set();
  const clean = () => { for (const f of ffs) try { f.kill('SIGKILL'); } catch {} try { fs.rmSync(segDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 }); } catch {} try { fs.unlinkSync(lock); } catch {} };
  const fail = m => { clean(); kill(); die(m); };

  let probe;
  try { probe = await openPage(); } catch (e) { fail(String(e.message || e)); }
  const fps = FPS || probe.info.fps || 30, DUR = probe.info.dur;
  const all = Math.round(DUR * fps), A = Math.max(0, Math.round(from * fps)), B = Math.min(all, to === null ? all : Math.round(to * fps));
  if (B <= A) fail(`nothing to render between ${from} and ${to} s (the film is ${DUR} s)`);
  const total = B - A, wk = Math.min(WK, Math.max(1, Math.ceil(total / 30))), per = Math.ceil(total / wk), t0 = Date.now();
  const events = await probe.ev(`(() => { const e = typeof window.EV === 'function' ? window.EV() : window.EV; return Array.isArray(e) ? e : []; })()`);
  probe.close();
  console.log(`render: ${total} frames at ${fps} fps, ${W}x${H}, ${wk} workers, Chrome ${path.basename(CHROME)}`);
  const texts = new Map(); let abort = null, done = 0;
  await Promise.all([...Array(wk)].map(async (_, w) => {
    const a = A + w * per, b = Math.min(B, a + per); if (a >= b) return;
    let pg; try { pg = await openPage(); } catch (e) { abort ??= String(e.message || e); return; }
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF,
      '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-r', String(fps), `seg_${w}.mp4`], { cwd: segDir, stdio: ['pipe', 'inherit', 'inherit'] });
    ffs.add(ff); let dead = null, closed; const end = new Promise(r => closed = r);
    ff.on('close', c => { ffs.delete(ff); closed(c); }); ff.on('error', e => { dead = e.code === 'ENOENT' ? 'ffmpeg is not installed or not on PATH' : e.message; closed(-1); });
    ff.stdin.on('error', () => { dead ??= 'ffmpeg closed its input early'; });
    for (let f = a; f < b && !dead && !abort; f++) {
      let r; try { r = await pg.ev(DRAW(f / fps)); } catch (e) { abort ??= `render(${(f / fps).toFixed(3)}) failed: ${String(e.message || e).split('\n')[0]}`; break; }
      if (r.err) { abort ??= 'page error: ' + r.err; break; }
      if (r.lost) { abort ??= `the WebGL context (${r.lost}) was lost at frame ${f}: every later frame would be blank. Use fewer WebGL canvases or fewer workers.`; break; }
      if (r.texts) for (const x of r.texts) {
        const key = String(x.id) + '\u0000' + x.text, inside = x.x0 >= 0 && x.y0 >= 0 && x.x1 <= W && x.y1 <= H;
        const s = texts.get(key) || { id: String(x.id), text: x.text, frames: [], box: null, px: x.px ?? null, pass: !!x.pass };
        s.frames.push([f, inside ? 1 : 0]); if (inside && !s.box) s.box = [x.x0, x.y0, x.x1, x.y1];
        if (x.px != null) s.px = s.px == null ? x.px : Math.min(s.px, x.px);
        if (!s.allBox) s.allBox = [x.x0, x.y0, x.x1, x.y1]; else s.allBox = [Math.min(s.allBox[0], x.x0), Math.min(s.allBox[1], x.y0), Math.max(s.allBox[2], x.x1), Math.max(s.allBox[3], x.y1)];
        texts.set(key, s);
      }
      const buf = await shot(pg, 'jpeg'); if (dead) break;
      if (!ff.stdin.write(buf)) await Promise.race([new Promise(r => ff.stdin.once('drain', r)), end]);
      if (++done % 60 === 0) { const s = (Date.now() - t0) / 1000; console.log(`render: ${done}/${total} frames, ${s.toFixed(0)} s, ${(s / done).toFixed(2)} s a frame`); }
    }
    ff.stdin.end(); const code = await end; pg.close();
    if (!abort && (dead || code !== 0)) abort = `ffmpeg failed for worker ${w}: ${dead || 'exit code ' + code}`;
  }));
  if (abort) fail(abort);
  fs.writeFileSync(path.join(segDir, 'segs.txt'), [...Array(wk)].map((_, w) => `file 'seg_${w}.mp4'`).filter((_, w) => A + w * per < B).join('\n'));
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'segs.txt', '-c', 'copy', '-movflags', '+faststart', 'merged.mp4'], { cwd: segDir, stdio: ['ignore', 'inherit', 'inherit'] }); }
  catch { fail('ffmpeg could not join the segments'); }
  fs.renameSync(path.join(segDir, 'merged.mp4'), out);
  // Text spans: each piece of text, its first continuous run on screen, and whether it was ever fully in frame.
  const spans = [];
  for (const s of texts.values()) {
    s.frames.sort((p, q) => p[0] - q[0]);
    const firstIn = s.frames.find(x => x[1]); let run = 0, start = null, last = null;
    if (firstIn) { start = firstIn[0]; last = start; for (const [f, ins] of s.frames) { if (f < start) continue; if (f === last || f === last + 1) { if (!ins) break; last = f; } else if (f > last + 1) break; } run = (last - start + 1) / fps; }
    spans.push({ id: s.id, text: s.text, t0: (start ?? s.frames[0][0]) / fps, t1: ((last ?? s.frames.at(-1)[0]) + 1) / fps, run: +run.toFixed(3), full: !!firstIn, pass: s.pass, px: s.px, box: s.box || s.allBox });
  }
  spans.sort((p, q) => p.t0 - q.t0);
  const meta = { w: W, h: H, fps, dur: DUR, frames: total, from: A / fps, to: B / fps, events: events.map(e => ({ type: 'hit', gain: 1, pan: 0, ...e, t: +(e.t - A / fps).toFixed(4) })).filter(e => e.t >= 0 && e.t <= total / fps), texts: spans, page: path.basename(pageFile) };
  fs.writeFileSync(out.replace(/\.[^.]+$/, '') + '.meta.json', JSON.stringify(meta, null, 1));
  clean(); kill();
  const s = (Date.now() - t0) / 1000;
  console.log(`done ${out} ${total} frames in ${s.toFixed(0)} s (${(s / total).toFixed(2)} s a frame)`);
  setTimeout(() => process.exit(0), 400);
}
