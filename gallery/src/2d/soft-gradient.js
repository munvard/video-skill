// Soft gradient: the frame breathes. The ball is a low sun; on the out breath it rests on its own reflection.
// One slow move, one word, dithered so the color never bands.
{
  const D = 4; let lo, g;
  const W = 120;
  scene({
    dur: D, fps: 20, blur: 1,
    init() { lo = mkc(W, W); g = lo.getContext('2d'); },
    draw(c, t) {
      const br = .5 - .5 * cos(TAU * t / D), ph = TAU * t / D, im = g.createImageData(W, W), d = im.data;
      // Color field: four soft lights over a vertical sky, mirrored with a ripple below the water line.
      const sky = [[26, 30, 74], [86, 60, 128], [214, 116, 132], [255, 178, 120]], L = [[.15 + .08 * sin(ph), .18, .5, [60, 120, 190]], [.9 + .05 * cos(ph), .3, .55, [170, 70, 150]], [.5, .62, .34 + .07 * br, [255, 170, 92]], [.2, .6 + .04 * cos(ph), .4, [240, 120, 130]]];
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        let x = i / W, y = j / W, wet = 0; if (y > .62) { const q = y - .62; wet = 1; x += sin(q * 60 - ph) * .010 * (q * 6 + .3); y = .62 - q * 1.15; }
        const v = clamp(y / .62) * 2.999, a = floor(v), k = E.io(v - a), C = [0, 1, 2].map(h => lerp(sky[a][h], sky[a + 1][h], k));
        for (const [lx, ly, r, col] of L) { const w = Math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / (r * r) * 2.2) * .62; for (let h = 0; h < 3; h++) C[h] = lerp(C[h], col[h], w); }
        const dim = wet ? .8 : 1; for (let h = 0; h < 3; h++) d[(j * W + i) * 4 + h] = C[h] * dim * (.94 + .06 * br); d[(j * W + i) * 4 + 3] = 255;
      }
      g.putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.filter = 'blur(6px)'; c.drawImage(lo, -8, -8, 496, 496); c.filter = 'none';
      const r = 34 + 5 * br, y = 264 - 70 * br, hor = 297.6;
      const halo = c.createRadialGradient(240, y, r * .6, 240, y, 190); halo.addColorStop(0, `rgba(255,196,130,${.55 + .2 * br})`); halo.addColorStop(.4, 'rgba(255,150,96,.22)'); halo.addColorStop(1, 'rgba(255,140,90,0)'); c.fillStyle = halo; c.fillRect(0, 0, 480, hor);
      const body = c.createRadialGradient(240, y - r * .5, 2, 240, y, r); body.addColorStop(0, '#FFE3B4'); body.addColorStop(.6, '#FF9A48'); body.addColorStop(1, '#FF6E24'); circle(c, 240, y, r); c.fillStyle = body; c.fill();
      // Reflection, broken by slow ripples.
      const ry = hor + (hor - y); c.save(); c.beginPath(); c.rect(0, hor, 480, 200); c.clip();
      for (let k = 0; k < 60; k++) { const yy = hor + k * 2.6, dy = yy - ry, q = k / 60; if (abs(dy) > r * 1.12) continue; const w = Math.sqrt(max(0, 1 - (dy / (r * 1.12)) ** 2)) * r * (1 + q * .4), sx = sin(k * .9 - ph) * (2 + 8 * q); c.fillStyle = `rgba(255,${150 - 20 * q},${92},${.75 - q * .5})`; rr(c, 240 - w + sx, yy, w * 2, 1.9, 1); c.fill(); }
      c.restore();
      txt(c, 'breathe', 240, 92, '300 62px Fraunces', `rgba(255,240,225,${.72 + .28 * br})`, 'center', `${1 + 3 * br}px`);
    },
    post: im => grain(im, 5, 9),
  });
}
