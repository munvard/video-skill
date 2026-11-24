// Isometric city: one tile is enough for a ball. It hops, and a city builds itself around it tile by tile, the sun
// crosses, windows light up, cars never stop, and the city folds back into one tile. Clean blocks, long soft shadows.
{
  const D = 4, A = 46, B = 26.5, N = 7, OX = 240, OY = 82; // 7 by 7 cells
  // Cell types: r = road, otherwise a building height (0 = park). The hero cell is the plaza in the middle.
  const M = ['2r35r42', 'rrrrrrr', '4r1p.r5'.replace('.', '2'), '3rp*pr2', '5r2p1r4', 'rrrrrrr', '2r43r31'];
  const pal = [['#F3E9DA', '#D9B9A0', '#B98D86'], ['#F0C9A4', '#D69A74', '#AF6F62'], ['#DCE7E6', '#A9C4C8', '#7D99A9'], ['#F6D97F', '#DDB05A', '#B6814C'], ['#E8B7A8', '#C98578', '#9D5F66']];
  const cells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) cells.push({ x, y, k: M[y][x], d: hyp(x - 3, y - 3), h: hash(x, y, 4) });
  cells.sort((a, b) => a.x + a.y - b.x - b.y);
  const P = (x, y, z = 0) => [OX + (x - y) * A, OY + (x + y) * B - z];
  const quad = (c, pts, f) => { poly(c, pts, true); c.fillStyle = f; c.fill(); };
  const tint = (hex, n, l) => { const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); const nt = [38, 44, 96]; return `rgb(${v.map((q, i) => Math.round(lerp(q * l, nt[i] + q * .16, n))).join(',')})`; };
  scene({
    dur: D, fps: 20, blur: 6, shutter: .45,
    draw(c, t) {
      // Loop phase: the city is complete at frame 0, folds at dusk, and grows again at dawn.
      const build = cell => { const s = cell.d * .095 + cell.h * .05, out = E.in3(seg(t, 1.75 + (4.4 - cell.d) * .1, 2.1 + (4.4 - cell.d) * .1)), inn = E.back(seg(t, 2.75 + s, 3.15 + s), 1.5); return t < 2.6 ? 1 - out : inn; };
      const night = E.io(seg(t, .55, 1.35)) * (1 - E.io(seg(t, 2.45, 3.0))), sun = t < 2.4 ? lerp(.25, 1, seg(t, 0, 1.6)) : lerp(-.8, .25, E.io(seg(t, 2.5, 4))), L = 1;
      const bg = c.createLinearGradient(0, 0, 0, 480); bg.addColorStop(0, mix('#BFE0E6', '#1B1F4B', night)); bg.addColorStop(1, mix('#F6E6CF', '#3A2B6B', night)); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      const zoom = 1 + .05 * cos(TAU * t / D); c.translate(240, 250); c.scale(zoom, zoom); c.translate(-240, -250);
      const hero = cells.find(q => q.k === '*');
      const sdx = -.9 * sun, sdy = .55 + .25 * abs(sun); // shadow direction on the ground, in cells per unit of height
      const st = new Map(cells.map(q => [q, q.k === '*' ? 1 : build(q)]));
      // Ground slabs.
      for (const q of cells) { const b = st.get(q); if (b <= 0) continue; const dz = (1 - b) * (t < 2.6 ? -120 : 200), al = clamp(b * 3), s = .985, o = (1 - s) / 2, f = (u, v, z = 0) => P(q.x + o + u * s, q.y + o + v * s, z + dz); c.globalAlpha = al;
        const base = q.k === 'r' ? '#8F8A99' : q.k === 'p' || q.k === '*' ? '#A7C77E' : '#E6DAC6';
        quad(c, [f(0, 1), f(1, 1), f(1, 1, -13), f(0, 1, -13)], tint('#B79C86', night, .95)); quad(c, [f(1, 0), f(1, 1), f(1, 1, -13), f(1, 0, -13)], tint('#8E7672', night, .95)); quad(c, [f(0, 0), f(1, 0), f(1, 1), f(0, 1)], tint(q.k === '*' ? '#EFE0C4' : base, night, L));
        if (q.k === 'r') { const hz = M[q.y][q.x - 1] === 'r' && M[q.y][q.x + 1] === 'r', vt = M[q.y - 1]?.[q.x] === 'r' && M[q.y + 1]?.[q.x] === 'r'; const col = tint('#F3E9DA', night * .6, 1); if (hz !== vt) for (let i = 0; i < 2; i++) { const u = .18 + i * .5; hz ? quad(c, [f(u, .47), f(u + .24, .47), f(u + .24, .53), f(u, .53)], col) : quad(c, [f(.47, u), f(.53, u), f(.53, u + .24), f(.47, u + .24)], col); } }
        if (q.k === '*') { const [px, py] = f(.5, .5); c.strokeStyle = tint('#E08A4E', night * .5, 1); c.lineWidth = 3; c.beginPath(); c.ellipse(px, py, 30, 17, 0, 0, TAU); c.stroke(); }
        c.globalAlpha = 1; }
      // Shadows on the ground.
      c.save(); c.globalAlpha = .26 * (1 - night); c.fillStyle = '#4A3F78'; c.filter = 'blur(1.6px)'; c.beginPath(); for (const q of cells) { const b = st.get(q), hh = +q.k; if (!(hh > 0) || b < .5) continue; const H = hh * .55 * b; const g = [[.14, .14], [.86, .14], [.86, .86], [.14, .86]].map(([u, v]) => [q.x + u, q.y + v]); const all = [...g, ...g.map(([u, v]) => [u + sdx * H, v + sdy * H])]; const cx = all.reduce((a, p) => a + p[0], 0) / 8, cy = all.reduce((a, p) => a + p[1], 0) / 8; void cx; void cy; // convex hull
        all.sort((a, p) => a[0] - p[0] || a[1] - p[1]); const cr = (o, a, p) => (a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]), lo = [], hi = []; for (const p of all) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); } for (const p of all.reverse()) { while (hi.length > 1 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); } [...lo.slice(0, -1), ...hi.slice(0, -1)].forEach((p, i) => { const s = P(clamp(p[0], 0, N), clamp(p[1], 0, N)); i ? c.lineTo(...s) : c.moveTo(...s); }); c.closePath(); } c.fill(); c.restore();
      // Cars on the two ring roads. One lap per loop, and they never stop.
      const cars = []; const ring = s => { s = fr(s) * 16; const a = 1.5, b = 5.5; if (s < 4) return [a + s, a, 0]; if (s < 8) return [b, a + s - 4, 1]; if (s < 12) return [b - (s - 8), b, 2]; return [a, b - (s - 12), 3]; };
      for (let i = 0; i < 6; i++) { const [x, y, d] = ring(t / D + i / 6), q = cells.find(k => k.x === floor(x) && k.y === floor(y)); if (st.get(q) > .97) cars.push({ x, y, d, i }); }
      // Hero: plaza, then roof to roof during the night, and home.
      const stops = [[3.5, 3.5, 0], [4.5, 2.5, 2 * 28], [4.5, 4.5, 28], [2.5, 4.5, 2 * 28], [3.5, 3.5, 0]], ht = [.35, .8, 1.25, 1.7, 2.1]; let bx = 3.5, by = 3.5, bz = 0, sq = 0;
      for (let i = 0; i < 4; i++) { if (t >= ht[i] && t < ht[i + 1]) { const u = seg(t, ht[i], ht[i + 1] - .1), a = stops[i], b = stops[i + 1]; bx = lerp(a[0], b[0], u); by = lerp(a[1], b[1], u); bz = lerp(a[2], b[2], u) + E.arc(u) * 46; if (u >= 1) sq = .22 * sin(PI * seg(t, ht[i + 1] - .1, ht[i + 1])); } } if (t < .35) sq = .2 * sin(PI * seg(t, .18, .35));
      if (t > 2.3 && t < 2.8) { bz = 30 * E.arc(seg(t, 2.3, 2.72)); } if (t > 2.72 && t < 2.9) sq = .3 * sin(PI * seg(t, 2.72, 2.9));
      const heroDraw = () => { const [x, y] = P(bx, by, bz), g = P(bx, by, 0), R = 20; const roof = stops.find(s => abs(s[0] - bx) < .3 && abs(s[1] - by) < .3); const sh = roof ? P(bx, by, roof[2]) : g; c.save(); c.globalAlpha = .4; c.fillStyle = '#3A2A55'; c.beginPath(); c.ellipse(sh[0] - 3, sh[1] + 1, 15, 7.5, 0, 0, TAU); c.fill(); c.restore(); if (night > 0) { const gl = c.createRadialGradient(x, y - R, 4, x, y - R, 70); gl.addColorStop(0, `rgba(255,150,70,${.5 * night})`); gl.addColorStop(1, 'rgba(255,150,70,0)'); c.fillStyle = gl; c.fillRect(x - 70, y - 90, 140, 140); } ball(c, x, y - R * (1 - sq), R, { sx: 1 + sq, sy: 1 - sq, lit: 1 }); };
      let heroDone = false;
      for (const q of cells) {
        const b = st.get(q), hh = +q.k, dz = (1 - b) * (t < 2.6 ? -120 : 200); const f = (u, v, z) => P(q.x + u, q.y + v, z + dz);
        for (const k of cars) if (floor(k.x) === q.x && floor(k.y) === q.y) { const lane = .17, w = k.d % 2 ? [.11, .2] : [.2, .11], ox = k.d === 1 ? lane : k.d === 3 ? -lane : 0, oy = k.d === 0 ? -lane : k.d === 2 ? lane : 0, X = k.x + ox, Y = k.y + oy, col = ['#D9483B', '#F4F1EA', '#3E7CB1', '#F2B33D', '#4C9A74', '#F4F1EA'][k.i], bx3 = (z0, z1, s, cc) => { const a = (u, v, z) => P(X + u * w[0] * s, Y + v * w[1] * s, z); quad(c, [a(-1, 1, z0), a(1, 1, z0), a(1, 1, z1), a(-1, 1, z1)], tint(cc, night * .7, .86)); quad(c, [a(1, -1, z0), a(1, 1, z0), a(1, 1, z1), a(1, -1, z1)], tint(cc, night * .7, .7)); quad(c, [a(-1, -1, z1), a(1, -1, z1), a(1, 1, z1), a(-1, 1, z1)], tint(cc, night * .7, 1)); }; c.globalAlpha = .3; quad(c, [P(X - w[0], Y - w[1]), P(X + w[0], Y - w[1]), P(X + w[0], Y + w[1] + .06), P(X - w[0], Y + w[1] + .06)], '#2A2340'); c.globalAlpha = 1; bx3(2, 8, 1, col); bx3(8, 13, .62, '#DDE8EE'); }
        if (hh > 0 && b > 0) {
          const H = hh * 28 * (b < 1 ? clamp(b) : b), p = pal[floor(q.h * 4.99)], o = .12, e = 1 - o; c.globalAlpha = clamp(b * 3);
          quad(c, [f(o, e, 0), f(e, e, 0), f(e, e, H), f(o, e, H)], tint(p[1], night, 1)); quad(c, [f(e, o, 0), f(e, e, 0), f(e, e, H), f(e, o, H)], tint(p[2], night, 1)); quad(c, [f(o, o, H), f(e, o, H), f(e, e, H), f(o, e, H)], tint(p[0], night, 1));
          const r = .2, g = 1 - r; quad(c, [f(r, r, H), f(g, r, H), f(g, g, H), f(r, g, H)], tint(p[0], night, .9));
          for (let z = 0; z < hh; z++) for (let w = 0; w < 3; w++) { const u0 = .22 + w * .205, u1 = u0 + .13, z0 = (z * 28 + 8) * H / (hh * 28), z1 = (z * 28 + 21) * H / (hh * 28); const lit = s => night > .1 + .8 * hash(q.x * 9 + z, q.y * 7 + w, s) && hash(q.x + z * 3, q.y + w, s) > .3; quad(c, [f(u0, e, z0), f(u1, e, z0), f(u1, e, z1), f(u0, e, z1)], lit(1) ? '#FFD488' : tint('#7FA3B5', night, .9)); quad(c, [f(e, u0, z0), f(e, u1, z0), f(e, u1, z1), f(e, u0, z1)], lit(2) ? '#FFB964' : tint('#5F7F97', night, .85)); }
          if (q.h > .6) { const [tx, ty] = f(.36, .36, H); c.strokeStyle = tint('#8A5A5A', night, 1); c.lineWidth = 2.5; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx, ty - 20); c.stroke(); circle(c, tx, ty - 21, 3); c.fillStyle = night > .4 ? '#FF6A4A' : '#D9583F'; c.fill(); }
          c.globalAlpha = 1;
        }
        if (q.k === 'p' && b > .1) for (const [u, v, s] of [[.3, .35, 1], [.7, .65, .8]]) { const [x, y] = f(u, v, 0); c.fillStyle = tint('#7A5A48', night, 1); c.fillRect(x - 2, y - 10 * b, 4, 10 * b); for (const [dx, dy, r, cc] of [[0, -18, 11, '#5E9A5B'], [-3, -21, 7, '#86BC6C']]) { circle(c, x + dx * s, y + dy * s * b, r * s * b); c.fillStyle = tint(cc, night, 1); c.fill(); } }
        if (!heroDone && q.x + q.y >= floor(bx) + floor(by) && q.x === floor(bx) && q.y === floor(by)) { heroDraw(); heroDone = true; }
      }
      if (!heroDone || bz > 20) heroDraw();
    },
  });
}
