// Native lo-fi: looks like a phone clip somebody sent you. Kitchen tiles, hard flash from the lens, a hand that shakes, the
// app's plain caption box, no grade and no logo. The ball circles the bowl rim, and it does not stop.
{
  const D = 3, a = t => TAU * t / D * 2, N = (t, s) => sin(TAU * t / D + s) * .5 + sin(TAU * t / D * 3 + s * 2.1) * .35 + sin(TAU * t / D * 8 + s * 1.3) * .16;
  ray({
    dur: D, fps: 20, spp: 40, bounces: 3, exposure: 1.25, bloom: .18, vig: .5, shutter: .55, sat: .98,
    lights: t => [{ p: [.35 + .05 * N(t, 0), 2.15, 3.1], at: [0, .2, 0], s: [.16, .16], c: [1, .98, .94], k: 720 }, { p: [-3, 3.4, -3], at: [0, 0, 0], s: [1.5, 1.5], c: [1, .62, .3], k: 5 }],
    cam: t => ({ p: [.12 + .10 * N(t, 0), 2.0 + .06 * N(t, 2), 3.1 + .06 * N(t, 3)], at: [.05 + .10 * N(t, 4), .46 + .07 * N(t, 5), -.1], fov: 46, ap: .012, focus: 3.4, roll: .05 + .03 * N(t, 6) }),
    uni: t => { const r = .86; return [[r * cos(a(t)), .70 + .03 * sin(a(t) * 2), r * sin(a(t)), a(t)], [.018 * sin(a(t)), 0, 0, 0]]; },
    glsl: `
vec2 map(vec3 p) {
  vec2 g = fract(p.xz / .8) - .5; float j = .5 - max(abs(g.x), abs(g.y)); float f = p.y + .012 * smoothstep(.02, .0, j); vec2 d = vec2(f * .9, 1.);
  vec3 b = p; b.xy *= rot(U[1].x); float bo = smax(abs(sph(b - vec3(0, .98, 0), .94)) - .035, b.y - .46, .05); d = un(d, vec2(bo, 2.)); d = un(d, vec2(cyl(b - vec3(0, .03, 0), .04, .4, .02), 2.));
  d = un(d, vec2(box(p - vec3(0, .9, -2.3), vec3(6., .8, .3), .02), 3.)); d = un(d, vec2(box(p - vec3(0, .06, -2.2), vec3(6., .12, .25), .01), 4.)); vec3 h = p - vec3(.0, 1.2, -1.94); h.x = mod(h.x + .7, 1.4) - .7; d = un(d, vec2(cap(h, vec3(-.25, 0, 0), vec3(.25, 0, 0), .03), 5.));
  vec3 s = p - vec3(1.75, .10, .15); s.xz *= rot(-.5); d = un(d, vec2(smin(ell(s, vec3(.2, .10, .36)), ell(s - vec3(0, .10, -.18), vec3(.18, .16, .2)), .12), 6.)); s -= vec3(.5, 0, .1); s.xz *= rot(.35); d = un(d, vec2(smin(ell(s, vec3(.2, .10, .36)), ell(s - vec3(0, .10, -.18), vec3(.18, .16, .2)), .12), 6.));
  return un(d, vec2(sph(p - U[0].xyz, .2), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .3; if (id < 1.5) { vec2 c = floor(p.xz / .8), g = fract(p.xz / .8) - .5; float j = .5 - max(abs(g.x), abs(g.y)); float k = mod(c.x + c.y, 2.); m.c = mix(vec3(.72, .70, .66), vec3(.22, .28, .30), k) * (.9 + .16 * h21(c)); if (j < .018) m.c = vec3(.3, .28, .26); m.r = .22; m.coat = .4; }
  else if (id < 2.5) { m.c = p.y > .4 ? vec3(.25, .42, .62) : vec3(.85, .84, .80); m.coat = .6; } else if (id < 3.5) { m.c = vec3(.55, .42, .28); m.r = .6; } else if (id < 4.5) m.c = vec3(.06); else if (id < 5.5) { m.c = vec3(.7); m.m = 1.; } else if (id < 6.5) { m.c = vec3(.62, .25, .38); m.r = 1.; n = bump(n, p, 50., .5); } else { ballM(m); vec3 q = p - U[0].xyz; q.xz *= rot(-U[0].w * 1.); q.xy *= rot(U[0].w * 3.); if (abs(q.y) < .025) m.c = vec3(.95, .9, .8); } }
vec3 sky(vec3 d) { return vec3(.05, .04, .035); }`,
    over(c) { const L = ['the ball is doing', 'it again']; c.font = '600 32px Inter'; c.letterSpacing = '-.5px'; c.fillStyle = '#fff'; const w = L.map(s => c.measureText(s).width + 30); rr(c, 240 - w[0] / 2, 46, w[0], 48, 12); c.fill(); rr(c, 240 - w[1] / 2, 86, w[1], 48, 12); c.fill(); L.forEach((s, i) => txt(c, s, 240, 81 + i * 40, '600 32px Inter', '#0B0B0B', 'center', '-.5px')); },
  });
}
