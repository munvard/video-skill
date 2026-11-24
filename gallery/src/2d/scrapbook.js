// Scrapbook: the ball leaves its photo, crosses the page as a paper sticker, and lands in an empty photo.
// Then the page turns and the same page waits under it. Photos are drawn here, notes are in a hand font.
{
  const D = 4, PW = 480; let fiber, page, tmp, g;
  const hand = (c, s, x, y, size, col = '#4A4038', rot = 0, al = 'left') => { c.save(); c.translate(x, y); c.rotate(rot); txt(c, s, 0, 0, `700 ${size}px Hand`, col, al); c.restore(); };
  const tape = (c, x, y, w, rot, col) => { c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = .82; c.fillStyle = col; c.shadowColor = 'rgba(60,40,20,.25)'; c.shadowBlur = 4; c.shadowOffsetY = 2; c.fillRect(-w / 2, -12, w, 24); c.shadowColor = 'transparent'; c.globalAlpha = .35; c.fillStyle = '#fff'; for (let i = 0; i < w / 12; i++) c.fillRect(-w / 2 + i * 12, -12, 5, 24); c.restore(); };
  const photo = (c, x, y, rot, art) => { c.save(); c.translate(x, y); c.rotate(rot); c.shadowColor = 'rgba(70,40,20,.38)'; c.shadowBlur = 18; c.shadowOffsetY = 9; c.shadowOffsetX = 4; c.fillStyle = '#FFFDF6'; c.fillRect(-92, -100, 184, 212); c.shadowColor = 'transparent'; c.beginPath(); c.rect(-80, -88, 160, 156); c.save(); c.clip(); art(c); const v = c.createRadialGradient(0, -10, 40, 0, -10, 130); v.addColorStop(0, 'rgba(255,220,160,0)'); v.addColorStop(1, 'rgba(90,50,20,.34)'); c.fillStyle = v; c.fillRect(-80, -88, 160, 156); c.restore(); c.restore(); };
  const hills = c => { const s = c.createLinearGradient(0, -88, 0, 70); s.addColorStop(0, '#8FC3D6'); s.addColorStop(1, '#F7E3B5'); c.fillStyle = s; c.fillRect(-80, -88, 160, 160); c.fillStyle = '#FFF3D0'; circle(c, 40, -50, 17); c.fill(); c.fillStyle = '#A9C27A'; c.beginPath(); c.ellipse(-50, 70, 110, 62, 0, 0, TAU); c.fill(); c.fillStyle = '#7FA65E'; c.beginPath(); c.ellipse(60, 84, 110, 62, 0, 0, TAU); c.fill(); for (let i = 0; i < 9; i++) { c.fillStyle = ['#FFE08A', '#fff', '#F2A7A0'][i % 3]; circle(c, -70 + i * 17, 52 + (i * 7 % 13), 2.6); c.fill(); } };
  const sea = c => { const s = c.createLinearGradient(0, -88, 0, 70); s.addColorStop(0, '#F3A27B'); s.addColorStop(.55, '#FBD9A6'); s.addColorStop(.56, '#4E93A8'); s.addColorStop(1, '#2B6079'); c.fillStyle = s; c.fillRect(-80, -88, 160, 160); c.fillStyle = 'rgba(255,240,200,.55)'; for (let i = 0; i < 7; i++) c.fillRect(-34 + i * 5, 8 + i * 8, 60 - i * 6, 2.5); c.fillStyle = '#E7C590'; c.beginPath(); c.ellipse(0, 84, 120, 36, 0, 0, TAU); c.fill(); c.strokeStyle = '#7A5230'; c.lineWidth = 3; c.beginPath(); c.moveTo(48, 60); c.lineTo(48, 6); c.stroke(); for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#E9604A' : '#FFF3DC'; c.beginPath(); c.moveTo(48, 4); c.arc(48, 22, 36, PI + i * PI / 6, PI + (i + 1) * PI / 6); c.closePath(); c.fill(); } };
  const A = [146, 168, -.06], Bp = [338, 296, .05], toPage = (P, x, y) => [P[0] + x * cos(P[2]) - y * sin(P[2]), P[1] + x * sin(P[2]) + y * cos(P[2])];
  const p1 = toPage(A, -14, 22), p2 = toPage(Bp, -26, 44);
  const drawBall = (c, x, y, r, sx, sy, stick, rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, sy); if (stick > 0) { c.shadowColor = `rgba(60,30,10,${.4 * stick})`; c.shadowBlur = 16 * stick; c.shadowOffsetY = 12 * stick; circle(c, 0, 0, r + 5 * stick); c.fillStyle = '#FFFDF6'; c.fill(); c.shadowColor = 'transparent'; } ball(c, 0, 0, r, { lit: 1 }); c.restore(); };
  // The page at time t. pen = how much of the question is written.
  const drawPage = (c, t, pen) => {
    c.fillStyle = '#F2E3C6'; c.fillRect(0, 0, 480, 480); c.globalCompositeOperation = 'multiply'; c.globalAlpha = .5; c.drawImage(fiber, 0, 0, 480, 480); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const sp = c.createLinearGradient(0, 0, 60, 0); sp.addColorStop(0, 'rgba(90,50,20,.38)'); sp.addColorStop(1, 'rgba(90,50,20,0)'); c.fillStyle = sp; c.fillRect(0, 0, 60, 480);
    c.strokeStyle = 'rgba(120,150,170,.22)'; c.lineWidth = 1.4; for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(0, i * 40); c.lineTo(480, i * 40); c.stroke(); }
    photo(c, ...A, hills); photo(c, ...Bp, sea);
    tape(c, 146, 72, 84, -.12, '#E9A5A0'); tape(c, 424, 206, 70, .72, '#A8CFC4'); tape(c, 254, 400, 66, .7, '#F0CF7E');
    hand(c, 'home', 150, 266, 34, '#5A4A3C', -.06, 'center'); hand(c, 'the sea!', 336, 394, 34, '#5A4A3C', .05, 'center');
    // Star sticker, pencil hearts, dashed path.
    c.save(); c.translate(400, 98); c.rotate(.2); c.shadowColor = 'rgba(60,30,10,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 4; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - PI / 2, q = i % 2 ? 19 : 42; c.lineTo(q * cos(a), q * sin(a)); } c.closePath(); c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = '#fff'; c.stroke(); c.shadowColor = 'transparent'; c.fillStyle = '#F7C548'; c.fill(); c.restore();
    c.save(); c.beginPath(); c.rect(36, 316, 250 * pen, 120); c.clip(); hand(c, 'where did', 46, 352, 44, '#C2452B', -.05); hand(c, 'it go?', 60, 396, 44, '#C2452B', -.05); c.restore();
    const hop = seg(t, .62, 1.35), h2 = seg(t, 0, 0); void h2;
    if (hop > 0) { c.setLineDash([2, 11]); c.lineCap = 'round'; c.lineWidth = 4; c.strokeStyle = 'rgba(90,74,60,.6)'; c.beginPath(); for (let i = 0; i <= 60 * hop; i++) { const u = i / 60; c.lineTo(lerp(p1[0], p2[0], u), lerp(p1[1], p2[1], u) - E.arc(u) * 110); } c.stroke(); c.setLineDash([]); }
    let x, y, sx = 1, sy = 1, st = 0, r = 19, rot = 0;
    if (t < .62) { [x, y] = p1; const w = sin(PI * seg(t, .34, .62)) * .24; sx = 1 + w; sy = 1 - w; y += w * 14; } else if (t < 1.35) { x = lerp(p1[0], p2[0], hop); y = lerp(p1[1], p2[1], hop) - E.arc(hop) * 110; st = sin(PI * hop) ** .5; r = 19 + 13 * sin(PI * hop); rot = hop * TAU; } else { [x, y] = p2; const q = t - 1.35, w = Math.exp(-q * 8) * cos(q * 26) * .22; sx = 1 + w; sy = 1 - w; y += w * 8 - abs(sin(q * 5)) * 9 * Math.exp(-q * 2.2); }
    drawBall(c, x, y, r, sx, sy, st, rot);
  };
  scene({
    dur: D, fps: 24, blur: t => t > 2.7 && t < 3.65 ? 16 : 6,
    init() {
      fiber = mkc(720, 720); const f = fiber.getContext('2d'), im = f.createImageData(720, 720), r = rng(8); for (let i = 0; i < 720 * 720; i++) { const v = 240 + (fbm(i % 720 / 20, floor(i / 720) / 20, 2, 3) - .5) * 40 + (r() - .5) * 8; im.data[i * 4] = v; im.data[i * 4 + 1] = v - 2; im.data[i * 4 + 2] = v - 8; im.data[i * 4 + 3] = 255; } f.putImageData(im, 0, 0);
      page = mkc(960, 960); g = page.getContext('2d');
    },
    draw(c, t) {
      const turn = seg(t, 2.75, 3.6), pen = E.io(seg(t, 1.75, 2.35));
      drawPage(c, turn > 0 ? t - D < 0 && turn > 0 ? 0 : 0 : t, turn > 0 ? 0 : pen);
      // At the loop the fresh page is already the one on top.
      if (turn > 0 && turn < 1) {
        g.setTransform(2, 0, 0, 2, 0, 0); drawPage(g, 2.75, 1);
        const a = E.io(turn) * PI, sh = sin(a); c.fillStyle = `rgba(60,30,10,${.28 * sh})`; c.fillRect(0, 0, 480, 480);
        // Bend the page: every strip has its own angle, so the sheet curls instead of swinging like a door.
        const N = 120; let x = 0, z = 0; const pts = [];
        for (let i = 0; i < N; i++) { const u = i / N, b = clamp(a + (.9 * sin(PI * u) - .35) * sh * (1 - u * .4), 0, PI); pts.push([x, z, b]); x += cos(b) * PW / N; z += sin(b) * PW / N; } pts.push([x, z, 0]);
        for (let i = 0; i < N; i++) { const [x0, z0, b] = pts[i], [x1, z1] = pts[i + 1], s0 = 1 + z0 / 1500, sc = (X, s) => X * s; const X0 = sc(x0, s0), X1 = sc(x1, 1 + z1 / 1500), w = X1 - X0, bk = w < 0; const hh = 480 * s0, yy = 240 - hh / 2 - z0 * .06; if (abs(w) < .05) continue;
          if (bk) { c.fillStyle = '#EAD9B8'; c.fillRect(min(X0, X1) - .4, yy, abs(w) + .8, hh); } else c.drawImage(page, i * 960 / N, 0, 960 / N, 960, X0, yy, w + .5, hh);
          c.fillStyle = `rgba(70,38,14,${clamp(.5 * abs(sin(b)) ** 2 * (bk ? .5 : .8))})`; c.fillRect(min(X0, X1) - .4, yy, abs(w) + .8, hh); }
      }
    },
  });
}
