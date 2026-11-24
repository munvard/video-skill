// Wait for it: a question you cannot leave. The ball runs round the rim of a cup, slows, stops, seems to fall outside (the
// false end), hangs, and tips in. Locked camera, real weight, and a label that says what it is.
{
  const D = 4, RIM = .60, R = .24;
  const st = t => { // angle, radius, height, squash
    if (t < .5) { const u = t / .5; return [PI * .55 - .0, lerp(1.75, RIM, u), .0 + hop0(u), 0]; }
    if (t < 2.2) { const u = seg(t, .5, 2.2), e = 1 - (1 - u) ** 2.1; return [PI * .55 + TAU * 2.2 * e, RIM + .03 * sin(u * 40) * (1 - u), 1.30 + .02 * sin(u * 40) * (1 - u), 0]; }
    const A = PI * .55 + TAU * 2.2; if (t < 2.7) { const u = E.io(seg(t, 2.2, 2.65)); return [A, RIM + .20 * u, 1.30 - .055 * u, 0]; }
    if (t < 3.1) { const u = E.io(seg(t, 2.72, 3.1)); return [A, RIM + .20 - .34 * u, 1.245 + .05 * sin(PI * u * .7), 0]; }
    const u = seg(t, 3.1, 3.42); return [A, lerp(RIM - .14, 0, Math.min(1, u * 1.6)), 1.28 - 1.0 * u * u, 0];
  };
  const hop0 = u => 1.30 + 1.15 * sin(PI * u * .5 + PI * .5) * 0 + (1 - u) * .62 + .35 * sin(PI * u);
  const pos = t => { const [a, r, y] = st(t); return [r * cos(a), y, r * sin(a)]; };
  const out = t => E.out3(seg(t, 3.55, 4)); // leaves the cup again
  ray({
    dur: D, spp: 52, bounces: 4, exposure: 1.1, bloom: .05, vig: .25, shutter: .5, sat: 1.08,
    lights: () => [{ p: [-3, 4.6, 2.2], at: [0, .6, 0], s: [1.5, 1.5], c: [1, .9, .76], k: 22 }, { p: [3.4, 2.2, -1.6], at: [0, .8, 0], s: [.8, 2.6], c: [.6, .8, 1], k: 9 }, { p: [3, 2.5, 3.5], at: [0, .6, 0], s: [2, 2], c: [1, .95, .9], k: 1.5 }],
    cam: t => ({ p: [0, 2.35, 4.3], at: [0, .92, 0], fov: 33, ap: .04, focus: 4.4 }),
    uni: t => { let p = pos(t); if (t > 3.42) { const b = t < 3.5 ? 0 : E.io(seg(t, 3.5, 4)), s = pos(0), q = [0, .30, 0]; p = t < 3.55 ? [0, .28, 0] : V.add(V.mix(q, s, b * b), [0, .95 * sin(PI * b) , 0]); } const n = t > 3.36 && t < 3.6 ? .22 * Math.exp(-(t - 3.42) * 14) * cos((t - 3.42) * 30) * (t > 3.42 ? 1 : 0) + (t > 3.45 && t < 3.55 ? .2 : 0) * sin(PI * seg(t, 3.45, 3.55)) : 0; const wob = (t > 2.2 && t < 3.1 ? .012 * sin((t - 2.2) * 22) : 0) + (t > 3.4 ? .03 * Math.exp(-(t - 3.4) * 8) * sin((t - 3.4) * 34) : 0); return [[...p, n], [wob, 0, 0, 0], [st(t)[0], 0, 0, 0]]; },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(smin(p.y, p.z + 2.8, 1.6), 1.);
  vec3 c = p; c.xy *= rot(U[1].x); float o = cone(c - vec3(0, .55, 0), .55, .46, .62, .03), i = cone(c - vec3(0, .62, 0), .57, .42, .58, .02); float cu = smax(o, -i, .02); cu = min(cu, length(vec2(length(c.xz) - .605, c.y - 1.08)) - .035); d = un(d, vec2(cu * .9, 2.));
  d = un(d, vec2(cyl(p - vec3(0, .015, 0), .015, .95, .01), 3.));
  return un(d, vec2(bal(p, vec4(U[0].xyz + vec3(0, 0., 0), .24), U[0].w), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) { m.r = .5; if (id < 1.5) { m.c = vec3(.10, .32, .34); m.r = .65; } else if (id < 2.5) { m.c = vec3(.90, .86, .78); m.r = .28; m.coat = .5; if (p.y > .46 && p.y < .62 && length(p.xz) > .46) m.c = vec3(.10, .25, .27); } else if (id < 3.5) { m.c = vec3(.62, .36, .18) * (.8 + .4 * fbm(vec3(p.x * 3., 0., p.z * 18.))); m.r = .4; } else { ballM(m); vec3 q = p - U[0].xyz; q.xz *= rot(U[2].x); q.xy *= rot(U[2].x * 2.5); if (abs(q.y) < .022) m.c = vec3(.5, .06, .0); } }
vec3 sky(vec3 d) { return vec3(.40, .52, .52) * .7; }`,
    over(c, t) { const a = E.io(seg(t, .12, .35)) * (1 - E.io(seg(t, 3.5, 3.8))), y = t > 3.4; txt(c, '3D simulation', 240, 456, '500 20px Inter', 'rgba(255,255,255,.75)', 'center'); c.globalAlpha = a; txt(c, y ? 'Yes.' : 'Will it go in?', 240, 66, '750 42px Inter', '#fff', 'center', '-1.2px'); },
  });
}
