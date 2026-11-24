// One take with a thread: one camera follows a glowing thread through lit worlds. The ball rides it, each doorway fills
// the frame and the next world has its own light. Two worlds make one period, so the take never ends.
{
  const D = 4, PER = 9; // world length
  const z0 = t => -2 * PER * (t / D - .12 * sin(TAU * 2 * t / D) / 2);
  const tx = z => .62 * sin(z * TAU / (2 * PER)) + .18 * sin(z * TAU / PER * 1 + 1), ty = z => .62 + .30 * sin(z * TAU / PER * 1 + .4) + .14 * sin(z * TAU / PER * 2);
  ray({
    dur: D, fps: 20, spp: 64, bounces: 4, steps: 120, stepk: .85, tmax: 26, exposure: 1.35, bloom: .3, fog: .045, fogc: [1, 1, 1], foga: [.006, .008, .016], vig: .4, shutter: .35, clampv: 5,
    lights: t => { // the two lights of the world we are in, and of the next one
      const z = z0(t) - 1.2, n = Math.floor(-z / PER), L = []; for (let k = 0; k < 2; k++) { const w = n + k, c = -(w + .5) * PER, m = ((w % 2) + 2) % 2, f = k === 0 ? 1 - E.io(seg(-z, (w + 1) * PER - .6, (w + 1) * PER)) : 1; L.push({ p: [m ? -2.2 : 2.2, 3.3, c - .5], at: [0, .3, c], s: [1.3, 2.6], c: m ? [1, .42, .2] : [.16, .62, 1], k: 11 * f }, { p: [m ? 3 : -3, 1.2, c - 1.8], at: [0, .6, c + .6], s: [.5, 2.4], c: m ? [.75, .16, .5] : [.1, .85, .7], k: 6.5 * f }); } return L;
    },
    cam: t => { const z = z0(t), f = z - 3.4; return { p: [tx(z) * .35, 1.05 + .18 * ty(z), z], at: [tx(f) * .75, .25 + ty(f) * .62, f], fov: 52, ap: .02, focus: 3.3, roll: .03 * sin(TAU * t / D) }; },
    uni: t => { const z = z0(t) - 3.1; return [[tx(z), ty(z) + .19, z, z * 3], [0, 0, 0, 0]]; },
    glsl: `
const float P = 9.;
float TX(float z) { return .62 * sin(z * 6.28319 / 18.) + .18 * sin(z * 6.28319 / 9. + 1.); }
float TY(float z) { return .62 + .30 * sin(z * 6.28319 / 9. + .4) + .14 * sin(z * 6.28319 / 4.5); }
vec2 map(vec3 p) {
  float w = floor(-p.z / P), m = mod(w, 2.), lz = p.z + (w + .5) * P; // world index and place in it
  vec2 d = vec2(p.y, 1. + m);
  // Doorway walls at world borders. The hole is round topped.
  float wz = abs(abs(lz) - P * .5) - .12; vec2 h = vec2(p.x, p.y - 1.05); float hole = length(vec2(h.x, max(h.y - .25, 0.))) - 1.02; hole = max(hole, -h.y - 1.06); d = un(d, vec2(smax(wz, -hole, .08) , 3. + m));
  float rim = length(vec2(hole - .0, wz + .0)) - .03; d = un(d, vec2(rim, 5. + m));
  // World A: standing glass-smooth stones. World B: floating rings and a stair of blocks.
  vec3 q = p; q.z = lz;
  if (m < .5) { for (int i = 0; i < 5; i++) { float f = float(i), s = mod(f, 2.) * 2. - 1.; vec3 c = vec3(s * (1.75 + .5 * sin(f * 2.3)), 0., -3. + f * 1.5); float hh = .7 + .9 * fract(f * .618); d = un(d, vec2(cap(q, c, c + vec3(0, hh, 0), .26 + .1 * fract(f * .37)), 20.)); } }
  else { for (int i = 0; i < 5; i++) { float f = float(i), s = mod(f, 2.) * 2. - 1.; vec3 c = vec3(s * (1.8 + .4 * sin(f * 1.9)), .0, -3. + f * 1.5); float hh = .35 + .8 * fract(f * .41 + .2); vec3 b = q - c - vec3(0, hh, 0); b.xz *= rot(.4 + f); d = un(d, vec2(box(b, vec3(.36, hh, .36), .05), 21.)); } }
  float th = length(vec2(p.x - TX(p.z), p.y - TY(p.z))) - .022; d = un(d, vec2(th * .8, 9.));
  return un(d, vec2(sph(p - U[0].xyz, .2), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 2.5) { m.c = vec3(.022); m.r = .10 + .13 * fbm(p * vec3(1.2, 1., 1.2)); m.coat = .9; n = normalize(n + .012 * (vec3(vn(p * 5.), 0., vn(p * 5. + 9.)) - .5)); }
  else if (id < 4.5) { m.c = id < 3.5 ? vec3(.04, .06, .09) : vec3(.09, .045, .05); m.r = .45; n = bump(n, p, 9., .08); }
  else if (id < 6.5) { m.c = vec3(.1); m.e = (id < 5.5 ? vec3(.1, .7, 1.) : vec3(1., .42, .16)) * 1.3; }
  else if (id < 9.5) { m.c = vec3(1., .6, .3); float k = smoothstep(2.6, .2, abs(p.z - U[0].z)); m.e = vec3(1., .42, .12) * (1.6 + 5. * k); }
  else if (id < 10.5) { m.c = OR; m.r = .3; m.coat = .6; m.e = vec3(1., .2, .03) * .55; vec3 q = p - U[0].xyz; q.yz *= rot(U[0].w); if (abs(q.y) < .03) m.c *= .35; }
  else if (id < 20.5) { m.c = vec3(.05, .16, .2); m.r = .12; m.coat = 1.; } else { m.c = vec3(.30, .10, .09); m.r = .4; m.coat = .4; } }
vec3 sky(vec3 d) { return vec3(.004, .006, .012); }`,
  });
}
