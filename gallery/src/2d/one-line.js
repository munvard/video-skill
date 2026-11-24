// One continuous line: the ball is the pen. It never leaves the page, and the line it leaves becomes a house, a tree, a cat, a boat.
// The strip is 1560 units wide and repeats, so the last frame runs into the first.
{
  const D = 4, L = 1560, N = 3000, PAP = '#F3E9D8', INK = '#1E2B45'; let pts, cam, when;
  const path = `M0 336 C50 336 40 250 78 250 C116 250 104 336 130 336 C160 336 152 290 172 290 C194 290 186 336 210 336
   L262 336 L262 238 L242 250 L318 176 L394 250 L372 238 L372 336 L336 336 L336 270 C336 256 300 256 300 270 L300 336 L430 336
   C470 336 478 326 480 262 C420 270 416 216 450 208 C440 160 506 140 526 176 C566 168 580 214 548 230 C566 268 500 276 494 250 C496 320 500 336 540 336
   L604 336 C640 336 650 296 642 262 C636 238 644 222 656 208 L656 176 L680 194 L704 194 L728 174 L730 206 C744 226 738 246 724 260 C752 284 756 336 736 336 L668 336
   L784 336 C828 336 826 262 794 266 C774 270 784 298 804 290 C834 280 832 336 872 336
   C896 352 914 352 934 336 L920 296 L1010 296 L1010 176 C1064 206 1078 252 1072 284 L1020 284 L1020 296 L1112 296 L1092 336 C1112 352 1130 352 1150 336 C1166 322 1180 322 1196 336 C1212 352 1228 352 1246 336
   C1290 300 1250 190 1310 180 C1376 172 1380 262 1330 262 C1288 262 1290 214 1322 214 C1350 214 1346 244 1326 240 C1380 280 1390 336 1440 336 L1560 336`;
  scene({
    dur: D, blur: 12, shutter: .28,
    init() {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); const T = p.getTotalLength();
      pts = []; for (let i = 0; i <= N; i++) { const q = p.getPointAtLength(T * i / N); pts.push([q.x, q.y]); }
      // The pen slows in tight corners and runs on open ground.
      const cost = []; let s = 0; for (let i = 0; i < N; i++) { const a = pts[max(0, i - 14)], b = pts[i], d = pts[min(N, i + 14)]; const turn = abs(Math.atan2((b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]), (b[0] - a[0]) * (d[0] - b[0]) + (b[1] - a[1]) * (d[1] - b[1]))); s += 1 + turn * 1.1; cost.push(s); }
      when = u => { const w = u * s; let lo = 0, hi = N - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cost[m] < w) lo = m + 1; else hi = m; } return lo + 1 - (cost[lo] - w) / (cost[lo] - (cost[lo - 1] || 0)); };
      const X = t => { const k = floor(t / D), i = when(fr(t / D)); return k * L + pts[min(N, floor(i))][0]; };
      cam = t => { let a = 0; for (let j = -24; j <= 24; j++) a += X(t + j * .03); return a / 49 - 190; };
    },
    draw(c, t) {
      c.fillStyle = PAP; c.fillRect(0, 0, 480, 480);
      const i = when(t / D), q = floor(i), f = i - q, A = pts[min(N, q)], Bp = pts[min(N, q + 1)], x = lerp(A[0], Bp[0], f), y = lerp(A[1], Bp[1], f), cx = cam(t);
      c.save(); c.scale(1.42, 1.42); c.translate(-cx, -84 - (y - 270) * .12);
      // Rare fill: a sun disc of plain warm tone behind each scene.
      for (const o of [-L, 0, L]) { c.fillStyle = '#F6C9A0'; circle(c, 300 + o, 150, 62); c.fill(); c.fillStyle = '#E9D9B8'; circle(c, 1000 + o, 226, 96); c.fill(); c.fillStyle = '#EAD2C0'; circle(c, 672 + o, 250, 84); c.fill(); }
      c.strokeStyle = INK; c.lineWidth = 5; c.lineJoin = c.lineCap = 'round';
      c.beginPath(); for (let k = 0; k <= N; k += 2) { const p = pts[k]; k ? c.lineTo(p[0] - L, p[1]) : c.moveTo(p[0] - L, p[1]); }
      for (let k = 0; k <= q; k += 2) c.lineTo(pts[k][0], pts[k][1]);
      c.lineTo(x, y); c.stroke();
      ball(c, x, y, 13, { fill: ORANGE }); c.restore();
    },
    post: im => grain(im, 7, 3),
  });
}
