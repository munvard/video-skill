// Time machine: a locked camera and one ball on one wall. It hops, and in the air the years pass: a seed becomes a tree,
// a house arrives, the town grows, and a new seed falls. The year is the ball's own age, so no date is invented.
{
  const D = 4, BX = 168, BY = 372, R = 25, STOP = [0, 12, 40, 90];
  // Story time 0..3 with a hold on every stop and a quick change while the ball is in the air; 3..4 closes the loop.
  const hops = [[.45, .95], [1.35, 1.85], [2.25, 2.75], [3.2, 3.85]];
  const when = t => { let s = 0; hops.forEach(([a, b]) => s += E.io5(seg(t, a, b))); return s; };
  const pal = [ // sky top, sky low, hill far, hill near, ground, leaf
    ['#8FD0D8', '#F8F0CF', '#A9D3A0', '#7FBF7B', '#6BA763', '#8CC751'], ['#6FB4E0', '#FBE7C0', '#8FC3A4', '#68A86F', '#5A9457', '#5FA845'],
    ['#F2A36B', '#FCE0A4', '#C9975F', '#A97A45', '#8F6C3D', '#E08A2C'], ['#2E3B72', '#C98BA0', '#566499', '#3F4A7A', '#333A63', '#D96B3A'], ['#8FD0D8', '#F8F0CF', '#A9D3A0', '#7FBF7B', '#6BA763', '#8CC751']];
  const P = (s, i) => { const a = floor(min(3.999, s)), k = E.io(min(1, s - a)); return mix(pal[a][i], pal[a + 1][i], s >= 4 ? 1 : k); };
  const branch = (c, x, y, a, L, w, d, g, out, sway) => { const l = L * clamp(g * 3.2 - d * .42); if (l <= .5) return; const x2 = x + sin(a) * l, y2 = y - cos(a) * l; c.lineWidth = max(1, w * clamp(g * 1.5 - d * .1)); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sin(a - .12) * l * .5, y - cos(a - .12) * l * .5, x2, y2); c.stroke(); if (d > 1) out.push([x2, y2, d]); if (d < 5) for (const [k, s] of [[-1, .78], [1, .72], ...(d === 1 ? [[.1, .8]] : [])]) branch(c, x2, y2, a + k * (.42 + .1 * hash(d, k + 2)) + sway, L * s, w * .66, d + 1, g, out, sway); };
  scene({
    dur: D, blur: 12, shutter: .5,
    draw(c, t, f) {
      const s = when(t), s4 = min(s, 4), age = s <= 3 ? lerp(STOP[floor(min(2, s))], STOP[floor(min(2, s)) + 1], s <= 3 ? s - floor(min(2, s)) : 1) : 90, back = clamp(s - 3);
      const sky = c.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, P(s4, 0)); sky.addColorStop(1, P(s4, 1)); c.fillStyle = sky; c.fillRect(0, 0, 480, 480);
      // Sun and moon pass faster while years pass.
      const rot = s * TAU; for (const [o, col, r] of [[0, '#FFF2C9', 30], [PI, '#E9EDFF', 22]]) { const a = rot + o - .75, x = 250 + 270 * sin(a), y = 400 - 330 * cos(a); circle(c, x, y, r); c.globalAlpha = .95; c.fillStyle = col; c.fill(); c.globalAlpha = 1; }
      const stars = clamp(1 - abs(s4 - 3) * 1.4); if (stars > 0) for (let i = 0; i < 30; i++) { c.globalAlpha = stars * (.4 + .6 * hash(i, 3)); c.fillStyle = '#fff'; circle(c, hash(i, 1) * 480, hash(i, 2) * 190, 1.2 + hash(i, 4)); c.fill(); } c.globalAlpha = 1;
      c.fillStyle = P(s4, 2); c.beginPath(); c.moveTo(0, 480); for (let x = 0; x <= 480; x += 6) c.lineTo(x, 296 - 34 * sin(x * .009 + .6) - 12 * sin(x * .027)); c.lineTo(480, 480); c.fill();
      // Town on the far hill: one house, then many, then they go back to grass at the loop.
      for (let i = 0; i < 11; i++) { const g = E.back(seg(s, .55 + i * .16, .85 + i * .16), 1.4) * (1 - E.in2(seg(back, .1 + i * .03, .4 + i * .03))); if (g <= 0) continue; const x = [402, 352, 440, 318, 376, 462, 300, 418, 336, 276, 448][i], h = (i < 2 ? 34 : 30 + (i * 17 % 60)) * g, w = i < 2 ? 34 : 22 + (i * 7 % 10), y = 306 - 14 * sin(x * .012) + (i % 3) * 8; c.fillStyle = mix(['#F4EBDC', '#E9C6A6', '#D8DDE4'][i % 3], P0(s4), .25); c.fillRect(x - w / 2, y - h, w, h + 60); if (i < 2) { c.fillStyle = '#C4583F'; poly(c, [[x - w / 2 - 4, y - h], [x, y - h - 17 * g], [x + w / 2 + 4, y - h]], true); c.fill(); } const on = s4 > 2.4 && s4 < 3.7; for (let k = 0; k < h / 15 - 1; k++) for (let m = 0; m < 2; m++) { c.fillStyle = on && hash(i, k, m) > .3 ? '#FFD98A' : 'rgba(60,70,100,.35)'; c.fillRect(x - w / 2 + 5 + m * (w - 16), y - h + 8 + k * 15, 6, 8); } }
      c.fillStyle = P(s4, 3); c.beginPath(); c.moveTo(0, 480); for (let x = 0; x <= 480; x += 6) c.lineTo(x, 346 + 20 * sin(x * .011 + 2)); c.lineTo(480, 480); c.fill();
      // The tree: one growth number. A new seed starts it again.
      const g = s <= 3 ? lerp(.1, 1, E.out2(s / 3)) : 1 - E.io(seg(back, .08, .6)) * .9, sway = .02 * sin(TAU * t / D * 2), out = []; c.strokeStyle = mix('#6B4A38', '#3A2C4A', clamp(1 - abs(s4 - 3))); c.lineCap = 'round'; branch(c, 344, 424, -.04, 78, 25, 0, g, out, sway);
      const lf = P(s4, 5), bare = clamp((s - 2.62) * 2) * (1 - clamp((s - 3.5) * 2)); out.forEach(([x, y, d], i) => { const rr2 = (10 + 12 * hash(i, 5)) * clamp(g * 1.4) * (1 - bare * (hash(i, 6) > .35 ? 1 : .35)); if (rr2 < .6) return; circle(c, x + 6 * (hash(i, 1) - .5), y + 6 * (hash(i, 2) - .5), rr2); c.fillStyle = mix(lf.startsWith('#') ? lf : toHex(lf), i % 3 ? '#FFFFFF' : '#000000', i % 3 ? .06 * (i % 3) : .14); c.fill(); });
      if (g < .2) { c.fillStyle = '#8CC751'; for (const k of [-1, 1]) { c.save(); c.translate(343, 404); c.rotate(k * .8); c.beginPath(); c.ellipse(0, -10, 5, 11, 0, 0, TAU); c.fill(); c.restore(); } }
      // Falling leaves in the old age, and the one seed.
      if (s > 2.2 && s < 3.8) for (let i = 0; i < 9; i++) { const u = fr(t * .5 + i * .23); c.globalAlpha = clamp((s - 2.2) * 2) * clamp((3.8 - s) * 2); c.save(); c.translate(250 + i * 22 + 20 * sin(u * 8 + i), 230 + u * 200); c.rotate(u * 7 + i); c.fillStyle = i % 2 ? '#E08A2C' : '#D9583A'; c.beginPath(); c.ellipse(0, 0, 7, 3.4, 0, 0, TAU); c.fill(); c.restore(); } c.globalAlpha = 1;
      c.fillStyle = P(s4, 4); c.beginPath(); c.moveTo(0, 480); c.lineTo(0, 416); c.quadraticCurveTo(240, 404, 480, 424); c.lineTo(480, 480); c.fill();
      // The wall, cleaner when young, mossy when old.
      c.fillStyle = mix('#E6DCC8', '#8B8AA6', clamp(1 - abs(s4 - 3)) * .7); c.save(); rr(c, 82, BY + R - 2, 172, 80, 6); c.fill(); c.clip(); c.fillStyle = 'rgba(80,60,70,.2)'; for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) { rr(c, 66 + k * 42 + (i % 2) * 18, BY + R + 8 + i * 22, 34, 14, 4); c.fill(); } c.restore(); const moss = clamp(s / 2.4) * (1 - back); for (let i = 0; i < 12; i++) { circle(c, 86 + i * 15, BY + R - 1, 8 * moss * (.5 + hash(i, 8))); c.fillStyle = '#6F9A55'; c.fill(); }
      let y = BY, sq = 0; for (const [a, b] of hops) { const u = seg(t, a, b); if (u > 0 && u < 1) { y -= E.arc(u) * 128; sq = -.1 * abs(cos(PI * u)); } sq += .22 * sin(PI * seg(t, a - .16, a)) + (t > b ? .2 * Math.exp(-(t - b) * 11) * cos((t - b) * 32) : 0); }
      c.globalAlpha = .28 * (1 - (BY - y) / 180); c.fillStyle = '#3A2A40'; c.beginPath(); c.ellipse(BX + 4, BY + R, 24, 5, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      ball(c, BX, y + sq * R, R, { sx: 1 + sq, sy: 1 - sq, lit: 1 });
      const yr = s > 3 ? lerp(90, 0, E.io(back)) : age, col = mix('#2F3E4A', '#F6EBDD', clamp(1.3 - abs(s4 - 3))); void yr; const sf = when(f / 24), yf = sf > 3 ? lerp(90, 0, E.io(clamp(sf - 3))) : lerp(STOP[floor(min(2, sf))], STOP[floor(min(2, sf)) + 1], sf - floor(min(2, sf))); txt(c, 'year ' + Math.round(yf + 1), 34, 78, '700 56px Fraunces', col, 'left', '-1px');
    },
  });
  function P0(s) { return toHex(P(s, 1)); }
  function toHex(v) { const m = v.match(/\d+/g); return v[0] === '#' ? v : '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); }
}
