// Small kit for the 2D scenes: easing, seeded noise, the ball, and the sub-frame renderer.
// A scene calls scene({fps, dur, w, h, ss, blur, shutter, init, draw, post}). draw(c, t, f) must depend on t only.
// fwd opens the shutter after the frame time, so a hard cut on a frame never mixes two shots.
// The renderer draws `blur` real sub-frames at `ss` times the size, averages them in linear light, then shrinks.
const TAU = Math.PI * 2, PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, floor = Math.floor, hyp = Math.hypot;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const fr = x => x - floor(x);
const E = {
  io: x => x * x * (3 - 2 * x), io5: x => x < .5 ? 16 * x ** 5 : 1 - (2 - 2 * x) ** 5 / 2, in2: x => x * x, in3: x => x ** 3,
  out2: x => 1 - (1 - x) ** 2, out3: x => 1 - (1 - x) ** 3, out5: x => 1 - (1 - x) ** 5,
  back: (x, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  spring: (x, f = 3, d = 5) => 1 - Math.exp(-d * x) * cos(TAU * f * x) * (1 - x),
  arc: x => 4 * x * (1 - x),
};
// Twelve measured eases: each was fitted to moves in human-made motion design. The math is copied from motionmaxxing
// (runtime/motion.js), Copyright Tejas Makwana, Apache License 2.0; see kit/LICENSE-motionmaxxing.txt and NOTICE.md.
// Typical lengths in frames at 30 fps are in EASE_FRAMES. Land with softLand or snapSettle, leave with accelExit.
{
  const powerOut = p => t => 1 - Math.pow(1 - t, p), powerIn = p => t => Math.pow(t, p);
  const expoOut = k => { const d = 1 - Math.exp(-k); return t => (1 - Math.exp(-k * t)) / d; };
  const snapRamp = (w, tau) => { const n = w * (1 - Math.exp(-1 / tau)) + (1 - w); return t => (w * (1 - Math.exp(-t / tau)) + (1 - w) * t) / n; };
  const snapOver = (A, ta, td) => { const f = t => (1 + A * Math.exp(-t / td)) * (1 - Math.exp(-t / ta)); const n = f(1); return t => f(t) / n; };
  const springM = (c, om) => { const f = t => 1 - Math.exp(-c * t) * (Math.cos(om * t) + (c / om) * Math.sin(om * t)); const n = f(1); return t => f(t) / n; };
  const smoothP = p => t => { const a = Math.pow(t, p), b = Math.pow(1 - t, p); return a / (a + b); };
  const guard = f => t => (t <= 0 ? 0 : t >= 1 ? 1 : f(t));
  Object.assign(E, {
    crashIn: guard(snapOver(2.0, 0.19, 0.218)), popOver: guard(springM(2.67, 4.36)), bounceHard: guard(springM(1.34, 5.07)),
    snapSettle: guard(snapRamp(0.942, 0.118)), softLand: guard(expoOut(3.41)), whip: guard(powerOut(2.52)), glide: guard(powerOut(1.7)),
    cruise: guard(t => t), softInOut: guard(smoothP(1.42)), gentleIn: guard(powerIn(2.07)), accelExit: guard(powerIn(2.6)), crashOut: guard(powerIn(3.97)),
  });
}
const EASE_FRAMES = { crashIn: 10, popOver: 15, bounceHard: 22, snapSettle: 11, softLand: 12, whip: 7, glide: 10, cruise: 9, softInOut: 9, gentleIn: 9, accelExit: 13, crashOut: 17 };
// A move from a to b between seconds t0 and t1 with a named ease: mv(t, 0.4, 0.8, 0, 300, 'softLand').
const mv = (t, t0, t1, a, b, e = 'softLand') => lerp(a, b, (typeof e === 'function' ? e : E[e])(seg(t, t0, t1)));
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = (x, y = 0, z = 0) => { const s = sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - floor(s); };
const vnoise = (x, y = 0, z = 0) => {
  const X = floor(x), Y = floor(y), a = E.io(x - X), b = E.io(y - Y);
  return lerp(lerp(hash(X, Y, z), hash(X + 1, Y, z), a), lerp(hash(X, Y + 1, z), hash(X + 1, Y + 1, z), a), b);
};
const fbm = (x, y, z = 0, o = 4) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * vnoise(x, y, z + i); x *= 2.03; y *= 2.03; a *= .5; } return s; };
const ORANGE = '#FF6A1F';
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, max(0, r), 0, TAU); };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const poly = (c, p, close) => { c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); if (close) c.closePath(); };
const txt = (c, s, x, y, font, fill, align = 'left', ls = '0px', base = 'alphabetic') => { c.font = font; c.fillStyle = fill; c.textAlign = align; c.textBaseline = base; c.letterSpacing = ls; c.fillText(s, x, y); };
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
// Flat ball with squash: sx and sy are scales, rot is the axis. lit adds a soft shade.
function ball(c, x, y, r, o = {}) {
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(o.sx || 1, o.sy || 1);
  circle(c, 0, 0, r); c.fillStyle = o.fill || ORANGE; c.fill();
  if (o.lit) { const g = c.createRadialGradient(-r * .35, -r * .45, r * .05, 0, 0, r * 1.02); g.addColorStop(0, '#FFC489'); g.addColorStop(.35, '#FF7F2E'); g.addColorStop(.8, '#EF5A12'); g.addColorStop(1, '#C23F08'); c.fillStyle = g; c.fill(); }
  c.restore();
}
const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; LIN[i] = v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }
const ENC = new Uint8ClampedArray(4097); for (let i = 0; i <= 4096; i++) { const v = i / 4096; ENC[i] = Math.round(255 * (v <= .0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - .055)); }
let S;
// scene() also makes the page a film for kit/render.mjs: window.DUR, FPS, SIZE, READY and render(t) are set here, and
// the frame is drawn into a canvas that fills the page.
function scene(o) {
  S = Object.assign({ fps: 24, dur: 3, w: 480, h: 480, ss: 2, blur: 12, shutter: .5 }, o);
  window.DUR = S.dur; window.FPS = S.fps; window.SIZE = [S.w, S.h];
  if (window.READY && window.READY !== window.__kitReady) window.USER_READY = window.READY;
  if (!window.__kitReady) window.__kitReady = (async () => {
    if (document.readyState !== 'complete') await new Promise(r => addEventListener('load', r, { once: true }));
    await boot();
    Object.assign(S.out.style, { position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh' });
    document.body.style.margin = 0; document.body.appendChild(S.out);
  })();
  window.READY = window.__kitReady;
  window.render = t => { S.paintOnly = true; TX.clear(); const r = frame(Math.round(t * S.fps)); S.paintOnly = false; return r; };
  window.TEXTS = () => [...TX.values()];
}
// Every text the film wants checked: call say() instead of txt() and the renderer can time it and measure its size.
// say(c, id, text, x, y, px, font, fill, align): px is the font size in pixels at the film size. pass: true for text the
// viewer is not meant to read in full (a sign the camera flies past).
const TX = new Map();
function say(c, id, s, x, y, px, font = `800 ${px}px Inter`, fill = '#fff', align = 'center', o = {}) {
  txt(c, s, x, y, font, fill, align, o.ls || '0px', o.base || 'alphabetic');
  const k = c.canvas === S.out ? 1 : (S.ss || 1), m = c.getTransform(), w = c.measureText(s).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const p = (X, Y) => [(m.a * X + m.c * Y + m.e) / k, (m.b * X + m.d * Y + m.f) / k];
  const a = p(x0, y - px * .78), b = p(x0 + w, y + px * .22), sc = Math.hypot(m.a, m.b) / k;
  if ((o.alpha ?? c.globalAlpha) > .5) TX.set(id + '|' + s, { id, text: s, x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]), px: px * sc, pass: !!o.pass });
}
async function boot() {
  if (window.USER_READY) await window.USER_READY;
  await Promise.all(['900 40px Inter', '400 40px Inter', '400 40px Fraunces', '700 40px Mono', '400 40px Mono', '400 40px Hand', '700 40px Hand', '40px Comic'].map(f => document.fonts.load(f, 'Ab')));
  S.cv = mkc(S.w * S.ss, S.h * S.ss); S.c = S.cv.getContext('2d', { willReadFrequently: true });
  S.out = mkc(S.w, S.h); S.oc = S.out.getContext('2d', { willReadFrequently: true }); S.n = Math.round(S.fps * S.dur);
  if (S.init) await S.init(S);
  return { n: S.n, fps: S.fps };
}
function frame(i) {
  if (S.ray) return S.ray(i);
  const { c, w, h, ss } = S, W = w * ss, H = h * ss, t0 = i / S.fps;
  const K = typeof S.blur === 'function' ? S.blur(t0) : S.blur, acc = new Float32Array(w * h * 3);
  for (let k = 0; k < K; k++) {
    let t = t0 + (K > 1 ? ((k + .5) / K - (S.fwd ? 0 : .5)) * S.shutter / S.fps : 0); t = ((t % S.dur) + S.dur) % S.dur;
    c.setTransform(ss, 0, 0, ss, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowColor = 'transparent'; c.setLineDash([]);
    S.draw(c, t, i);
    const d = c.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y++) { let p = y * W * 4; const q0 = floor(y / ss) * w; for (let x = 0; x < W; x++, p += 4) { const q = (q0 + (x / ss | 0)) * 3; acc[q] += LIN[d[p]]; acc[q + 1] += LIN[d[p + 1]]; acc[q + 2] += LIN[d[p + 2]]; } }
  }
  const im = S.oc.createImageData(w, h), D = im.data, k = 4096 / (K * ss * ss);
  for (let q = 0, p = 0; q < acc.length; q += 3, p += 4) { D[p] = ENC[min(4096, acc[q] * k + .5 | 0)]; D[p + 1] = ENC[min(4096, acc[q + 1] * k + .5 | 0)]; D[p + 2] = ENC[min(4096, acc[q + 2] * k + .5 | 0)]; D[p + 3] = 255; }
  if (S.post) S.post(im, i, t0);
  S.oc.putImageData(im, 0, 0);
  if (S.over) { S.oc.save(); S.over(S.oc, t0, i); S.oc.restore(); }
  return S.paintOnly ? undefined : S.out.toDataURL('image/png').slice(22);
}
// Static grain for prints and gradients. It never moves, so it costs little.
function grain(im, amt, seed = 1) { const r = rng(seed), d = im.data; for (let p = 0; p < d.length; p += 4) { const g = (r() - .5) * amt; d[p] += g; d[p + 1] += g; d[p + 2] += g; } }
// 3x5 to 5x7 bitmap text, drawn as squares of size u.
const BITS = { A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110', D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000', G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110', J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111', M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', W: '10001100011000110101101011101110001', X: '10001100010101000100010101000110001', Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100110010001000011111', '3': '11110000010000101110000010000111110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110', '.': '00000000000000000000000000110001100', '!': '00100001000010000100001000000000100', '?': '01110100010000100110001000000000100', ':': '00000001100011000000001100011000000', ' ': '0'.repeat(35), '-': '00000000000000011111000000000000000', '>': '10000010000010000010001000100010000' };
function bits(c, s, x, y, u, fill) { c.fillStyle = fill; for (const ch of s) { const b = BITS[ch] || BITS[' ']; for (let i = 0; i < 35; i++) if (b[i] === '1') c.fillRect(x + (i % 5) * u, y + floor(i / 5) * u, u, u); x += 6 * u; } return x; }
// For HTML films: every element with data-say="<id>" is a text to check. Visible means opacity over 0.5 and inside the
// page. Use it as window.TEXTS = domTexts. Add data-pass to text the viewer is not meant to read in full.
function domTexts() {
  const out = [];
  for (const el of document.querySelectorAll('[data-say]')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op <= .5) continue;
    const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    let sc = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== 'none') { const q = new DOMMatrix(t); sc *= Math.hypot(q.a, q.b); } }
    out.push({ id: el.dataset.say, text: el.innerText.trim().replace(/\s+/g, ' '), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom, px: parseFloat(cs.fontSize) * sc, pass: el.hasAttribute('data-pass') });
  }
  return out;
}
// Image sequences (Blender frames, screen takes cut to PNG): seq('shots/a/%04d.png', 1) then await s.at(i) gives a
// decoded image for frame i, loaded on demand with a small cache.
function seq(pattern, first = 1, keep = 6) {
  const cache = new Map();
  const url = i => pattern.replace(/%0(\d)d/, (_, n) => String(i + first).padStart(+n, '0'));
  return { at(i) { if (!cache.has(i)) { const im = new Image(); im.decoding = 'sync'; im.src = url(i); cache.set(i, im.decode().then(() => im)); while (cache.size > keep) cache.delete(cache.keys().next().value); } return cache.get(i); } };
}
