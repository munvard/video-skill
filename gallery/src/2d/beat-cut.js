// Beat cut: a new picture on each beat at 131 beats a minute, one word a beat, one look (black, cobalt, orange), and one
// sudden stop that holds across the loop point. Real sub-frame blur, no flashes.
{
  const B = 11 / 24, D = B * 8, K = '#0B0B10', C = '#2536F5', O = '#FF5A12', W = '#F4F1EA';
  const big = (c, s, x, y, size, col, sc = 1, al = 'center', rot = 0) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, 1); txt(c, s, 0, 0, `900 ${size}px Inter`, col, al, `${-size * .05}px`); c.restore(); };
  const bg = (c, col) => { c.fillStyle = col; c.fillRect(-100, -100, 700, 700); };
  const shots = [
    (c, u) => { bg(c, O); const z = 1 + .9 * E.out5(u); c.save(); c.translate(240, 260); c.rotate(-.3 + u * .12); for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; c.fillStyle = i % 2 ? '#FF7A3A' : O; c.beginPath(); c.moveTo(0, 0); c.lineTo(600 * cos(a), 600 * sin(a)); c.lineTo(600 * cos(a + .11), 600 * sin(a + .11)); c.fill(); } circle(c, 0, 0, 104 * z); c.fillStyle = K; c.fill(); c.restore(); big(c, 'WAKE', 240, 308, 132, W, 1); },
    (c, u) => { bg(c, K); const e = E.out5(u); for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? C : K; c.fillRect(0, i * 60 - e * 110, 480, 34); } const y = 560 - e * 400; c.fillStyle = O; rr(c, 178, y, 124, 520, 62); c.fill(); circle(c, 240, y + 62, 62); c.fillStyle = '#FF8A4A'; c.fill(); big(c, 'JUMP', 240, 452 - e * 30, 152, W, 1); },
    (c, u) => { bg(c, C); const e = E.out3(u); for (let i = 7; i >= 0; i--) { c.beginPath(); for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, q = (i * 46 + e * 150) * (k % 2 ? 1 : 1.08); c.lineTo(240 + q * cos(a), 240 + q * .8 * sin(a)); } c.closePath(); c.fillStyle = i % 2 ? C : K; c.fill(); } c.save(); c.translate(240, 240); c.scale(1.5 - .5 * E.out5(u), .5 + .5 * E.out5(u)); circle(c, 0, 0, 78); c.fillStyle = O; c.fill(); c.restore(); big(c, 'HIT', 240, 300, 250 * (1.12 - .12 * e), W, 1); },
    (c, u) => { bg(c, K); c.save(); c.translate(240, 240); c.rotate(-.35); const e = u + .2; for (let i = -5; i < 6; i++) { const d = i % 2 ? 1 : -1; big(c, 'SPIN SPIN SPIN SPIN', d * (e * 420 - 160), i * 84 + 30, 92, i === 0 ? O : i % 2 ? '#1A1F6E' : C, 1); } c.restore(); c.save(); c.translate(240, 240); c.rotate(u * 5); for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 96, 0, TAU / 12); c.fillStyle = W; c.fill(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 96, TAU / 12, TAU / 6); c.fillStyle = O; c.fill(); } c.restore(); },
    (c, u) => { bg(c, O); const e = E.out5(u); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const d = hyp(x - 3.5, y - 3.5), k = clamp(e * 2.2 - d * .22); circle(c, 30 + x * 60, 30 + y * 60, 30 * k); c.fillStyle = (x + y) % 2 ? K : C; c.fill(); } big(c, 'MORE', 240, 300, 148, W, 1.0); },
    (c, u) => { bg(c, C); const e = E.in3(u); c.fillStyle = K; poly(c, [[0, 480], [480, 60], [480, 480]], true); c.fill(); const x = lerp(-60, 540, E.io(u)), y = lerp(420, -20, E.io(u)); c.strokeStyle = O; c.lineWidth = 104; c.lineCap = 'round'; c.beginPath(); c.moveTo(-200, 595); c.lineTo(x, y); c.stroke(); big(c, 'FAST', 226 + e * 60, 250, 150, W, 1, 'center', -.72); },
    (c, u) => { bg(c, K); const e = E.out5(u); for (let i = 0; i < 5; i++) { const q = 1 + i * .5 - (e * .5); c.strokeStyle = i % 2 ? C : '#171A45'; c.lineWidth = 26; c.strokeRect(240 - 200 * q, 240 - 200 * q, 400 * q, 400 * q); } const f = E.in2(seg(u, .2, 1)); circle(c, 240, 240, lerp(150, 34, f)); c.fillStyle = O; c.fill(); },
  ];
  scene({
    dur: D, fwd: 1, blur: 16, shutter: .5,
    draw(c, t) {
      // The stop: half a beat before frame 0 and half a beat after it. Nothing moves but a breath.
      const T = (t - 5 / 24 + D) % D, b = floor(T / B + 1e-6), u = fr(T / B);
      if (b < 7) { c.save(); const k = Math.exp(-u * 9) * .03; c.translate(240, 240); c.scale(1 + k + u * .02, 1 + k + u * .02); c.translate(-240, -240); shots[b](c, u); c.restore(); return; }
      bg(c, K); const q = (T - 7 * B) / B, br = sin(q * PI) * .015; circle(c, 240, 240, 34 * (1 + br)); c.fillStyle = O; c.fill(); big(c, 'STOP', 240, 404, 64, W, 1);
    },
  });
}
