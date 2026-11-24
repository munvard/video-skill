// Movie trailer: wide frame, one shaft of light through dust, a stair that is far too big. Cards between the beats, three
// shots, and the jump itself is kept for the end. Cut before it lands.
{
  const D = 4, C = [0, 1.25, 2.5]; // shot starts
  const tt = t => (t + .6) % D, sh = t0 => { const t = tt(t0); return t < C[1] - 1e-4 ? 0 : t < C[2] - 1e-4 ? 1 : 2; }, u = t => tt(t) - C[sh(t)]; // the loop joins inside the first shot
  ray({
    dur: D, fps: 20, spp: 88, bounces: 3, exposure: 1.2, bloom: .22, vig: .4, shutter: .5, fwd: 1, fog: .05, fogc: [1, 1, 1], foga: [.0015, .002, .004], sat: 1.05, tmax: 30, dn: 1.3,
    lights: t => [{ p: [-3.4, 8.2, -.6], at: [0, 0, 1], s: [.8, .8], c: [1, .82, .58], k: 1000 }, { p: [4.2, 2.6, 2.2], at: [0, .6, 0], s: [1, 3], c: [.25, .45, .8], k: 5 }],
    cam: t => { const s = sh(t), v = u(t); return [{ p: [3.4 - .2 * v, .75 + .05 * v, 7.0 - .3 * v], at: [-.35, 1.35, 0], fov: 36, ap: .02, focus: 6.6 }, { p: [-1.0 + .06 * v, .42, 3.7 - .15 * v], at: [-.12, .40, .9], fov: 27, ap: .06, focus: 2.75 }, { p: [1.1, .34 + .10 * v, 4.7 - .35 * v], at: [0, 1.05 + .42 * E.io(seg(v, .45, 1.2)), 0], fov: 37, ap: .02, focus: 4. }][s]; },
    uni: t => { const s = sh(t), v = u(t); let y = 0, z = 1.0, q = 0, look = 0; if (s === 1) { q = .10 * sin(PI * seg(v, .25, .5)) + .22 * E.io(seg(v, .85, 1.2)); } if (s === 2) { q = v < .38 ? .30 * E.io(seg(v, .05, .33)) : 0; const a = seg(v, .38, 1.3); y = v > .38 ? 2.9 * (a * 1.35 - a * a * .62) : 0; z = 1.0 - .95 * a; if (v > .34 && v < .55) q = -.18 * (1 - seg(v, .38, .55)); } look = 0; return [[0, y, z, q], [s, look, 0, t]]; },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(p.y + .01 * fbm(p * 3.), 1.);
  // Three huge steps and a door frame at the top that shapes the light.
  d = un(d, vec2(box(p - vec3(0, .75, -1.6), vec3(6., .75, 1.5), .05), 2.)); d = un(d, vec2(box(p - vec3(0, 1.6, -3.1), vec3(6., 1.5, 1.6), .05), 2.));
  vec3 c = p; c.x = abs(c.x) - 3.75; float f = length(c.xz - vec2(0, -.2)); float fl = .46 + .018 * cos(atan(c.z + .2, c.x) * 14.); d = un(d, vec2((f - fl) * .8, 3.)); d = un(d, vec2(box(c - vec3(0, .1, -.2), vec3(.62, .1, .62), .03), 3.));
  // A ceiling with a round opening: only here does the light come in.
  float w = abs(p.y - 5.8) - .12; float o = length(p.xz - vec2(-2.4, -.13)) - .48; d = un(d, vec2(max(w, -o), 4.));
  return un(d, vec2(bal(p, vec4(U[0].x, U[0].y + .3 * (1. - U[0].w), U[0].z, .3), U[0].w), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) { m.r = .75; if (id < 1.5) { m.c = vec3(.15, .13, .12) * (.6 + .8 * fbm(p * 2.5)); m.r = .35 + .3 * fbm(p * 2.); } else if (id < 4.5) { m.c = vec3(.27, .24, .21) * (.65 + .6 * fbm(p * vec3(2., 5., 2.))); n = bump(n, p, 14., .10); } else ballM(m); }
vec3 sky(vec3 d) { return vec3(.004, .006, .012); }`,
    over(c, t) {
      const s = sh(t), v = u(t); c.fillStyle = '#000'; c.fillRect(0, 0, 480, 88); c.fillRect(0, 392, 480, 88);
      const card = (w, a, b) => { const k = E.io(seg(v, a, a + .25)) * (1 - E.io(seg(v, b - .18, b))); if (!k) return; c.save(); c.globalAlpha = k; c.letterSpacing = (9 + 2.2 * v) + 'px'; c.font = '400 33px Fraunces'; c.textAlign = 'center'; c.fillStyle = '#F6E9D6'; c.fillText(w, 244, 450); c.restore(); };
      if (s === 0) card('ONE BALL', .05, 1.25); if (s === 1) card('ONE STAIR', .15, 1.25); if (s === 2) { const k = 1 - E.io(seg(v, 1.28, 1.48)); c.globalAlpha = 1 - k; c.fillRect(0, 0, 480, 480); }
    },
  });
}
