// Infinite zoom: every ball has a round window, and inside is a room with a smaller ball in its middle. Three rooms, then
// the first again, at constant ratio with a short calm stop in each room. The geometry is self similar, so there is no seam.
{
  const D = 4, K = 6.2, N = 3;
  const lv = t => { const u = t / D * N, i = floor(u), f = u - i; return i + lerp(f, E.io(f), 1); };
  ray({
    dur: D, fps: 20, spp: 84, bounces: 3, steps: 130, stepk: .85, tmax: 60, exposure: 1.15, bloom: .1, vig: .3, shutter: .35, sat: 1.12,
    lights: t => { const s = lv(t), b = floor(s), out = []; for (let n = b - 1; n < b + 3; n++) { const k = K ** (s - n); out.push({ p: [-.25 * k, .78 * k, .15 * k], at: [0, -.2 * k, 0], s: [.75 * k, .75 * k], c: [[1, .86, .66], [.72, .86, 1], [1, .72, .84]][((n % 3) + 3) % 3], k: 5.2 }); } return out; },
    cam: t => ({ p: [.0, .05 + .06 * sin(TAU * t / D), 2.6], at: [0, 0, 0], fov: 40, ap: 0, roll: .0 }),
    uni: t => [[lv(t), K, 0, 0]],
    glsl: `
// Level n, seen at scale s: a hollow ball of radius 1 with a window toward the camera, and furniture.
vec2 level(vec3 p, float n) {
  float m = mod(n, 3.), r = length(p); float shell = abs(r - 1.02) - .035; float win = length(p.xy - vec2(0, .11)) - .665; if (p.z > 0.) shell = smax(shell, -win, .05);
  vec2 d = vec2(shell, 10. + m); float rim = p.z > 0. ? length(vec2(win, r - 1.02)) - .055 : 9.; d = un(d, vec2(rim, 20. + m));
  if (r > 1.) return d;
  float fl = max(p.y + .56, r - 1.); d = un(d, vec2(fl, 30. + m));
  // A plinth holds the next ball (radius 1 / 6.2 at the middle).
  d = un(d, vec2(cone(p - vec3(0, -.40, 0), .2, .24, .12, .02), 40. + m));
  if (m < .5) { // garden
    for (int i = 0; i < 4; i++) { float f = float(i); vec3 c = vec3((i < 2 ? -1. : 1.) * (.5 + .16 * mod(f, 2.)), -.56, -.1 - .34 * mod(f, 2.)); d = un(d, vec2(cap(p, c, c + vec3(0, .18, 0), .022), 50.)); d = un(d, vec2(sph(p - c - vec3(0, .30, 0), .15 + .03 * mod(f, 2.)), 51.)); } }
  else if (m < 1.5) { // study: shelves and a lamp
    vec3 q = p - vec3(0, -.1, -.66); q.x = abs(q.x) - .42; d = un(d, vec2(box(q, vec3(.16, .42, .1), .015), 52.)); vec3 b = q; b.y = mod(b.y + .5, .2) - .1; d = un(d, vec2(max(box(b - vec3(0, 0, .1), vec3(.13, .07, .03), .01), abs(q.y) - .36), 53.)); }
  else { // night: rings and stars
    vec3 q = p - vec3(0, .1, -.3); q.yz *= rot(1.2); d = un(d, vec2(tor(q, .62, .02), 54.)); for (int i = 0; i < 5; i++) { float f = float(i); d = un(d, vec2(sph(p - vec3(.72 * sin(f * 2.4), .15 + .4 * sin(f * 1.7), -.45 - .2 * cos(f * 3.)), .045), 55.)); } }
  return d; }
vec2 map(vec3 p) { vec2 d = vec2(99., 0.); float s = U[0].x, b = floor(s); for (int i = 0; i < 4; i++) { float n = b - 1. + float(i), k = pow(U[0].y, s - n - .0); if (i > 0 || k < 9.9 * U[0].y) { vec2 e = level(p / k, n); d = un(d, vec2(e.x * k, e.y)); } } return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  float k = mod(id, 10.); m.r = .42; m.coat = .2;
  if (id < 19.) { float inside = dot(n, normalize(p)) < 0. ? 1. : 0.; ballM(m); if (inside > .5) { m.c = k < .5 ? vec3(.42, .68, .72) : k < 1.5 ? vec3(.62, .22, .16) : vec3(.06, .05, .20); m.coat = 0.; m.r = .7; } }
  else if (id < 29.) { m.c = k < .5 ? vec3(.95, .85, .62) : k < 1.5 ? vec3(.80, .52, .18) : vec3(.70, .72, .95); m.r = .25; m.m = k > .5 && k < 1.5 ? 1. : 0.; }
  else if (id < 39.) { m.c = k < .5 ? vec3(.28, .55, .16) : k < 1.5 ? vec3(.34, .15, .07) : vec3(.10, .09, .30); m.r = k > 1.5 ? .12 : .6; }
  else if (id < 49.) { m.c = k < .5 ? vec3(.93, .88, .78) : k < 1.5 ? vec3(.16, .26, .22) : vec3(.80, .80, .92); }
  else if (id < 50.5) m.c = vec3(.35, .18, .08); else if (id < 51.5) m.c = vec3(.07, .36, .12); else if (id < 52.5) m.c = vec3(.25, .10, .04); else if (id < 53.5) m.c = mix(vec3(.8, .5, .15), vec3(.1, .3, .4), step(.5, fract(p.x * 3. / pow(U[0].y, fract(U[0].x))))); else if (id < 54.5) { m.c = vec3(.9, .7, .3); m.m = 1.; m.r = .2; } else { m.c = vec3(1); m.e = vec3(1., .85, .5) * 2.; } }
vec3 sky(vec3 d) { return vec3(.10, .07, .12); }`,
  });
}
