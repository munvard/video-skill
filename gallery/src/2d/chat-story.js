// Chat story: large messages with human timing, in a chat design made for this film. One of the typing dots is the ball.
// The thread scrolls by exactly one conversation, so the loop has no seam.
{
  const D = 4, BG = '#231B2E', ME = '#4B3A66', YOU = '#F3E7D8', INK = '#2A1F36';
  // Messages: arrival time, side, text, y in the thread.
  const PER = 306, M = [[-.64, 'l', 'are you awake?', 0], [.95, 'r', 'no', 80], [2.15, 'l', 'then who', 160], [2.5, 'l', 'is jumping?', 230]];
    const bub = (c, side, s, y, k, two) => { if (k <= 0) return; c.font = '600 36px Inter'; c.letterSpacing = '-.8px'; const w = c.measureText(s).width + 44, x = side === 'l' ? 26 : 454 - w, q = E.back(k, 1.6); c.save(); c.translate(side === 'l' ? x : x + w, y + 30); c.scale(.7 + .3 * q, .7 + .3 * q); c.globalAlpha = min(1, k * 3); c.translate(side === 'l' ? -x : -(x + w), -(y + 30)); rr(c, x, y - 32, w, 62, side === 'l' ? [two ? 8 : 30, 30, 30, 10] : [30, two ? 8 : 30, 10, 30]); c.fillStyle = side === 'l' ? YOU : ME; c.fill(); txt(c, s, x + 22, y + 12, '600 36px Inter', side === 'l' ? INK : '#F7EFFA', 'left', '-.8px'); c.restore(); };
  scene({
    dur: D, blur: 12, shutter: .5,
    draw(c, t) {
      const g = c.createLinearGradient(0, 0, 480, 480); g.addColorStop(0, '#2E2340'); g.addColorStop(1, BG); c.fillStyle = g; c.fillRect(0, 0, 480, 480);
      // Every new row pushes the thread up, and one conversation is exactly PER tall, so the frame is always full.
      const st = (x, k) => E.io5(seg(t, x, x + .28)) * k, scroll = st(.9, 80) + st(1.2, 80) + st(2.46, 70) + st(3.3, 76), top = 338 - scroll;
      c.save(); c.beginPath(); c.rect(0, 0, 480, 400); c.clip(); c.translate(0, top);
      for (let n = -2; n <= 1; n++) M.forEach(([a0, s, m, y], i) => { const at = a0 + n * D, k = n < 0 ? 1 : seg(t, at, at + .22); bub(c, s, m, y + n * PER, k, i === 3); });
      const ty = 160, show = E.back(seg(t, 1.2, 1.4), 1.6) * (1 - seg(t, 2.08, 2.16)); if (show > .02) { c.save(); c.translate(26, ty + 30); c.scale(show, show); c.translate(-26, -(ty + 30)); rr(c, 26, ty - 32, 132, 62, [30, 30, 30, 10]); c.fillStyle = YOU; c.fill(); for (const k of [0, 2]) { circle(c, 62 + k * 30, ty + 3 * sin(t * 9 - k), 9); c.fillStyle = '#B9A8A8'; c.fill(); } c.restore(); }
      c.restore();
      const tyS = 338;
      // Input bar with the send button. The ball is the send button at rest.
      const bar = c.createLinearGradient(0, 396, 0, 480); bar.addColorStop(0, '#1B1524'); bar.addColorStop(1, '#17111F'); c.fillStyle = bar; c.fillRect(0, 398, 480, 82); rr(c, 26, 412, 342, 54, 27); c.fillStyle = '#322743'; c.fill();
      const typing = t > .42 && t < .95 ? ['n', 'no'][t < .62 ? 0 : 1] : ''; txt(c, typing, 48, 451, '600 34px Inter', '#F7EFFA', 'left', '-.8px'); const cx = 50 + (typing ? typing.length * 22 - 2 : 0); if (fr(t * 1.5) < .55) { c.fillStyle = '#FF8A45'; c.fillRect(cx + 2, 424, 3.5, 32); }
      circle(c, 416, 439, 33); c.fillStyle = '#322743'; c.fill();
      // Ball: button, jumps to the typing bubble, acts as a dot, leaps at the question, falls back on the button.
      let x = 416, y = 439, r = 27, sx = 1, sy = 1; const sq = (a, b, k) => { const u = seg(t, a, b); if (u > 0 && u < 1) { sy = 1 - k * sin(PI * u); sx = 2 - sy; y += (1 - sy) * r * .6; } };
      sq(.86, 1.02, .22);
      if (t > 1.04 && t < 1.42) { const u = seg(t, 1.04, 1.42); x = lerp(416, 92, u); y = lerp(439, tyS, u) - E.arc(u) * 90; r = lerp(27, 13, u); } else if (t >= 1.42 && t < 2.1) { x = 92; y = tyS - abs(sin((t - 1.42) * 9.2)) * 22; r = 13; } else if (t >= 2.1 && t < 2.9) { const u = seg(t, 2.1, 2.9); x = lerp(92, 330, u); y = lerp(tyS, 400 - 24, u) - E.arc(u) * 250; r = lerp(13, 25, E.out2(u)); } else if (t >= 2.9 && t < 3.2) { const u = seg(t, 2.9, 3.2); x = lerp(330, 416, u); y = lerp(376, 439, u) - E.arc(u) * 46; r = lerp(25, 27, u); } else if (t >= 3.2) { const q = t - 3.2; sy = 1 - .22 * Math.exp(-q * 9) * cos(q * 28); sx = 2 - sy; }
      sq(2.86, 2.95, .25); sq(3.7, 3.92, .12); 
      ball(c, x, y, r, { sx, sy, lit: 1 });
      const k = (t < 1.0 ? 1 : 0) + E.io(seg(t, 3.25, 3.45)); if (k > 0) { c.globalAlpha = min(1, k) * .95; c.strokeStyle = '#fff'; c.lineWidth = 4.5; c.lineCap = c.lineJoin = 'round'; c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x, y - 9); c.moveTo(x - 8, y - 2); c.lineTo(x, y - 10); c.lineTo(x + 8, y - 2); c.stroke(); c.globalAlpha = 1; }
    },
  });
}
