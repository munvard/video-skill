// Honest race: same start, same finish, same clock, two paths. The numbers are computed, not chosen: a ball without
// friction, 2 m across and 1 m down, g = 9.81. The curve (a cycloid) wins by about a fifth. Shown at half speed, and said so.
{
  const D = 4, g = 9.81, dx = 2, h = 1, SLOW = 2, T0 = .5;
  let th = 3.5; for (let i = 0; i < 60; i++) { const f = (th - sin(th)) / (1 - cos(th)) - dx / h; const e = 1e-5, f2 = ((th + e) - sin(th + e)) / (1 - cos(th + e)) - dx / h; th -= f / ((f2 - f) / e); }
  const K = h / (1 - cos(th)), tc = th * Math.sqrt(K / g), ts = Math.sqrt(2 * (dx * dx + h * h) / (g * h));
  const cyc = t => { const a = t * Math.sqrt(g / K); return [K * (a - sin(a)), K * (1 - cos(a))]; }, str = t => { const s = min(1, (t / ts) ** 2); return [dx * s, h * s]; };
  const rows = [{ name: 'curve', T: tc, at: cyc, y: 20, bg: '#153B3E', track: '#3E9C8B', hi: '#8FE0C6', col: '#FF6A1F' }, { name: 'straight', T: ts, at: str, y: 260, bg: '#3A1F45', track: '#8D5AA5', hi: '#D9AEEB', col: '#F4E7D3' }];
  const S0 = 134, ox = 104, r = 17, M = (p, y) => [ox + p[0] * S0 + 10, y + 54 + p[1] * S0 * .9];
  const s0 = (sim, k) => sim >= k * .1;
  scene({
    dur: D, blur: 14, shutter: .55,
    draw(c, t, f) {
      const sim = max(0, (t - T0) / SLOW), tf = f / 24, sf = max(0, (tf - T0) / SLOW);
      for (const R of rows) {
        const top = R.y - 20; c.save(); c.beginPath(); c.rect(0, top, 480, 240); c.clip();
        const bg = c.createLinearGradient(0, top, 0, top + 240); bg.addColorStop(0, R.bg); bg.addColorStop(1, mix(R.bg, '#000000', .35)); c.fillStyle = bg; c.fillRect(0, top, 480, 240);
        // Ramp body with its lit top edge.
        const pts = []; for (let i = 0; i <= 60; i++) pts.push(M(R.at(R.T * i / 60), R.y)); const A = pts[0], B = pts[60];
        c.beginPath(); c.moveTo(20, A[1] + r); c.lineTo(A[0], A[1] + r); pts.forEach(p => c.lineTo(p[0], p[1] + r)); c.lineTo(480, B[1] + r); c.lineTo(480, top + 240); c.lineTo(20, top + 240); c.closePath();
        const tg = c.createLinearGradient(0, top + 60, 0, top + 240); tg.addColorStop(0, R.track); tg.addColorStop(1, mix(R.track, '#000000', .55)); c.fillStyle = tg; c.fill();
        c.beginPath(); c.moveTo(20, A[1] + r); c.lineTo(A[0], A[1] + r); pts.forEach(p => c.lineTo(p[0], p[1] + r)); c.lineTo(480, B[1] + r); c.strokeStyle = R.hi; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke();
        c.fillStyle = mix(R.track, '#000000', .4); c.fillRect(0, top, 20, 240);
        // A peg every tenth of a second, so the eye can read the speed.
        for (let k = 1; k * .1 < R.T; k++) { const q = M(R.at(k * .1), R.y); c.fillStyle = s0(sim, k) ? '#FFF6E2' : 'rgba(0,0,0,.35)'; circle(c, q[0], q[1] + r + 14, 4.2); c.fill(); }
        // Finish gate: the same place in both halves.
        for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#F6F1E6' : '#14110F'; c.fillRect(B[0] + 12 + j * 7, B[1] + r - 12 * (i + 1) - 2, 7, 12); }
        // Ball: wakes, waits at the gate, runs, then leaves and drops in again at the start.
        const s = min(sim, R.T), done = sim > R.T ? sim - R.T : 0, v = Math.sqrt(2 * g * h), end = 3.42, dirx = R === rows[0] ? .985 : .894;
        let p = M(R.at(s), R.y), rest = 0;
        if (done) { const q = done * SLOW, x = q < .0 ? 0 : 1 - Math.exp(-q * 5); p = [B[0] + x * 52, B[1]]; rest = 1; }
        if (t > end) { const u = E.in2(seg(t, end, end + .25)); p = [p[0] + u * 130, p[1] - sin(u * PI) * 14]; }
        const drop = seg(t, 3.5, 3.82); let sx = 1, sy = 1;
        const wk = sin(PI * seg(t, .2, .48)); sx += wk * .14; sy -= wk * .14;
        const roll = s * 5;
        const draw = (X, Y) => { ball(c, X, Y + (1 - sy) * r, r, { sx, sy, fill: R.col }); c.save(); c.translate(X, Y + (1 - sy) * r); c.rotate(roll); c.strokeStyle = 'rgba(30,10,0,.35)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r * .55, -.5, 1.2); c.stroke(); c.restore(); };
        if (t < end + .26) draw(p[0], p[1]);
        if (t > 3.5) { const ld = t > 3.82 ? sin(PI * seg(t, 3.82, 4)) * .16 : 0; sx = 1 + ld; sy = 1 - ld; draw(A[0], lerp(A[1] - 110, A[1], E.in2(drop))); }
        // Clock: counts simulated seconds, stops at this ball's own finish, resets out of sight of the race.
        const clk = tf > 3.6 ? R.T * (1 - E.io(seg(tf, 3.6, 3.9))) : min(sf, R.T), won = sf > R.T && tf < 3.6;
        txt(c, clk.toFixed(2), 462, top + 52, '700 44px Mono', won ? (R === rows[0] ? '#FFB37E' : '#F4E7D3') : 'rgba(255,255,255,.75)', 'right', '-1px');
        txt(c, 's', 462, top + 80, '700 22px Mono', 'rgba(255,255,255,.6)', 'right');
        txt(c, R.name, 206, top + 50, '800 34px Inter', '#FFFFFF', 'left', '-.8px');
        c.restore();
      }
      c.fillStyle = '#0B0A0C'; c.fillRect(0, 237, 480, 6);
      txt(c, 'half speed', 36, 466, '600 21px Inter', 'rgba(255,255,255,.8)');
    },
  });
}
