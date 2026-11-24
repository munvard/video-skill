// Face to camera: the ball talks to you in window light. Two eyes, eye level, captions phrase by phrase with one colored
// word, and a small punch in on each sentence. It tells its whole life, and ends where it began.
{
  const D = 4, L = [[0, 1, 'I was', 'asleep.'], [1, 2, 'Then I', 'jumped.'], [2, 3, 'It was', 'good.'], [3, 4, 'So now I', 'sleep.']];
  const shot = t => Math.min(3, floor(t + 1e-4)), hp = t => hopY(t, 1.42, 1.9, .42);
  ray({
    dur: D, spp: 60, bounces: 4, exposure: 1.15, bloom: .06, vig: .3, shutter: .5, fwd: 1, sat: 1.06,
    lights: () => [{ p: [-3.1, 1.7, 2.3], at: [0, .8, 0], s: [1.5, 2.4], c: [1, .93, .84], k: 10 }, { p: [2.2, 2.4, -2.4], at: [0, .9, 0], s: [.8, 1.4], c: [1, .6, .3], k: 8 }, { p: [3.5, 1.2, 2], at: [0, .8, 0], s: [2, 2], c: [.5, .62, .8], k: .9 }],
    cam: t => { const s = shot(t), z = [4.0, 3.35, 3.65, 4.05][s], dx = [0, -.14, .1, 0][s], u = t - s; return { p: [dx + .02 * sin(TAU * t / D), .98, z - .05 * E.io(u)], at: [dx * .4, .78 + .12 * (s === 1 ? hp(t) : 0), 0], fov: 34, ap: .085, focus: z - .6 }; },
    uni: t => {
      const s = shot(t), u = t - s, talk = Math.max(0, sin(u * 21) * .5 + sin(u * 33) * .5) * seg(u, .06, .12) * (1 - seg(u, .5, .62));
      const open = s === 0 ? seg(t, .18, .4) : s === 3 ? 1 - E.io(seg(u, .55, .95)) : 1, bl = [.75, 1.3, 2.62].reduce((m, b) => Math.max(m, 1 - Math.abs(t - b) / .07), 0), lid = Math.min(open, 1 - Math.max(0, bl) * .95);
      const q = .045 * talk + (s === 1 ? (t > 1.3 && t < 1.42 ? .22 * sin(PI * seg(t, 1.3, 1.42)) : t > 1.9 ? .2 * Math.exp(-(t - 1.9) * 10) * cos((t - 1.9) * 30) : 0) : 0) + .03 * (s === 3 ? sin(u * 4) * seg(u, .5, 1) * (1 - seg(u, .9, 1)) : 0);
      return [[hp(t), q, Math.max(.06, lid), s === 2 ? .06 * sin(u * 6) : 0], [s === 0 ? 0 : .03 * sin(t * 2.2) * sin(PI * u), s === 2 ? .5 : 0, 0, 0]];
    },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.); d = un(d, vec2(p.z + 3.2, 2.));
  // Shelf with books and a plant, far out of focus.
  d = un(d, vec2(box(p - vec3(.6, .95, -2.8), vec3(1.9, .05, .35), .02), 3.)); vec3 b = p - vec3(.1, 1.32, -2.75); float i = clamp(floor(b.x / .2 + .5), -2., 4.); b.x -= i * .2; d = un(d, vec2(box(b + vec3(0, .06 * sin(i * 3.), 0), vec3(.085, .32 + .06 * sin(i * 3.), .24), .015), 20. + i));
  vec3 v = p - vec3(1.75, 1.2, -2.7); d = un(d, vec2(cone(v, .2, .16, .22, .02), 4.)); float lf = 9.; for (int k = 0; k < 6; k++) { float a = float(k) * 1.05; lf = min(lf, cap(v, vec3(0, .2, 0), vec3(.42 * cos(a), .65 + .1 * sin(a * 2.), .3 * sin(a)), .07)); } d = un(d, vec2(lf, 5.));
  float q = U[0].y; vec4 B = vec4(U[1].x, U[0].x + .78 * (1. - q), 0., .78); d = un(d, vec2(bal(p, B, q), 10.));
  vec3 e = p - B.xyz; e.xy *= rot(U[0].w); e.x -= U[1].x * 1.5; e.x = abs(e.x) - .235; float h = .165 * U[0].z; vec3 c = vec3(0., .14 * (1. - q), .70 + .02 * q); d = un(d, vec2(ell(e - c, vec3(.085, h, .09)), 11.));
  // A mouth: only a soft crease.
  vec3 m_ = p - B.xyz - vec3(U[1].x * 1.5, -.16, .755); float mo = length(vec2(length(vec2(m_.x, m_.y - .12 - .02)) - .13, m_.z)) - .016; mo = max(mo, m_.y + .035); d = un(d, vec2(mo, 12.));
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .6; if (id < 1.5) { m.c = vec3(.42, .24, .13) * (.8 + .35 * fbm(vec3(p.x * 8., 0., p.z * 1.))); m.r = .35; m.coat = .25; } else if (id < 2.5) m.c = vec3(.34, .42, .40); else if (id < 3.5) m.c = vec3(.40, .24, .13); else if (id < 4.5) m.c = vec3(.75, .7, .62); else if (id < 5.5) m.c = vec3(.07, .22, .08);
  else if (id < 10.5) ballM(m); else if (id < 11.5) { m.c = vec3(.008); m.r = .06; m.coat = 1.; } else if (id < 12.5) m.c = vec3(.18, .03, .01); else { float i = id - 20.; m.c = vec3(.35 + .3 * sin(i * 2.1), .25 + .15 * sin(i * 3.3 + 1.), .22 + .15 * cos(i * 2.7)); } }
vec3 sky(vec3 d) { return vec3(.35, .36, .38); }`,
    over(c, t) {
      const s = shot(t), u = t - s, [, , a, b] = L[s], on = seg(u, .02, .12) * (s === 3 ? 1 - seg(u, .84, .95) : 1), key = seg(u, .24, .3) * on; c.font = '750 44px Inter'; c.letterSpacing = '-1.2px'; const wa = c.measureText(a + ' ').width, wb = c.measureText(b).width, x = 240 - (wa + wb) / 2, y = 424;
      c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = 'rgba(16,10,8,.9)'; const put = (w, X, col, al, k) => { if (!al) return; c.save(); c.globalAlpha = al; c.translate(X, y + 6 * (1 - al)); c.scale(k, k); c.textAlign = 'left'; c.strokeText(w, 0, 0); c.fillStyle = col; c.fillText(w, 0, 0); c.restore(); }; put(a, x, '#fff', on, 1); put(b, x + wa, '#FFC24D', key, 1);
    },
  });
}
