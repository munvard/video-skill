// Macro material: a texture nobody can name, dew on orange hills. A slow slide and a rack of focus, then one fast move
// shows the whole ball. It hops, the drops tremble, and the camera goes back in. One hard rim light.
{
  const D = 4, out = t => E.io5(seg(t, 1.55, 2.0)) * (1 - E.io5(seg(t, 3.15, 3.8)));
  const hop = t => hopY(t, 2.35, 2.85, .5), sq = t => squashAt(t, 2.35, .0) + (t > 2.2 && t < 2.35 ? .2 * sin(PI * seg(t, 2.2, 2.35)) : 0) + (t >= 2.85 ? .22 * Math.exp(-(t - 2.85) * 9) * cos((t - 2.85) * 28) : 0);
  ray({
    dur: D, fps: 20, spp: 88, bounces: 4, steps: 140, stepk: .7, exposure: 1.4, bloom: .1, vig: .4, shutter: .5, dn: .9,
    lights: () => [{ p: [2.6, 2.7, -2.4], at: [0, .6, 0], s: [1.6, .8], c: [1, .9, .76], k: 46 }, { p: [-3.5, 2.2, 1.6], at: [0, .8, 0], s: [1.2, 2.6], c: [.45, .62, 1], k: 7 }, { p: [.5, 3.6, 2.2], at: [0, .7, 0], s: [1, 1], c: [1, .75, .55], k: 11 }],
    cam: t => {
      const o = out(t), s = -.1 + .2 * E.io(seg(t < 2 ? t + .85 : t - 3.15, 0, 2.4)), n = V.norm([s, .42, .9]), near = V.add([0, 1, 0], V.mul(n, 1.62)), far = [.0, 1.35, 5.4];
      const z = Math.exp(lerp(Math.log(.62), Math.log(4.4), o)); void near; void far; const dir = V.norm(V.mix(n, [0.05, .1, 1], o)), tgt = V.mix(V.add([0, 1, 0], V.mul(n, .98)), [0, 1.12, 0], o);
      const rack = lerp(.5, .72, E.io(seg(t < 2 ? t + .85 : t - 3.15, .3, 2))); return { p: V.add(tgt, V.mul(dir, z)), at: tgt, fov: 34, ap: lerp(.045, .05, o), focus: lerp(rack, z - .75, o) };
    },
    uni: t => [[hop(t), sq(t), 0, 0]],
    glsl: `
vec3 bp(vec3 p) { float q = U[0].y; return (p - vec3(0, U[0].x + 1. - q, 0)) / vec3(1. + q * .5, 1. - q, 1. + q * .5); }
float cell(vec3 p, out vec3 c) { vec3 i = floor(p), f = fract(p); float m = 9.; c = vec3(0); for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = vec3(x, y, z), o = vec3(h31(i + g), h31(i + g + 31.), h31(i + g + 67.)); vec3 r = g + o * .8 + .1 - f; float d = dot(r, r); if (d < m) { m = d; c = i + g; } } return sqrt(m); }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y + .02 * fbm(p * 3.), 1.);
  vec3 b = bp(p); float l = length(b), s = l - 1.;
  if (s > .12) return un(d, vec2(s - .06, 10.));
  vec3 c; vec3 n = b / l; float k = cell(n * 15., c); float dim = smoothstep(.0, .62, k); s = l - 1. + .022 * (1. - dim) - .006 * vn(n * 42.);
  d = un(d, vec2(s, 10.));
  // Dew: drops that sit on the skin, denser on top.
  vec3 c2; vec3 f = n * 7.; vec3 i = floor(f); float w = 9.; for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = i + vec3(x, y, z); float h = h31(g + 5.); if (h < .74) continue; vec3 o = normalize(g + .5 + .5 * (vec3(h31(g + 1.), h31(g + 2.), h31(g + 3.)) - .5)); float r = .022 + .038 * fract(h * 17.); vec3 q = b - o * (1. + r * .25); float e = length(q) - r; w = min(w, e); }
  return un(d, vec2(max(w, .005 - s), 91.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { m.c = vec3(.018, .020, .026) * (.6 + .9 * fbm(p * 5.)); m.r = .3 + .3 * fbm(p * 3.); n = bump(n, p, 30., .12); }
  else if (id < 11.) { vec3 b = normalize(bp(p)); ballM(m); m.c = vec3(1., .21, .02) * (.85 + .3 * vn(b * 9.)); m.r = .36 + .14 * vn(b * 60.); m.coat = .25; n = bump(n, b, 120., .10); m.sss = .3; }
  else { m.tr = 1.; m.c = vec3(1., .97, .95); m.ior = 1.33; } }
vec3 sky(vec3 d) { return vec3(.012, .016, .024) + vec3(.05, .035, .03) * smoothstep(-.1, .6, d.y) * .5; }`,
  });
}
