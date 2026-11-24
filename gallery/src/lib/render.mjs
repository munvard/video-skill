// Renders one 2D scene to PNG frames with headless Chrome and no npm packages.
// node render.mjs <slug> <outdir> [every n-th frame]. Set CHROME if Chrome is not found.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const [slug, out, every = '1'] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dir = existsSync(join(root, 'src/lit', slug + '.js')) ? 'lit' : '2d';
const find = () => {
  const L = process.env.LOCALAPPDATA || '', P = process.env.ProgramFiles || '', list = [], pw = join(L, 'ms-playwright');
  if (L && existsSync(pw)) for (const d of readdirSync(pw).sort().reverse()) if (d.startsWith('chromium_headless_shell')) list.push(join(pw, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe'));
  list.push(join(L, 'Google/Chrome/Application/chrome.exe'), join(P, 'Google/Chrome/Application/chrome.exe'), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium');
  return process.env.CHROME || list.find(existsSync);
};
const types = { '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const srv = createServer((q, r) => {
  const p = join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { connection: 'close', 'content-type': types[extname(p)] || 'text/plain' }); r.end(readFileSync(p));
}).listen(0);
const port = srv.address().port, prof = mkdtempSync(join(tmpdir(), 'ball-'));
const ch = spawn(find(), ['--headless', '--use-angle=vulkan', '--enable-gpu', '--ignore-gpu-blocklist', '--remote-debugging-port=0', '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-background-timer-throttling', '--user-data-dir=' + prof, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const url = await new Promise((ok, no) => { let b = ''; ch.stderr.on('data', d => { b += d; const m = b.match(/ws:\/\/\S+/); if (m) ok(m[0]); }); setTimeout(() => no(Error('Chrome did not start ' + b)), 20000); });
const ws = new WebSocket(url); await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id) { wait.get(d.id)(d); wait.delete(d.id); } };
const send = (method, params = {}, sessionId) => new Promise(ok => { wait.set(++id, ok); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const done = code => { ch.kill(); srv.close(); setTimeout(() => { try { rmSync(prof, { recursive: true, force: true }); } catch {} process.exit(code); }, 400); };
const { result: { targetId } } = await send('Target.createTarget', { url: `http://localhost:${port}/src/lib/page.html` });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
const ev = async expression => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.result?.exceptionDetails) { console.error(slug, r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); done(1); await new Promise(() => {}); }
  return r.result.result.value;
};
for (let k = 0; k < 100 && await ev('document.readyState=="complete"&&typeof boot=="function"') !== true; k++) await new Promise(r => setTimeout(r, 100));
await send('Runtime.evaluate', { expression: `window.onerror=(m,u,l)=>window.ERR=m+' line '+l` }, sessionId);
await ev(readFileSync(join(root, 'src', dir, slug + '.js'), 'utf8') + String.fromCharCode(10) + '0');
if (process.env.SPPK) await ev(`window.SPPK=${+process.env.SPPK}`);
const info = await ev('boot()');
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
for (let i = 0; i < info.n; i += +every) writeFileSync(join(out, String(i).padStart(4, '0') + '.png'), Buffer.from(await ev(`frame(${i})`), 'base64'));
writeFileSync(join(out, 'info.json'), JSON.stringify(info));
done(0);
