// The cursor is the hero: it pulls a ball that is too heavy, slips, gives up, and the ball carries it to the goal.
// A large cursor with light and a shadow that tells its height. The interface is only simple shapes.
{
  const D = 4, FL = 372, r = 34, HOME = [112, FL - r], SLOT = [372, 150];
  const ARROW = [[0, 0], [0, 96], [23, 75], [39, 112], [58, 104], [42, 68], [74, 66]];
  const path = (c, p, rad = 5) => { c.beginPath(); const n = p.length; for (let i = 0; i < n; i++) { const a = p[(i + n - 1) % n], b = p[i], d = p[(i + 1) % n]; const m = (u, v) => [lerp(u[0], v[0], .5), lerp(u[1], v[1], .5)]; const s = m(a, b); if (!i) c.moveTo(s[0], s[1]); c.arcTo(b[0], b[1], ...m(b, d), rad); } c.closePath(); };
  // Cursor pose by time: tip x, tip y, turn, stretch along its body, height over the page.
  const K = [[0, 126, 318, 0, 1.0, 10], [.28, 146, 292, .1, 1.12, 12], [.34, 142, 296, .06, 1.1, 12], [.40, 150, 288, .14, 1.17, 12], [.46, 146, 292, .1, 1.14, 12], [.56, 158, 278, .2, 1.26, 14], [.62, 250, 190, 1.6, .92, 40], [.82, 318, 178, 4.2, 1, 46], [1.02, 356, 268, 6.0, 1, 30], [1.16, 372, 322, 7.35, .9, 2], [1.28, 372, 322, 7.25, 1.02, 2], [1.75, 372, 322, 7.28, 1, 2], [1.86, 372, 324, 7.28, .95, 2], [2.06, 330, 210, 6.9, 1.02, 40], [2.3, 286, 246, 6.28, 1, 20], [2.42, 286, 262, 6.28, .93, 12], [2.9, 384, 108, 6.2, 1.06, 24], [3.02, 378, 116, 6.28, .96, 12], [3.35, 378, 116, 6.28, 1, 12], [3.86, 136, 306, 6.28, 1, 30], [4, 126, 318, 6.28, 1, 10]];
  const pose = t => { let i = 0; while (i < K.length - 2 && K[i + 1][0] < t) i++; const a = K[i], b = K[i + 1], p = K[max(0, i - 1)], q = K[min(K.length - 1, i + 2)], h = b[0] - a[0], u = clamp((t - a[0]) / h); return [1, 2, 3, 4, 5].map(k => { const m0 = i ? (b[k] - p[k]) / (b[0] - p[0]) * h : 0, m1 = i < K.length - 2 ? (q[k] - a[k]) / (q[0] - a[0]) * h : 0, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * a[k] + (u3 - 2 * u2 + u) * m0 * .7 + (3 * u2 - 2 * u3) * b[k] + (u3 - u2) * m1 * .7; }); };
  scene({
    dur: D, blur: 16, shutter: .55,
    draw(c, t) {
      const bg = c.createLinearGradient(0, 0, 480, 480); bg.addColorStop(0, '#C9D6FF'); bg.addColorStop(1, '#9FB2F2'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      const card = (x, y, w, h, R, f, b = 28, o = 14) => { c.save(); c.shadowColor = 'rgba(40,52,130,.28)'; c.shadowBlur = b * 2; c.shadowOffsetY = o * 2; rr(c, x, y, w, h, R); c.fillStyle = f; c.fill(); c.restore(); };
      card(36, 44, 408, 366, 34, '#F8FAFF');
      const on = E.back(seg(t, 2.86, 3.06), 2) * (1 - E.io(seg(t, 3.36, 3.5)));
      rr(c, 72, 84, 150, 26, 13); c.fillStyle = '#DCE4FA'; c.fill(); rr(c, 72, 124, 96, 20, 10); c.fillStyle = '#E9EEFB'; c.fill();
      for (let i = 0; i < 3; i++) { rr(c, 72 + i * 46, 168, 34, 34, 11); c.fillStyle = ['#CFE6E0', '#E6DCF8', '#FBE3C8'][i]; c.fill(); }
      // The socket: an inset ring that fills with light when the ball is home.
      c.save(); circle(c, SLOT[0], SLOT[1], 46); const ig = c.createLinearGradient(0, SLOT[1] - 46, 0, SLOT[1] + 46); ig.addColorStop(0, '#C6D0EE'); ig.addColorStop(1, '#EEF2FC'); c.fillStyle = ig; c.fill(); c.lineWidth = 5; c.strokeStyle = `rgba(255,122,40,${clamp(on)})`; circle(c, SLOT[0], SLOT[1], 46 + 8 * clamp(on)); c.stroke(); c.restore();
      rr(c, 56, FL, 368, 14, 7); c.fillStyle = '#D6DFF7'; c.fill();
      // Ball.
      let [bx, by] = HOME, sx = 1, sy = 1, rot = 0; const strain = seg(t, .1, .56);
      if (t < .58) { by -= 7 * strain; bx += 5 * strain; sy = 1 + .14 * strain; sx = 1 - .08 * strain; rot = .6; } else if (t < .8) { const q = t - .58; sy = 1 - .22 * Math.exp(-q * 12) * cos(q * 34); sx = 2 - sy; } else if (t < 1.4) { const w = sin(PI * seg(t, 1.2, 1.4)) * .25; sx = 1 + w; sy = 1 - w; } else if (t < 1.75) { const u = seg(t, 1.4, 1.75); bx = lerp(112, 220, u); by -= E.arc(u) * 66; sy = 1 + .1 * cos(PI * u) ** 2; sx = 2 - sy; } else if (t < 1.92) { const w = sin(PI * seg(t, 1.75, 1.92)) * .3; bx = 220; sx = 1 + w; sy = 1 - w; } else if (t < 2.3) { const u = seg(t, 1.92, 2.3); bx = lerp(220, 286, u); by -= E.arc(u) * 40; } else if (t < 2.48) { const w = sin(PI * seg(t, 2.3, 2.48)) * .32; bx = 286; sx = 1 + w; sy = 1 - w; } else if (t < 2.92) { const u = seg(t, 2.48, 2.92); bx = lerp(286, SLOT[0], u); by = lerp(FL - r, SLOT[1], u) - E.arc(u) * 46; sy = 1.14 - .14 * u; sx = 2 - sy; } else if (t < 3.45) { [bx, by] = SLOT; const q = t - 2.92; sy = 1 - .2 * Math.exp(-q * 11) * cos(q * 32); sx = 2 - sy; } else { const u = seg(t, 3.45, 3.86); bx = lerp(SLOT[0], HOME[0], u); by = lerp(SLOT[1], HOME[1], u) - E.arc(u) * 60; const q = t - 3.86; if (q > 0) { sy = 1 - .2 * Math.exp(-q * 14) * cos(q * 34); sx = 2 - sy; } }
      const flr = by > 250 || t > 3.45 || (t > 2.3 && t < 2.8), inSlot = t > 2.8 && t < 3.5;
      if (!inSlot) { const h = clamp((FL - r - by) / 220); c.save(); c.globalAlpha = .34 * (1 - h); c.fillStyle = '#5E6CB0'; c.filter = `blur(${5 + h * 16}px)`; c.beginPath(); c.ellipse(bx + 4, FL + 3, r * (1 - h * .3) * sx, 7, 0, 0, TAU); c.fill(); c.restore(); }
      ball(c, bx, by + (1 - sy) * r, r, { sx, sy, lit: 1 });
      // Cursor.
      const [x, y, a, st, h] = pose(t), tremble = t > .2 && t < .58 ? sin(t * 130) * 2.2 * strain : 0;
      const cur = (ox, oy, fill) => { c.save(); c.translate(x + ox + tremble, y + oy); c.rotate(a); c.scale(1 / Math.sqrt(st) * .92, st * .92); path(c, ARROW); if (fill) { c.fillStyle = fill; c.fill(); } c.restore(); };
      c.save(); c.filter = `blur(${3 + h * .28}px)`; c.globalAlpha = .42 - h * .004; cur(5 + h * .35, 8 + h * .8, '#39458F'); c.restore();
      c.save(); c.translate(x + tremble, y); c.rotate(a); c.scale(1 / Math.sqrt(st) * .92, st * .92); path(c, ARROW, 6); c.lineJoin = 'round'; c.lineWidth = 13; c.strokeStyle = '#FFFFFF'; c.stroke();
      const g = c.createLinearGradient(-10, 0, 80, 110); g.addColorStop(0, '#3B4378'); g.addColorStop(.5, '#1D2247'); g.addColorStop(1, '#0E1128'); c.fillStyle = g; c.fill();
      c.clip(); c.globalAlpha = .5; c.strokeStyle = '#8F9BE0'; c.lineWidth = 5; c.beginPath(); c.moveTo(4, 10); c.lineTo(4, 84); c.stroke(); c.restore();
    },
  });
}
