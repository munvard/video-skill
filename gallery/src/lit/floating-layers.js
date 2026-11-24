// Floating layers: a flat screen turns, its layers come apart, one moves forward while the rest fall out of focus, and the
// screen closes. Only space, depth and shadow. The ball leaves its picture and becomes round.
{
  const D = 4, turn = t => E.io5(seg(t, .35, 1.15)) * (1 - E.io5(seg(t, 3.1, 3.85))), open = t => E.out5(seg(t, .75, 1.5)) * (1 - E.io5(seg(t, 2.9, 3.6))), fw = t => E.io5(seg(t, 1.55, 2.15)) * (1 - E.io5(seg(t, 2.65, 3.2)));
  const W = 1024, hop = t => hopY(t, 1.95, 2.45, .42);
  ray({
    dur: D, spp: 60, bounces: 4, exposure: 1.0, bloom: .05, vig: .12, shutter: .5, sat: 1.1,
    lights: () => [{ p: [-3.4, 4.2, 4.4], at: [0, 0, 0], s: [2.6, 2.6], c: [1, .96, .9], k: 11 }, { p: [4.4, .6, 1.6], at: [0, 0, 0], s: [.8, 4], c: [.75, .85, 1], k: 7 }],
    cam: t => { const a = .62 * turn(t), z = 6.6; return { p: [-z * sin(a) * .95, .12 + 1.2 * turn(t), z * cos(a) * 1.0], at: [.0, 0, .35 * open(t)], fov: 29, ap: .015 + .15 * fw(t), focus: z - .35 - .95 * open(t) * .9 - .35 * fw(t) }; },
    uni: t => [[open(t), fw(t), hop(t), t > 2.45 ? .2 * Math.exp(-(t - 2.45) * 9) * cos((t - 2.45) * 28) : t > 1.8 && t < 1.95 ? .16 * sin(PI * seg(t, 1.8, 1.95)) : 0]],
    tex: {
      w: W, h: W, draw(c) { // four layers, one per quarter
        c.clearRect(0, 0, W, W); c.fillStyle = '#F4EFE6'; c.fillRect(0, 0, 512, 512);
        txt(c, 'Today', 46, 96, '700 58px Inter', '#201A17', 'left', '-2px'); circle(c, 440, 78, 26); c.fillStyle = '#D9CFC0'; c.fill(); [0, 1].forEach(i => { c.fillStyle = '#E4DBCD'; rr(c, 46, 520, 420, 20, 10); c.fill(); });
        c.fillStyle = '#fff'; c.fillRect(512, 0, 512, 512); const g = c.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#2F5D62'); g.addColorStop(1, '#8FB8A0'); c.fillStyle = g; c.fillRect(512, 0, 512, 512); c.fillStyle = '#1F4347'; c.beginPath(); c.moveTo(512, 380); c.quadraticCurveTo(700, 300, 1024, 410); c.lineTo(1024, 512); c.lineTo(512, 512); c.fill();
        c.fillStyle = '#FFFDF9'; c.fillRect(0, 512, 512, 512); txt(c, 'One jump', 40, 800, '700 88px Inter', '#201A17', 'left', '-3px');
        c.fillStyle = '#E8590C'; c.fillRect(512, 512, 512, 512); txt(c, 'Go', 768, 800, '700 110px Inter', '#fff', 'center');
      },
    },
    glsl: `
float lay(vec3 p, vec3 c, vec2 s, float r) { p -= c; return ext(box2(p.xy, s - r) - r, p.z, .022, .008); }
float Z(float i) { return U[0].x * (i * .48) + .05 * i + (i > 1.5 && i < 2.5 ? .0 : 0.); }
vec2 map(vec3 p) {
  vec2 d = vec2(p.z + 1.3, 1.);
  d = un(d, vec2(lay(p, vec3(0, 0, 0), vec2(1.0, 1.42), .16), 20.));
  d = un(d, vec2(lay(p, vec3(0, .18, Z(1.)), vec2(.82, .66), .12), 21.));
  d = un(d, vec2(lay(p, vec3(-.12, -.79, Z(2.)), vec2(.70, .20), .1), 22.));
  d = un(d, vec2(lay(p, vec3(.56, -1.13, Z(3.) + .1 * U[0].x), vec2(.27, .15), .15), 23.));
  float z = Z(1.) + .0 + U[0].x * .52 + U[0].y * .42, q = U[0].w; vec3 c = vec3(0, -.06 + U[0].z - .27 * q, z + .05); vec3 b = p - c; float k = max(.12, clamp(U[0].x * 1.2, 0., 1.)); d = un(d, vec2(ell(b, .27 * vec3(1. + q * .6, 1. - q, k * (1. + q * .6))) * .9, 10.));
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .45; m.coat = .25;
  if (id < 1.5) { m.c = vec3(.70, .52, .42); m.r = .8; m.coat = 0.; return; }
  if (id < 11.) { ballM(m); return; }
  vec2 c, s, o; if (id < 20.5) { c = vec2(0, 0); s = vec2(1.42); o = vec2(0, .5); } else if (id < 21.5) { c = vec2(0, .18); s = vec2(.82); o = vec2(.5, .5); } else if (id < 22.5) { c = vec2(-.12, -.79); s = vec2(.70); o = vec2(0); } else { c = vec2(.56, -1.13); s = vec2(.27); o = vec2(.5, 0); }
  vec2 uv = (p.xy - c) / s * .5 + .5; if (id < 20.5) uv = vec2(p.x / 1. * .5 + .5, (p.y - .42) / 2. + .5); vec3 t = texture(uTex, o + clamp(uv, .004, .996) * .5).rgb; m.c = pow(t, vec3(2.2)); if (n.z < .5) m.c = mix(m.c, vec3(.9), .5); }
vec3 sky(vec3 d) { return vec3(.82, .80, .78) * .8; }`,
  });
}
