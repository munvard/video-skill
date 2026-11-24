// Cutaway: a machine cut open, each part colored by its job. The ball travels the whole path (drop, turn, lift) and comes
// back to the start, so the diagram is also a perpetual machine. One word per stage, the cut face is flat and bright.
{
  const D = 4, S = 512; // the front plane, 4.2 world units wide
  // Path in world units: funnel, two ramps, wheel, lift.
  const P = [[-.95, 1.5], [-.95, 1.06], [.62, .66], [.72, .46], [-.72, .10], [-.86, -.10], [-.86, -.42], [-.6, -.78], [.25, -1.02], [1.22, -1.02], [1.22, 1.32], [1.1, 1.62], [.6, 1.86], [-.1, 1.96], [-.7, 1.86], [-.95, 1.5]];
  const T = [0, .20, .72, .82, 1.32, 1.42, 1.55, 1.85, 2.15, 2.45, 3.3, 3.42, 3.58, 3.74, 3.88, 4];
  const at = t => { let i = 0; while (i < T.length - 2 && T[i + 1] <= t) i++; const v = seg(t, T[i], T[i + 1]), e = i === 0 ? v * v : i === 1 || i === 3 ? v * v * .4 + v * .6 : v; return [lerp(P[i][0], P[i + 1][0], e), lerp(P[i][1], P[i + 1][1], e)]; };
  const px = ([x, y]) => [(x / 4.8 + .5) * S, (.5 - (y - .42) / 4.8) * S];
  ray({
    dur: D, fps: 20, spp: 52, bounces: 3, steps: 130, stepk: .75, exposure: 1.1, bloom: .05, vig: .2, shutter: .5, sat: 1.12,
    lights: () => [{ p: [-2.8, 4.6, 4.2], at: [0, .3, 0], s: [1.8, 1.8], c: [1, .95, .86], k: 21 }, { p: [3.8, 1.4, 3], at: [0, .3, 0], s: [1.2, 3], c: [.7, .84, 1], k: 5 }],
    cam: t => ({ p: [1.35, 1.2, 7.6], at: [0, .38, -.2], fov: 32, ap: .03, focus: 7.6 }),
    uni: t => { const p = at(t), w = E.io(seg(t, 1.5, 2.1)) ; return [[p[0], p[1], TAU / 3 * (t / D * 3 * 1), 0], [((t - 2.45) / .85), w, t, 0]]; },
    sdf: { w: S, h: S, draw(c) { c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = .40 / 4.8 * S; c.beginPath(); P.slice(0, 11).forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](...px(p))); c.stroke(); c.beginPath(); c.moveTo(...px([1.22, 1.3])); c.lineTo(...px([1.22, 2.2])); c.stroke(); poly(c, [px([-1.45, 1.95]), px([-.45, 1.95]), px([-.76, 1.3]), px([-1.14, 1.3])]); c.fill(); const w = px([-.35, -.70]); circle(c, w[0], w[1], .56 / 4.8 * S); c.fill(); } },
    glsl: `
float chan(vec2 p) { return sdTex(vec2(p.x, p.y - .42) / 4.8 + .5) * 4.8; }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y + 1.75, 1.); d = un(d, vec2(p.z + 3.2, 1.));
  vec3 q = p - vec3(0, .12, -.55); float body = box(q, vec3(1.75, 1.68, .58), .16); body = max(body, p.z - .0);
  float c = chan(p.xy); float cut = max(-c * 1., 0.); cut = smax(body, -max(c, -(p.z + .44)), .02); d = un(d, vec2(cut, 2.));
  // Liner of the channels: a thin bright skin.
  float ln = max(max(abs(c - .0) - .022, abs(p.z + .21) - .24), box(q, vec3(1.9, 1.9, .9), .1)); ln = max(ln, p.y - 1.8); d = un(d, vec2(ln, 3.));
  // Wheel.
  vec3 w = p - vec3(-.35, -.70, -.22); w.xy *= rot(U[1].z * 1.5708 * 1.3333); float a = atan(w.y, w.x), s = 6.28319 / 6., b = mod(a, s) - s * .5; vec2 r = length(w.xy) * vec2(cos(b), sin(b)); float wh = max(min(length(w.xy) - .15, max(box2(r - vec2(.27, 0), vec2(.15, .028)), -1.)), abs(w.z) - .13); d = un(d, vec2(wh - .01, 4.));
  d = un(d, vec2(max(length(w.xy) - .07, abs(w.z) - .22), 5.));
  // Lift: cups on a belt.
  if (p.x > .8) { float y = p.y + U[1].z * -.0; float sp = .82, v = mod(p.y - U[1].y * 0. - (2.34 / .85) * (U[1].z - 2.45) + .2 + 1.02 + .41, sp) - .41; vec3 l = vec3(p.x - 1.22, v, p.z + .22); float cu = max(max(abs(length(l.xy) - .20) - .02, l.y - .02), abs(l.z) - .15); cu = max(cu, abs(p.y - .2) - 1.75); d = un(d, vec2(cu, 6.)); d = un(d, vec2(max(abs(p.x - 1.22) - .03, max(abs(p.z + .41) - .02, abs(p.y - .1) - 1.5)), 7.)); }
  // Feet, pipe at the top from the lift to the funnel.
  vec3 f = p; f.x = abs(f.x) - 1.3; d = un(d, vec2(cyl(f - vec3(0, -1.64, -.6), .12, .16, .03), 5.));
  return un(d, vec2(sph(p - vec3(U[0].xy, -.20), .165), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .5; if (id < 1.5) { m.c = vec3(.78, .70, .60); m.r = .8; }
  else if (id < 2.5) { float c = chan(p.xy); if (p.z > -.012) { m.c = vec3(.95, .90, .80); m.r = .6; float h = fract((p.x + p.y) * 7.); m.c *= h < .10 ? .86 : 1.; } else if (c < .03) { m.c = p.x > .85 ? vec3(.10, .34, .50) : p.y > 1.2 ? vec3(.75, .50, .08) : p.y > -.3 ? vec3(.55, .16, .20) : vec3(.10, .38, .32); m.r = .6; } else { m.c = vec3(.10, .15, .22); m.coat = .4; m.r = .35; } }
  else if (id < 3.5) { m.c = p.x > .85 ? vec3(.12, .48, .75) : p.y > 1.2 ? vec3(.95, .65, .08) : p.y > -.3 ? vec3(.85, .20, .26) : vec3(.10, .58, .46); m.r = .35; } else if (id < 4.5) { m.c = vec3(.06, .30, .26); m.r = .35; m.coat = .4; } else if (id < 5.5) { m.c = vec3(.7); m.m = 1.; m.r = .25; } else if (id < 6.5) { m.c = vec3(.10, .30, .48); m.coat = .4; } else if (id < 7.5) m.c = vec3(.03); else ballM(m); }
vec3 sky(vec3 d) { return vec3(.80, .78, .74) * .8; }`,
    over(c, t) { [['drop', .15, 1.4], ['turn', 1.5, 2.35], ['lift', 2.5, 3.75]].forEach(([w, a, b]) => { const k = E.io(seg(t, a, a + .18)) * (1 - E.io(seg(t, b - .18, b))); if (k) { c.globalAlpha = k; txt(c, w, 34, 64, '700 42px Inter', '#1B2735', 'left', '-1.2px'); } }); },
  });
}
