// One joke: a very high board, a very small glass, a very serious ball. Straight, straight, then one unexpected cut.
// Only the setup line is written. The turn is never explained.
{
  const D = 4, BG = '#BFE0DA', INK = '#1F3438', CUT = 2.0;
  const eyes = (c, x, y, s, o = {}) => { c.fillStyle = INK; for (const k of [-1, 1]) { c.beginPath(); c.ellipse(x + k * 8 * s + (o.lx || 0) * s, y - 3 * s + (o.ly || 0) * s, 3 * s, (o.shut ? .6 : 4.4) * s, 0, 0, TAU); c.fill(); } if (o.brow) { c.strokeStyle = INK; c.lineWidth = 2.6 * s; c.lineCap = 'round'; for (const k of [-1, 1]) { c.beginPath(); c.moveTo(x + k * 13 * s, y - 13 * s - o.brow * s); c.lineTo(x + k * 4 * s, y - 13 * s + o.brow * s); c.stroke(); } } };
  const glass = (c, x, y, s, ball_) => { // y = table line
    c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-13, -34); c.lineTo(-10, 0); c.lineTo(10, 0); c.lineTo(13, -34); c.closePath(); c.fill();
    c.fillStyle = '#5FB2CF'; c.beginPath(); c.moveTo(-12.2, -25 + ball_); c.lineTo(-10, -1); c.lineTo(10, -1); c.lineTo(12.2, -25 - ball_); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = '#FFFFFF'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-13, -34); c.lineTo(-10, 0); c.lineTo(10, 0); c.lineTo(13, -34); c.stroke(); c.lineWidth = 2; c.globalAlpha = .7; c.beginPath(); c.moveTo(-7.5, -20); c.lineTo(-6.4, -6); c.stroke(); c.restore();
  };
  scene({
    dur: D, fwd: 1, blur: 14, shutter: .5,
    draw(c, t) {
      c.fillStyle = BG; c.fillRect(0, 0, 480, 480);
      // Camera: wide, a hard cut to the glass, then one slow pull back to the same wide.
      const pull = E.io5(seg(t, 2.72, 3.5)), z = t < CUT ? 1 : Math.exp(lerp(Math.log(5.4), 0, pull)), k = (z - 1) / 4.4, fx = lerp(240, 344, k), fy = lerp(240, 384, k);
      c.save(); c.translate(240, 240); c.scale(z, z); c.translate(-fx, -fy);
      c.fillStyle = '#F2EAD8'; circle(c, 372, 92, 34); c.fill();
      c.fillStyle = '#A9D2CB'; c.beginPath(); c.moveTo(-200, 430); c.quadraticCurveTo(120, 340, 300, 430); c.quadraticCurveTo(420, 380, 700, 430); c.lineTo(700, 700); c.lineTo(-200, 700); c.fill();
      c.fillStyle = '#E9C99A'; c.fillRect(-300, 424, 1100, 400); c.fillStyle = '#D7B17E'; c.fillRect(-300, 424, 1100, 5);
      // Tower.
      c.strokeStyle = '#F8F4EA'; c.lineWidth = 7; c.lineCap = 'round'; for (const x of [52, 92]) { c.beginPath(); c.moveTo(x, 428); c.lineTo(x, 152); c.stroke(); } c.lineWidth = 4; for (let i = 0; i < 15; i++) { c.beginPath(); c.moveTo(52, 414 - i * 18); c.lineTo(92, 414 - i * 18); c.stroke(); }
      const press = (t < .5 ? 0 : 0) + 10 * sin(PI * seg(t, .7, .88)) + 18 * sin(PI * seg(t, 1.12, 1.4)) + (t > 1.4 && t < CUT ? -13 * Math.exp(-(t - 1.4) * 5) * cos((t - 1.4) * 30) : 0) + (t > 3.8 ? 8 * Math.exp(-(t - 3.8) * 12) * sin((t - 3.8) * 34) : 0);
      c.strokeStyle = '#E2574C'; c.lineWidth = 9; c.beginPath(); c.moveTo(34, 158); c.quadraticCurveTo(120, 156, 196, 158 + press); c.stroke();
      const tx = 344, ty = 428; c.strokeStyle = '#8A5F3C'; c.lineWidth = 5; void tx;
      const wob = t > CUT ? Math.exp(-(t - CUT) * 4) * cos((t - CUT) * 26) : 0;
      glass(c, tx, ty, 1, t > CUT ? 2.4 * wob : 0);
      // Ball.
      const R = 24; let x = 178, y = 158 - 4.5 - R + press, sx = 1, sy = 1, e = { lx: 1.6, ly: 0 };
      if (t < .7) { const w = sin(PI * seg(t, .2, .5)); e = { lx: 2.4, ly: 3 * w, brow: 2 }; } else if (t < .88) { sy = 1 - .1 * sin(PI * seg(t, .7, .88)); sx = 2 - sy; e.brow = 2; } else if (t < 1.12) { y -= E.arc(seg(t, .88, 1.12)) * 46; sy = 1.06; sx = .95; e.brow = 2; } else if (t < 1.4) { sy = 1 - .26 * sin(PI * seg(t, 1.12, 1.4)); sx = 2 - sy; e.brow = 3; } else if (t < CUT) { const u = seg(t, 1.4, 1.72); y = 130 - E.out2(u) * 220; x = 178 + u * 30; sy = 1.2; sx = .86; }
      else if (t < 3.05) { x = tx; y = ty - 34 - 19.5; sy = 1 + wob * .12; sx = 1 - wob * .12; const b = t > 2.3 && t < 2.38 || t > 2.86 && t < 2.94; e = { shut: b, lx: t > 2.5 && t < 2.86 ? 3 : 0, ly: 1 }; } else { const u = seg(t, 3.05, 3.8); x = lerp(tx, 178, u); y = lerp(ty - 53.5, 129.5, u) - E.arc(u) * 60; sy = 1.06; sx = .95; if (t > 3.8) { x = 178; y = 129.5 + press; sy = 1 - .12 * Math.exp(-(t - 3.8) * 14); sx = 2 - sy; } }
      if (t < 1.72 || t >= CUT) { c.save(); c.translate(x, y + (1 - sy) * R); c.scale(sx, sy); circle(c, 0, 0, R); c.fillStyle = ORANGE; c.fill(); c.save(); c.clip(); c.fillStyle = 'rgba(190,60,0,.28)'; c.beginPath(); c.rect(-R, -R, 2 * R, 2 * R); c.arc(-5, -7, R, 0, TAU, true); c.fill(); c.restore(); eyes(c, 0, 0, 1, e); c.restore(); }
      c.restore();
      // Setup line, only before the cut and again at the start of the loop.
      const a = t < CUT ? 1 : E.io(seg(t, 3.7, 3.95)); if (a > 0) { c.globalAlpha = a; txt(c, 'Big jump today.', 452, 222, '700 38px Inter', INK, 'right', '-1px'); c.globalAlpha = 1; }
    },
  });
}
