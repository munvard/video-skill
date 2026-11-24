// POV moment: you sit at a breakfast table. One situation line. The ball sleeps in the egg cup, the toast jumps, the ball
// jumps higher and goes back to bed. Eye height, handheld, morning window.
{
  const D = 4, N = (t, s) => sin(TAU * t / D + s) * .6 + sin(TAU * t / D * 2 + s * 2.3) * .35 + sin(TAU * t / D * 5 + s * 1.7) * .1;
  const toast = t => hopY(t, 1.1, 1.75, .95), by = t => hopY(t, 1.5, 2.35, .92);
  ray({
    dur: D, fps: 20, spp: 52, bounces: 4, exposure: 1.18, bloom: .1, vig: .25, shutter: .6, sat: 1.08,
    lights: () => [{ p: [-3.6, 2.8, -1.8], at: [0, .2, 0], s: [1.2, 1.5], c: [1, .76, .48], k: 34 }, { p: [2.5, 3, 3], at: [0, 0, 0], s: [3, 3], c: [.6, .75, 1], k: 1.4 }],
    cam: t => { const l = E.io(seg(t, 1.15, 1.45)) * (1 - E.io(seg(t, 2.5, 3.2))); return { p: [.05 * N(t, 0), 1.72 + .03 * N(t, 2), 3.1 + .03 * N(t, 1)], at: [.03 + .04 * N(t, 3), .42 + .36 * l + .03 * N(t, 4), -.15], fov: 47, ap: .05, focus: 3.2, roll: .012 * N(t, 5) }; },
    uni: t => { const z = t < 1.4 || t > 2.75 ? 1 : 0, q = t > 2.35 ? .25 * Math.exp(-(t - 2.35) * 9) * cos((t - 2.35) * 28) : t > 1.36 && t < 1.5 ? .25 * sin(PI * seg(t, 1.36, 1.5)) : 0; const j = t > 1.1 && t < 1.35 ? .02 * Math.exp(-(t - 1.1) * 14) * sin((t - 1.1) * 90) : 0; return [[by(t), q, z, t], [toast(t), j, t > 1.1 && t < 1.75 ? 1.2 * sin(PI * seg(t, 1.1, 1.75)) * .3 : 0, 0]]; },
    glsl: `
vec3 EC = vec3(-.32, 0., .42);
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.); d = un(d, vec2(p.z + 3.4, 2.));
  // Window frame in the wall.
  vec3 w = p - vec3(-.9, 2.1, -3.3); d = un(d, vec2(max(abs(box2(w.xy, vec2(1., .9))) - .07, abs(w.z) - .06), 3.)); d = un(d, vec2(box(w, vec3(.03, .9, .04), .01), 3.));
  // Toaster, and toast.
  vec3 t = p - vec3(.72 , .36 + U[1].y, -.75); t.xz *= rot(.35); float to = box(t, vec3(.52, .34, .28), .15); vec3 sl = t - vec3(0, .3, 0); sl.z = abs(sl.z) - .1; to = max(to, -box(sl, vec3(.36, .2, .045), .02)); d = un(d, vec2(to, 4.)); d = un(d, vec2(box(t - vec3(.56, .05 - .08 * step(U[0].w, 1.1), 0), vec3(.06, .035, .05), .02), 5.));
  vec3 b = t - vec3(0, .12 + U[1].x, .1); b.xy *= rot(U[1].z); d = un(d, vec2(ext(box2(b.xy - vec2(0, .0), vec2(.22, .2)) - .08, b.z, .035, .015), 6.)); b = t - vec3(0, .10 + U[1].x * .86, -.1); b.xy *= rot(-U[1].z); d = un(d, vec2(ext(box2(b.xy, vec2(.22, .2)) - .08, b.z, .035, .015), 6.));
  // Egg cup, mug, plate, spoon.
  vec3 e = p - EC; d = un(d, vec2(smax(abs(sph(e - vec3(0, .42, 0), .30)) - .03, e.y - .40, .02), 7.)); d = un(d, vec2(smin(cyl(e - vec3(0, .02, 0), .02, .2, .02), cone(e - vec3(0, .1, 0), .09, .12, .06, .01), .06), 7.));
  vec3 m_ = p - vec3(-1.25, .3, -.35); float mg = max(abs(cyl(m_, .3, .29, .02)) - .025, m_.y - .28); vec3 hd = m_ - vec3(-.32, 0, .05); mg = min(mg, tor(hd.xzy, .16, .04)); d = un(d, vec2(mg, 8.)); d = un(d, vec2(cyl(m_ - vec3(0, .02, 0), .2, .27, .01), 9.));
  vec3 pl = p - vec3(.62, .03, .55); d = un(d, vec2(max(abs(length(pl - vec3(0, 2.2, 0)) - 2.21) - .02, length(pl.xz) - .56), 7.));
  float y = U[0].x; vec4 B = vec4(EC + vec3(0, .43 + y - .25 * U[0].y * step(y, .01) * .5, 0), .25); d = un(d, vec2(bal(p, B, U[0].y), 10.));
  vec3 ey = p - B.xyz - vec3(0, .06 * (1. - U[0].y), .222); ey.x = abs(ey.x) - .075; d = un(d, vec2(ell(ey, vec3(.028, U[0].z > .5 ? .008 : .042, .03)), 11.));
  return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { vec3 q = p; float g = fbm(vec3(q.x * 1.2, 0., q.z * 14.)); m.c = mix(vec3(.50, .27, .12), vec3(.68, .42, .21), g); if (fract(q.z * .9 + .2) < .012) m.c *= .4; m.r = .35; m.coat = .3; }
  else if (id < 2.5) { m.c = vec3(.50, .62, .60); m.r = .9; vec2 w = abs(p.xy - vec2(-.9, 2.1)); if (w.x < 1. && w.y < .9) { m.c = vec3(0); m.e = mix(vec3(1., .72, .42), vec3(.75, .86, 1.), smoothstep(1.4, 2.9, p.y)) * 1.5; } } else if (id < 3.5) m.c = vec3(.85, .82, .76);
  else if (id < 4.5) { m.c = vec3(.75, .22, .18); m.r = .25; m.coat = .7; } else if (id < 5.5) { m.c = vec3(.05); m.r = .4; } else if (id < 6.5) { m.c = mix(vec3(.75, .48, .2), vec3(.42, .2, .06), fbm(p * 9.)); m.r = .9; n = bump(n, p, 40., .2); } else if (id < 7.5) { m.c = vec3(.86, .86, .82); m.r = .25; m.coat = .5; } else if (id < 8.5) { m.c = vec3(.16, .30, .48); m.r = .3; m.coat = .5; } else if (id < 9.5) { m.c = vec3(.10, .045, .02); m.r = .1; m.coat = .7; } else if (id < 10.5) ballM(m); else { m.c = vec3(.01); m.r = .2; } }
vec3 sky(vec3 d) { return vec3(.55, .60, .66) * .5; }`,
    over(c) { const s = 'POV: Monday, 7:00'; c.font = '700 33px Inter'; c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = 'rgba(20,12,8,.85)'; c.textAlign = 'center'; c.letterSpacing = '-.6px'; c.strokeText(s, 240, 66); txt(c, s, 240, 66, '700 33px Inter', '#fff', 'center', '-.6px'); },
  });
}
