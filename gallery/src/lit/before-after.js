// Before and after: one locked camera, one honest wipe. Left of the line a flat dusty ball, right of it the same ball full
// and bouncing. Nothing else in the room changes. After the wipe the air goes out again, and the loop is closed.
{
  const D = 4, wipe = t => lerp(-1.15, 1.15, E.io(seg(t, .8, 1.75)));
  const B = [[1.15, 1.62, .7], [1.62, 2.09, .7], [2.09, 2.56, .7], [2.56, 2.9, .4]], y = t => B.reduce((s, [a, b, h]) => s + hopY(t, a, b, h), 0), sq = t => B.reduce((s, [, b]) => s + (Math.abs(t - b) < .06 ? .2 * cos(PI * (t - b) / .12) : 0), 0);
  const air = t => 1 - E.io(seg(t, 3.05, 3.8));
  ray({
    dur: D, spp: 48, bounces: 3, exposure: 1.08, bloom: .05, vig: .2, shutter: .5,
    lights: () => [{ p: [-3.2, 4.2, 2.6], at: [0, .4, 0], s: [1.6, 2], c: [1, .92, .8], k: 17 }, { p: [4, 2, 2.4], at: [0, .6, 0], s: [1, 3], c: [.75, .86, 1], k: 5 }],
    cam: () => ({ p: [0, 1.35, 5.6], at: [0, .82, 0], fov: 30, ap: .04, focus: 5.5 }),
    uni: t => [[wipe(t), y(t), sq(t), t > .8 ? air(t) : 0]],
    glsl: `
bool after() { return gUV.x < U[0].x; }
float full() { return after() ? U[0].w : 0.; }
vec2 map(vec3 p) {
  vec2 d = vec2(smin(p.y, p.z + 2.6, 1.4), 1.);
  float f = full(); vec3 c = vec3(0, (after() ? U[0].y : 0.), 0); float q = after() ? U[0].z : 0.;
  float h = mix(.22, .62, f), w = mix(.74, .62, f); vec3 b = p - c - vec3(0, h * (1. - q) , 0); float bend = (1. - f); b.y += bend * .10 * b.x * b.x - bend * .05 * sin(b.x * 5. + 1.);
  float e = ell(b, vec3(w * (1. + q * .6), h * (1. - q), w * (1. + q * .6))); e += bend * (.05 * (vn(p * 5. + 2.) - .5) + .10 * exp(-dot(b.xz - vec2(.1, .12), b.xz - vec2(.1, .12)) * 9.) * step(0., b.y)); d = un(d, vec2(e * .8, 10.));
  d = un(d, vec2(cyl(p - vec3(1.5, .42, -.6), .42, .13, .03), 12.)); d = un(d, vec2(cyl(p - vec3(1.5, .95, -.6), .12, .03, .01), 13.)); d = un(d, vec2(cap(p, vec3(1.28, 1.08, -.6), vec3(1.72, 1.08, -.6), .04), 14.)); d = un(d, vec2(box(p - vec3(1.5, .03, -.6), vec3(.26, .03, .16), .02), 13.));
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { m.c = vec3(.36, .42, .44); m.r = .6; }
  else if (id < 11.) { ballM(m); float f = full(); float dust = (1. - f) * clamp(.35 + .75 * fbm(p * 5.) * smoothstep(-.3, .9, n.y), 0., .92); m.c = mix(m.c, vec3(.36, .33, .30), dust); m.coat *= f; m.r = mix(.9, .3, f); }
  else if (id < 12.5) { m.c = vec3(.10, .22, .26); m.r = .3; m.coat = .4; } else if (id < 13.5) { m.c = vec3(.6); m.m = 1.; m.r = .25; } else { m.c = vec3(.08, .05, .04); m.r = .5; } }
vec3 sky(vec3 d) { return vec3(.55, .60, .62) * .55; }`,
    over(c, t) {
      const x = 240 + wipe(t) * 240, a = 1 - seg(t, 3.2, 3.6); c.save(); c.beginPath(); c.rect(x, 0, 480, 480); c.clip(); txt(c, 'flat', 240, 446, '650 46px Inter', '#FFFFFF', 'center', '-1px'); c.restore();
      c.save(); c.beginPath(); c.rect(0, 0, x, 480); c.clip(); c.globalAlpha = a; txt(c, 'full', 240, 446, '650 46px Inter', '#FFB27A', 'center', '-1px'); c.globalAlpha = E.io(seg(t, 3.5, 3.85)); txt(c, 'flat', 240, 446, '650 46px Inter', '#FFFFFF', 'center', '-1px'); c.restore();
      if (x > -4 && x < 484) { c.fillStyle = '#fff'; c.fillRect(x - 1.5, 0, 3, 480); circle(c, x, 60, 15); c.fill(); c.fillStyle = '#25363A'; poly(c, [[x - 9, 60], [x - 3, 54], [x - 3, 66]]); c.fill(); poly(c, [[x + 9, 60], [x + 3, 54], [x + 3, 66]]); c.fill(); }
    },
  });
}
