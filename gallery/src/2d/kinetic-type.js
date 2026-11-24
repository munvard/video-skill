// Kinetic type: the words do what they say. One typeface, two colors. The ball is the full stop.
// HEAVY fills frame 0, AGAIN winds up like a wheel, WAKE is stepped awake letter by letter, JUMP leaves.
{
  const BG = '#0E0D0C', FG = '#FF5F1A', D = 4, F = s => `900 ${s}px Inter`;
  const word = (c, s, size) => { c.font = F(size); c.letterSpacing = '0px'; let x = 0; return [...s].map(ch => { const w = c.measureText(ch).width * .94, o = { ch, x, w }; x += w; return o; }); };
  const put = (c, ch, size) => txt(c, ch, 0, 0, F(size), FG);
  const HIT = 3.72;
  scene({
    dur: D, blur: 20, shutter: .55,
    draw(c, t) {
      c.fillStyle = BG; c.fillRect(0, 0, 480, 480);
      const heavy = (k, out, drop) => {
        const sh = k > 0 ? Math.exp(-k * 10) * sin(k * 62) * 16 : 0;
        c.save(); c.translate(10, 468 - drop * 680 + out * 560 + sh); c.rotate(sh * .0016); c.scale(.915, 2.75 - (k > 0 ? Math.exp(-k * 9) * .45 : 0));
        word(c, 'HEAVY', 146).forEach(l => { c.save(); c.translate(l.x, 0); put(c, l.ch, 146); c.restore(); }); c.restore();
      };
      // Where the ball is in the HEAVY shot: it bounces on the word after the hit.
      const top = k => 124 - abs(sin(k * 7.2)) * 60 * Math.exp(-k * 2.2);
      if (t < 1.0) { // HEAVY, landed. Then the floor gives way.
        const k = t + D - HIT, out = E.in3(seg(t, .56, .84)); heavy(k, out, 0);
        const up = E.io(seg(t, .56, .9));
        ball(c, lerp(386, 240, up), lerp(top(k), 240, up), 19, { fill: FG });
      }
      if (t > .78 && t < 2.02) { // AGAIN turns round the ball, readable, then winds into it.
        const inn = E.out5(seg(t, .8, 1.1)), end = E.io5(seg(t, 1.5, 1.86)), k = inn * (1 - end), rot = -.9 - (t - .8) * 1.25 - end * 3, s = 'AGAINAGAINAGAIN';
        c.save(); c.translate(240, 240);
        if (k > .02) [...s].forEach((ch, i) => { c.save(); c.rotate(rot + (i + floor(i / 5) * .55) / 16.65 * TAU); c.translate(0, -150 * k); c.scale(k, k); c.textAlign = 'center'; txt(c, ch, 0, 0, F(84), FG, 'center'); c.restore(); });
        c.restore();
        if (t >= .9) { const go = E.in2(seg(t, 1.74, 2.02)); ball(c, lerp(240, 76, go), lerp(240, 290, go) - sin(PI * go) * 50, 19 + sin(PI * seg(t, 1.55, 1.9)) * 12, { fill: FG }); }
      }
      if (t > 1.6 && t < 2.98) { // WAKE lies flat. The ball steps on each letter and it stands up.
        const inn = 1 - E.out5(seg(t, 1.62, 1.9)), out = E.in3(seg(t, 2.8, 2.98)), W = word(c, 'WAKE', 176), hitAt = i => 2.02 + i * .16;
        W.forEach((l, i) => {
          const u = seg(t, hitAt(i), hitAt(i) + .3), up = u > 0 ? E.back(u, 2.6) : 0;
          c.save(); c.translate(14 + l.x * .8, 330 + inn * 200 + out * 300); c.transform(1, 0, lerp(.9, 0, up), 1, 0, 0); c.scale(.8, lerp(.16, 1.45, up)); put(c, l.ch, 176); c.restore();
        });
        if (t >= 2.02) {
          const n = min(3, floor((t - 2.02) / .16)), u = clamp((t - 2.02) / .16 - n, 0, 1.6), lx = i => i < 0 ? 30 : i > 3 ? 448 : 14 + W[i].x * .8 + W[i].w * .4;
          const last = t > hitAt(3), q = seg(t, hitAt(3), hitAt(3) + .42);
          const x = last ? lerp(lx(3), 452, E.out2(q)) : lerp(lx(n), lx(n + 1), u), y = last ? lerp(290, 311, E.in2(q)) - E.arc(q) * 150 : lerp(250, 290, n < 0 ? 0 : 1) - E.arc(clamp(u)) * 44;
          ball(c, x, y + out * 40, 19, { fill: FG });
        }
      }
      if (t > 2.84 && t < 3.6) { // JUMP crouches under its own weight and leaves the frame.
        const inn = E.out5(seg(t, 2.86, 3.06)), cr = E.io(seg(t, 3.06, 3.28));
        word(c, 'JUMP', 190).forEach((l, i) => {
          const go = E.in2(seg(t, 3.28 + i * .035, 3.5 + i * .035));
          c.save(); c.translate(14 + l.x * .84, 400 + (1 - inn) * 320 - go * 860); c.scale(lerp(.84, .92, cr) - go * .16, (lerp(1, .34, cr) + go * 1.4) * 1.7); put(c, l.ch, 190); c.restore();
        });
        const go = seg(t, 3.28, 3.6), k = cr * (1 - go);
        if (t >= 2.98) ball(c, lerp(452, 420, go), lerp(lerp(352, 381, seg(t, 2.98, 3.06)), 389, cr) - E.out2(go) * 300, 19, { fill: FG, sx: 1 + k * .35, sy: 1 - k * .3 + sin(go * PI) * .4 });
      }
      if (t >= 3.5) { // HEAVY falls and shakes the floor.
        const k = t - HIT; heavy(k, 0, 1 - E.in3(seg(t, 3.52, HIT)));
        if (t >= 3.6) { const q = seg(t, 3.6, HIT); ball(c, lerp(420, 386, q), k > 0 ? top(k) : lerp(89, 124, q), 19, { fill: FG, sx: 1 + (k > 0 ? Math.exp(-k * 16) * .5 : 0), sy: 1 - (k > 0 ? Math.exp(-k * 16) * .4 : 0) }); }
      }
    },
  });
}
