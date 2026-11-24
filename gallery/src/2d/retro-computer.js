// Retro computer: an invented machine with its own windows (side tabs, dotted shadows). The ball breaks out of its
// window, and the old machine says something too modern. 200 by 200 thick pixels on curved glass with scan lines.
{
  const N = 200, D = 4, C = { bg: '#0F4A4F', dot: '#1C666A', pap: '#F2E6C4', ink: '#10202A', or: '#FF6A1F', ol: '#FFB070', tab: '#E9B949', sh: '#08292E', red: '#C8372D' }; let lo, g, src, map;
  const R = (x, y, w, h, c) => { g.fillStyle = C[c]; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
  const win = (x, y, w, h, name, k) => { // slow draw: the window is drawn line by line
    const hh = floor(h * k); if (hh < 2) return false;
    for (let j = 0; j < hh; j += 2) for (let i = (j / 2) % 2 * 2; i < w; i += 4) R(x + 5 + i, y + 5 + j, 2, 2, 'sh');
    R(x, y, w, hh, 'ink'); R(x + 2, y + 2, w - 4, max(0, hh - 4), 'pap'); R(x - 10, y + 6, 10, min(hh, 34), 'ink'); R(x - 8, y + 8, 8, max(0, min(hh - 10, 30)), 'tab'); if (hh > 24) for (let i = 0; i < 3; i++) R(x - 6, y + 12 + i * 8, 4, 4, 'ink');
    if (name && hh > 16) { bits(g, name, x + 8, y + 7, 1, C.ink); R(x + 2, y + 18, w - 4, 1, 'ink'); } return k >= 1;
  };
  const pball = (cx, cy, r, sq = 0) => { cx |= 0; cy |= 0; const rx = r + sq, ry = r - sq; for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) { const d = (x / (rx + .6)) ** 2 + (y / (ry + .6)) ** 2; if (d <= 1) R(cx + x, cy + y, 1, 1, 'or'); else if ((x / (rx + 1.7)) ** 2 + (y / (ry + 1.7)) ** 2 <= 1) R(cx + x, cy + y, 1, 1, 'ink'); } for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { if ((x / (rx + .3)) ** 2 + (y / (ry + .3)) ** 2 > 1) continue; const l = -x * .6 - y * .8; if (l > r * .45 && (x + y) % 2 === 0 || l > r * .8) R(cx + x, cy + y, 1, 1, 'ol'); if (l < -r * .5 && (x + y) % 2 === 0) R(cx + x, cy + y, 1, 1, 'red'); } };
  scene({
    dur: D, blur: 1, ss: 2,
    init() {
      lo = mkc(N, N); g = lo.getContext('2d', { willReadFrequently: true });
      // Screen map: for each output pixel, where it looks on the tube. Built once.
      map = new Float32Array(960 * 960 * 3); for (let y = 0; y < 960; y++) for (let x = 0; x < 960; x++) { const u = (x - 480) / 418, v = (y - 470) / 410, r2 = u * u + v * v, k = 1 + .055 * r2 + .02 * r2 * r2, U = u * k, V = v * k, e = max(abs(U), abs(V)), o = (y * 960 + x) * 3; map[o] = U; map[o + 1] = V; const q = Math.pow(Math.pow(abs(U), 9) + Math.pow(abs(V), 9), 1 / 9); map[o + 2] = q; }
    },
    draw(c, t0, f) {
      const t = floor(t0 * 12 + 1e-4) / 12, p = floor(t * 12 + .01);
      R(0, 0, N, N, 'bg'); for (let y = 0; y < N; y += 8) for (let x = (y / 8 % 2) * 4; x < N; x += 8) R(x, y, 2, 2, 'dot');
      R(0, 0, N, 15, 'pap'); R(0, 15, N, 2, 'ink'); pball(10, 7, 4); bits(g, 'BALL OS', 20, 4, 1, C.ink); bits(g, ['00:01', '00:02', '00:03', '00:04'][floor(t)], 164, 4, 1, C.ink);
      // Icons on the right: original shapes.
      for (let i = 0; i < 3; i++) { const y = 34 + i * 40; R(168, y, 22, 18, 'ink'); R(170, y + 2, 18, 14, i === 1 ? 'or' : 'pap'); R(172, y + 5, 10 - i * 2, 2, 'ink'); R(172, y + 9, 14 - i * 3, 2, 'ink'); }
      // Window 1: the ball sleeps, then jumps and breaks the top edge.
      win(22, 104, 92, 78, 'SLEEP', 1);
      const k2 = E.out2(seg(t, 1.0, 1.35)) * (1 - seg(t, 3.45, 3.7)), k3 = seg(t, 1.9, 2.15) * (1 - seg(t, 3.3, 3.5));
      if (k2 > 0) win(70, 30, 92, 66, 'JUMP', k2);
      let bx = 66, by = 163, sq = 0, rr0 = 13;
      if (t < .58) { sq = t > .33 ? 3 : 0; by += sq; } else if (t < 1.5) { const u = seg(t, .58, 1.5); bx = lerp(66, 116, u); by = lerp(163, 80, u) - E.arc(u) * 70; } else if (t < 3.3) { bx = 116; const q = t - 1.5; by = 80 - abs(sin(q * 5.2)) * 16 * Math.exp(-q * .9); sq = abs(sin(q * 5.2)) < .25 ? 2 : 0; } else { const u = seg(t, 3.3, 3.85); bx = lerp(116, 66, u); by = lerp(80, 163, u) - E.arc(u) * 46; if (t > 3.85) sq = 3, by += 2; }
      const hole = t > .62 && t < 3.9; if (hole) { for (const [x, w] of [[56, 26]]) { R(x, 104, w, 3, 'bg'); R(x - 2, 100, 3, 7, 'ink'); R(x + w, 99, 3, 8, 'ink'); } if (t < 1.2) for (let i = 0; i < 6; i++) { const q = (t - .62); R(58 + i * 4 + (i - 3) * q * 40, 100 - q * 60 + q * q * 180 + i % 2 * 4, 2, 2, 'ink'); } }
      if (t < .58 || t > 3.9) { const z = p % 6; bits(g, 'Z', 84 + (z >> 1), 142 - z * 2, 1, C.ink); }
      pball(bx, by, rr0, sq);
      // The message: too modern.
      if (k3 > 0 && win(24, 108, 156, 70, '', k3)) { const s1 = 'I MADE A VIDEO', s2 = 'OF THIS.', n = floor((t - 2.15) * 30); bits(g, s1.slice(0, clamp(n, 0, 14)), 34, 118, 1.5, C.ink); bits(g, s2.slice(0, clamp(n - 14, 0, 8)), 34, 136, 1.5, C.ink); const pr = t > 3.15; R(126 + (pr ? 1 : 0), 152 + (pr ? 1 : 0), 42, 18, 'ink'); R(128 + (pr ? 1 : 0), 154 + (pr ? 1 : 0), 38, 14, pr ? 'tab' : 'or'); bits(g, 'POST', 135 + (pr ? 1 : 0), 158 + (pr ? 1 : 0), 1, C.ink); }
      src = g.getImageData(0, 0, N, N).data;
      const im = c.createImageData(960, 960), o = im.data;
      for (let y = 0; y < 960; y++) for (let x = 0; x < 960; x++) {
        const i = y * 960 + x, U = map[i * 3], V = map[i * 3 + 1], q = map[i * 3 + 2], j = i * 4; o[j + 3] = 255;
        if (q < 1) {
          const sx = (U * .535 + .5) * N, sy = (V * .54 + .5) * N, X = clamp(floor(sx), 0, N - 1), Y = clamp(floor(sy), 0, N - 1), fy = sy - Y, scan = .74 + .34 * sin(PI * fy) ** 1.2, X2 = clamp(floor(sx + .22), 0, N - 1), X0 = clamp(floor(sx - .22), 0, N - 1);
          const edge = clamp((1 - q) * 14), vig = (1 - .32 * (U * U + V * V)) * E.io(edge), gl = max(0, 1 - hyp(U + .55, V + .72) * 1.15) * 26;
          o[j] = src[(Y * N + X2) * 4] * scan * vig * 1.2 + gl; o[j + 1] = src[(Y * N + X) * 4 + 1] * scan * vig * 1.2 + gl; o[j + 2] = src[(Y * N + X0) * 4 + 2] * scan * vig * 1.2 + gl * 1.1;
        } else {
          // Case: warm plastic, a lit inner lip, a small lamp.
          const d = q - 1, lip = d < .035 ? 1 : 0, sh = lip ? lerp(.22, .5, clamp(d / .035)) * (V > 0 ? 1.35 : .8) : .86 - .12 * V + .05 * (hash(x >> 1, y >> 1) - .5), L = d > .035 && d < .05 ? (V > 0 ? -.10 : .1) : 0; o[j] = 206 * (sh + L); o[j + 1] = 188 * (sh + L); o[j + 2] = 156 * (sh + L);
          const lx = (x - 866) / 8, ly = (y - 924) / 8, ld = lx * lx + ly * ly; if (ld < 1) { o[j] = 255; o[j + 1] = 120; o[j + 2] = 40; } else if (ld < 9) { const a = (1 - ld / 9) * .5; o[j] = lerp(o[j], 255, a); o[j + 1] = lerp(o[j + 1], 130, a); }
          if (y > 914 && y < 934 && x > 90 && x < 330 && ((x - 90) % 24) < 12) { o[j] *= .45; o[j + 1] *= .45; o[j + 2] *= .45; }
        }
      }
      c.putImageData(im, 0, 0);
    },
  });
}
