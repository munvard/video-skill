// Riso print: the blue ink alone is an odd shape. When the orange ink arrives, the ball becomes the eye of a fish.
// Two spot inks, two screens at different angles, misregistration that steps at 8 poses a second, paper that never moves.
{
  const W = 960, D = 3.5; let paper, A, B;
  const ink = [[255, 88, 36], [20, 70, 188]];
  const fish = (c, x, y, s, k) => {
    c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.moveTo(-150, 0); c.bezierCurveTo(-120, -104, 20, -128, 96, -30 + k * 4);
    c.bezierCurveTo(120, -14, 150, -70, 190, -84 + k * 12); c.bezierCurveTo(172, -30, 172, 30, 190, 84 + k * 12); c.bezierCurveTo(150, 70, 120, 18, 96, 34 + k * 4);
    c.bezierCurveTo(20, 128, -120, 104, -150, 0); c.closePath(); c.restore();
  };
  scene({
    dur: D, blur: 1, ss: 2,
    init() {
      A = mkc(W, W); B = mkc(W, W); const r = rng(7); paper = new Float32Array(W * W);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) paper[y * W + x] = (fbm(x / 9, y / 9, 3, 3) - .45) * 10 + (r() - .5) * 9;
    },
    draw(c, t0) {
      const p = floor(t0 * 8 + 1e-4), t = p / 8, tw = floor(t0 * 4 + 1e-4) / 4, a = A.getContext('2d', { willReadFrequently: true }), b = B.getContext('2d', { willReadFrequently: true });
      for (const g of [a, b]) { g.setTransform(2, 0, 0, 2, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, 480, 480); }
      const k = sin(TAU * t * 6 / D), fx = 252, fy = 244, eye = [fx - 78, fy - 22], home = [66, 404];
      let bx, by, sq = 0, inEye = 0;
      const h1 = seg(t, .33, 1.0), h2 = seg(t, 2.5, 3.17);
      if (t < .33) { [bx, by] = home; sq = sin(PI * seg(t, .08, .33)) * .28; } else if (t < 1) { bx = lerp(home[0], eye[0], h1); by = lerp(home[1], eye[1], h1) - E.arc(h1) * 150; sq = -.18 * cos(PI * h1) ** 2; } else if (t < 2.5) { [bx, by] = eye; inEye = 1; sq = sin(PI * seg(t, .95, 1.2)) * .2; } else if (t < 3.17) { bx = lerp(eye[0], home[0], h2); by = lerp(eye[1], home[1], h2) - E.arc(h2) * 130; } else { [bx, by] = home; sq = sin(PI * seg(t, 3.1, 3.42)) * .28; }
      const on = t >= 1 && t < 2.5, f = on ? min(1, (t - .9) * 5, (2.55 - t) * 5) : 0;
      // BLUE plate.
      txt(b, 'SEA', 20, 132, '900 156px Inter', '#000', 'left', '-9px');
      const g = b.createLinearGradient(0, fy - 110, 0, fy + 120); g.addColorStop(0, '#050505'); g.addColorStop(.55, '#555'); g.addColorStop(1, '#c4c4c4');
      fish(b, fx, fy, 1.06, k); b.lineWidth = 12; b.strokeStyle = '#fff'; b.stroke(); b.fillStyle = g; b.fill();
      circle(b, eye[0], eye[1], 35); b.fillStyle = '#fff'; b.fill();
      b.strokeStyle = '#fff'; b.lineWidth = 7; b.lineCap = 'round'; b.beginPath(); b.arc(fx - 38, fy + 4, 62, -.9, .9); b.stroke();
      b.beginPath(); b.moveTo(fx - 152, fy + 26); b.quadraticCurveTo(fx - 120, fy + 36 + (on ? 10 : -6), fx - 96, fy + 24); b.stroke();
      for (let j = 0; j < 4; j++) { b.beginPath(); b.moveTo(-10, 500); for (let x = -10; x <= 490; x += 8) b.lineTo(x, 380 + j * 32 + sin(x * .035 + j * 1.9 + TAU * tw / D * (j % 2 ? 2 : -2)) * 9); b.lineTo(490, 500); b.closePath(); const v = [214, 168, 110, 40][j]; b.fillStyle = `rgb(${v},${v},${v})`; b.fill(); }
      // ORANGE plate: the sun, its path on the water, and what only appears with the eye.
      const sun = a.createRadialGradient(372, 120, 10, 372, 120, 96); sun.addColorStop(0, '#222'); sun.addColorStop(1, '#999'); circle(a, 372, 112, 84); a.fillStyle = sun; a.fill();
      for (let j = 0; j < 6; j++) { a.fillStyle = `rgba(0,0,0,${.25 + .1 * (j % 3)})`; rr(a, 316 - j * 9 + sin(TAU * tw / D * 2 + j) * 14, 388 + j * 15, 112 + j * 18, 7, 4); a.fill(); }
      if (f > 0) {
        a.save(); fish(a, fx, fy, 1.06, k); a.clip(); a.globalAlpha = f; a.strokeStyle = '#111'; a.lineWidth = 4.5;
        for (let i = 0; i < 9; i++) for (let j = 0; j < 8; j++) { a.beginPath(); a.arc(fx - 46 + i * 30 + (j % 2) * 15, fy - 104 + j * 27, 15, .2, PI - .2); a.stroke(); }
        const lg = a.createLinearGradient(fx - 150, 0, fx + 190, 0); lg.addColorStop(0, '#fff'); lg.addColorStop(.5, '#aaa'); lg.addColorStop(1, '#111'); a.globalAlpha = f * .8; a.globalCompositeOperation = 'multiply'; a.fillStyle = lg; a.fillRect(0, 0, 480, 480); a.restore();
        circle(a, eye[0], eye[1], 37); a.fillStyle = '#fff'; a.fill();
      }
      const blink = on && (p === 15) ? .25 : 1;
      a.save(); a.translate(bx, by); a.scale(1 + sq, (1 - sq) * blink); circle(a, 0, 0, inEye ? 29 : 27); a.fillStyle = '#000'; a.fill(); a.restore();
      if (on) {
        const lx = -8 + 13 * E.io(seg(t, 1.5, 1.75)) - 13 * E.io(seg(t, 2.05, 2.3));
        b.save(); b.translate(eye[0] + lx, eye[1]); b.scale(1, blink); circle(b, 0, 0, 13); b.fillStyle = '#000'; b.fill(); circle(b, 5, -5, 4.5); b.fillStyle = '#fff'; b.fill(); b.restore();
        for (let i = 0; i < 4; i++) { const u = fr(t * .8 + i * .37); circle(b, 84 - i * 6, 244 - u * 96, 5 + i * 1.6); b.strokeStyle = '#000'; b.lineWidth = 3; b.stroke(); }
      }
      // Screen both plates and print them with multiply.
      const da = a.getImageData(0, 0, W, W).data, db = b.getImageData(0, 0, W, W).data, im = c.createImageData(W, W), o = im.data, jx = [[2.5, 4], [4, 3], [3, 5.5], [5, 4]][floor(p / 7) % 4];
      const dens = (v, x, y, ca, sa, q) => v < 10 ? 1 : v > 249 ? 0 : clamp(((255 - v) / 255 - (.5 + .25 * (cos((x * ca + y * sa) * q) + cos((y * ca - x * sa) * q))) * .96) * 5 + .5);
      const c1 = cos(1.309), s1 = sin(1.309), c2 = cos(.785), s2 = sin(.785);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, q = max(0, x - jx[0] | 0) + max(0, y - jx[1] | 0) * W, n = paper[i];
        const dO = dens(da[q * 4], x, y, c1, s1, .36) * (.95 + n * .006), dB = dens(db[i * 4], x, y, c2, s2, .36) * (.93 + n * .008);
        for (let h = 0; h < 3; h++) o[i * 4 + h] = ([246, 239, 224][h] + n * .7) * lerp(1, ink[0][h] / 255, dO) * lerp(1, ink[1][h] / 255, dB);
        o[i * 4 + 3] = 255;
      }
      c.putImageData(im, 0, 0);
    },
  });
}
