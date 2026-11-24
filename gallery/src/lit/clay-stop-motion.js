// Clay stop motion: a lump of clay wakes, hops, splats, is pinched into a flower and rolled back into a lump.
// 12 poses a second, the surface is pressed a little differently in every pose, felt and card set, window light.
{
  const D = 3.5;
  // time, squash, flat, petals, height, turn
  const K = [[0, 1, 0, 0, 0, 0], [.25, 1.04, 0, 0, 0, 0], [.42, .62, 0, 0, 0, -.1], [.58, 1.3, 0, 0, .5, .05], [.83, 1.04, 0, 0, 1.25, .3], [1.0, 1.1, 0, 0, .7, .5], [1.17, .7, .75, 0, 0, .55], [1.33, .7, 1, .12, 0, .6], [1.67, .8, 1, .8, .3, .75], [1.92, .9, .95, 1.1, .4, .9], [2.17, .9, .95, 1, .42, 1], [2.5, .9, .95, 1.05, .42, 1.15], [2.75, .8, .9, .5, .1, 1.4], [2.92, .78, .45, .1, 0, 1], [3.08, 1.18, .1, 0, .06, .5], [3.25, .9, 0, 0, 0, .15], [3.5, 1, 0, 0, 0, 0]];
  const pose = t => { let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++; const a = K[i], b = K[i + 1], u = clamp((t - a[0]) / (b[0] - a[0])); return a.map((v, k) => lerp(v, b[k], u)); };
  ray({
    dur: D, shutter: 0, spp: 56, stepk: .62, steps: 150, exposure: 1.2, bloom: .05, sat: 1.1, vig: .3,
    lights: () => [{ p: [-3.6, 4.6, 2.6], at: [0, .5, 0], s: [1.6, 2.2], c: [1, .83, .6], k: 19 }, { p: [4, 2.6, 4], at: [0, .6, 0], s: [4, 3], c: [.62, .76, 1], k: 1.5 }, { p: [1.8, 3.4, -1.9], at: [0, .6, 0], s: [1.6, 1], c: [1, .74, .5], k: 5 }],
    cam: t => ({ p: [.12 * sin(TAU * floor(t * 12) / 12 / D), 1.75, 6.1], at: [.02, .98, 0], fov: 37, ap: .075, focus: 6.15 }),
    uni: t0 => {
      const p = floor(t0 * 12 + 1e-4), t = p / 12, k = pose(t), blink = p % 15 === 4 || t < .2 || t > 3.3 ? 1 : 0;
      return [[k[1], k[2], k[3], k[4]], [k[5], p, blink, clamp(k[3])], [hash(p, 1) * 9, hash(p, 2) * 9, (hash(p >> 1, 3) - .5) * .05, 0]];
    },
    glsl: `
vec3 hp(vec3 p) { float w = .62 * (1. + .38 * U[0].y) / sqrt(U[0].x), h = .62 * (1. - .72 * U[0].y) * U[0].x; p -= vec3(U[2].z * .4, U[0].w + h - .01, 0.); p.xz *= rot(U[1].x); p.yz *= rot(-.8 * U[0].y * U[0].z); return p; }
float hero(vec3 p) {
  float w = .62 * (1. + .38 * U[0].y) / sqrt(U[0].x), h = .62 * (1. - .72 * U[0].y) * U[0].x; p = hp(p); float far = length(p) - 1.7; if (far > .4) return far;
  float a = atan(p.z, p.x), rad = length(p.xz), pet = 1. + U[0].z * (.66 * pow(abs(cos(a * 2.5)), .7) - .2) * smoothstep(0., .8, rad);
  p.y -= U[0].y * U[0].z * .22 * rad * rad; float d = ell(p, vec3(w * pet, h, w * pet)); float k = 1. - .6 * U[0].y;
  return d - k * (.075 * (vn(p * 2.6 + vec3(U[1].y * 1.7, 0, U[2].x)) - .5) + .03 * (vn(p * 7. + U[2].y) - .5)); }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.); d = un(d, vec2(p.z + 3.4, 2.));
  d = un(d, vec2(hero(p), 10.));
  // Cactus: three pressed lumps.
  vec3 q = p - vec3(1.55, .66, -.75); float c = ell(q, vec3(.31, .64, .31)); c = smin(c, ell((q - vec3(.38, .1, 0)), vec3(.15, .24, .15)), .16); c = smin(c, ell(q - vec3(-.36, .24, 0), vec3(.14, .22, .14)), .16); c -= .05 * (vn(q * 6.) - .5) + .02 * cos(atan(q.z, q.x) * 9.) * smoothstep(.6, 0., abs(q.y)); d = un(d, vec2(c, 20.));
  d = un(d, vec2(sph(q - vec3(0, .72, 0), .11) - .03 * vn(q * 14.), 21.));
  // Card hills standing on the felt.
  for (int i = 0; i < 3; i++) { float fi = float(i); vec3 h = p - vec3(-2.3 + fi * 2.15 + (i == 2 ? .6 : 0.), 0., -2.5 - .3 * fi); float R_ = i == 0 ? 1.25 : i == 1 ? 1.75 : 1.2; float e = length(h.xy * vec2(1., 1.2)) - R_ + .02 * vn(vec3(h.xy * 8., fi)); d = un(d, vec2(max(max(abs(h.z) - .05, e * .8), -p.y), 30. + fi)); }
  vec3 s = p - vec3(-1.45, 2.42, -2.9); d = un(d, vec2(max(length(s.xy) - .5 + .012 * vn(s * 30.), abs(s.z) - .05), 33.));
  // Small clay pebbles.
  for (int i = 0; i < 5; i++) { float f = float(i); vec3 c2 = vec3(i == 0 ? -1.55 : i == 1 ? -1.25 : i == 2 ? 1.2 : i == 3 ? .92 : -1.9, 0., i == 0 ? .2 : i == 1 ? .62 : i == 2 ? .8 : i == 3 ? 1.1 : -.5); float r = i == 4 ? .2 : .07 + .05 * fract(f * .63 + .3); d = un(d, vec2(sph(p - c2 - vec3(0, r * .85, 0), r) - .02 * vn(p * 18.), 40. + f)); }
  // Eyes, and the heart of the flower.
  vec3 h = hp(p); float o = U[0].y; if (o < .3) { float w = .62 / sqrt(U[0].x); vec3 e = p - vec3(0., U[0].w + .62 * U[0].x * 1.18, w * .93); e.x = abs(e.x) - .17; d = un(d, vec2(ell(e, vec3(.05, U[1].z > .5 ? .014 : .072 * U[0].x, .05)), 50.)); }
  if (U[1].w > .02) { d = un(d, vec2(sph(h - vec3(0, .13, 0), .27 * U[1].w) - .03 * (vn(h * 9. + U[1].y) - .5), 41.)); vec3 e = h; e.xz *= rot(-U[1].x); e -= vec3(0., .33 * U[1].w, .16 * U[1].w); e.x = abs(e.x) - .085; d = un(d, vec2(ell(e, vec3(.032, U[1].z > .5 ? .01 : .05, .03)), 50.)); }
  return d; }
float prints(vec3 p) { float s = 0.; for (int i = 0; i < 4; i++) { vec3 c = vec3(sin(float(i) * 2.4), cos(float(i) * 1.7) * .6, sin(float(i) * 4.1 + 1.)) * .5; float r = length(p - c); s += sin(r * 150. + 5. * vn(p * 7.)) * smoothstep(.3, .12, r); } return s; }
vec3 nb(vec3 n, vec3 p, float k) { vec2 e = vec2(.004, 0.); float a = prints(p); return normalize(n - k * (vec3(prints(p + e.xyy), prints(p + e.yxy), prints(p + e.yyx)) - a) / e.x * .004); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .62;
  if (id < 1.5) { m.c = vec3(.135, .30, .27) * (.75 + .5 * fbm(p * 14.)); m.r = 1.; n = bump(n, p, 70., .5); }
  else if (id < 2.5) { m.c = vec3(.80, .60, .40) * (.97 + .06 * fbm(p * 3.)); m.r = 1.; n = bump(n, p, 60., .12); }
  else if (id < 10.5) { vec3 q = hp(p); m.c = vec3(1., .19, .03) * (.88 + .24 * vn(q * 5.)); m.sss = .3; m.r = .5; n = nb(n, q, .5); n = bump(n, q, 22., .14); }
  else if (id < 20.5) { m.c = vec3(.10, .33, .12) * (.8 + .4 * vn(p * 6.)); m.sss = .2; n = nb(n, p * .9 - vec3(1.4, .5, -.8), .45); n = bump(n, p, 24., .14); }
  else if (id < 21.5) m.c = vec3(.9, .28, .34);
  else if (id < 33.5) { m.c = id < 30.5 ? vec3(.72, .23, .12) : id < 31.5 ? vec3(.80, .50, .13) : id < 32.5 ? vec3(.17, .36, .36) : vec3(1., .62, .10); m.c *= .9 + .2 * fbm(p * 9.); m.r = 1.; n = bump(n, p, 70., .18); }
  else if (id < 45.) { float i = id - 40.; m.c = i < .5 ? vec3(.22, .30, .55) : i < 1.5 ? vec3(1., .66, .12) : i < 2.5 ? vec3(.85, .62, .3) : i < 3.5 ? vec3(.25, .33, .6) : vec3(.62, .2, .12); n = bump(n, p, 20., .15); m.sss = .2; }
  else { m.c = vec3(.012); m.r = .2; m.coat = .5; } }
vec3 sky(vec3 d) { return mix(vec3(.5, .4, .3), vec3(.65, .72, .85), .5 + .5 * d.y) * .55; }`,
  });
}
