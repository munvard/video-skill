// Mascot short: the character wants one thing (out), something stands in the way (a jar), and it gets what it deserves.
// Eyes do the acting: look, plan, effort, pride, surprise. Soft set, no words.
{
  const D = 4;
  // time, x, y, squash, lookX, lookY, lid(1 open), tilt
  const K = [[0, 0, 0, 0, 0, .3, .25, 0], [.3, 0, 0, 0, -.6, .1, 1, 0], [.6, 0, 0, 0, .6, .2, 1, 0], [.85, 0, 0, 0, 0, .95, 1.1, 0], [1.1, 0, 0, .34, 0, .9, .7, 0], [1.2, 0, 0, -.2, 0, 1, 1, 0], [1.5, .0, 1.75, -.04, .3, .4, 1.15, -.1], [1.72, .0, 2.05, 0, .5, -.4, 1.2, -.25], [1.95, .42, 1.62, .0, .7, -.3, 1.1, -.35], [2.0, .5, 1.5, .16, .7, 0, .8, -.3], [2.2, .56, 1.53, -.04, .4, .2, .55, -.12], [2.55, .58, 1.54, 0, 0, .25, .55, .02], [2.75, .52, 1.53, 0, -.3, .0, 1.1, .2], [2.95, .30, 1.58, 0, -.6, -.5, 1.35, .6], [3.08, .16, 1.4, -.05, -.4, .4, 1.35, .85], [3.32, 0, 0, -.1, 0, .6, 1.35, .3], [3.38, 0, 0, .36, 0, .6, .3, .1], [3.52, 0, .12, -.1, 0, .3, .6, 0], [3.66, 0, 0, .1, 0, .3, .4, 0], [3.85, 0, 0, 0, 0, .3, .25, 0], [4, 0, 0, 0, 0, .3, .25, 0]];
  const pose = t => { let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++; const a = K[i], b = K[i + 1], u = seg(t, a[0], b[0]), e = E.io(u); return a.map((v, k) => lerp(v, b[k], k === 2 ? (b[2] > a[2] + .5 ? E.out3(u) : b[2] < a[2] - .5 ? u * u : e) : k === 1 ? u : e)); };
  ray({
    dur: D, fps: 20, spp: 190, bounces: 8, steps: 130, stepk: .85, exposure: 1.1, bloom: .07, vig: .22, shutter: .5, sat: 1.12, abs: .12, dn: .7,
    lights: () => [{ p: [-3, 4.4, 2.6], at: [0, .8, 0], s: [1.8, 2.2], c: [1, .88, .70], k: 19 }, { p: [3.2, 2.2, -1.8], at: [0, 1, 0], s: [.7, 3], c: [1, .55, .75], k: 13 }, { p: [3.4, 2.4, 3.2], at: [0, .8, 0], s: [2, 2], c: [.6, .75, 1], k: 2 }],
    cam: t => { const k = pose(t), y = clamp(k[2] / 2.0); return { p: [.0, 1.75 + .25 * y, 6.0], at: [.06 * k[1], 1.2 + .42 * E.io(y), 0], fov: 33, ap: .05, focus: 5.6 }; },
    uni: t => { const k = pose(t); return [[k[1], k[2], k[3], Math.max(.07, k[6])], [k[4], k[5], k[7], 0]]; },
    glsl: `
vec3 bl(vec3 p) { float q = U[0].z; p -= vec3(U[0].x, U[0].y + .13 + .5 * (1. - q), 0.); p.xy *= rot(U[1].z); return p; }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.); d = un(d, vec2(smin(p.y, p.z + 3.6, 1.8), 1.));
  // Jar.
  vec2 q = vec2(length(p.xz), p.y); float o = cyl(p - vec3(0, .86, 0), .86, .92, .22); float in_ = cyl(p - vec3(0, .98, 0), .88, .85, .18); float j = smax(o, -in_, .03); j = max(j, p.y - 1.62); j = min(j, length(vec2(abs(q.x - .84), q.y - 1.64)) - .085); d = un(d, vec2(j, 91.));
  // A lid on the table and two pebbles of sugar.
  d = un(d, vec2(cyl(p - vec3(1.72, .09, .3), .09, .55, .04), 2.)); vec3 s = p - vec3(-1.55, .13, .55); s.xz *= rot(.5); d = un(d, vec2(box(s, vec3(.13), .03), 3.)); s = p - vec3(-1.86, .13, .22); s.xz *= rot(-.2); d = un(d, vec2(box(s, vec3(.13), .03), 3.));
  vec3 b = bl(p); float k = U[0].z; vec3 R_ = .5 * vec3(1. + k * .6, 1. - k, 1. + k * .6); d = un(d, vec2(ell(b, R_), 10.));
  vec3 e = b - vec3(U[1].x * .07, .10 * (1. - k) + U[1].y * .06, 0.); e.x = abs(e.x) - .16; float z = .405 + .02 * k; d = un(d, vec2(ell(e - vec3(0, 0, z), vec3(.115, .15 * min(U[0].w, 1.25), .09)), 11.));
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { m.c = vec3(.30, .16, .34); m.r = .6; if (p.z > -1.7) m.coat = .15; } else if (id < 2.5) { m.c = vec3(.85, .70, .20); m.m = 1.; m.r = .28; } else if (id < 3.5) { m.c = vec3(.9); m.sss = .5; m.r = .8; n = bump(n, p, 60., .3); }
  else if (id < 10.5) ballM(m);
  else if (id < 11.5) { vec3 b = bl(p); vec2 e = b.xy - vec2(U[1].x * .07, .10 * (1. - U[0].z) + U[1].y * .06); e.x = abs(e.x) > 0. ? e.x - sign(e.x) * .16 : e.x; vec2 look = vec2(U[1].x, U[1].y) * vec2(.042, .05); float r = length(e - look); m.c = r < .068 ? vec3(.012) : vec3(.92, .90, .86); if (length(e - look - vec2(-.022, .028)) < .02) { m.e = vec3(1.); } m.r = .12; m.coat = .8; }
  else { m.tr = 1.; m.c = vec3(.86, .97, .95); m.ior = 1.22; } }
vec3 sky(vec3 d) { return mix(vec3(.16, .09, .20), vec3(.55, .38, .52), smoothstep(-.2, .9, d.y)) * .6; }`,
  });
}
