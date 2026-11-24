// Map journey: a flat paper map; where the ball lands, the land stands up as real terrain, with light and shadow.
// Software height field: an island made from noise, drawn back to front, lit by one low sun. Invented places.
{
  const D = 4, G = 300; let hgt, shade, PAPER, cls;
  const stops = [[.22, .62, 'Low Bay'], [.5, .36, 'Long Hill'], [.79, .6, 'North Cape']];
  const H = (x, y) => hgt[clamp(floor(y * G), 0, G - 1) * G + clamp(floor(x * G), 0, G - 1)];
  scene({
    dur: D, blur: 5, shutter: .45,
    init() {
      hgt = new Float32Array(G * G); shade = new Float32Array(G * G); cls = [];
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const x = i / G, y = j / G; let h = fbm(x * 4.2 + 3, y * 4.2 + 8, 5, 5) * .9; let m = 0; for (const [a, b, r] of [[.22, .62, .2], [.5, .38, .26], [.79, .6, .2], [.5, .62, .2]]) m = max(m, 1 - ((x - a) ** 2 + (y - b) ** 2) / (r * r)); h = h * .55 + m * .5 - .36; const pk = Math.exp(-((x - .5) ** 2 + (y - .3) ** 2) * 60) * .34 * (.6 + .8 * fbm(x * 12, y * 12, 2, 3)); hgt[j * G + i] = max(0, h + pk * (m > 0 ? 1 : 0)); }
      // Low sun from the left: march toward the light once, for the raised land.
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const h = hgt[j * G + i], dx = hgt[j * G + min(G - 1, i + 1)] - hgt[j * G + max(0, i - 1)], dy = hgt[min(G - 1, j + 1) * G + i] - hgt[max(0, j - 1) * G + i]; let l = clamp(.72 - dx * 16 - dy * 7, .25, 1.25), s = 1; for (let k = 2; k < 60; k += 2) { const a = i - k, b = j - k * .45; if (a < 0 || b < 0) break; if (hgt[floor(b) * G + a] > h + k * .0052) { s = .62; break; } } shade[j * G + i] = l * s; }
      PAPER = new Float32Array(G * G); for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { let p = 1 + (fbm(i / 16, j / 16, 3, 3) - .45) * .12; for (const f of [.25, .5, .75]) { p -= .05 * Math.exp(-(((i / G - f) * 160) ** 2)) - .03 * Math.exp(-(((i / G - f) * 160 - 1.5) ** 2)); } p -= .05 * Math.exp(-(((j / G - .5) * 160) ** 2)); PAPER[j * G + i] = p; }
    },
    draw(c, t) {
      // Ball travels stop to stop in three hops. The land around the last stop is up, and lies down when it leaves.
      const hop = [[.35, 1.15, 0, 1], [1.5, 2.3, 1, 2], [2.75, 3.65, 2, 0]]; let x, y, up = 0, sq = 0; const at = [0, 0, 0]; let cur = 0; x = stops[0][0]; y = stops[0][1];
      for (const [a, b, p, q] of hop) { const u = seg(t, a, b); if (t >= a && t < b) { const k = E.io(u); x = lerp(stops[p][0], stops[q][0], k); y = lerp(stops[p][1], stops[q][1], k); up = E.arc(u) * (q === 0 ? .36 : .26); } if (t >= b) { x = stops[q][0]; y = stops[q][1]; cur = q; } }
      for (const [a, b] of [[0, .35], [1.15, 1.5], [2.3, 2.75], [3.65, 4]]) { if (t >= a && t < b) sq = a ? .24 * Math.exp(-(t - a) * 12) * cos((t - a) * 34) : 0; const pr = sin(PI * seg(t, b - .16, b)); if (t < b && b < 4) sq += .16 * pr; }
      at[0] = max(1 - E.io(seg(t, .55, 1.1)), E.back(seg(t, 3.5, 3.95), 1.2)); at[1] = E.back(seg(t, 1.0, 1.4), 1.3) * (1 - E.io(seg(t, 1.75, 2.25))); at[2] = E.back(seg(t, 2.15, 2.55), 1.3) * (1 - E.io(seg(t, 3.0, 3.5)));
      const bg = c.createLinearGradient(0, 0, 0, 480); bg.addColorStop(0, '#3B2A24'); bg.addColorStop(1, '#1F1512'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      // Camera: slow drift toward the ball. Oblique view: x right, y into the page, height up.
      const cx = .5 + (x - .5) * .16, S = 500, TY = .9, HZ = 165, X = u => 240 + (u - cx) * S * 1.0, Y = v => 262 + (v - .5) * S * TY;
      const rise = (i, j) => { const u = i / G, v = j / G; let r = 0; for (let k = 0; k < 3; k++) { const d = hyp(u - stops[k][0], (v - stops[k][1]) * .9); r = max(r, at[k] * E.io(clamp(1.5 - d / .21))); } return r; };
      c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 50; c.shadowOffsetY = 34; c.fillStyle = '#EAD9B5'; c.fillRect(X(0), Y(0), X(1) - X(0), Y(1) - Y(0)); c.restore();
      const W = 480, im = c.getImageData(0, 0, 960, 960), o = im.data; void W;
      // Column renderer at 2x: for each screen column walk from back to front and fill spans upward.
      const ROW = G, yb = new Float32Array(960).fill(1e9);
      const r0 = new Float32Array(G * G); for (let j = 0; j < G; j += 1) for (let i = 0; i < G; i += 1) r0[j * G + i] = hgt[j * G + i] > 0 ? rise(i, j) : 0;
      const x0 = X(0) * 2, x1 = X(1) * 2;
      for (let px = max(0, Math.ceil(x0)); px < min(960, x1); px++) {
        const iu = clamp(floor((px - x0) / (x1 - x0) * G), 0, G - 1); let ymin = 961;
        for (let jj = ROW * 2 - 1; jj >= 0; jj--) { // front to back
          const j = jj / 2, ji = floor(j), idx = ji * G + iu, h = hgt[idx], r = r0[idx], z = h * r * HZ, sy = (Y((jj + .5) / (ROW * 2)) - z) * 2; if (sy >= ymin) continue;
          const pap = PAPER[idx], b = 250 * (h + .02);
          // Flat map ink: coast line, contours, soft tint.
          let R, Gc, B; const land = h > .001, nb = land !== (hgt[ji * G + min(G - 1, iu + 1)] > .001) || land !== (hgt[min(G - 1, ji + 1) * G + iu] > .001);
          if (!land) { const w = .5 + .5 * sin((ji + 2.5 * sin(iu * .12)) * .9), far = fbmLand[idx]; R = 178 - 12 * far; Gc = 203 - 4 * far; B = 196 + 2 * far; if (w > .96 && far > .3) { R -= 14; Gc -= 10; B -= 8; } } else { const cont = fr(h * 15) < .13; R = 236; Gc = 218; B = 176; if (cont) { R = 196; Gc = 158; B = 112; } }
          if (nb) { R = 92; Gc = 62; B = 48; }
          R *= pap; Gc *= pap; B *= pap;
          if (land && r > 0) { const q = h * 1.9, sh = shade[idx]; let a = [206, 186, 120], d = [98, 138, 78]; if (q > .5) { a = [98, 138, 78]; d = [132, 108, 84]; } if (q > .85) { a = [132, 108, 84]; d = [246, 240, 232]; } const k = q < .5 ? clamp(q / .5) : q < .85 ? (q - .5) / .35 : clamp((q - .85) / .25); const T = [0, 1, 2].map(n => lerp(a[n], d[n], k) * sh * 1.12); const e = clamp(r * 1.2); R = lerp(R, T[0] + 14, e); Gc = lerp(Gc, T[1] + 8, e); B = lerp(B, T[2] + 4, e); }
          const top = max(0, floor(sy)), bot = min(960, ymin === 961 ? floor(sy) + 2 : floor(ymin)); for (let yy = top; yy < bot; yy++) { const p = (yy * 960 + px) * 4; o[p] = R; o[p + 1] = Gc; o[p + 2] = B; o[p + 3] = 255; } ymin = sy;
        }
      }
      c.putImageData(im, 0, 0);
      const Z = (u, v) => { const i = clamp(floor(u * G), 0, G - 1), j = clamp(floor(v * G), 0, G - 1); return hgt[j * G + i] * rise(i, j) * HZ; };
      // Route: one color, drawn by the ball, worn away from the old end.
      c.strokeStyle = '#D9401C'; c.lineWidth = 4; c.lineCap = 'round'; c.setLineDash([1, 10]);
      for (const [a, b, p, q] of hop) { const u = E.io(seg(t, a, b)), out = E.io(seg(t, b + .4, b + 1.2)), P = stops[p], Q = stops[q]; if (u > out) { c.beginPath(); for (let k = 0; k <= 40; k++) { const w = lerp(out, u, k / 40), uu = lerp(P[0], Q[0], w), vv = lerp(P[1], Q[1], w); c.lineTo(X(uu), Y(vv) - Z(uu, vv) - 2); } c.stroke(); } } c.setLineDash([]);
      const bx = X(x), gy = Y(y) - Z(x, y), by = gy - up * 400 - 17;
      c.save(); c.globalAlpha = .45 * (1 - up * 1.6); c.fillStyle = '#3A1C10'; c.beginPath(); c.ellipse(bx + up * 90, gy + 1 + up * 30, 19 * (1 + up), 7, 0, 0, TAU); c.fill(); c.restore();
      ball(c, bx, by + sq * 14, 19, { sx: 1 + sq, sy: 1 - sq, lit: 1 });
      stops.forEach(([u, v, name], k) => { const a = clamp(at[k]) ** 2; if (a < .02) return; c.globalAlpha = a; c.font = '600 27px Fraunces'; c.textAlign = 'center'; c.letterSpacing = '.3px'; const tx = clamp(X(u), 84, 396), ty = Y(v) + 60; c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = 'rgba(244,232,202,.95)'; c.strokeText(name, tx, ty); c.fillStyle = '#4A2A1C'; c.fillText(name, tx, ty); c.globalAlpha = 1; });
    },
  });
  // Distance to the coast for the sea rings, filled once on first use.
  var fbmLand = new Float32Array(G * G).map((_, i) => { const x = i % G / G, y = floor(i / G) / G; let m = 0; for (const [a, b, r] of [[.22, .62, .26], [.5, .38, .32], [.79, .6, .26], [.5, .62, .26]]) m = max(m, 1 - ((x - a) ** 2 + (y - b) ** 2) / (r * r)); return clamp(m * 1.6); });
}
