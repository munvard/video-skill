// Whiteboard lesson: the wrong answer many people believe, then the right drawing. Two pens, big drawings, one eraser.
// "At the top there is no pull" is crossed out: the arrow down is the same size everywhere on the path.
{
  const D = 4, BL = '#1F3F8F', OR = '#F2611A', X = u => lerp(70, 410, u), Y = u => 372 - E.arc(u) * 236;
  const wob = (p, s, a = 1.2) => p.map(([x, y], i) => [x + (vnoise(i * .35, s) - .5) * 2 * a, y + (vnoise(i * .35, s + 9) - .5) * 2 * a]);
  const pen = (c, p, f, col, w = 6) => { if (f <= 0) return; const n = max(2, Math.ceil(p.length * f)); c.strokeStyle = col; c.lineWidth = w; c.lineCap = c.lineJoin = 'round'; poly(c, p.slice(0, n)); c.globalAlpha = .93; c.stroke(); c.globalAlpha = 1; };
  const line = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
  const arrow = (x, y, L) => [line([x, y], [x, y + L]), line([x - 13, y + L - 17], [x, y + L], 8).concat(line([x, y + L], [x + 13, y + L - 17], 8))];
  const write = (c, s, x, y, size, col, f) => { if (f <= 0) return; c.save(); c.font = `700 ${size}px Hand`; c.letterSpacing = '0px'; const w = c.measureText(s).width; c.beginPath(); c.rect(x - 8, y - size, (w + 20) * f, size * 1.5); c.clip(); txt(c, s, x, y, `700 ${size}px Hand`, col); c.restore(); };
  const path = wob(Array.from({ length: 61 }, (_, i) => [X(i / 60), Y(i / 60)]), 2), floorL = wob(line([40, 398], [440, 398], 40), 5);
  scene({
    dur: D, blur: 6, shutter: .4,
    draw(c, t) {
      const bg = c.createLinearGradient(0, 0, 480, 480); bg.addColorStop(0, '#FBFCFC'); bg.addColorStop(.5, '#EFF2F3'); bg.addColorStop(1, '#E3E8EA'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      // Window reflection and old marks that were never fully erased.
      c.fillStyle = 'rgba(255,255,255,.6)'; poly(c, [[300, 0], [420, 0], [250, 480], [130, 480]], true); c.fill();
      c.globalAlpha = .06; c.strokeStyle = BL; c.lineWidth = 16; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(60 + i * 50, 440 - i * 22); c.quadraticCurveTo(200, 380, 380 - i * 20, 436 - i * 26); c.stroke(); } c.globalAlpha = 1;
      // One drift of the board with the ink.
      const dz = 1 + .035 * sin(TAU * t / D); c.translate(240, 250); c.scale(dz, dz); c.rotate(.006 * sin(TAU * t / D)); c.translate(-240, -250);
      // Erased at 2.95 to 3.35 by a hand-sized eraser moving in a zigzag; the first drawing is put back right after.
      const er = seg(t, 2.9, 3.4), re = t > 3.4 ? E.io(seg(t, 3.42, 3.96)) : 1, old = t < 3.4;
      const ex = q => 240 + 250 * cos(q * PI * 5), ey = q => lerp(60, 430, q);
      c.save();
      if (er > 0 && old) { // keep only what the eraser has not reached
        c.beginPath(); c.rect(-40, ey(er) - 6, 560, 520); c.clip();
      }
      pen(c, floorL, old ? 1 : seg(re, 0, .3), BL, 6);
      c.setLineDash([]); for (let i = 0; i < 15; i++) { const f = old ? 1 : seg(re, .2 + i * .04, .24 + i * .04); if (f > 0) pen(c, path.slice(i * 4, i * 4 + 3), 1, BL, 6); }
      write(c, 'top = no pull?', 112, 92, 54, BL, old ? 1 : seg(re, .55, 1));
      if (old) {
        // Cross out, then three equal arrows.
        pen(c, wob(line([104, 96], [372, 58], 30), 3, 2.4), E.io(seg(t, 1.12, 1.3)), OR, 8);
        [[.5, 1.42], [.16, 1.86], [.84, 2.04]].forEach(([u, a], i) => { const [s, h] = arrow(X(u), Y(u) + 30, 92); pen(c, wob(s, 10 + i), E.io(seg(t, a, a + .18)), OR, 8); pen(c, wob(h, 20 + i, .8), E.io(seg(t, a + .16, a + .28)), OR, 8); });
        write(c, 'always the same', 106, 448, 50, OR, E.io(seg(t, 2.1, 2.55)));
      }
      c.restore();
      if (er > 0 && er < 1) { c.globalAlpha = .1; c.strokeStyle = BL; c.lineWidth = 46; c.beginPath(); for (let i = 0; i <= 80; i++) { const q = er * i / 80; c.lineTo(ex(q), ey(q)); } c.stroke(); c.globalAlpha = 1; }
      // The ball is a filled marker drawing and it really travels the dotted path.
      let u, sq = 0; if (t < .22) { u = 0; sq = sin(PI * seg(t, .04, .22)) * .28; } else if (t < 1.02) { const q = seg(t, .22, 1.02); u = q < 1 ? .5 * E.out2(q) : .5; u = .5 * (1 - (1 - q) ** 1.6); } else if (t < 2.5) u = .5; else if (t < 2.9) u = .5 + .5 * seg(t, 2.5, 2.9) ** 1.6; else if (t < 3.4) u = 1; else u = 0;
      let bx = X(u), by = Y(u); if (t > .9 && t < 2.5) by += 3 * sin(t * 5);
      if (t >= 2.9 && t < 3.4) { sq = .25 * Math.exp(-(t - 2.9) * 9) * cos((t - 2.9) * 30); bx = X(1); } if (t >= 3.4) { const q = seg(t, 3.4, 3.75); bx = lerp(X(1), X(0), q); by = Y(0) - E.arc(q) * 60; sq = t > 3.75 ? .2 * sin(PI * seg(t, 3.75, 3.95)) : 0; }
      c.save(); c.translate(bx, by + 6 + sq * 20); c.scale(1 + sq, 1 - sq); c.lineCap = 'round';
      circle(c, 0, 0, 23); c.fillStyle = OR; c.fill(); c.globalAlpha = .35; c.strokeStyle = '#B53E06'; c.lineWidth = 3; for (let i = -3; i <= 3; i++) { const h = Math.sqrt(1 - (i / 4.2) ** 2) * 20; c.beginPath(); c.moveTo(i * 6 - 3, -h + 2); c.lineTo(i * 6 + 3, h - 2); c.stroke(); } c.globalAlpha = 1; c.strokeStyle = '#C9480B'; c.lineWidth = 4.5; poly(c, wob(Array.from({ length: 30 }, (_, i) => [23 * cos(i / 29 * 6.6), 23 * sin(i / 29 * 6.6)]), 4, .8)); c.stroke(); c.restore();
      if (er > 0 && er < 1) { const x = ex(er), y = ey(er); c.save(); c.translate(x, y); c.rotate(.12 * sin(er * 16)); c.shadowColor = 'rgba(20,30,50,.4)'; c.shadowBlur = 24; c.shadowOffsetY = 14; rr(c, -62, -30, 124, 60, 10); c.fillStyle = '#39424E'; c.fill(); c.shadowColor = 'transparent'; rr(c, -62, 8, 124, 22, 8); c.fillStyle = '#C9CED6'; c.fill(); rr(c, -54, -24, 108, 8, 4); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill(); c.restore(); }
    },
  });
}
