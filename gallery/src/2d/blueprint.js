// Blueprint: the plan draws itself, the camera tilts, the drawing rises into a real ball, jumps along its own dotted
// path and lies down as a drawing again. Orthographic, so the drawn circle and the ball match exactly.
{
  const D = 4, R = 72, LINE = '#BFD8FF';
  scene({
    dur: D, blur: 10, shutter: .5,
    draw(c, t) {
      const tilt = E.io5(seg(t, .75, 1.5)) * (1 - E.io5(seg(t, 3.0, 3.7))), phi = lerp(PI / 2, .42, tilt), yaw = -.5 * tilt;
      const real = E.io(seg(t, 1.42, 1.72)) * (1 - E.io(seg(t, 2.75, 3.0))), wire = E.io(seg(t, 1.0, 1.4)) * (1 - E.io(seg(t, 3.05, 3.4)));
      const P = (x, y, z = 0) => { const X = x * cos(yaw) - y * sin(yaw), Y = x * sin(yaw) + y * cos(yaw); return [240 + X, lerp(232, 356, tilt) - (Y * sin(phi) + z * cos(phi))]; };
      const bg = c.createRadialGradient(240, 200, 20, 240, 240, 380); bg.addColorStop(0, '#1B4A94'); bg.addColorStop(1, '#0B2557'); c.fillStyle = bg; c.fillRect(0, 0, 480, 480);
      const line = (p, w, a, col = LINE) => { c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = w; poly(c, p); c.stroke(); c.globalAlpha = 1; };
      for (let i = -14; i <= 14; i++) { const a = i % 4 ? .1 : .22; line([P(i * 30, -420), P(i * 30, 420)], 1, a); line([P(-420, i * 30), P(420, i * 30)], 1, a); }
      // Drawing progress: erased and redrawn at speed around the loop point.
      const dr = t < 2 ? 1 : E.io5(seg(t, 3.35, 3.98)), dim = (t < 1 ? 1 - E.io(seg(t, .6, .95)) : E.io(seg(t, 3.5, 3.95)));
      const ring = (r, n, f = 1, z = 0, sq = 1) => { const p = []; for (let i = 0; i <= n * f; i++) p.push(P(r * cos(i / n * TAU + 1.2), r * sq * sin(i / n * TAU + 1.2), z)); return p; };
      c.lineCap = 'round';
      line(ring(R, 90), 2.6, t < 2 ? 1 : max(.35, dr), '#EAF2FF');
      if (dim > 0) {
        const e = dim; c.setLineDash([14, 6, 3, 6]); line([P(-R - 46 * e, 0), P(R + 46 * e, 0)], 1.4, .8); line([P(0, -R - 46 * e), P(0, R + 46 * e)], 1.4, .8); c.setLineDash([]);
        line([P(-R, -R - 8), P(-R, -R - 52 * e)], 1.4, .8); line([P(R, -R - 8), P(R, -R - 52 * e)], 1.4, .8); line([P(-R * e, -R - 42), P(R * e, -R - 42)], 2, 1);
        for (const s of [-1, 1]) line([P(s * R * e - s * 11, -R - 37), P(s * R * e, -R - 42), P(s * R * e - s * 11, -R - 47)], 2, 1);
        c.globalAlpha = e; txt(c, '1 ball', 240, 232 + R + 80, '700 26px Mono', '#EAF2FF', 'center'); c.globalAlpha = 1;
        line(ring(R * .62, 60, e), 1.2, .55); line(ring(R * 1.5, 80, e), 1.2, .35);
        line([P(R * .707, R * .707), P(R * .707 + 52 * e, R * .707 + 52 * e), P(R * .707 + 52 * e + 60 * e, R * .707 + 52 * e)], 1.6, .9);
        c.globalAlpha = e; txt(c, 'r', 240 + R * .707 + 70, 232 - R * .707 - 60, '700 26px Mono', '#EAF2FF'); c.globalAlpha = 1;
      }
      // The jump: three balls high, measured by the ball itself.
      const H = R * 2 * 1.05, j = seg(t, 1.95, 2.72), up = arcH(j), q = sin(PI * seg(t, 1.76, 1.98)) * .22, ld = t > 2.72 ? sin(PI * seg(t, 2.72, 2.95)) * .2 : 0;
      function arcH(u) { return 4 * u * (1 - u) * H * 1.0; }
      if (wire > 0) {
        const z = R + up;
        // Height marks: a ruler made of ball outlines.
        c.globalAlpha = wire; c.setLineDash([5, 6]); for (let k = 0; k < 2; k++) { const [x, y] = P(0, 0, R + (k ? H : 0)); if (k) { c.strokeStyle = LINE; c.lineWidth = 1.6; circle(c, x, y, R); c.stroke(); } } c.setLineDash([]);
        const s = 132; line([P(s, 0, 0), P(s, 0, (R * 2 + H) * wire)], 1.8, wire * .9); for (let k = 0; k <= 3; k++) { const zz = k / 3 * (R * 2 + H) * wire; line([P(s - 9, 0, zz), P(s + 9, 0, zz)], 1.8, wire * .9); } c.globalAlpha = 1;
        // Contact shadow, then the wire ball, then the material over it.
        const sh = P(0, 0); c.save(); c.translate(sh[0] + 8, sh[1] + 6); c.scale(1, sin(phi)); const g = c.createRadialGradient(0, 0, 4, 0, 0, R * 1.25); const sa = real * (.55 - .35 * up / H); g.addColorStop(0, `rgba(2,10,34,${sa})`); g.addColorStop(1, 'rgba(2,10,34,0)'); c.fillStyle = g; circle(c, 0, 0, R * 1.25); c.fill(); c.restore();
        const [bx, by] = P(0, 0, z), sx = 1 + q + ld - .1 * sin(PI * j), sy = 1 - q - ld + .12 * sin(PI * j); c.save(); c.translate(bx, by + (1 - sy) * R * cos(phi)); c.scale(sx, sy);
        c.strokeStyle = '#EAF2FF'; c.lineWidth = 1.5; c.globalAlpha = wire * (1 - real * .999);
        for (let k = -3; k <= 3; k++) { const a = k / 4 * PI / 2, rr2 = R * cos(a), zz = R * sin(a) * cos(phi); c.beginPath(); c.ellipse(0, -zz, rr2, rr2 * sin(phi), 0, 0, TAU); c.stroke(); }
        for (let k = 0; k < 6; k++) { const a = k / 6 * PI + yaw; const p = []; for (let m = 0; m <= 48; m++) { const b = m / 48 * TAU, x = R * cos(b) * cos(a), y = R * cos(b) * sin(a), zz = R * sin(b); p.push([x, -(y * sin(phi) + zz * cos(phi))]); } poly(c, p); c.stroke(); }
        circle(c, 0, 0, R); c.lineWidth = 2.6; c.globalAlpha = wire; c.stroke();
        if (real > 0) { c.save(); circle(c, 0, 0, R + 1); c.clip(); c.globalAlpha = 1; const top = lerp(R + 2, -R - 2, real); c.beginPath(); c.rect(-R - 2, top, R * 2 + 4, R * 2 + 4); c.clip(); const m = c.createRadialGradient(-R * .36, -R * .5, R * .05, -R * .05, -R * .05, R * 1.18); m.addColorStop(0, '#FFE2BC'); m.addColorStop(.16, '#FFB071'); m.addColorStop(.45, '#FF7424'); m.addColorStop(.78, '#DB4A08'); m.addColorStop(.95, '#8E2E12'); m.addColorStop(1, '#5A3560'); c.fillStyle = m; c.fillRect(-R - 2, -R - 2, R * 2 + 4, R * 2 + 4); const rim = c.createRadialGradient(0, 0, R * .74, 0, 0, R * 1.02); rim.addColorStop(0, 'rgba(120,170,255,0)'); rim.addColorStop(1, 'rgba(150,180,255,.4)'); c.fillStyle = rim; c.beginPath(); c.rect(-R - 2, -R - 2, R * 2 + 4, R * 2 + 4); c.fill(); c.restore(); }
        c.restore();
      }
    },
  });
}
