// Exploded view: the ball opens along one axis, waits, and snaps shut. Two shells, a foam ring, a spring, a gear and a warm
// core, in exact line on a studio sweep. One accent color.
{
  const D = 4, open = t => E.out5(seg(t, 1.0, 1.5)) * (1 - E.in3(seg(t, 2.95, 3.25))) + (t > 1.5 && t < 2.95 ? .035 * sin(PI * seg(t, 1.5, 2.95)) : 0);
  ray({
    dur: D, spp: 56, bounces: 4, steps: 120, stepk: .85, exposure: .9, bloom: .05, vig: .18, shutter: .5, sat: 1.22, contrast: 1.12,
    lights: () => [{ p: [-3.2, 4.8, 3], at: [0, 1.2, 0], s: [2.4, 2.4], c: [1, .96, .9], k: 13 }, { p: [3.6, 2.4, -.6], at: [0, 1.3, 0], s: [.7, 4], c: [1, .9, .8], k: 11 }, { p: [-3.6, 1.6, -1.4], at: [0, 1.3, 0], s: [.6, 3.6], c: [.7, .84, 1], k: 9 }],
    cam: t => ({ p: [.9 * sin(.5 * sin(TAU * t / D)), 4.1, 7.5], at: [0, 1.6, 0], fov: 29, ap: .06, focus: 8.0 }),
    uni: t => { const o = open(t), y = hopY(t, .35, .95, 1.15) + o * 0 + lerp(0, .0, o), air = t > .95 && t < 3.3 ? 1 : 0, up = t <= .95 ? hopY(t, .35, 1.28, 1.35) : t < 3.2 ? 1.1 + .03 * sin((t - .95) * 3) : 1.1 * (1 - E.in2(seg(t, 3.25, 3.5))); void y; void air; const q = (t < .35 ? .22 * sin(PI * seg(t, .2, .35)) : 0) + (t > 3.5 ? .22 * Math.exp(-(t - 3.5) * 9) * cos((t - 3.5) * 28) : 0); return [[lerp(up, up, 1), q, o, t * 0 + E.io5(seg(t, 1.0, 3.1)) * PI], [0, 0, 0, 0]]; },
    glsl: `
float gear(vec3 p) { float a = atan(p.z, p.x), r = length(p.xz); float t = .30 + .035 * smoothstep(-.3, .3, sin(a * 14.)); float d = ext(r - t, p.y, .06, .012); d = max(d, -(r - .12)); for (int i = 0; i < 1; i++) { float s = 6.28319 / 5.; float b = mod(a + s * .5, s) - s * .5; vec2 q = r * vec2(cos(b), sin(b)) - vec2(.21, 0); d = max(d, -(length(q) - .05)); } return d * .8; }
float spring(vec3 p, float h) { float r = length(p.xz), a = atan(p.z, p.x), k = 6.28319 * 4.; float y = p.y * k / (2. * h); float n = mod(y - a + 3.14159, 6.28319) - 3.14159; float d = length(vec2(r - .2, n * 2. * h / k)) - .028; return max(d, abs(p.y) - h) * .75; }
vec2 map(vec3 p) {
  vec2 d = vec2(smin(p.y, p.z + 4.2, 2.4), 1.);
  float o = U[0].z, q = U[0].y; vec3 c = p - vec3(0, U[0].x + .62 * (1. - q), 0); c /= vec3(1. + q * .6, 1. - q, 1. + q * .6); if (length(c.xz) > 1.1 && o < .01) return un(d, vec2(length(c) - .62, 10.));
  float s = U[0].w; c.xz *= rot(s);
  vec3 a = c - vec3(0, o * 1.02, 0); float sh = abs(length(a) - .585) - .035; d = un(d, vec2(smax(sh, -a.y + .004, .015), 10.));
  vec3 b = c + vec3(0, o * .98, 0); sh = abs(length(b) - .585) - .035; d = un(d, vec2(smax(sh, b.y + .004, .015), 11.));
  if (o > .004) {
    vec3 f = c - vec3(0, o * .5, 0); d = un(d, vec2(max(abs(length(f.xz) - .42) - .09, abs(f.y) - .09) - .02, 12.));
    vec3 k = c - vec3(0, o * .12, 0); d = un(d, vec2(sph(k, .2), 13.));
    vec3 g = c + vec3(0, o * .24, 0); g.xz *= rot(s * 2.); d = un(d, vec2(gear(g), 14.));
    vec3 e = c + vec3(0, o * .58, 0); d = un(d, vec2(spring(e, .06 + .13 * o), 15.));
    // The axis all parts share.
    d = un(d, vec2(max(length(c.xz) - .006, abs(c.y) - 1.5 * o), 16.)); }
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { m.c = vec3(.74, .71, .68); m.r = .55; }
  else if (id < 11.5) { vec3 c = p - vec3(0, U[0].x + .62 + (id < 10.5 ? 1. : -1.) * U[0].z, 0); ballM(m); if (dot(n, normalize(c)) < .2 && U[0].z > .02) { m.c = vec3(.95, .93, .9); m.r = .5; m.sss = 0.; m.coat = 0.; } }
  else if (id < 12.5) { m.c = vec3(.10, .10, .11); m.r = .9; n = bump(n, p, 60., .3); } else if (id < 13.5) { m.c = OR; m.r = .25; m.coat = 1.; m.e = vec3(1., .22, .03) * .55; }
  else if (id < 14.5) { m.c = vec3(.80, .78, .75); m.m = 1.; m.r = .26; } else if (id < 15.5) { m.c = vec3(.62, .62, .64); m.m = 1.; m.r = .2; } else { m.c = vec3(.3); } }
vec3 sky(vec3 d) { return vec3(.72, .71, .72) * (.75 + .25 * d.y); }`,
    over(c, t) { const a = E.io(seg(t, 1.55, 1.8)) * (1 - E.io(seg(t, 2.75, 2.95))); if (a <= 0) return; c.globalAlpha = a; c.strokeStyle = '#3A332E'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(263, 207); c.lineTo(348, 207); c.stroke(); circle(c, 263, 207, 3); c.fillStyle = '#3A332E'; c.fill(); txt(c, 'core', 356, 214, '600 24px Inter', '#3A332E', 'left', '-.4px'); },
  });
}
