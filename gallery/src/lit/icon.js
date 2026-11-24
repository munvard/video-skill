// The plugin icon: the ball, a warm key, a cool rim, and a second of sleep in its eyes. One still frame, 1024 pixels.
ray({
  dur: 1, fps: 1, w: 1024, h: 1024, spp: 320, bounces: 4, shutter: 0, exposure: 1.12, bloom: .12, vig: .18, sat: 1.1, dn: .8,
  lights: () => [{ p: [-2.6, 3.8, 3.0], at: [0, .9, 0], s: [1.8, 1.8], c: [1, .93, .82], k: 22 }, { p: [3.0, 2.2, -1.8], at: [0, .9, 0], s: [.7, 2.6], c: [.42, .62, 1], k: 26 }, { p: [-3.2, 1.0, -1.6], at: [0, .9, 0], s: [.6, 2.2], c: [1, .35, .5], k: 14 }],
  cam: () => ({ p: [0, 1.5, 6.2], at: [0, .92, 0], fov: 23, ap: .03, focus: 5.4 }),
  uni: () => [],
  glsl: `
vec2 map(vec3 p) { vec2 d = vec2(smin(p.y, p.z + 2.6, 2.2), 1.); d = un(d, vec2(sph(p - vec3(0, .9, 0), .9), 10.)); vec3 e = p - vec3(0., 1.08, .80); e.x = abs(e.x) - .26; return un(d, vec2(ell(e, vec3(.095, .175, .10)), 11.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) { if (id < 1.5) { m.c = vec3(.05, .055, .14); m.r = .85; } else if (id < 10.5) { ballM(m); m.r = .3; } else { m.c = vec3(.006); m.r = .05; m.coat = 1.; } }
vec3 sky(vec3 d) { return mix(vec3(.05, .05, .12), vec3(.22, .24, .42), smoothstep(-.2, 1., d.y)); }`,
});
