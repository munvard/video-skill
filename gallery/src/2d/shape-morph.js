// Shape morph: ball, full frame, dot, line, wave, ring, ball. One accent per world, a fast middle, a creep in every hold.
{
  const CREAM = '#F4F1EA', OR = '#FF6A1F', N = 160, L = 300, D = 3.75, R = 15;
  // A curve with constant bend k (0 = straight, TAU/L = closed ring), plus a travelling wave of height a.
  const curve = (k, a, ph, len) => {
    const p = [];
    for (let i = 0; i <= N; i++) {
      const s = (i / N - .5) * len, ang = k * s;
      const x = abs(k) < 1e-5 ? s : sin(ang) / k, y = abs(k) < 1e-5 ? 0 : (1 - cos(ang)) / k;
      const w = a * cos(PI * (i / N - .5)) ** 2 * sin(s * .0838 + ph);
      p.push([x - sin(ang) * w, y + cos(ang) * w]);
    }
    return p;
  };
  const shadow = (c, a, w = 17) => { c.globalAlpha = a; c.fillStyle = '#DED7C8'; c.beginPath(); c.ellipse(240, 284, w, 2.6, 0, 0, TAU); c.fill(); c.globalAlpha = 1; };
  scene({
    dur: D, blur: 20, shutter: .6,
    draw(c, t) {
      const creep = 1 + .012 * sin(TAU * t / D);
      c.fillStyle = CREAM; c.fillRect(0, 0, 480, 480);
      c.translate(240, 240); c.scale(creep, creep); c.translate(-240, -240);
      const grow = E.io5(seg(t, .74, 1.14)), shrink = E.io5(seg(t, 2.85, 3.4));
      if (t < 1.14) {
        const hop = seg(t, .34, .74), crouch = sin(PI * seg(t, .14, .36)), st = sin(PI * hop) * .3 * (1 - grow);
        const r = R * Math.exp(Math.log(26) * grow), y = lerp(hop > 0 ? 262 - 110 * E.out2(hop) : 262 + crouch * 4, 240, grow);
        shadow(c, 1 - hop, 17 * (1 - hop * .5));
        ball(c, 240, y, r, { sx: 1 + crouch * .24 - st, sy: 1 - crouch * .22 + st * 1.3, fill: OR });
      } else if (t < 2.86) { c.fillStyle = OR; c.fillRect(-20, -20, 520, 520); } else {
        const land = sin(PI * seg(t, 3.42, 3.62)), r = 340 * Math.exp(Math.log(R / 340) * shrink);
        shadow(c, seg(shrink, .9, 1));
        ball(c, 240, lerp(240, 262, E.in2(seg(t, 3.2, 3.44))) + land * 4, r, { sx: 1 + land * .22, sy: 1 - land * .2, fill: OR });
      }
      // The orange world: a cream dot becomes a line, the line speaks, curls up, closes, and takes the world with it.
      if (t > 1.02 && t < 3.3) {
        const pop = E.back(seg(t, 1.02, 1.24), 2.2), ext = E.io5(seg(t, 1.28, 1.56));
        const wave = E.io(seg(t, 1.58, 1.76)) * (1 - E.io5(seg(t, 2.1, 2.4))), curl = E.io5(seg(t, 2.12, 2.56));
        const spin = E.io5(seg(t, 2.25, 3.1)) * TAU, cl = E.io5(seg(t, 2.85, 3.3)), rad = L / TAU;
        const pts = curve(curl * TAU / L, 36 * wave, -t * 11, lerp(.01, L, ext));
        const u = clamp(.5 + E.io5(seg(t, 1.66, 2.16)) * .5), P = pts[Math.round(u * N)], q = Math.exp(Math.log(.03) * cl);
        c.save(); c.translate(240, 240); c.scale(q, q); c.rotate(spin * curl); c.translate(0, -curl * rad);
        c.lineCap = c.lineJoin = 'round'; c.strokeStyle = CREAM; c.lineWidth = 3.2 * ext;
        if (cl < .99) { poly(c, pts); c.stroke(); ball(c, P[0], P[1], 14 * pop * (1 - ext * .3), { fill: CREAM }); }
        c.restore();
      }
    },
    post: im => grain(im, 5),
  });
}
