// Paper collage: torn and cut paper on a table, on twos, with real cast shadows. A painted paper ball jumps off a paper
// boat, flips twice, is taped to the sky and becomes the sun; strips slide out as rays. Then it sinks and starts again.
{
  const D = 3.75; let P = {}, fiber;
  const torn = (c, pts, amp, seed) => { // jagged outline through points
    c.beginPath(); let k = 0; const n = pts.length; pts.forEach((a, i) => { const b = pts[(i + 1) % n], L = hyp(b[0] - a[0], b[1] - a[1]), m = max(1, floor(L / 5)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L; for (let j = 0; j < m; j++) { const u = j / m, e = (fbm((i * 50 + j) * .22, seed, 1, 3) - .48) * amp * 2; const x = lerp(a[0], b[0], u) + nx * e, y = lerp(a[1], b[1], u) + ny * e; k++ ? c.lineTo(x, y) : c.moveTo(x, y); } }); c.closePath();
  };
  // One piece of paper: white torn core, painted face, fibers. Kept as an image at 2x.
  const piece = (w, h, pts, col, o = {}) => {
    const cv = mkc((w + 40) * 2, (h + 40) * 2), c = cv.getContext('2d'); c.scale(2, 2); c.translate(20, 20);
    if (o.tear) { torn(c, pts, o.tear, o.seed || 1); c.fillStyle = '#FBF6EA'; c.fill(); c.save(); c.translate(o.dx || 0, o.dy || 3); torn(c, pts, o.tear * .9, (o.seed || 1) + .4); c.clip(); } else { poly(c, pts, true); c.save(); c.clip(); }
    c.fillStyle = col; c.fillRect(-20, -20, w + 40, h + 40);
    if (o.paint) o.paint(c, w, h);
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = .55; c.drawImage(fiber, (o.seed || 0) * 37 % 200, (o.seed || 0) * 61 % 200, 480, 480, -20, -20, 480, 480); c.restore();
    return { cv, w, h };
  };
  const put = (c, p, x, y, o = {}) => { const z = o.z || 6; c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(o.sx ?? 1, o.sy ?? 1); c.shadowColor = 'rgba(50,28,14,.42)'; c.shadowBlur = z * 2.4; c.shadowOffsetX = z * 1.3; c.shadowOffsetY = z * 1.9; c.globalAlpha = o.a ?? 1; c.drawImage(p.cv, -(p.w / 2 + 20), -(p.h / 2 + 20), p.w + 40, p.h + 40); c.restore(); };
  const disc = (R, n = 40, j = .02, s = 1) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU, q = R * (1 + (hash(i, s) - .5) * j); return [R + q * cos(a), R + q * sin(a)]; });
  scene({
    dur: D, blur: 1,
    init() {
      fiber = mkc(720, 720); const f = fiber.getContext('2d'), im = f.createImageData(720, 720), r = rng(5); for (let i = 0; i < 720 * 720; i++) { const v = 236 + (fbm(i % 720 / 14, floor(i / 720) / 14, 2, 3) - .5) * 46 + (r() - .5) * 16; im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v - 3; im.data[i * 4 + 3] = 255; } f.putImageData(im, 0, 0);
      const dry = (c, w, h, col) => { c.strokeStyle = col; c.lineCap = 'round'; for (let i = 0; i < 60; i++) { c.globalAlpha = .12 + .2 * hash(i, 4); c.lineWidth = 1 + 3 * hash(i, 5); const y = h * hash(i, 6); c.beginPath(); c.moveTo(-10 + w * .3 * hash(i, 7), y); c.quadraticCurveTo(w / 2, y + 12 * (hash(i, 8) - .5), w * (.6 + .5 * hash(i, 9)), y + 3); c.stroke(); } c.globalAlpha = 1; };
      P.sky = piece(440, 400, [[0, 0], [440, 0], [440, 400], [0, 400]], '#F0C9B0', { tear: 5, seed: 11, dx: 0, dy: 0, paint: (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7FB4B8'); g.addColorStop(.55, '#EFD7B4'); g.addColorStop(1, '#F2B79A'); c.fillStyle = g; c.fillRect(-20, -20, w + 40, h + 40); dry(c, w, h, '#fff'); } });
      P.m1 = piece(250, 210, [[0, 210], [88, 18], [112, 40], [134, 10], [250, 210]], '#5A4A6B', { tear: 4, seed: 2, dy: 5, paint: (c, w, h) => { c.strokeStyle = '#7A6890'; c.lineWidth = 2; for (let i = 0; i < 40; i++) { c.beginPath(); c.moveTo(-60 + i * 10, h); c.lineTo(40 + i * 10, 0); c.stroke(); } } });
      P.m2 = piece(280, 170, [[0, 170], [120, 10], [150, 36], [176, 22], [280, 170]], '#B5563F', { tear: 4, seed: 3, dy: 5, paint: (c, w, h) => { c.fillStyle = '#D9806A'; for (let i = 0; i < 26; i++) for (let j = 0; j < 16; j++) { circle(c, i * 12 + (j % 2) * 6, j * 12, 2.4); c.fill(); } } });
      const wave = (col, s, paint) => piece(560, 130, [[0, 24], [70, 8], [140, 26], [210, 6], [280, 24], [350, 8], [420, 26], [490, 8], [560, 24], [560, 130], [0, 130]], col, { tear: 5, seed: s, dy: 6, paint });
      P.w1 = wave('#2C6E7F', 5, (c, w, h) => dry(c, w, h, '#9AD0CF')); P.w2 = wave('#1F4F66', 6, (c, w, h) => { c.strokeStyle = '#4D8CA0'; c.lineWidth = 2.5; for (let i = 0; i < 12; i++) { c.beginPath(); for (let x = -20; x < w + 20; x += 6) c.lineTo(x, i * 13 + 4 * sin(x * .09)); c.stroke(); } }); P.w3 = wave('#17324A', 8, (c, w, h) => dry(c, w, h, '#3D6E8C'));
      P.boat = piece(150, 92, [[0, 46], [62, 46], [75, 0], [88, 46], [150, 46], [118, 92], [32, 92]], '#F7EEDC', { seed: 4, paint: (c, w, h) => { c.fillStyle = '#D8CDB4'; poly(c, [[75, 0], [88, 46], [118, 92], [75, 92]], true); c.fill(); c.fillStyle = '#B9AE98'; poly(c, [[0, 46], [62, 46], [75, 66], [32, 92]], true); c.globalAlpha = .35; c.fill(); c.globalAlpha = 1; c.strokeStyle = '#C9BDA0'; c.lineWidth = 1.2; poly(c, [[0, 46], [75, 66], [150, 46]]); c.stroke(); } });
      const or = (c, w, h) => { const g = c.createRadialGradient(w * .4, h * .35, 4, w / 2, h / 2, w * .6); g.addColorStop(0, '#FF8A3A'); g.addColorStop(1, '#EE5410'); c.fillStyle = g; c.fillRect(-20, -20, w + 40, h + 40); dry(c, w, h, '#FFC08A'); };
      P.ball = piece(76, 76, disc(38, 34, .05, 1), '#FF6A1F', { seed: 6, paint: or }); P.back = piece(76, 76, disc(38, 34, .05, 2), '#FFD25A', { seed: 9, paint: (c, w, h) => { c.strokeStyle = '#E8A92E'; c.lineWidth = 3; for (let i = 0; i < 12; i++) { circle(c, w / 2, h / 2, i * 5); c.stroke(); } } });
      P.ray = piece(16, 50, [[2, 0], [14, 2], [16, 50], [0, 48]], '#F9B233', { seed: 7 });
      P.tape = piece(54, 20, [[0, 2], [3, 6], [0, 10], [3, 15], [0, 20], [54, 18], [51, 13], [54, 9], [51, 4], [54, 0]], '#F3E6B8', { seed: 8 });
      P.L = [['S', '#C23B2E'], ['U', '#1F4F66'], ['N', '#E2A32C']].map(([ch, col], i) => { const p = piece(62, 70, [[2, 4], [58, 0], [62, 66], [0, 70]], ['#F7EEDC', '#F2B79A', '#2B2233'][i], { seed: 20 + i, paint: c => { txt(c, ch, 31, 60, '900 66px ' + ['Fraunces', 'Inter', 'Fraunces'][i], col, 'center'); } }); return p; });
    },
    draw(c, t0) {
      const p = floor(t0 * 12 + 1e-4), t = p / 12, j = (k, a = 1) => (hash(p >> 1, k) - .5) * a;
      const tb = c.createLinearGradient(0, 0, 480, 480); tb.addColorStop(0, '#C79B6C'); tb.addColorStop(1, '#A87847'); c.fillStyle = tb; c.fillRect(0, 0, 480, 480);
      c.globalCompositeOperation = 'multiply'; c.globalAlpha = .5; for (let i = 0; i < 30; i++) { c.fillStyle = i % 2 ? '#D9B48A' : '#E5C6A2'; c.fillRect(0, i * 17 + 4 * sin(i * 3), 480, 9); } c.drawImage(fiber, 0, 0, 480, 480); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      put(c, P.sky, 240, 226, { z: 5, rot: -.012 });
      const sunk = E.in2(seg(t, 2.9, 3.35)), stick = t >= 1.17 && t < 2.9, ray = stick ? E.back(seg(t, 1.33, 1.75), 2) * (1 - E.in2(seg(t, 2.66, 2.9))) : 0, SX = 300, SY = 112;
      if (ray > .02) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + floor(t * 6) * .05; put(c, P.ray, SX + cos(a) * (30 + 46 * ray), SY + sin(a) * (30 + 46 * ray), { rot: a + PI / 2, z: 3, sy: i % 2 ? .8 : 1 }); }
      const sun = () => { put(c, P.ball, SX, SY + sunk * 260, { z: 6, sx: 1.12, sy: 1.12, rot: j(1, .04) }); };
      if (t >= 1.17 && t < 3.4) { sun(); if (t > 1.2 && t < 2.8) put(c, P.tape, SX + 2, SY - 42, { z: 2, rot: -.2, sx: 1, a: .9 }); }
      put(c, P.m1, 366, 268, { z: 8 }); put(c, P.m2, 150, 290, { z: 10 });
      const sw = (k, a, s) => a * sin(TAU * (t / D * s + k));
      put(c, P.w1, 240 + sw(0, 12, 2), 372 + sw(.3, 4, 2), { z: 8, rot: .006 });
      // Boat rocks; it dips when the ball leaves and when it lands.
      const dip = -10 * sin(PI * seg(t, .42, .7)) + 12 * sin(PI * seg(t, 3.42, 3.75)), bx = 128 + sw(.5, 5, 1), by = 330 + sw(.1, 4, 2) + dip, br = sw(.2, .05, 1) + .05 * sin(PI * seg(t, .42, .9));
      const inBoat = (dx, dy, s = 1) => put(c, P.ball, bx + dx, by + dy, { z: 5, sx: s, sy: 2 - s, rot: br });
      if (t < .5) inBoat(0, -64 + 10 * sin(PI * seg(t, .17, .5)), 1 + .16 * sin(PI * seg(t, .17, .5)));
      if (t > 3.3) { const u = seg(t, 3.33, 3.6); inBoat(0, lerp(40, -64, E.back(u, 2.2))); }
      put(c, P.boat, bx, by, { z: 7, rot: br });
      put(c, P.w2, 236 - sw(.2, 14, 2), 412 + sw(.6, 4, 2), { z: 9, rot: -.008 }); put(c, P.w3, 244 + sw(.7, 10, 2), 452 + sw(.9, 4, 2), { z: 11, rot: .004 });
      // Flight with flips. The back of the paper is yellow.
      if (t >= .5 && t < 1.17) { const u = seg(t, .5, 1.17), x = lerp(128, SX, u), y = lerp(266, SY, u) - E.arc(u) * 92, f = cos(u * PI * 3); put(c, f >= 0 || u > .9 ? P.ball : P.back, x, y, { sx: u > .9 ? 1.1 : max(.08, abs(f)) * 1.1, sy: 1.1, z: 10 + 16 * E.arc(u), rot: u * .6 }); }
      // Cut letters are laid down one by one while the sun is up.
      P.L.forEach((l, i) => { const a = 1.5 + i * .17, b = 2.75 + i * .08, inn = E.out3(seg(t, a, a + .25)), out = E.in2(seg(t, b, b + .25)); if (inn > 0 && out < 1) put(c, l, 76 + i * 64, 86 + (i % 2) * 8 - (1 - inn) * 160 - out * 190, { rot: [-.08, .05, -.03][i] + (1 - inn) * .5, z: 5 + (1 - inn) * 14 }); });
    },
    post: im => grain(im, 4, 2),
  });
}
