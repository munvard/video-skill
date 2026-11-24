// Screen cinema: a lit display in a dark room. The camera goes where the cursor acts, then waits. One click on "Jump",
// and the ball in the preview jumps. Interface drawn here, belongs to no real product.
{
  const D = 4, click = 1.35, W = 1200, H = 750;
  const go = t => E.io5(seg(t, .35, 1.2)), side = t => E.io5(seg(t, 1.55, 2.15)), home = t => E.io5(seg(t, 3.15, 3.95));
  const ui = (c, t) => {
    c.fillStyle = '#1B1F28'; c.fillRect(0, 0, W, H); c.fillStyle = '#2A303C'; c.fillRect(0, 0, 330, H);
    txt(c, 'Ball', 48, 96, '700 46px Inter', '#F3F1EC', 'left', '-1px');
    [['Size', .42], ['Height', .78]].forEach(([n, v], i) => { const y = 190 + i * 120; txt(c, n, 48, y, '500 27px Inter', '#8D93A1', 'left'); c.fillStyle = '#454D5E'; rr(c, 48, y + 26, 234, 10, 5); c.fill(); c.fillStyle = '#D8DBE2'; rr(c, 48, y + 26, 234 * v, 10, 5); c.fill(); circle(c, 48 + 234 * v, y + 31, 15); c.fill(); });
    const pr = seg(t, click - .06, click) * (1 - seg(t, click + .1, click + .25)), hov = seg(t, 1.0, 1.1) * (1 - seg(t, 2.2, 2.4));
    c.save(); c.translate(165, 510); c.scale(1 - .05 * pr, 1 - .05 * pr); c.fillStyle = mix('#E8590C', '#FF7A2E', hov); rr(c, -117, -44, 234, 88, 22); c.fill(); txt(c, 'Jump', 0, 13, '650 37px Inter', '#FFF', 'center'); c.restore();
    c.fillStyle = '#23262E'; rr(c, 372, 42, 786, 666, 30); c.fill(); c.save(); rr(c, 372, 42, 786, 666, 30); c.clip();
    const g = c.createLinearGradient(0, 42, 0, 708); g.addColorStop(0, '#3A2A5E'); g.addColorStop(.62, '#C85A54'); g.addColorStop(.75, '#F2A65A'); c.fillStyle = g; c.fillRect(372, 42, 786, 666); c.fillStyle = '#2A1D3E'; c.fillRect(372, 560, 786, 148);
    const y = hopY(t, 1.5, 2.15, 330) + hopY(t, 2.15, 2.5, 80), q = (t > click && t < 1.5 ? .3 * sin(PI * seg(t, click, 1.5) * .9) : 0) + (t > 2.15 ? .25 * Math.exp(-(t - 2.15) * 8) * cos((t - 2.15) * 26) : 0);
    c.fillStyle = `rgba(0,0,0,${.35 * (1 - y / 420)})`; c.beginPath(); c.ellipse(765, 602, 88 * (1 - y / 700), 17, 0, 0, TAU); c.fill(); ball(c, 765, 596 - 82 * (1 - q) - y, 82, { sx: 1 + q * .6, sy: 1 - q, lit: 1 }); c.restore();
    const k = E.io5(seg(t, .3, 1.1)), b = E.io5(seg(t, 2.7, 3.6)); let cx = lerp(720, 205, k), cy = lerp(330, 528, k); cx = lerp(cx, 720, b); cy = lerp(cy, 330, b); c.save(); c.translate(cx, cy); c.scale(1.75 * (1 - .1 * pr), 1.75 * (1 - .1 * pr)); poly(c, [[0, 0], [0, 25], [6, 19.5], [10, 28.5], [14.4, 26.6], [10.5, 18], [18.4, 18]]); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#111'; c.stroke(); c.restore();
  };
  ray({
    dur: D, spp: 52, bounces: 3, exposure: 1.1, bloom: .22, vig: .45, shutter: .4, tmax: 30,
    lights: () => [{ p: [-4.5, 3.5, -1.5], at: [0, 1, -1], s: [1.2, 3], c: [.35, .5, 1], k: 26 }, { p: [3.6, 2.8, 3.4], at: [0, .8, 0], s: [1.5, 1.5], c: [1, .75, .5], k: 14 }],
    cam: t => { const a = go(t), b = side(t), h = home(t); let p = V.mix([1.5, 1.75, 5.2], [-1.75, 1.35, 2.35], a), at = V.mix([0, 1.33, 0], [-1.05, 1.06, 0], a); p = V.mix(p, [1.3, 1.5, 2.9], b); at = V.mix(at, [.42, 1.28, 0], b); p = V.mix(p, [1.5, 1.75, 5.2], h); at = V.mix(at, [0, 1.33, 0], h); return { p, at, fov: 34, ap: .055, focus: Math.hypot(...V.sub(at, p)), roll: 0 }; },
    uni: t => [[t, 0, 0, 0]],
    tex: { w: W, h: H, draw: ui },
    glsl: `
vec2 map(vec3 p) { vec2 d = vec2(p.y, 1.); vec3 q = p - vec3(0, 1.4, 0); d = un(d, vec2(box(q, vec3(1.64, 1.04, .045), .04), 2.)); d = un(d, vec2(box(p - vec3(0, .25, -.14), vec3(.12, .34, .05), .03), 4.)); d = un(d, vec2(cyl(p - vec3(0, .02, -.1), .02, .5, .012), 4.)); d = un(d, vec2(p.z + 2.6, 5.));
  d = un(d, vec2(sph(p - vec3(2.15, .17, .7), .17), 10.)); d = un(d, vec2(cyl(p - vec3(-2.1, .25, .2), .25, .2, .03), 6.)); return d; }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  if (id < 1.5) { m.c = vec3(.05, .035, .03) * (.8 + .4 * fbm(p * vec3(1., 1., 9.))); m.r = .2; m.coat = .7; }
  else if (id < 2.5) { m.c = vec3(.01); m.r = .25; m.coat = .4; vec2 uv = (p.xy - vec2(0, 1.4)) / vec2(3.2, 2.) + .5; if (p.z > .03 && uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1.) { vec3 c = texture(uTex, uv).rgb; m.e = pow(c, vec3(2.2)) * .95; m.r = .12; } }
  else if (id < 4.5) { m.c = vec3(.5); m.m = 1.; m.r = .3; } else if (id < 5.5) { m.c = vec3(.13, .14, .18); m.r = .9; } else if (id < 6.5) { m.c = vec3(.1, .13, .16); m.r = .35; m.coat = .4; } else ballM(m); }
vec3 sky(vec3 d) { return vec3(.01, .012, .018); }`,
  });
}
