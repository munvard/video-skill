// Terminal poem: one command is typed with a human rhythm. On enter, its letters leave the line and become a huge ball
// made of text. The ball really turns and bounces, then the letters fall home.
{
  const D = 4, CW = 13, CH = 20, FONT = '700 21px Mono', G = '#8A94A6', OR = '#FF7A2E'; let cells;
  const CMD = 'ball --jump', ramp = ' .:-=+*oaLB@';
  const keys = [.10, .19, .29, .36, .62, .70, .78, .90, .98, 1.07, 1.15];
  scene({
    dur: D, blur: 10, shutter: .5,
    init() { cells = []; for (let j = -8; j <= 8; j++) for (let i = -13; i <= 13; i++) cells.push([i, j, hash(i, j, 3), hash(i, j, 8)]); },
    draw(c, t) {
      t = (t + 2.381) % D; // frame 0 is the ball already bouncing
      c.fillStyle = '#0A0C10'; c.fillRect(0, 0, 480, 480);
      const gl = c.createRadialGradient(240, 250, 10, 240, 250, 300), on = seg(t, 1.5, 1.9) * (1 - seg(t, 3.3, 3.7)); gl.addColorStop(0, `rgba(255,110,30,${.13 * on})`); gl.addColorStop(1, 'rgba(255,110,30,0)'); c.fillStyle = gl; c.fillRect(0, 0, 480, 480);
      // The prompt. The finished command waits in frame 0, is cleared, and is typed again at the end of the loop.
      const X0 = 40, Y0 = 76, px = i => X0 + 26 + i * 19.2, big = '700 32px Mono';
      const typed = t < 1.25 ? keys.filter(k => k <= t).length : CMD.length, gone = seg(t, 1.36, 1.5), back = t > 3.3;
      txt(c, '>', X0, Y0, big, OR);
      const enter = t > 1.28 && t < 1.4;
      for (let i = 0; i < CMD.length; i++) {
        if (t < 1.36 ? i < typed : false) txt(c, CMD[i], px(i), Y0, big, enter ? '#FFFFFF' : '#E8ECF2');
      }
      const cur = t < 1.36 ? typed : 0, blink = t < 1.3 && t > .05 || fr(t * 1.5) < .6; if (blink && (t < 1.36 || t > 3.55)) { c.fillStyle = OR; c.fillRect(px(cur) + 1, Y0 - 25, 16, 32); }
      // Ball physics: grows out of the line, falls, bounces twice, jumps up and breaks into letters.
      if (t > 1.34 && t < 3.75) {
        const born = E.io(seg(t, 1.36, 1.78)), die = E.in2(seg(t, 3.22, 3.7)), Rr = 136 * born;
        const G0 = 310, u1 = seg(t, 1.78, 2.06), u2 = seg(t, 2.06, 2.66), u3 = seg(t, 2.66, 3.22); let y = 200, sq = 0;
        if (t < 1.78) y = lerp(Y0, 196, born); else if (t < 2.06) y = 196 + (G0 - 196) * u1 * u1; else if (t < 2.66) { y = G0 - 108 * E.arc(u2); } else y = G0 - 64 * E.arc(u3);
        sq = .26 * Math.exp(-(((t - 2.08) / .055) ** 2)) + .16 * Math.exp(-(((t - 2.67) / .055) ** 2)) - .1 * (t > 1.9 && t < 2.06 ? 1 : 0) * u1;
        const sx = 1 + sq, sy = 1 - sq, yb = y + sq * Rr, ru = fr((t - 2.381) / D), rot = TAU * 2 * (ru - sin(TAU * ru) / TAU);
        c.font = FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
        for (const [i, j, h, h2] of cells) {
          const x0 = i * CW, y0 = j * CH; const nx = x0 / (Rr * sx), ny = y0 / (Rr * sy), r2 = nx * nx + ny * ny; if (r2 > 1) continue;
          const nz = Math.sqrt(1 - r2), light = clamp(.2 + .95 * max(0, -nx * .45 - ny * .62 + nz * .64) + .25 * (1 - nz) ** 3 * (nx > 0 ? 1 : 0));
          // Stripes painted on the ball make the turn visible.
          const ax = nx * cos(rot) + nz * sin(rot), stripe = abs(ny * .9 + ax * .25) < .16 ? .5 : 1;
          const v = light * stripe, ch = ramp[clamp(floor(v * ramp.length * .98), 2, ramp.length - 1)];
          let X = 240 + x0, Y = yb + y0; const src = floor(h * CMD.length);
          if (born < 1) { const k = E.io(clamp(born * 1.5 - h2 * .5)); X = lerp(px(src) + 9, X, k); Y = lerp(Y0 - 10, Y, k); }
          if (die > 0) { const k = clamp(die * 1.6 - h2 * .6); X = lerp(X, px(0) + 8 + (h - .5) * 60, E.in2(k)); Y = lerp(Y, Y0 - 10, E.io(k)) + sin(PI * k) * 90 * (h - .3); c.globalAlpha = 1 - E.in3(k); }
          c.fillStyle = mix('#7A2B08', v > .9 ? '#FFC58A' : '#FF7A2E', clamp(v * 1.25 + .1)); c.fillText(ch, X, Y); c.globalAlpha = 1;
        }
        // The floor answers in text too.
        const f = t > 2.06 ? t - 2.06 : -1, f2 = t > 2.66 ? t - 2.66 : -1; c.fillStyle = G;
        for (let i = -18; i <= 18; i++) { const X = 240 + i * CW, d = abs(i) * CW; let a = 0; for (const [q, s] of [[f, 1], [f2, .6]]) if (q > 0) a += s * Math.exp(-(((d - q * 420) / 46) ** 2)) * Math.exp(-q * 1.8); c.globalAlpha = (.25 + .75 * clamp(a)) * born * (1 - die); c.fillText(a > .5 ? '^' : a > .18 ? '~' : '_', X, G0 + 146 - a * 9); } c.globalAlpha = 1;
      }
    },
  });
}
