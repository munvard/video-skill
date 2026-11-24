// Toy diorama: a tiny bright island on a turntable. A small ball does something absurdly big: every time it lands, the
// whole village jumps. Toy plastic, saturated palette, shallow focus.
{
  const D = 4, hops = [[.2, .85, 1.0, 0], [1.0, 1.65, 1.15, 1], [1.8, 2.6, 1.4, 2], [2.75, 3.4, 1.1, 3]], P = [[0, 1.05], [.95, .2], [.1, -.75], [-.9, .25], [0, 1.05]];
  const at = t => { let x = P[0][0], z = P[0][1], y = 0, q = 0; hops.forEach(([a, b, h, i]) => { if (t >= a) { const u = seg(t, a, b); x = lerp(P[i][0], P[i + 1][0], u); z = lerp(P[i][1], P[i + 1][1], u); y = hopY(t, a, b, h); } q += (t > a - .13 && t < a ? .26 * sin(PI * seg(t, a - .13, a)) : 0) + (t >= b ? .24 * Math.exp(-(t - b) * 10) * cos((t - b) * 30) : 0); }); return [x, y, z, q]; };
  // Village bounce: how far a thing at distance d from the last landing has jumped.
  ray({
    dur: D, fps: 20, spp: 48, bounces: 3, stepk: .8, steps: 120, exposure: 1.12, bloom: .04, sat: 1.18, vig: .12, shutter: .5,
    lights: () => [{ p: [-4, 6.5, 4], at: [0, 0, 0], s: [1.8, 1.8], c: [1, .93, .8], k: 34 }, { p: [5, 3, 3], at: [0, .5, 0], s: [4, 3], c: [.7, .84, 1], k: 1.6 }],
    cam: t => { const a = .1; return { p: [6.2 * sin(a), 4.4, 6.2 * cos(a)], at: [0, .3, 0], fov: 29, ap: .16, focus: 7.15 }; },
    uni: t => { const b = at(t), L = hops.map(([, e, h, i]) => { const d = t - e, w = d < 0 ? t + D - e : d; return [P[i + 1][0], P[i + 1][1], w, h]; }); return [b, [TAU * t / D, 0, 0, 0], ...L]; },
    glsl: `
float jump(vec2 c) { float s = 0.; for (int i = 0; i < 4; i++) { vec4 l = U[2 + i]; float d = l.z - length(c - l.xy) * .08 - .02; if (d > 0. && d < .5) s += max(0., sin(d * 9.5)) * exp(-d * 4.2) * .95 * l.w; } return s; }
vec2 tree(vec3 p, vec2 c, float s, float k) { p -= vec3(c.x, jump(c), c.y); p /= s; float t = cyl(p - vec3(0, .14, 0), .16, .055, .02), l; if (k < .5) { l = cone(p - vec3(0, .46, 0), .24, .27, .03, .04); l = min(l, cone(p - vec3(0, .70, 0), .2, .2, .02, .03)); } else l = sph(p - vec3(0, .52, 0), .27); return un(vec2(t * s, 20.), vec2(l * s, 21. + k)); }
vec2 house(vec3 p, vec2 c, float a, float h, float k) { p -= vec3(c.x, jump(c), c.y); p.xz *= rot(a); if (length(p - vec3(0, .3, 0)) > 1.3) return vec2(length(p - vec3(0, .3, 0)) - .95, 30.); vec2 d = vec2(box(p - vec3(0, h * .5, 0), vec3(.26, h * .5, .24), .025), 30. + k); vec3 q = p - vec3(0, h, 0); float r = max(dot(abs(q.xy), vec2(.64, .77)) - .24, abs(q.z) - .29) - .015; r = max(r, -q.y - .02); d = un(d, vec2(r, 40. + k)); d = un(d, vec2(box(p - vec3(.0, .13, .245), vec3(.07, .13, .02), .015), 50.)); vec3 w = p - vec3(0, h * .72, .24); w.x = abs(w.x) - .13; d = un(d, vec2(box(w, vec3(.055, .06, .02), .012), 51.)); d = un(d, vec2(box(p - vec3(.13, h + .24, .05), vec3(.045, .14, .045), .012), 52.)); return d; }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y + .62, 1.);
  float is = cyl(p - vec3(0, -.2, 0), .2, 1.72, .06); d = un(d, vec2(is, 2.)); d = un(d, vec2(cyl(p - vec3(0, -.47, 0), .1, 1.86, .05), 3.));
  if (p.y < 1.8 && length(p.xz) < 2.1) {
    d = un(d, vec2(max(cyl(p - vec3(.1, .0, -.75), .012, .42, .01), -1.), 4.));
    d = un(d, house(p, vec2(-.75, -.75), .5, .52, 0.)); d = un(d, house(p, vec2(.98, -.62), -.5, .38, 1.)); d = un(d, house(p, vec2(-1.22, .55), 1.2, .34, 2.));
    d = un(d, tree(p, vec2(1.25, .55), .9, 0.)); d = un(d, tree(p, vec2(.55, -1.2), .8, 0.)); d = un(d, tree(p, vec2(-.45, -1.32), 1., 1.)); d = un(d, tree(p, vec2(-.62, 1.1), .66, 1.)); d = un(d, tree(p, vec2(1.12, .98), .6, 0.));
    // Windmill.
    vec2 c = vec2(.16, -.28) + vec2(.42, .12); vec3 q = p - vec3(.5, jump(vec2(.5, .6)), .55); q = p - vec3(-.25, jump(vec2(-.25, .1)), .05); d = un(d, vec2(cone(q - vec3(0, .34, 0), .34, .2, .12, .03), 31.)); d = un(d, vec2(cone(q - vec3(0, .76, 0), .09, .17, .03, .02), 40.)); vec3 b = q - vec3(0, .62, .2); d = un(d, vec2(sph(b, .045), 52.)); b.xy *= rot(U[1].x); b.xy = abs(b.xy); if (b.y > b.x) b.xy = b.yx; d = un(d, vec2(box(b - vec3(.23, .045, .0), vec3(.2, .05, .012), .01), 51.));
    // Car that never stops.
    float a = U[1].x; vec3 k = p - vec3(0, .075, 0); k.xz *= rot(-a); k -= vec3(1.5, 0, 0); d = un(d, vec2(min(box(k, vec3(.07, .05, .14), .03), box(k - vec3(0, .06, -.01), vec3(.055, .04, .075), .02)), 53.));
  }
  return un(d, vec2(bal(p, vec4(U[0].x, U[0].y + .27 * (1. - U[0].w), U[0].z, .27), U[0].w), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .38; m.coat = .35;
  if (id < 1.5) { m.c = vec3(.18, .55, .72); m.r = .7; m.coat = 0.; }
  else if (id < 2.5) { float r = length(p.xz); m.c = p.y > -.02 ? (abs(r - 1.5) < .13 ? vec3(.62, .52, .40) : vec3(.22, .62, .14)) : vec3(.75, .45, .20); if (abs(r - 1.5) < .012 && p.y > -.02 && fract(atan(p.z, p.x) * 5.) < .5) m.c = vec3(.95); }
  else if (id < 3.5) { m.c = vec3(.92, .80, .62); } else if (id < 4.5) { m.c = vec3(.08, .45, .75); m.r = .06; m.coat = 1.; }
  else if (id < 11.) ballM(m);
  else if (id < 20.5) m.c = vec3(.40, .19, .09); else if (id < 21.5) m.c = vec3(.05, .42, .20); else if (id < 22.5) m.c = vec3(.50, .70, .06);
  else if (id < 30.5) m.c = vec3(.96, .85, .65); else if (id < 31.5) m.c = vec3(.94, .92, .88); else if (id < 33.) m.c = vec3(.42, .72, .86);
  else if (id < 40.5) m.c = vec3(.85, .10, .12); else if (id < 41.5) m.c = vec3(.12, .25, .68); else if (id < 43.) m.c = vec3(.97, .66, .06);
  else if (id < 50.5) m.c = vec3(.30, .12, .06); else if (id < 51.5) m.c = vec3(.98, .94, .80); else if (id < 52.5) m.c = vec3(.75, .12, .14); else m.c = vec3(.95, .80, .05); }
vec3 sky(vec3 d) { return mix(vec3(.75, .85, .95), vec3(.35, .65, .95), clamp(d.y, 0., 1.)) * .85; }`,
  });
}
