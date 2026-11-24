// Mini documentary: one true small thing, filmed with patience. A patch of sun crosses the floor, and the ball moves with
// it. One place name, daylight, leaf shadows, a camera that only breathes.
{
  const D = 4, sun = t => cos(TAU * t / D); // 1 left .. -1 right
  const X = t => { // the ball follows late, in small hops
    const h = [[.62, .98, -.82, -.1], [1.3, 1.68, -.1, .72], [2.62, 2.98, .72, .0], [3.3, 3.68, .0, -.82]]; let x = -.82, y = 0, q = 0, r = 0; for (const [a, b, p, n] of h) { if (t >= a) { x = lerp(p, n, seg(t, a, b)); y = hopY(t, a, b, .34); } q += (t > a - .12 && t < a ? .2 * sin(PI * seg(t, a - .12, a)) : 0) + (t >= b && t < b + .6 ? .16 * Math.exp(-(t - b) * 10) * cos((t - b) * 28) : 0); r += 0; } return [x, y, q];
  };
  ray({
    dur: D, fps: 20, spp: 76, bounces: 4, exposure: 1.2, bloom: .1, vig: .32, shutter: .5, sat: 1.04, fog: .012, fogc: [1, .9, .75], foga: [.0, .0, .0],
    lights: t => [{ p: [1.75 * sun(t), 6.2, -6.8], at: [0, .9, 0], s: [.75, .75], c: [1, .80, .52], k: 620 }, { p: [0, 2.2, -2.35], at: [0, .8, 2], s: [2.4, 2], c: [.62, .78, 1], k: 1.6 }, { p: [1.5, 2.4, 4.6], at: [0, .4, -.4], s: [2.5, 2], c: [.8, .85, 1], k: 1.1 }],
    cam: t => ({ p: [.1 + .03 * sin(TAU * t / D), 1.02 + .012 * sin(TAU * t / D * 2), 4.4], at: [.05 + .10 * X(t)[0] * 0, .68, -.4], fov: 37, ap: .07, focus: 4.1 }),
    uni: t => { const b = X(t); return [[b[0], b[1], b[2], t], [0, 0, 0, 0]]; },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.);
  // Wall with a window, and the room around it, so light comes only through the glass.
  vec2 h = abs(p.xy - vec2(0., 2.0)); float wl = abs(p.z + 2.6) - .14; float hole = box2(p.xy - vec2(0., 2.), vec2(1.35, 1.0)); d = un(d, vec2(max(wl, -hole), 2.)); d = un(d, vec2(max(5.2 - p.y, -2.6 - p.z), 2.)); d = un(d, vec2(max(4.6 - abs(p.x), -2.6 - p.z), 2.));
  vec3 w = p - vec3(0, 2., -2.56); float fr = max(abs(box2(w.xy, vec2(1.35, 1.))) - .06, abs(w.z) - .08); fr = min(fr, box(w, vec3(.04, 1., .05), .01)); fr = min(fr, box(w - vec3(0, .3, 0), vec3(1.35, .035, .05), .01)); d = un(d, vec2(fr, 3.)); d = un(d, vec2(box(p - vec3(0, .96, -2.35), vec3(1.6, .05, .26), .02), 3.));
  // A plant on the sill, whose leaves make the shadows.
  vec3 v = p - vec3(.78, 1.16, -2.35); d = un(d, vec2(cone(v, .17, .12, .17, .02), 4.)); float lf = 9.; for (int i = 0; i < 7; i++) { float a = float(i) * .9 + .1 * sin(U[0].w * 1.5708 + float(i)), s = .35 + .06 * float(i); vec3 e = vec3(cos(a) * .42, s, sin(a) * .16); lf = min(lf, cap(v, vec3(0, .1, 0), e, .012)); vec3 q = v - e * 1.12; q.xy *= rot(a); lf = min(lf, ell(q, vec3(.17, .07, .03))); } d = un(d, vec2(lf * .8, 5.));
  // Baseboard, book, cup.
  d = un(d, vec2(box(p - vec3(0, .1, -2.42), vec3(5., .1, .05), .01), 3.)); vec3 b = p - vec3(1.62, .07, -.75); b.xz *= rot(.4); d = un(d, vec2(box(b, vec3(.42, .07, .3), .015), 6.)); b.xz *= rot(-.7); d = un(d, vec2(box(b - vec3(.03, .12, 0), vec3(.36, .05, .27), .015), 7.));
  return un(d, vec2(bal(p, vec4(U[0].x, U[0].y + .3 * (1. - U[0].z), -.25 , .3), U[0].z), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .8; if (id < 1.5) { vec2 q = p.xz; float i = floor(q.x / .42), g = fbm(vec3(q.x * 12., i * 3., q.y * 1.1)); m.c = mix(vec3(.30, .17, .085), vec3(.46, .28, .15), g) * (.85 + .25 * h11(i)); if (fract(q.x / .42) < .02) m.c *= .35; m.r = .32; m.coat = .25; }
  else if (id < 2.5) m.c = vec3(.62, .58, .52); else if (id < 3.5) { m.c = vec3(.78, .75, .70); m.r = .5; } else if (id < 4.5) m.c = vec3(.52, .22, .12); else if (id < 5.5) { m.c = vec3(.08, .26, .07); m.r = .5; m.sss = .5; } else if (id < 6.5) m.c = vec3(.13, .22, .30); else if (id < 7.5) m.c = vec3(.62, .52, .36); else ballM(m); }
vec3 sky(vec3 d) { return d.z < 0. ? mix(vec3(1., .86, .66), vec3(.62, .80, 1.), smoothstep(-.1, .5, d.y)) * 1.6 : vec3(.18, .16, .15); }`,
    over(c, t) { const a = E.io(seg(t, .35, .8)) * (1 - E.io(seg(t, 2.9, 3.4))); c.globalAlpha = a; c.fillStyle = '#E8590C'; c.fillRect(34, 398, 3, 44); txt(c, 'South window', 50, 418, '500 27px Fraunces', '#FFF8EC', 'left'); txt(c, 'late afternoon', 50, 443, '400 21px Inter', 'rgba(255,248,236,.85)', 'left'); },
  });
}
