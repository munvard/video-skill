// Pixel art: 120 by 120 pixels at 4x, 16 colors, an original night valley. A tiny hero ball runs over holes and wakes lamps.
// Everything is drawn on whole pixels and the hero moves on 12 poses a second.
{
  const P = ['#140f2b', '#231a4a', '#3a2a6b', '#5f3f8c', '#9455a0', '#d9779a', '#ffb08c', '#ffe3b0', '#0f2d3f', '#17524f', '#2c7d5b', '#6fb865', '#ff6a1f', '#ffa24a', '#b83a10', '#fff6dc'];
  const N = 120, D = 4, PER = 240; let cv, g;
  const px = (x, y, w, h, i) => { g.fillStyle = P[i]; g.fillRect(x | 0, y | 0, w, h); };
  // Ground line of the world: holes at known places, two steps up.
  const holes = [[46, 64], [150, 174]], gy = x => { x = ((x % PER) + PER) % PER; for (const [a, b] of holes) if (x >= a && x < b) return 999; return x > 92 && x < 128 ? 84 : x > 190 && x < 214 ? 88 : 94; };
  const tree = (x, y, s, i) => { for (let k = 0; k < s; k++) { const w = 1 + floor(k * .62) + (k % 4 === 3 ? -1 : 0); px(x - w, y - s + k, w * 2 + 1, 1, i); } px(x, y, 1, 3, i); };
  // Hero jumps: [take off, land] in world x.
  const hops = [[36, 72], [84, 100], [118, 136], [142, 182], [184, 198], [206, 226]];
  scene({
    dur: D, blur: 1, ss: 1,
    init() { cv = mkc(N, N); g = cv.getContext('2d'); },
    draw(c, t0, f) {
      const t = floor(t0 * 24 + 1e-4) / 24, run = seg(t, .6, 3.8), cam = floor(PER * (run < .12 ? run * run / .24 : run > .88 ? 1 - (1 - run) ** 2 / .24 : .06 + (run - .12) * .88 / .76)), a12 = floor(t0 * 12 + 1e-4);
      // Sky with ordered dither between bands.
      for (let y = 0; y < N; y++) { const v = min(6, y / 15), lo = floor(v), k = fr(v); for (let x = 0; x < N; x++) { const b = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][y & 3][x & 3] / 16; px(x, y, 1, 1, min(6, lo + (k > b ? 1 : 0))); } }
      for (let i = 0; i < 26; i++) { const x = floor(hash(i, 1) * 120), y = floor(hash(i, 2) * 46); if ((a12 + i * 5) % 16 > 1) px(x, y, 1, 1, i % 4 ? 5 : 15); }
      // Moon with a bite of shade.
      for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const d = x * x + y * y; if (d < 148) px(88 + x, 24 + y, 1, 1, (x + 4) ** 2 + (y + 3) ** 2 < 104 ? 15 : 7); }
      px(85, 19, 3, 2, 7); px(90, 27, 2, 2, 7); px(82, 26, 2, 1, 7);
      // Far mountains, period 60, and near hills, period 120. Both close exactly on the loop.
      for (let x = 0; x < N; x++) { const w = (x + floor(cam / 4)) % 60, h = 22 + floor(abs(((w * 1.0) % 30) - 15) * -1 + 15) + (w > 30 ? 6 : 0) - abs(w - 44) * .2; px(x, 92 - floor(h), 1, 60, 4); if (w % 30 > 10 && w % 30 < 20) px(x, 92 - floor(h), 1, 2 + (w & 1), 5); }
      for (let x = 0; x < N; x++) { const w = (x + floor(cam / 2)) % 120, h = 16 + floor(6 * sin(w / 120 * TAU) + 4 * sin(w / 120 * TAU * 3 + 1)); px(x, 92 - h, 1, 60, 3); if (w % 7 === 3) tree(x, 93 - h, 8 + (w % 5), 2); }
      for (let i = -1; i < 3; i++) { const x = i * 120 - (cam % 120) + 20; tree(x, 92, 34, 1); tree(x + 24, 92, 22, 1); tree(x + 74, 92, 27, 1); }
      // Ground.
      for (let x = 0; x < N; x++) { const wx = x + cam, y = gy(wx), w = ((wx % PER) + PER) % PER; if (y > 900) { px(x, 112, 1, 8, 8); if ((w + a12) % 5 === 0) px(x, 112, 2, 1, 5); continue; } px(x, y, 1, 2, 11); px(x, y + 2, 1, 2, 10); px(x, y + 4, 1, 40, 9); if (hash(w, 4) > .6) px(x, y - 1, 1, 1, 11); if (hash(w, 5) > .9) px(x, y - 3, 1, 3, 10); for (let k = 0; k < 4; k++) if (hash(w, 9 + k) > .82) px(x, y + 8 + k * 6, 2, 2, 8); if (gy(wx - 1) !== y || gy(wx + 1) !== y) px(x, y + 2, 1, 40, 8); }
      // Hero position in world space.
      const hx = 34, wx = ((cam + hx) % PER + PER) % PER; let hop = null; for (const h of hops) if (wx >= h[0] && wx < h[1]) hop = h;
      const u = hop ? (wx - hop[0]) / (hop[1] - hop[0]) : 0, base = hop ? lerp(min(gy(hop[0]), 99), min(gy(hop[1]), 99), u) : gy(wx), still = t < .6 || t > 3.8, up = hop ? E.arc(u) * (hop[1] - hop[0] > 30 ? 30 : 14) : still ? 0 : (a12 % 2);
      const by = floor(base - up), sq = !hop && hops.some(h => wx >= h[1] && wx < h[1] + 4) ? 1 : 0;
      // Lamps wake when the hero passes and sleep behind the frame.
      for (const lx of [20, 80, 112, 140, 202, 230]) for (const o of [-PER, 0, PER]) {
        const x = lx + o - cam; if (x < -20 || x > 140) continue; const y = gy(lx), on = x < hx + 4;
        if (on) for (let yy = -13; yy <= 13; yy++) for (let xx = -13; xx <= 13; xx++) { const d = xx * xx + yy * yy; if (d < 150 && (d < 60 ? (xx + yy) & 1 : ((xx & 1) === 0 && (yy & 1) === 0)) && (yy - 15 + y) < y) px(x + xx, y - 15 + yy, 1, 1, 6); }
        px(x, y - 12, 1, 12, 0); px(x - 2, y - 17, 5, 5, on ? 7 : 2); px(x - 1, y - 16, 3, 3, on ? 15 : 3); px(x - 2, y - 18, 5, 1, 0);
      }
      // Hungry flowers live in the holes.
      for (const [A, B] of holes) for (const o of [-PER, 0, PER]) { const x = floor((A + B) / 2) + o - cam; if (x < -20 || x > 140) continue; const near = abs(x - hx) < 20, y = 102 - (near ? 6 : 0) + (a12 % 4 < 2 ? 0 : 1), m = near && a12 % 2 ? 1 : 0; px(x, y, 1, 14, 10); px(x - 4, y - 3 - m, 9, 2, 4); px(x - 3, y - 5 - m, 7, 2, 5); px(x - 4, y + m, 9, 2, 4); for (let k = -3; k <= 3; k += 2) { px(x + k, y - 1 - m, 1, 1, 15); } }
      // Dust and the hero.
      for (let k = 1; k < 5; k++) { const q = ((wx - k * 5) % PER + PER) % PER; if (!hop && !still && gy(q) < 900) px(hx - 4 - k * 4, by - 1 - ((a12 + k) % 3), 1, 1, 7); }
      if (t < .45 || t > 3.9) { const z = a12 % 6; px(hx + 8, by - 14 - z, 4, 1, 7); px(hx + 10, by - 13 - z, 1, 1, 7); px(hx + 9, by - 12 - z, 1, 1, 7); px(hx + 8, by - 11 - z, 4, 1, 7); }
      const blink = t < .45 || t > 3.9 || a12 % 22 === 4, rows = sq ? [[3, 5], [1, 9], [0, 11], [0, 11], [0, 11], [1, 9]] : [[3, 5], [1, 7], [0, 9], [0, 9], [0, 9], [0, 9], [1, 7], [3, 5]], off = sq ? 5 : 4, H = rows.length;
      rows.forEach(([x, w], i) => { px(hx - off + x - 1, by - H + i, w + 2, 1, 0); });
      px(hx - off + 2, by - H - 1, sq ? 6 : 5, 1, 0);
      rows.forEach(([x, w], i) => { px(hx - off + x, by - H + i, w, 1, i > H - 3 ? 14 : 12); if (i < H - 3) px(hx - off + x, by - H + i, max(2, w >> 1), 1, i < 3 ? 13 : 12); });
      px(hx - off + 3, by - H + 1, 2, 1, 7);
      if (!blink) { px(hx + 1, by - H + 3, 1, 2, 0); px(hx + 3, by - H + 3, 1, 2, 0); } else px(hx + 1, by - H + 4, 3, 1, 0);
      // Fireflies.
      for (let i = 0; i < 7; i++) { const x = (floor(hash(i, 31) * 120 + sin(TAU * t / D + i) * 9) - floor(cam / 2) % 120 + 240) % 120, y = floor(62 + hash(i, 32) * 26 + cos(TAU * t / D * 2 + i * 2) * 4); if ((a12 + i * 3) % 8 < 5) px(x, y, 1, 1, 7); }
      c.imageSmoothingEnabled = false; c.drawImage(cv, 0, 0, 480, 480);
    },
  });
}
