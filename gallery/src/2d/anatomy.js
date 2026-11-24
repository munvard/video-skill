// Anatomy: how /video thinks, shown and not told. One request becomes four sketches, one is chosen and gets better, its
// frames are planned, drawn, checked, and become a film. Uses the finished previews, so build those four first.
{
  const D = 11.5, SRC = ['blueprint', 'clay-stop-motion', 'pixel-art', 'paper-collage'], PICK = 1, INK = '#1E1915', BG = '#F3ECDF', OR = '#E8590C', GREEN = '#2F7D4F';
  let clips = [], sketches = [];
  const dec = async s => { const d = new ImageDecoder({ data: await (await fetch('/' + s + '.webp')).arrayBuffer(), type: 'image/webp' }); await d.tracks.ready; await d.completed; const n = d.tracks.selectedTrack.frameCount, out = []; for (let i = 0; i < n; i += 2) { const c = mkc(480, 480); c.getContext('2d').drawImage((await d.decode({ frameIndex: i })).image, 0, 0, 480, 480); out.push(c); } return out; };
  const sketch = src => { // pencil: edges of the picture, plus a little tone
    const n = 240, a = mkc(n, n), c = a.getContext('2d'); c.filter = 'blur(1px)'; c.drawImage(src, 0, 0, n, n); const d = c.getImageData(0, 0, n, n), L = new Float32Array(n * n); for (let i = 0; i < n * n; i++) L[i] = .3 * d.data[i * 4] + .59 * d.data[i * 4 + 1] + .11 * d.data[i * 4 + 2];
    const o = c.createImageData(n, n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const g = (X, Y) => L[min(n - 1, max(0, Y)) * n + min(n - 1, max(0, X))], gx = g(x + 1, y) - g(x - 1, y), gy = g(x, y + 1) - g(x, y - 1), e = clamp((hyp(gx, gy) - 9) / 34), h = ((x + y) % 7 < 2 ? 1 : 0) * clamp((130 - g(x, y)) / 110) * .34, k = clamp(e * .95 + h), i = (y * n + x) * 4; [[250, 40], [246, 36], [236, 34]].forEach(([p, q], j) => { o.data[i + j] = lerp(p, q, k); }); o.data[i + 3] = 255; }
    const b = mkc(n, n); b.getContext('2d').putImageData(o, 0, 0); return b;
  };
  const CELLS = [0, .10, .17, .24, .31, .40, .56, .84], cx = i => 62 + i * 136, CW = 124, CY = 150;
  const POSE = [[1, 1, 0], [1.25, .68, 0], [.8, 1.25, 10], [1, 1, 26], [.85, 1.2, 12], [1.5, .34, 0], ['f'], [1.1, .85, 0]];
  const W = [[0, 1.75, 'ask'], [1.85, 3.45, 'four ideas'], [3.55, 4.15, 'pick one'], [4.2, 5.35, 'make it better'], [5.5, 6.75, 'plan every frame'], [6.8, 7.85, 'draw'], [7.9, 9.3, 'check, then fix'], [9.4, 10.95, 'film']];
  const R = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
  const pic = (c, im, [x, y, w, h], r = 14) => { c.save(); rr(c, x, y, w, h, r); c.clip(); c.drawImage(im, x, y, w, h); c.restore(); };
  const shadow = (c, [x, y, w, h], r, k = 1) => { c.save(); c.shadowColor = `rgba(70,45,20,${.22 * k})`; c.shadowBlur = 44 * k; c.shadowOffsetY = 18 * k; c.fillStyle = '#FFFDF8'; rr(c, x, y, w, h, r); c.fill(); c.restore(); };
  const clip = t => clips[PICK][floor(fr(t / 3.5) * clips[PICK].length)];
  scene({
    dur: D, fps: 20, w: 1200, h: 500, blur: 5, shutter: .5,
    async init() { for (const s of SRC) { clips.push(await dec(s)); const k = clips.at(-1); sketches.push(sketch(k[floor(k.length * (s === 'blueprint' ? .5 : .24))])); } },
    draw(c, t) {
      c.fillStyle = BG; c.fillRect(0, 0, 1200, 500);
      for (const [a, b, s] of W) { const k = E.io(seg(t, a, a + .2)) * (1 - E.io(seg(t, b - .18, b))); if (k > 0) { c.globalAlpha = k; txt(c, s, 600, 462, '700 44px Inter', INK, 'center', '-1.4px'); c.globalAlpha = 1; } }
      const FIELD = [200, 160, 800, 112], msg = 'a ball that jumps';
      // ask
      const open = t > 11 ? E.io5(seg(t, 11, 11.46)) : 1, split = E.io5(seg(t, 1.7, 2.35));
      if (t < 1.75 || t > 10.95) {
        const f = t > 10.9 ? R([600 - 18, 216 - 18, 36, 36], FIELD, open) : FIELD, r = lerp(18, 56, open); shadow(c, f, min(r, f[3] / 2), open); if (t > 10.9 && open < .25) { circle(c, 600, 216, 18); c.fillStyle = '#FFFDF8'; c.fill(); }
        c.font = '700 42px Mono'; c.letterSpacing = '0px'; const x0 = 262, wv = c.measureText('/video ').width, n = t > 10.9 ? 0 : floor(seg(t, .25, 1.25) * msg.length + .01); c.globalAlpha = t > 10.9 ? seg(open, .7, 1) : 1; txt(c, '/video', x0, 231, '700 42px Mono', OR); txt(c, msg.slice(0, n), x0 + wv, 231, '400 42px Mono', INK); c.globalAlpha = 1;
        const bx = x0 + wv + c.measureText(msg.slice(0, n)).width + 24, go = t > 10.9 ? E.io(seg(open, .2, 1)) : 1, hop = t < 1.75 ? E.arc(seg(t, 1.3, 1.65)) * 46 : 0; ball(c, lerp(600, bx, go), 216 - hop, 18, { lit: 1 });
      }
      // four sketches
      const Q = i => [62 + i * 274, 112, 254, 254], part = i => [FIELD[0] + i * 200, FIELD[1], 200, FIELD[3]];
      const lift = E.io5(seg(t, 3.5, 4.05)), big = [600 - 152, 78, 304, 304], toCell = E.io5(seg(t, 5.35, 5.95));
      if (t >= 1.7 && t < 5.96) {
        for (let i = 0; i < 4; i++) {
          let b = R(part(i), Q(i), split), al = 1; b[1] += -14 * sin(PI * seg(t, 2.2 + i * .12, 2.7 + i * .12));
          if (i === PICK) { b = R(b, big, lift); b = R(b, [cx(0), CY, CW, CW], toCell); } else { b[1] += 60 * lift * lift; al = 1 - lift; } if (al <= 0) continue;
          c.globalAlpha = al; shadow(c, b, lerp(40, 20, split), al * (1 - toCell * .7)); const sk = seg(split, .35, 1); c.save(); rr(c, b[0], b[1], b[2], b[3], lerp(40, 20, split)); c.clip();
          c.globalAlpha = al * sk; c.drawImage(sketches[i], b[0] + 0, b[1], b[2], b[3]);
          if (i === PICK) { const k = E.io(seg(t, 4.15, 4.85)); if (k > 0) { c.globalAlpha = 1; c.beginPath(); c.rect(b[0], b[1], b[2] * k, b[3]); c.clip(); c.drawImage(clip(t - 4.85 + .84), b[0], b[1], b[2], b[3]); } }
          c.restore(); c.globalAlpha = 1;
          if (i === PICK) { const k = seg(t, 4.15, 4.85); if (k > 0 && k < 1) { const x = b[0] + b[2] * E.io(k); c.fillStyle = OR; c.fillRect(x - 2, b[1] - 10, 4, b[3] + 20); circle(c, x, b[1] - 12, 8); c.fill(); } const rg = E.out3(seg(t, 3.45, 3.75)) * (1 - E.io(seg(t, 4.0, 4.2))); if (rg > 0) { c.globalAlpha = rg; c.strokeStyle = OR; c.lineWidth = 5; rr(c, b[0] - 9, b[1] - 9, b[2] + 18, b[3] + 18, 27); c.stroke(); c.globalAlpha = 1; } }
        }
      }
      // the frame table, the frames, the check
      const join = E.io5(seg(t, 9.3, 9.95)), P = [600 - 170, 44, 340, 340];
      if (t >= 5.5 && t < 11) {
        const mag = t < 7.95 ? -1 : t < 8.45 ? lerp(-.6, 5, E.io(seg(t, 7.95, 8.45))) : t < 8.95 ? 5 : lerp(5, 7.9, E.io(seg(t, 8.95, 9.2)));
        for (let i = 7; i >= 0; i--) {
          const un = E.out5(seg(t, 5.72 + i * .03, 6.2 + i * .05)); if (un <= 0) continue; let b = [lerp(cx(0), cx(i), un), CY, CW, CW]; b = R(b, P, join); const r = lerp(14, 26, join), tx = b[0] + b[2] / 2;
          if (t < 11) { const gone = E.in3(seg(t, 10.85, 11)); if (gone > 0) b = R(b, [600 - 18, 216 - 18, 36, 36], gone); const rad = lerp(r, 18, gone); if (gone >= 1) continue; if (join > 0) { if (i === 0) shadow(c, b, rad, join * (1 - gone)); }
            if (join < 1) {
              c.globalAlpha = (1 - join) * un; c.fillStyle = '#FBF6EC'; rr(c, ...b, r); c.fill(); c.strokeStyle = 'rgba(30,25,21,.28)'; c.lineWidth = 2; c.setLineDash([7, 6]); rr(c, b[0] + 1, b[1] + 1, b[2] - 2, b[3] - 2, r); c.stroke(); c.setLineDash([]);
              const p = POSE[i], gy = CY + 96; c.strokeStyle = 'rgba(30,25,21,.35)'; c.beginPath(); c.moveTo(tx - 36, gy); c.lineTo(tx + 36, gy); c.stroke(); c.strokeStyle = OR; c.lineWidth = 3.5; if (p[0] === 'f') { for (let k = 0; k < 5; k++) { const a = TAU * k / 5 - PI / 2; c.beginPath(); c.ellipse(tx + 15 * cos(a), gy - 34 + 15 * sin(a), 14, 8, a, 0, TAU); c.stroke(); } } else { c.beginPath(); c.ellipse(tx, gy - 18 * p[1] - p[2], 18 * p[0], 18 * p[1], 0, 0, TAU); c.stroke(); }
              txt(c, (CELLS[i] * 3.5).toFixed(1) + ' s', tx, CY - 22, '700 27px Mono', 'rgba(30,25,21,.62)', 'center'); c.globalAlpha = 1;
              const dr = E.out3(seg(t, 6.8 + i * .09, 7.15 + i * .09)); if (dr > 0 && (i === 0 || join < 1)) { c.save(); rr(c, ...b, r); c.clip(); c.globalAlpha = 1 - .0 * join; const im = clips[PICK][floor(CELLS[i] * clips[PICK].length)]; c.beginPath(); c.rect(b[0], b[1] + b[3] * (1 - dr), b[2], b[3] * dr); c.clip();
                if (i === 5 && t < 8.85) { const fl = seg(t, 8.6, 8.85); c.translate(tx, b[1] + b[3] / 2); c.rotate(PI * (1 - E.io5(fl))); c.drawImage(im, -b[2] / 2, -b[3] / 2, b[2], b[3]); } else c.drawImage(im, ...b); c.restore(); }
              const ok = i === 5 ? E.back(seg(t, 8.85, 9.1)) : E.back(seg(mag, i, i + .5)); if (ok > 0 && t > 7.95) { c.save(); c.globalAlpha = (1 - join); c.translate(tx, CY + CW + 30); c.scale(max(0, ok), max(0, ok)); circle(c, 0, 0, 17); c.fillStyle = GREEN; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4.5; c.lineCap = 'round'; c.lineJoin = 'round'; poly(c, [[-7, 0], [-2, 6], [8, -6]]); c.stroke(); c.restore(); }
            }
            if (join > .6 && i === 0) { c.globalAlpha = seg(join, .6, 1); pic(c, clip(t - 9.95), b, rad); c.globalAlpha = 1; }
            if (gone > .6 && i === 0) { ball(c, 600, 216, 18, { lit: 1 }); } }
        }
        if (mag > -.6 && mag < 7.9 && t < 9.25) { const x = lerp(cx(0), cx(1), mag) + CW / 2, bad = t > 8.45 && t < 8.8, k = seg(t, 7.95, 8.05); c.globalAlpha = k * (1 - seg(t, 9.12, 9.2)); c.strokeStyle = bad ? '#D22F1F' : INK; c.lineWidth = bad ? 8 : 6; circle(c, x, CY + CW / 2, 80 + (bad ? 5 * sin(t * 40) * (1 - seg(t, 8.45, 8.7)) : 0)); c.stroke(); c.lineCap = 'round'; c.lineWidth = 11; c.beginPath(); c.moveTo(x + 59, CY + CW / 2 + 59); c.lineTo(x + 92, CY + CW / 2 + 92); c.stroke(); c.globalAlpha = 1; }
      }
      if (t > 10.94 && t <= 11) ball(c, 600, 216, 18, { lit: 1 });
    },
  });
}
