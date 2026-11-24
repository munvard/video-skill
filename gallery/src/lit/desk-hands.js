// Desk and hands: a locked camera above a real looking desk. No hands here, the ball does the work itself: ink, print,
// ink, print, then one rolled line. Jump cuts on the beat. The sheet is pulled away and the next one is already there.
{
  const D = 4, F = 1 / 24;
  // Paper space: x right, z down. Pad at the left.
  const PAD = [-1.55, .62], E1 = [.1, -.45], E2 = [1.05, -.45], R = .34;
  // key: time, x, z ; hops between
  const H = [[.0, PAD, PAD, 0], [.25, PAD, PAD, .25], [.5, PAD, E1, .7], [1.0, E1, E1, 0], [1.0, E1, PAD, .6], [1.333, PAD, PAD, 0], [1.333, PAD, E2, .8], [1.833, E2, PAD, .7], [2.25, PAD, PAD, 0]];
  void H;
  const A = t => { // position of the ball, jump cuts at exact frames
    const hop = (a, b, p, q, h) => { const u = E.io(seg(t, a, b)) * .35 + seg(t, a, b) * .65; return [lerp(p[0], q[0], u), hopY(t, a, b, h), lerp(p[1], q[1], u)]; }, f = k => k * F;
    if (t < f(8)) return [...hop(0, f(8), PAD, PAD, .0)]; if (t < f(17)) return hop(f(8), f(17), PAD, E1, .9); if (t < f(21)) return [E1[0], 0, E1[1]]; if (t < f(28)) return hop(f(21), f(28), E1, PAD, .7); if (t < f(31)) return [PAD[0], 0, PAD[1]];
    if (t < f(39)) return hop(f(31), f(39), PAD, E2, 1.0); if (t < f(42)) return [E2[0], 0, E2[1]];
    if (t < f(46)) return hop(f(42), f(46) + .12, E2, PAD, .8); // cut
    if (t < f(50)) return [arcX(0), 0, arcZ(0)]; if (t < f(68)) { const u = E.io(seg(t, f(50), f(68))); return [arcX(u), 0, arcZ(u)]; } if (t < f(76)) return [arcX(1), hopY(t, f(69), f(75), .35), arcZ(1)];
    return hop(f(79), f(92), [arcX(1), arcZ(1)], PAD, .9);
  };
  const arcX = u => .575 - .62 * cos(PI * (.12 + .76 * u)), arcZ = u => .18 + .58 * sin(PI * (.12 + .76 * u));
  const sq = t => [8, 17, 28, 39, 50, 75, 92].reduce((s, k) => s + (Math.abs(t - k * F) < .1 ? (k === 17 || k === 39 ? .28 : .14) * cos((t - k * F) / .1 * PI / 2) : 0), 0);
  ray({
    dur: D, spp: 48, bounces: 3, exposure: 1.08, bloom: .02, vig: .28, shutter: .5, fwd: 1,
    lights: () => [{ p: [-4.2, 4.4, -2.6], at: [0, 0, 0], s: [1.4, 1.8], c: [1, .9, .74], k: 24 }, { p: [3.5, 4, 3.5], at: [0, 0, 0], s: [3, 3], c: [.7, .82, 1], k: 1.2 }],
    cam: t => { const s = t >= 46 * F && t < 76 * F ? 1 : 0; return { p: s ? [.5, 5.0, .22] : [-.1, 7.4, .08], at: s ? [.5, 0, .2] : [-.1, 0, .05], fov: 33, ap: .04, focus: s ? 4.8 : 7.2 }; },
    uni: t => { const p = A(t), roll = E.io(seg(t, 50 * F, 68 * F)), out = E.in3(seg(t, 80 * F, 91 * F)), wet = t < 17 * F ? 1 : t < 28 * F ? .25 : t < 39 * F ? 1 : t < 46 * F ? .2 : t < 68 * F ? 1 - .7 * roll : t > 92 * F || t < 0 ? 1 : .2; return [[p[0], p[1], p[2], sq(t)], [t >= 17 * F ? 1 : 0, t >= 39 * F ? 1 : 0, t >= 50 * F ? Math.max(.001, roll) : 0, out], [wet, t * 3, t >= 46 * F && t < 68 * F ? roll * 4.4 : 0, 0]]; },
    glsl: `
const float R_ = .34;
vec2 map(vec3 p) {
  vec2 d = vec2(p.y + .03, 1.);
  vec3 q = p - vec3(.55, -.008, 0.); d = un(d, vec2(box(q, vec3(1.35, .012, 1.75), .004), 2.)); if (U[1].w < 1.) { vec3 s = q - vec3(.0, .016, -U[1].w * 5.2); s.y -= U[1].w * .16 * smoothstep(-1.8, 1.8, s.z); d = un(d, vec2(box(s, vec3(1.35, .008, 1.75), .004) * .9, 3.)); }
  vec3 k = p - vec3(-1.55, .06, .62); d = un(d, vec2(max(box(k, vec3(.58, .1, .58), .06), -box(k - vec3(0, .1, 0), vec3(.48, .08, .48), .05)), 4.)); d = un(d, vec2(box(k - vec3(0, .02, 0), vec3(.48, .06, .48), .04), 5.));
  // Pencil, ruler, tape roll.
  vec3 c = p - vec3(-1.55, .07, -.95); c.xz *= rot(.5); d = un(d, vec2(max(max(abs(c.x) * .866 + abs(c.y) * .5, abs(c.y)) - .06, abs(c.z) - .62), 6.)); vec3 tp = c - vec3(0, 0, -.74); d = un(d, vec2(max(length(tp.xy) - .06 * clamp(1. - (-tp.z + .12) / .24, 0., 1.), abs(tp.z) - .12) * .7, 7.));
  vec3 r = p - vec3(-1.62, .16, 1.78); d = un(d, vec2(max(abs(length(r.xz) - .34) - .07, abs(r.y) - .16) - .01, 8.));
  float y = U[0].y; vec4 B = vec4(U[0].x, y + R_ * (1. - U[0].w) + .02, U[0].z, R_); return un(d, vec2(bal(p, B, U[0].w), 10.)); }
float ink(vec2 p, float id) { float s = 0., g = .55 + .6 * fbm(vec3(p * 9., 3.)); float e = .02 * (vn(vec3(p * 14., 1.)) - .5); if (U[1].x > .5) s = max(s, smoothstep(.012, -.012, length(p - vec2(.1, -.45)) - .215 + e)); if (U[1].y > .5) s = max(s, smoothstep(.012, -.012, length(p - vec2(1.05, -.45)) - .215 + e)); if (U[1].z > 0.) { vec2 c = p - vec2(.575, .18); c.y /= .935; float a = acos(clamp(-c.x / max(length(c), .001), -1., 1.)) / 3.14159; float u = (a - .12) / .76; float w = abs(length(c) - .62) - .115 + e; float m = step(0., c.y) * step(0., u) * step(u, U[1].z); float cap0 = length(p - vec2(.575 - .62 * cos(3.14159 * .12), .18 + .58 * sin(3.14159 * .12))) - .115 + e; s = max(s, max(smoothstep(.012, -.012, w) * m, smoothstep(.012, -.012, cap0))); } return clamp(s * (g + .45), 0., 1.); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .7; if (id < 1.5) { float g = fbm(vec3(p.x * 2., 0., p.z * 22.)); m.c = mix(vec3(.10, .17, .16), vec3(.13, .21, .20), g); m.r = .6; n = bump(n, p, 60., .1); }
  else if (id < 3.5) { m.c = vec3(.88, .86, .81) * (.97 + .05 * vn(p * 60.)); if (id > 2.5) { float z = p.z + U[1].w * 5.2; m.c = mix(m.c, vec3(.75, .10, .02), ink(vec2(p.x, z), id) * .95); } m.r = .9; }
  else if (id < 4.5) { m.c = vec3(.03, .03, .035); m.r = .35; m.coat = .4; } else if (id < 5.5) { m.c = vec3(.42, .05, .015); m.r = .5; n = bump(n, p, 50., .3); } else if (id < 6.5) { m.c = vec3(.85, .55, .06); m.r = .4; m.coat = .3; } else if (id < 7.5) { m.c = vec3(.8, .6, .4); } else if (id < 8.5) { m.c = vec3(.8, .75, .62); m.r = .3; }
  else { ballM(m); m.c = mix(m.c, vec3(.45, .05, .01), .35 * U[2].x * smoothstep(.2, -.9, n.y)); } }
vec3 sky(vec3 d) { return vec3(.5, .52, .55) * .7; }`,
  });
}
