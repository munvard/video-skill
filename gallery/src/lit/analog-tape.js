// Analog tape: a family camera in a night room catches the ball lifting itself off the carpet. Handheld, tungsten, a
// tape pass over the lit picture: color smear, line noise, a tracking band that comes by once, timecode.
{
  const D = 4, up = t => E.io(seg(t, .7, 1.9)) * (1 - E.in3(seg(t, 2.75, 3.1))) + (t > 3.1 ? 0 : 0);
  const N = (t, s) => sin(TAU * t / D * 2 + s) * .5 + sin(TAU * t / D * 3 + s * 2.1) * .3 + sin(TAU * t / D * 7 + s * 3.7) * .12;
  ray({
    dur: D, fps: 20, spp: 40, bounces: 3, exposure: 1.5, bloom: .25, vig: .4, shutter: .8, sat: 1.05,
    lights: () => [{ p: [1.55, 1.62, -1.25], at: [1.2, 0, -.6], s: [.5, .5], c: [1, .6, .25], k: 16 }, { p: [-3.2, 2.6, -2.2], at: [0, .4, 0], s: [1.4, 1.6], c: [.25, .4, 1], k: 9 }, { p: [-.6, 2.2, 3.6], at: [0, .4, 0], s: [.5, .5], c: [1, .9, .75], k: 22 }],
    cam: t => { const z = E.io(seg(t, 1.5, 2.2)) * (1 - E.io(seg(t, 3.2, 3.9))), e = t > 2.95 && t < 3.4 ? .05 * Math.exp(-(t - 2.95) * 7) * sin((t - 2.95) * 40) : 0; return { p: [.1 + .05 * N(t, 1), 1.0 + .04 * N(t, 2), 4.6], at: [.03 + .06 * N(t, 4), .62 + .3 * up(t) * .8 + .05 * N(t, 5) + e, 0], fov: 38 - 10 * z, ap: .03, focus: 4.6 + .4 * sin(TAU * t / D * 2) * seg(t, 1.4, 1.6) * (1 - seg(t, 2.4, 2.6)), roll: .02 * N(t, 3) }; },
    uni: t => { const u = up(t), b = t > 3.1 ? hopY(t, 3.1, 3.4, .2) + hopY(t, 3.4, 3.58, .06) : 0; return [[u * 1.05 + b + (u > .9 ? .05 * sin((t - 1.9) * 9) : 0), u, (t > 3.1 && t < 3.25 ? .2 * sin(PI * seg(t, 3.08, 3.25)) : 0), 0]]; },
    glsl: `
vec2 map(vec3 p) {
  vec2 d = vec2(p.y - .015 * vn(p * 30.), 1.); d = un(d, vec2(p.z + 2.3, 2.));
  vec3 s = p - vec3(-1.35, .0, -1.5); float so = box(s - vec3(0, .3, 0), vec3(1.0, .28, .5), .1); so = min(so, box(s - vec3(0, .75, -.42), vec3(1.0, .5, .16), .12)); so = min(so, box(s - vec3(.95, .45, 0), vec3(.16, .42, .52), .12)); d = un(d, vec2(so, 3.));
  vec3 l = p - vec3(1.6, 0, -1.5); d = un(d, vec2(cyl(l - vec3(0, .3, 0), .3, .42, .03), 4.)); d = un(d, vec2(cyl(l - vec3(0, .9, 0), .3, .035, .01), 5.)); d = un(d, vec2(max(abs(cone(l - vec3(0, 1.42, 0), .27, .42, .26, .0)) - .01, abs(l.y - 1.42) - .26), 6.));
  d = un(d, vec2(max(abs(length(p.xz * vec2(1., 1.25) - vec2(0, .2)) - .0) - 1.5, abs(p.y) - .03), 7.));
  d = un(d, vec2(box(p - vec3(-.9, 1.75, -2.28), vec3(.42, .3, .03), .01), 8.));
  return un(d, vec2(bal(p, vec4(0, U[0].x + .36 * (1. - U[0].z) + .02, .2, .36), U[0].z), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .9; if (id < 1.5) { m.c = vec3(.22, .12, .07) * (.6 + .8 * vn(p * 40.)); } else if (id < 2.5) { m.c = vec3(.36, .28, .18); if (fract(p.x * 3.2) < .12) m.c *= .8; } else if (id < 3.5) { m.c = vec3(.08, .20, .13); n = bump(n, p, 40., .2); } else if (id < 4.5) { m.c = vec3(.25, .11, .05); m.r = .4; } else if (id < 5.5) { m.c = vec3(.7, .5, .2); m.m = 1.; m.r = .3; } else if (id < 6.5) { m.c = vec3(.8, .6, .35); m.e = vec3(1., .55, .2) * 2.2; } else if (id < 7.5) { float r = length(p.xz * vec2(1., 1.25) - vec2(0, .2)); m.c = fract(r * 2.6) < .5 ? vec3(.45, .10, .07) : vec3(.52, .40, .22); m.c *= .7 + .5 * vn(p * 45.); } else if (id < 8.5) { m.c = abs(p.x + .9) > .36 || abs(p.y - 1.75) > .24 ? vec3(.3, .16, .06) : mix(vec3(.15, .25, .3), vec3(.5, .4, .2), step(1.7, p.y)); m.r = .3; } else ballM(m); }
vec3 sky(vec3 d) { return vec3(.02, .025, .05); }`,
    post(im, i, t) {
      const { data: d, width: W, height: H } = im, o = new Float32Array(d), rnd = rng(900 + i), band = ((t / D) * 1.9 - .5) * H;
      for (let y = 0; y < H; y++) {
        const near = Math.max(0, 1 - Math.abs(y - band) / 26), ln = y >> 1, wob = Math.round(1.2 * sin(y * .05 + t * TAU) + near * 16 * sin(y * .9 + i) + (y > H - 13 ? 10 + 6 * hash(ln, i) : 0)), nz = (hash(ln, i) - .5) * 9;
        let cr = 0, cb = 0, Y0 = 0;
        for (let x = 0; x < W; x++) {
          const p = (y * W + Math.min(W - 1, Math.max(0, x - wob))) * 4, p2 = (y * W + Math.min(W - 1, Math.max(0, x - wob - 7))) * 4, R = o[p], G = o[p + 1], B = o[p + 2], Yr = .3 * R + .59 * G + .11 * B; Y0 += (Yr - Y0) * .55;
          const Yc = .3 * o[p2] + .59 * o[p2 + 1] + .11 * o[p2 + 2]; cr += (o[p2] - Yc - cr) * .09; cb += (o[p2 + 2] - Yc - cb) * .09;
          const Ys = Yr + (Yr - Y0) * .7 + nz + (hash(x >> 2, ln * 7 + i * 131) - .5) * 7 + (near > .3 && hash(x >> 4, ln * 3 + i * 17) > .86 ? 70 * near : 0), k = y % 2 ? .95 : 1.02, q = (y * W + x) * 4;
          d[q] = (Ys * .94 + 9 + cr * 1.15) * k; d[q + 1] = (Ys * .94 + 8 - cr * .5 - cb * .2) * k; d[q + 2] = (Ys * .9 + 15 + cb * 1.1) * k;
        }
      } void rnd;
    },
    over(c, t, i) { c.filter = 'blur(.5px)'; const f = i % 20; txt(c, '23:41:' + (12 + floor(i / 20)) + ':' + String(f).padStart(2, '0'), 34, 442, '700 25px Mono', 'rgba(244,240,226,.92)', 'left'); if (i % 20 < 12) { circle(c, 46, 47, 9); c.fillStyle = '#E9402E'; c.fill(); } txt(c, 'REC', 64, 56, '700 25px Mono', 'rgba(244,240,226,.92)', 'left'); },
  });
}
