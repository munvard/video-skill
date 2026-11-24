// Glass and light: a warm light drifts behind thick glass, is bent into many, turns fast through the ring once, and
// lights a word as it goes. One color family, real refraction with dispersion.
{
  const D = 4;
  const where = t => { const u = t / D, a = TAU * (u - .13 * sin(TAU * u)); return [1.35 * sin(a), .15 + .5 * sin(a * 2 + .6), 1.3 * cos(a) - .25]; };
  ray({
    dur: D, fps: 20, spp: 180, bounces: 7, steps: 120, stepk: .9, exposure: 1.15, bloom: .22, disp: .035, abs: .5, shutter: .6, vig: .35, clampv: 6, dn: 1,
    lights: () => [{ p: [-2.6, 3.4, 1.6], at: [0, 0, 0], s: [1, 3.4], c: [1, .55, .3], k: 5 }, { p: [3.2, 1.2, 1.2], at: [0, 0, 0], s: [.7, 3], c: [.55, .35, 1], k: 5 }],
    cam: t => ({ p: [.3 * cos(TAU * t / D), .25, 5.6], at: [0, .02, 0], fov: 36, ap: .03, focus: 5.2 }),
    uni: t => [[...where(t), .24], [t / D * TAU, E.io5(t / D) * TAU, 0, 0]],
    tex: { w: 1024, h: 512, draw(c) { c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 512); txt(c, 'light', 512, 330, '300 300px Fraunces', '#fff', 'center', '6px'); } },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(p.z + 3.2, 1.); d = un(d, vec2(p.y + 1.75, 2.));
  d = un(d, vec2(sph(p - U[0].xyz, U[0].w), 10.));
  vec3 q = p; q.xy *= rot(.25 * sin(U[1].x)); q.xz *= rot(U[1].y + .5); q.yz *= rot(1.15); float r = tor(q, 1.02, .34);
  vec3 a = p - vec3(-1.15 + .2 * sin(U[1].x), -.95 + .12 * cos(U[1].x), .75); float g = smin(r, sph(a, .5), .55);
  vec3 b = p - vec3(1.25, .95 + .12 * sin(U[1].x + 1.), .45); g = smin(g, sph(b, .36), .5);
  return un(d, vec2(g, 92.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { vec2 uv = p.xy / vec2(5.6, 2.8) + vec2(.5, .5); float w = texture(uTex, uv).r * step(0., uv.x) * step(uv.x, 1.) * step(0., uv.y) * step(uv.y, 1.); float l = length(p - U[0].xyz); float pr = exp(-l * .42);
    m.c = vec3(.045, .02, .05); m.r = .8; vec3 g = mix(vec3(.16, .03, .08), vec3(.02, .012, .05), smoothstep(0., 3.4, length(p.xy - U[0].xy))) * .75; m.e = g + w * vec3(1., .47, .18) * (.10 + 2.6 * pr); }
  else if (id < 2.5) { m.c = vec3(.03, .015, .03); m.r = .16; m.coat = 1.; }
  else if (id < 11.) { m.c = OR; m.r = .5; m.e = vec3(1., .33, .07) * 4.2; }
  else { m.tr = 1.; m.c = vec3(1., .84, .80); m.ior = 1.46; m.r = .0; } }
vec3 sky(vec3 d) { return mix(vec3(.02, .01, .03), vec3(.10, .03, .08), smoothstep(-.2, 1., d.y)); }`,
  });
}
