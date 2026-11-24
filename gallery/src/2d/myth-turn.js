// Myth and turn: "How do I jump higher?" is the wrong question. The room turns, the wall becomes the floor, and the ball
// simply drops through the door it could not reach. The door leads to the first picture.
{
  const D = 4, WALL = '#F1E4CF', INK = '#2A1B3D', R = 24, DOOR = 120; // the door is in the right wall, this far from the top
  const say = (c, words, t, y, size, mx = 240) => { c.font = `800 ${size}px Inter`; c.letterSpacing = '-1.5px'; let w = 0; for (const [s] of words) w += c.measureText(s + ' ').width; let x = mx - (w - size * .22) / 2; for (const [s, at, col] of words) { const k = seg(t, at, at + .1); if (k > 0) { c.globalAlpha = k; txt(c, s, x, y + (1 - E.out3(k)) * 10, `800 ${size}px Inter`, col || INK, 'left', '-1.5px'); c.globalAlpha = 1; } c.font = `800 ${size}px Inter`; c.letterSpacing = '-1.5px'; x += c.measureText(s + ' ').width; } };
  const room = (c, o) => { // 480 square, floor at 400, right wall at 400
    const g = c.createLinearGradient(0, 0, 400, 400); g.addColorStop(0, '#F8EEDC'); g.addColorStop(1, '#EBD8BC'); c.fillStyle = g; c.fillRect(-600, -600, 1001, 1001);
    c.fillStyle = '#4B2E66'; c.fillRect(-700, 400, 1800, 700); c.fillStyle = '#6A4590'; c.fillRect(-700, 400, 1100, 8);
    c.fillStyle = '#3A2354'; c.fillRect(400, -700, 700, 1101); c.fillStyle = '#54347A'; c.fillRect(400, -700, 8, 1100);
    // The door: a lit opening through the right wall.
    const dg = c.createLinearGradient(400, 0, 620, 0); dg.addColorStop(0, '#FFCF8A'); dg.addColorStop(.35, '#F8EEDC'); dg.addColorStop(1, '#F8EEDC'); c.fillStyle = dg; c.fillRect(399, DOOR - 46, 700, 92);
    c.globalAlpha = o.glow; const lg = c.createRadialGradient(400, DOOR, 10, 400, DOOR, 190); lg.addColorStop(0, 'rgba(255,196,110,.9)'); lg.addColorStop(1, 'rgba(255,196,110,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(400, DOOR - 46); c.lineTo(210, DOOR - 120); c.lineTo(210, DOOR + 120); c.lineTo(400, DOOR + 46); c.fill(); c.globalAlpha = 1;
    // Wear marks of many failed jumps.
    c.strokeStyle = 'rgba(90,50,110,.35)'; c.lineWidth = 4; c.lineCap = 'round'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(330 + i * 8, 250 - i * 9); c.lineTo(352 + i * 6, 244 - i * 9); c.stroke(); }
  };
  scene({
    dur: D, blur: 14, shutter: .5,
    draw(c, t) {
      const turn = E.io5(seg(t, 1.9, 2.5)), a = -0 + turn * PI / 2, dive = E.in3(seg(t, 3.02, 3.62)), q = seg(t, 3.02, 3.62);
      // Ball, in room coordinates. Floor y = 400, wall x = 400.
      let x = 330, y = 400 - R, sx = 1, sy = 1; const jump = (a0, b0, h) => { const u = seg(t, a0, b0); if (u > 0 && u < 1) { y -= E.arc(u) * h; x = 330 + 14 * sin(PI * u); sy = 1 + .1 * abs(cos(PI * u)); sx = 2 - sy; } }, sq = (a0, b0, k) => { const u = seg(t, a0, b0); if (u > 0 && u < 1) { sy = 1 - k * sin(PI * u); sx = 2 - sy; } };
      sq(.04, .16, .25); jump(.16, .66, 160); sq(.66, .8, .3); jump(.8, 1.36, 186); sq(1.36, 1.52, .22);
      let vis = true, sc = 1;
      if (t > 2.05) { // gravity is now towards the right wall
        const f = E.in2(seg(t, 2.1, 2.42)); x = lerp(330, 400 - R, f); y = 400 - R; const b = t - 2.42; if (b > 0) { x -= abs(sin(b * 14)) * 18 * Math.exp(-b * 6); }
        const roll = E.io(seg(t, 2.46, 2.98)); y = lerp(400 - R, DOOR + 2, roll); const fall = E.in2(seg(t, 2.94, 3.5)); x += fall * 300; if (fall > 0) y = DOOR + 2;
      }
      // Camera: centered, turns with the room, then dives through the door.
      c.fillStyle = WALL; c.fillRect(0, 0, 480, 480); c.save(); c.translate(240, 240); c.rotate(a);
      const cxr = lerp(lerp(240, 250, turn), 420, E.io(q)), cyr = lerp(lerp(240, 260, turn), DOOR, E.io(q)), z = lerp(1, 1.02, seg(t, 0, 1.6)) * lerp(1, 13, dive);
      c.scale(z, z); c.translate(-cxr, -cyr); room(c, { glow: .5 + .5 * turn });
      if (t < 3.5) { c.save(); c.translate(x, y); const ud = turn > .5; c.scale(ud ? 1 : sx, ud ? 1 : sy); c.translate(0, ud ? 0 : (1 - sy) * R); circle(c, 0, 0, R); c.fillStyle = ORANGE; c.fill(); c.save(); c.clip(); c.rotate(-a); c.fillStyle = 'rgba(160,40,0,.3)'; c.beginPath(); c.rect(-R, -R, 2 * R, 2 * R); c.arc(-6, -8, R, 0, TAU, true); c.fill(); c.restore(); c.restore(); }
      c.restore();
      // Arrival: the light of the door is the wall of the first picture; floor and wall slide back in around the ball.
      const arr = E.out5(seg(t, 3.5, 3.95)); if (t > 3.5) { c.save(); c.globalAlpha = seg(t, 3.5, 3.6); c.save(); c.translate(0, 0); const s = lerp(1.9, 1, arr); c.translate(330, 376); c.scale(s, s); c.translate(-330, -376); room(c, { glow: .5 }); const f = E.in2(seg(t, 3.52, 3.8)), b = t - 3.8, w = b > 0 ? Math.exp(-b * 14) * .22 * cos(b * 30) : -.08; circle(c, 330, 0, 0); ball(c, 330, lerp(150, 400 - R, f) + (b > 0 ? w * R : 0), R, { sx: 1 + w, sy: 1 - w }); c.restore(); c.restore(); }
      // Words.
      if (t < 1.62) { say(c, [['How', 0], ['do', 0], ['I', 0]], t + .2, 66, 44, 190); say(c, [['jump', 0], ['higher?', 0]], t + .2, 114, 44, 190); } else if (t < 2.0) { say(c, [['Wrong', 1.62, '#E9501A']], t, 66, 44, 190); say(c, [['question.', 1.72]], t, 114, 44, 190); } else if (t < 3.06) say(c, [['Turn', 2.12, '#E9501A'], ['the', 2.26], ['room.', 2.36]], t, 66, 44, 290);
      else if (t > 3.62) { say(c, [['How', 3.62], ['do', 3.66], ['I', 3.7]], t, 66, 44, 190); say(c, [['jump', 3.76], ['higher?', 3.84]], t, 114, 44, 190); }
    },
  });
}
