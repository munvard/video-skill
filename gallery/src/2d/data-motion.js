// Data in motion: the ball draws its own chart. A drop from 1 m, 80 percent of the speed kept at each hit, g = 9.81,
// computed here in real time. The share of height that comes back is 0.8 squared, so 64 percent, every bounce.
{
  const D = 4, g = 9.81, e = .8, T0 = .3, X0 = 92, PXS = 122, BASE = 392, PXM = 262, R = 15, FGC = '#E9F1EA', LINE = '#6FA58F';
  const hits = [Math.sqrt(2 / g)]; let v = g * hits[0]; const apex = [[0, 1]]; for (let i = 0; i < 5; i++) { v *= e; hits.push(hits[i] + 2 * v / g); apex.push([hits[i] + v / g, v * v / 2 / g]); }
  const END = 2.62, H = s => { if (s < hits[0]) return 1 - g * s * s / 2; let k = 0, u = g * hits[0]; while (k < hits.length - 1 && s >= hits[k + 1]) k++; u *= e ** (k + 1); const q = s - hits[k]; return max(0, u * q - g * q * q / 2); };
  const P = s => [X0 + s * PXS, BASE - R - H(s) * PXM];
  scene({
    dur: D, blur: 14, shutter: .5,
    draw(c, t, f) {
      const bg = c.createLinearGradient(0, 0, 0, 480); bg.addColorStop(0, '#14392F'); bg.addColorStop(1, '#0C2620'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      const s = clamp(t - T0, 0, END), tail = E.io(seg(t, 3.15, 3.7)) * END, axis = 1;
      // Axis from zero, in metres and seconds, with the ball's own size as the scale.
      c.lineCap = 'round'; for (let k = 0; k <= 4; k++) { const y = BASE - R - k / 4 * PXM; c.strokeStyle = k ? 'rgba(233,241,234,.13)' : 'rgba(233,241,234,0)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(64, y); c.lineTo(456, y); c.stroke(); }
      c.strokeStyle = FGC; c.lineWidth = 3; c.beginPath(); c.moveTo(64, BASE); c.lineTo(64 + 392 * axis, BASE); c.stroke(); c.beginPath(); c.moveTo(64, BASE); c.lineTo(64, BASE - R - PXM - 8); c.stroke();
      txt(c, '1 m', 54, BASE - R - PXM + 8, '600 22px Inter', 'rgba(233,241,234,.85)', 'right'); txt(c, '0', 54, BASE + 6, '600 22px Inter', 'rgba(233,241,234,.85)', 'right');
      for (let k = 0; k <= 2; k++) { const x = X0 + k * PXS; c.beginPath(); c.moveTo(x, BASE); c.lineTo(x, BASE + 7); c.stroke(); txt(c, k + ' s', x, BASE + 32, '600 22px Inter', 'rgba(233,241,234,.85)', 'center'); }
      // Pillars rise to each apex as the ball reaches it.
      apex.slice(1, 5).forEach(([at, h], i) => { const k = E.out3(seg(s, at - .02, at + .2)) * (1 - E.io(seg(tail, at - .25, at + .05))); if (k <= 0) return; const x = X0 + at * PXS, y = BASE - R - h * PXM * k; const pg = c.createLinearGradient(0, y, 0, BASE); pg.addColorStop(0, 'rgba(255,170,96,.85)'); pg.addColorStop(1, 'rgba(255,120,40,.10)'); c.fillStyle = pg; rr(c, x - 17, y + R, 34, BASE - y - R, [8, 8, 0, 0]); c.fill(); c.globalAlpha = k; txt(c, h.toFixed(2), x, y - 14, '700 22px Inter', '#FFD3A6', 'center', '-.4px'); c.globalAlpha = 1; });
      // The line the ball has drawn.
      c.strokeStyle = '#FF9A52'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.beginPath(); let st = false; for (let q = tail; q < s; q += .004) { const p = P(q); st ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); st = true; } if (st && tail < s) { const p = P(s); c.lineTo(p[0], p[1]); c.stroke(); }
      // Big number first, its meaning after the second bounce.
      const n = E.io(seg(t, 1.35, 1.65)) * (1 - E.io(seg(t, 3.3, 3.6)));
      txt(c, '64%', 452, 92, '800 92px Inter', FGC, 'right', '-4px');
      c.globalAlpha = n; txt(c, 'of the height comes back,', 452, 130 + (1 - n) * 8, '600 23px Inter', '#FFD3A6', 'right', '-.3px'); txt(c, 'every bounce', 452, 160 + (1 - n) * 8, '600 23px Inter', '#FFD3A6', 'right', '-.3px'); c.globalAlpha = 1;
      txt(c, 'simulated: 1 m drop, 80% of speed kept', 64, 462, '500 20px Inter', 'rgba(233,241,234,.62)', 'left', '-.3px');
      // Ball: waits at 1 m, falls on its own clock, rolls, then hops back to the start.
      let [x, y] = P(s), sx = 1, sy = 1; const wob = t < T0 ? sin(PI * seg(t, .1, T0)) * .1 : 0; sx += wob; sy -= wob;
      const near = hits.find(h => abs(s - h) < .03); if (near !== undefined && t > T0 && t < 3) { const k = 1 - abs(s - near) / .03; sy -= .3 * k * (near < .6 ? 1 : .6); sx += .26 * k * (near < .6 ? 1 : .6); y += (1 - sy) * R; }
      if (t > T0 + END) { const u = seg(t, T0 + END, 3.3); x += 26 * E.out2(u); y = BASE - R; } if (t > 3.3) { const u = E.io(seg(t, 3.3, 3.86)); const x1 = P(END)[0] + 26; x = lerp(x1, X0, u); y = lerp(BASE - R, BASE - R - PXM, u) - sin(PI * u) * 46; }
      ball(c, x, y, R, { sx, sy, lit: 1 });
    },
  });
}
