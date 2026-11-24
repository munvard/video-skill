// Perfect loop: stairs that always go down and still close. Fourteen steps, fourteen hops, one lap. The picture hides the
// height error the way an isometric drawing can: the path moves three cells away from us while it goes down fourteen steps.
{
  const D = 4, A = 45, BB = 23, K = 3, S1 = 2, N = 4 * S1 + 2 * K, DZ = 2 * K * BB / N, OX = 306, OY = 196, cells = [];
  { let x = 0, y = 0; const go = (dx, dy, n) => { for (let i = 0; i < n; i++) { cells.push([x, y]); x += dx; y += dy; } }; go(1, 0, S1); go(0, 1, S1); go(-1, 0, S1 + K); go(0, -1, S1 + K); }
  const pr = (x, y, z) => [OX + (x - y) * A, OY + (x + y) * BB + z];
  const top = i => { const n = floor(i / N), k = ((i % N) + N) % N, [x, y] = cells[k]; void n; return pr(x, y, k * DZ); };
  const rhomb = (c, x, y) => poly(c, [[x, y - BB], [x + A, y], [x, y + BB], [x - A, y]], true);
  scene({
    dur: D, blur: 12, shutter: .5,
    draw(c, t) {
      const bg = c.createLinearGradient(0, 0, 0, 480); bg.addColorStop(0, '#F7C9B6'); bg.addColorStop(.6, '#EFA4A0'); bg.addColorStop(1, '#8E6A9E'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      const sun = c.createRadialGradient(352, 92, 8, 352, 92, 150); sun.addColorStop(0, '#FFF1D8'); sun.addColorStop(.3, '#FFDCBC'); sun.addColorStop(1, 'rgba(255,215,185,0)'); c.fillStyle = sun; c.fillRect(0, 0, 480, 480);
      const DEPTH = 170, order = cells.map((_, i) => i).sort((a, b) => top(a)[1] - top(b)[1] || a - b);
      const prog = t / D * N, hi = floor(prog), hu = fr(prog), pa = top(hi), pb = top(hi + 1);
      for (const i of order) {
        const [x, y] = top(i);
        const l = c.createLinearGradient(0, y, 0, y + DEPTH); l.addColorStop(0, '#C9707E'); l.addColorStop(1, '#7A4F86'); c.fillStyle = l; poly(c, [[x - A, y], [x, y + BB], [x, y + BB + DEPTH], [x - A, y + DEPTH]], true); c.fill();
        const r = c.createLinearGradient(0, y, 0, y + DEPTH); r.addColorStop(0, '#E9A08E'); r.addColorStop(1, '#A0668E'); c.fillStyle = r; poly(c, [[x + A, y], [x, y + BB], [x, y + BB + DEPTH], [x + A, y + DEPTH]], true); c.fill();
        // Arches in the lower wall, only on the outer front sides.
        const [cx, cy] = cells[i]; const arch = (sx) => { c.save(); c.beginPath(); c.rect(x - A, y + 34, 2 * A, 140); c.clip(); c.transform(1, sx * BB / A, 0, 1, x, y + BB); c.fillStyle = '#55366B'; c.beginPath(); c.moveTo(sx * -12 + -sx * 14, 120); const x0 = -sx * 37, x1 = -sx * 13; c.beginPath(); c.moveTo(x0, 150); c.lineTo(x0, 64); c.arc((x0 + x1) / 2, 64, abs(x1 - x0) / 2, sx > 0 ? PI : 0, sx > 0 ? 0 : PI, sx < 0); c.lineTo(x1, 150); c.fill(); c.restore(); };
        if (cy === 2 && cx > -3 && cx < 2 && (cx & 1) === 0) arch(1); if (cx === 2 && cy === 1) arch(-1);
        // Step top: warm near the sun side, with a lit edge and a riser line.
        const g = c.createLinearGradient(x - A, y, x + A, y); g.addColorStop(0, '#FBE3CB'); g.addColorStop(1, '#FFF3DF'); c.fillStyle = g; rhomb(c, x, y); c.fill(); c.strokeStyle = 'rgba(150,80,96,.55)'; c.lineWidth = 1.2; c.stroke();
        // The step the ball is on dips a little.
      }
      // Contact shadow, long to the lower left.
      const u = hu, x = lerp(pa[0], pb[0], E.io(u) * .35 + u * .65), yy = lerp(pa[1], pb[1], u), up = E.arc(u) * 38, R = 18;
      c.save(); c.globalAlpha = .4 - .2 * up / 40; c.fillStyle = '#8F3F4E'; c.beginPath(); c.ellipse(x - 6 - up * .25, yy + 3 + up * .04, R * .95, R * .48, 0, 0, TAU); c.fill(); c.restore();
      const ld = u < .16 ? sin(PI * u / .16) : u > .92 ? 0 : 0, sy = 1 - .2 * ld + .1 * sin(PI * u), sx = 2 - sy;
      ball(c, x, yy - R * .86 - up + (1 - sy) * R * .8, R, { sx, sy, lit: 1 });
      // Mist at the foot.
      const m = c.createLinearGradient(0, 330, 0, 480); m.addColorStop(0, 'rgba(190,130,165,0)'); m.addColorStop(.75, 'rgba(160,112,160,.95)'); m.addColorStop(1, '#8E6A9E'); c.fillStyle = m; c.fillRect(0, 330, 480, 150);
    },
  });
}
