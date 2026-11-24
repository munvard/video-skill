// Swiss grid: a poster that moves. Six columns, six rows, one accent. Every block starts and stops on a grid line,
// and the ball always rests in a cell: inside the 0, on the flag of the 1, under the hook of the 2, in the bowl of the 3.
{
  const D = 3.2, B = D / 4, M = 24, U = 72, INK = '#111110', PAP = '#F5F3EE', RED = '#FF4B12', X = i => M + i * U;
  const num = ['0', '1', '2', '3'], cap = ['rest', 'wake', 'turn', 'land'];
  const home = [[3, 3], [1.05, 1.95], [1.5, 4.05], [1.32, 3.5]];
  scene({
    dur: D, blur: 16, shutter: .5,
    draw(c, t) {
      const b = floor(t / B) % 4, n = (b + 1) % 4, u = fr(t / B), k = E.io5(seg(u, .58, 1)), hard = E.out5(seg(u, .6, .98));
      c.fillStyle = PAP; c.fillRect(0, 0, 480, 480);
      // Numerals move on a strip, one poster width at a time, and change direction every beat.
      const dir = b % 2 ? 1 : 0;
      for (const [i, o] of [[b, 0], [n, 1]]) {
        const off = (o - hard) * 432, x = dir ? 0 : off, y = dir ? off : 0;
        c.save(); c.beginPath(); c.rect(M, M, 432, 432); c.clip();
        txt(c, num[i], X(3) + x - (i === 1 ? 24 : 0), X(5) + 14 + y, '800 470px Inter', INK, 'center'); c.restore();
      }
      // Bar: one row high, its length is the beat.
      const len = lerp(b + 1, n + 1, hard) * U + U; c.fillStyle = RED;
      c.fillRect(X(0), X(5) + 36, len, 36);
      // Captions stay on the left line, one row apart, and step up by one row.
      c.save(); c.beginPath(); c.rect(M, M, 220, 36); c.clip();
      txt(c, cap[b], M, M + 27 - hard * 36, '700 30px Inter', INK, 'left', '-.6px'); txt(c, cap[n], M, M + 63 - hard * 36, '700 30px Inter', INK, 'left', '-.6px'); c.restore();
      txt(c, `${n + 0 === 0 && hard > .5 ? 1 : b + (hard > .5 ? 2 : 1)}/4`.replace('5/', '1/'), X(6), M + 27, '700 30px Inter', INK, 'right', '-.6px');
      // The grid itself, on top, thin, with stronger marks where something rests.
      c.strokeStyle = 'rgba(17,17,16,.13)'; c.lineWidth = 1;
      for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(X(i), M); c.lineTo(X(i), X(6)); c.moveTo(M, X(i)); c.lineTo(X(6), X(i)); c.stroke(); }
      const a = home[b], z = home[n], x = lerp(X(a[0]), X(z[0]), k), y = lerp(X(a[1]), X(z[1]), k) - sin(PI * k) * 120;
      c.strokeStyle = RED; c.lineWidth = 2; const g = sin(PI * seg(u, 0, .6)) ** .5 * 18;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const cx = X(a[0]) + sx * 44, cy = X(a[1]) + sy * 44; if (u < .6) { c.beginPath(); c.moveTo(cx - sx * g, cy); c.lineTo(cx, cy); c.lineTo(cx, cy - sy * g); c.stroke(); } }
      const ld = Math.exp(-u * 9) * sin(u * 26), cr = sin(PI * seg(u, .44, .6));
      ball(c, x, y + cr * 4, 31, { fill: RED, sx: 1 + ld * .18 + cr * .12, sy: 1 - ld * .18 - cr * .12 });
    },
  });
}
