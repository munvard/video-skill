// Hero: one ball, one move, eight worlds. The camera never stops being one camera. Every world is left through a round
// opening, and the last one is the counter of the "o": the ball is the dot of the "i" first, then it jumps through.
{
  const T = 10, LEN = 35, P = 4, SH = 7.15, XH = 1.3, S = 160; // S = canvas pixels per world unit
  const bump = t => E.io(seg(t, 5.75, 6.95)) * (1 - E.io(seg(t, 8.3, 9.4)));
  const N = 4000, cum = [0]; for (let i = 0; i < N; i++) cum.push(cum[i] + (1 - .975 * bump((i + .5) / N * T)));
  const lzRaw = t => { const u = t / T * N, i = Math.min(N - 1, Math.max(0, floor(u))); return lerp(cum[i], cum[i + 1], u - i) / cum[N] * LEN; };
  const camLz = t => { const n = floor(t / T); return n * LEN + lzRaw(t - n * T); };
  const inv = z => { let a = -T, b = 2 * T; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; camLz(m) < z ? a = m : b = m; } return (a + b) / 2; };
  let IX = 0, OX = 0, IY = 0; const R = .235;
  let KEYS;
  const keys = () => {
    if (KEYS) return KEYS; const K = []; const X = k => .42 * [0, -1, .8, -.6, 1, -.9, .5][k];
    for (let k = 0; k < 7; k++) K.push([inv(4 * k + 2 - 2.6), k ? X(k) : 0, 0, 4 * k + 2]);
    K.push([K[6][0] + .9, -.6, 0, 30]); K.push([7.02, IX, IY, 34.32]); K.push([8.3, IX, IY, 34.32, 1]); K.push([8.98, OX - .02, 0, 33.4]);
    const first = K.map(k => k.slice()), w = (d) => first.map(k => [k[0] + d * T, k[1], k[2], k[3] + d * LEN, k[4]]); KEYS = [...w(-1), ...w(0), ...w(1)]; return KEYS;
  };
  const ballAt = t => {
    const K = keys(); let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++; const a = K[i], b = K[i + 1], dt = b[0] - a[0], u = clamp((t - a[0]) / dt); let y, q = 0;
    const still = b[4]; if (still) { y = a[2]; } else { const through = a[3] % LEN > 33 && a[3] % LEN < 34; const h = through ? .44 : a[2] > .5 ? .42 : b[2] > .5 ? 1.0 : clamp(1.05 * (dt / .9) ** 2, .5, 1.15); y = lerp(a[2], b[2], u) + h * 4 * u * (1 - u) * (a[2] === b[2] ? 1 : 1); }
    const pre = still ? 0 : 1; q += t - a[0] < .5 ? (still ? .20 : .20) * Math.exp(-(t - a[0]) * 13) * cos((t - a[0]) * 30) * (a[4] ? 0 : 1) : 0; const nx = b[0] - t; if (nx < .16 && b[4]) q += .22 * sin(PI * (1 - nx / .16)) * 1; void pre;
    const ga = a[3] % LEN, thru = !still && ga > 33 && ga < 34; return [lerp(a[1], b[1], thru ? E.io(seg(u, .5, 1)) : u), y + R * (1 - q), lerp(a[3], b[3], u), q];
  };
  const path = (z, a, b, c, d) => { let l = ((z % LEN) + LEN) % LEN; if (l < 20) l += LEN; const k = E.io(seg(l, a, b)) * (1 - E.io(seg(l, c, d))); return [OX * k, lerp(1.18, XH / 2, k)]; };
  // two lights per world: [x, y, dz, w, h, color, power]
  const LT = [[[-2.6, 4.2, -.6, 1.8, 1.8, [1, .86, .66], 20], [2.8, 2.4, 1, .8, 2, [.7, .85, 1], 5]], [[0, 4.4, 0, 2.5, 2.5, [.45, .68, 1], 13], [2.8, 1.6, .8, .6, 2, [.6, .8, 1], 8]], [[-2.4, 4.0, .4, 1.6, 1.6, [1, .84, .62], 24], [2.8, 2, 0, .8, 2, [1, .6, .5], 6]], [[2.2, 4.4, -.4, 1.4, 1.4, [1, .95, .85], 30], [-2.8, 2, .5, 1, 2, [.6, .75, 1], 6]], [[-2.6, 2.6, .9, .5, 2.6, [1, .30, .45], 24], [2.7, 2.2, -.2, .5, 2.8, [.15, .65, 1], 24]], [[-2, 4.6, -.4, 2.4, 2, [1, .97, .9], 18], [2.8, 2.4, .6, 1, 2, [1, .8, .7], 6]], [[-2.8, 3.4, .6, 1.2, 1.2, [1, .55, .3], 18], [2.6, 3.4, -.4, 1.4, 2, [.28, .34, 1], 16]], [[-3.2, 5.2, -2.2, 2.4, 2.4, [1, .95, .88], 30], [3.6, 3.2, -1.6, 1.4, 2.6, [.85, .92, 1], 9]]];
  const ctr = w => w < 7 ? 4 * w + 2 : 31.5;
  const font = '640 ' + 380 + 'px Inter';
  ray({
    dur: T, fps: 20, w: 1280, h: 640, spp: 104, bounces: 3, steps: 120, stepk: .85, tmax: 34, exposure: 1.12, bloom: .12, vig: .28, shutter: .45, sat: 1.08, clampv: 4, dn: 1.1,
    lights: t0 => {
      const t = t0 + SH, z = camLz(t) + .02, n = floor(z / LEN), l = z - n * LEN, w = Math.min(7, floor(l / P)), pr = w < 7 ? (l - 4 * w) / 4 : (l - 28) / 7, L = [];
      for (let k = 0; k < 3; k++) { const ww = w + k, m = ww % 8, c = n * LEN + (ww >= 8 ? LEN : 0) + ctr(m), f = k === 0 ? 1 - .0 * pr : k === 1 ? 1 : E.io(seg(pr, 0, .55)); LT[m].slice(0, k < 2 ? 2 : 1).forEach(q => L.push({ p: [q[0] + (ww >= 8 ? 0 : 0), q[1], -(c + q[2])], at: [m === 7 ? .3 : 0, .5, -(c + (m === 7 ? 2.2 : 0))], s: [q[3], q[4]], c: q[5], k: q[6] * f })); }
      return L;
    },
    cam: t0 => {
      const t = t0 + SH, z = camLz(t), a = path(z, 30.2, 33.9, 35.5, 38.6), b = path(z, 29.7, 32.6, 33.9, 37), br = bump(t); const p = [a[0] + .0, a[1] + .02 * sin(TAU * t0 / T * 2), -z], at = [lerp(b[0], .0, 0) + .0, b[1] + .02, -(z + 3)]; void br; const bl = ballAt(t); return { p, at, fov: 41, ap: .022, focus: clamp(bl[2] - z, 1.4, 5.1) };
    },
    uni: t0 => { const t = t0 + SH, b = ballAt(t), z = camLz(t); let lk = -9; const K = keys(); let d = 9, kx = 0, kz = 0; for (const k of K) if (t >= k[0] && t - k[0] < d) { d = t - k[0]; kx = k[1]; kz = k[3]; } void lk; return [[b[0], b[1], -b[2], b[3]], [OX, XH / 2, .385, t0 / T], [kx, -kz, d, 0], [z, 0, 0, 0]]; },
    sdf: { w: 1024, h: 512, draw(c) { c.font = font; c.letterSpacing = '0px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; const base = 448, gap = 26, parts = ['v', 'ı', 'd', 'e'], ro = XH / 2 * S + 3, w = parts.map(s => c.measureText(s).width), tot = w.reduce((a, b) => a + b, 0) + ro * 2 + gap - 10; let x = (1024 - tot) / 2; parts.forEach((s, i) => { c.fillText(s, x, base); if (i === 1) IX = (x + w[1] / 2 - 512) / S; x += w[i]; }); const ox = x + 8 + ro; c.beginPath(); c.arc(ox, base - ro + 3, ro, 0, TAU); c.arc(ox, base - ro + 3, .385 * S, 0, TAU, true); c.fill(); OX = (ox - 512) / S; IY = XH + .015; } },
    glsl: `
float gW;
void where(vec3 p, out float w, out vec3 q, out float bd) { float l = mod(-p.z, 35.); w = min(floor(l / 4.), 7.); float c = w < 6.5 ? 4. * w + 2. : 31.5; q = vec3(p.x, p.y, l - c); bd = (w < 6.5 ? 2. : 3.5) - abs(q.z); }
float edges(vec3 p, vec3 b) { p = abs(p) - b; vec3 q = abs(p + .012) - .012; return min(min(length(max(vec3(p.x, q.y, q.z), 0.)), length(max(vec3(q.x, p.y, q.z), 0.))), length(max(vec3(q.x, q.y, p.z), 0.))) - .012; }
vec2 map(vec3 p) {
  float w, bd; vec3 q; where(p, w, q, bd); gW = w; vec2 d = vec2(p.y, w);
  bool isO = (w > 6.5 && q.z > 0.) || (w < .5 && q.z < 0.); float hole = isO ? length(p.xy - U[1].xy) - U[1].z : length(p.xy - vec2(0, 1.18)) - 1.0;
  float wall = smax(bd > 0. ? .07 - 0. + (bd - .14) : 0., -hole, .03); wall = smax(bd - .09, -hole, .03); vec2 dw = vec2(wall, 10. + w);
  if (!isO) dw = un(dw, vec2(length(vec2(hole + .0, bd - .05)) - .055, 20. + w));
  float sx = sign(q.x), ax = abs(q.x);
  if (w < .5) { // paper
    for (int i = 0; i < 3; i++) { float f = float(i); vec3 h = q - vec3(sx * (2.3 + .2 * f) + 1.75 * step(0., sx), 0., -.7 + f * .75); float e = length(h.xy * vec2(1., .9 + .12 * f)) - (1.05 + .22 * f); d = un(d, vec2(max(max(e * .85, abs(h.z) - .035), -p.y), 30. + f + (sx > 0. ? .4 : 0.))); }
    vec3 s = q - vec3(-1.45, 2.75, 1.2); d = un(d, vec2(max(length(s.xy) - .42, abs(s.z) - .03), 34.)); s = q - vec3(1.75, 2.5, .4); d = un(d, vec2(max(min(min(length(s.xy) - .22, length(s.xy - vec2(.28, -.05)) - .18), length(s.xy + vec2(.28, .06)) - .16), abs(s.z) - .03), 35.)); }
  else if (w < 1.5) { // blueprint
    for (int i = 0; i < 2; i++) { float f = float(i); vec3 b = q - vec3(sx * 1.75, .55 + .35 * f, -.55 + 1.15 * f); d = un(d, vec2(edges(b, vec3(.42, .55 + .35 * f, .36)), 36.)); } d = un(d, vec2(tor((q - vec3(0, 2.75, .0)).xzy, .5, .014), 36.)); d = un(d, vec2(tor((q - vec3(0, 2.75, .0)).xzy, .32, .014), 36.)); }
  else if (w < 2.5) { // clay
    vec3 c = q - vec3(sx * 1.65, .72, .35 * sx); float k = smin(ell(c, vec3(.28, .72, .28)), ell(c - vec3(.36 * sx, .12, 0), vec3(.14, .26, .14)), .16); k = smin(k, ell(c + vec3(.34 * sx, -.0, 0), vec3(.13, .22, .13)), .16); d = un(d, vec2(k - .05 * (vn(c * 6.) - .5), 37.)); d = un(d, vec2(sph(c - vec3(0, .8, 0), .12) - .03 * vn(c * 14.), 38.)); for (int i = 0; i < 3; i++) { float f = float(i); d = un(d, vec2(sph(q - vec3(sx * (.95 + .22 * f), .1 + .02 * f, -.9 + .42 * f), .12 + .03 * f) - .03 * vn(q * 14.), 39.)); } }
  else if (w < 3.5) { // blocks
    vec2 g = floor(q.xz / .34) + .5; float r = abs(g.x) * .34; float hh = r < .85 ? 0. : floor((.2 + 1.2 * h21(g + 4.)) * smoothstep(.7, 2.4, r) * 4.) * .17 * 1.; hh = min(hh, 1.2); vec3 b = vec3(q.x - g.x * .34, q.y - hh * .5, q.z - g.y * .34); float e = box(b, vec3(.165, hh * .5 + .001, .165), .012); d = un(d, vec2(min(e, .2), 40.)); d.x = min(d.x, max(.06, .17 - max(abs(b.x), abs(b.z)) + .03 + .0)); if (p.y > 1.35) d = vec2(min(p.y - 1.2, max(p.y - 1.2, .06)), 40.); vec3 cl = q - vec3(sx * 1.7, 2.5, .2); d = un(d, vec2(min(box(cl, vec3(.5, .14, .24), .01), box(cl - vec3(.1, .2, 0), vec3(.26, .12, .2), .01)), 41.)); }
  else if (w < 4.5) { // night mirror with rings of light
    for (int i = 0; i < 3; i++) { float f = float(i); vec3 r = q - vec3(sx * (1.6 + .25 * f), .75 + .55 * f, -.8 + .8 * f); r.xz *= rot(.6 * sx); d = un(d, vec2(tor(r.xzy, .42 + .08 * f, .022), 42. + (sx > 0. ? .4 : 0.))); } }
  else if (w < 5.5) { // print
    vec3 b = q - vec3(sx * 1.8, 0., .2); b.xz *= rot(.5 * sx); d = un(d, vec2(cone(b - vec3(0, .8, 0), .8, .55, .0, .03), 43.)); b = q - vec3(sx * 1.15, .3, -.85); d = un(d, vec2(box(b, vec3(.22, .3, .22), .02), 44.)); b = q - vec3(-sx * 0., 2.75, .5); }
  else if (w < 6.5) { // city at night
    vec2 g = vec2(sx, floor((q.z + 2.) / .8)); vec3 b = vec3(ax - 1.75, q.y, q.z + 2. - (g.y + .5) * .8); float hh = .8 + 1.5 * h21(g + 2.); d = un(d, vec2(box(b - vec3(0, hh * .5, 0), vec3(.42, hh * .5, .33), .02), 45.)); d.x = min(d.x, max(.05, .4 - abs(b.z) + .07)); vec3 b2 = vec3(ax - 2.75, q.y, b.z); d = un(d, vec2(box(b2 - vec3(0, hh * .9, 0), vec3(.42, hh * .9, .34), .02), 46.)); }
  else { // the word
    float s = sdTex(vec2(p.x / 6.4 + .5, (p.y + .4) / 3.2)) * 3.2; float z = abs(q.z - 3.28) - .13; vec2 e = vec2(s, z) + .03; d = un(d, vec2((min(max(e.x, e.y), 0.) + length(max(e, 0.)) - .03) * .9, 47.)); }
  d.x = min(d.x, bd + .22); d = un(d, dw);
  float qz = U[0].w; float b = ell(p - U[0].xyz, .235 * vec3(1. + qz * .6, 1. - qz, 1. + qz * .6)); return un(d, vec2(b, 60.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  float w, bd; vec3 q; where(p, w, q, bd); m.r = .7; float fl = step(id, 7.5), wl = step(9.5, id) * step(id, 17.5), rm = step(19.5, id) * step(id, 27.5);
  if (id > 59.) { ballM(m); return; }
  if (w < .5) { vec3 k = vec3(.90, .82, .66) * (.94 + .1 * fbm(p * 22.)); m.r = 1.; n = bump(n, p, 70., .10); m.c = fl > .5 ? vec3(.78, .62, .42) * (.94 + .1 * fbm(p * 22.)) : wl > .5 ? vec3(.55, .74, .74) * (.95 + .1 * fbm(p * 20.)) : rm > .5 ? k : id < 30.5 ? vec3(.12, .40, .32) : id < 31.5 ? vec3(.80, .52, .16) : id < 32.6 ? vec3(.72, .24, .14) : id < 34.5 ? vec3(1., .70, .16) : vec3(.95, .92, .86); }
  else if (w < 1.5) { m.c = vec3(.015, .06, .22); m.r = .45; vec3 g = abs(fract(p * 2.5 + .5) - .5) / 2.5; float l = fl > .5 ? min(g.x, abs(fract(q.z * 2.5 + .5) - .5) / 2.5) : wl > .5 ? min(g.x, g.y) : 1.; m.e = vec3(.55, .78, 1.) * smoothstep(.012, .002, l) * .22; float r2 = length(p.xz - U[2].xy); float rip = U[2].z < .9 ? smoothstep(.02, .0, abs(r2 - U[2].z * 1.7)) * (1. - U[2].z / .9) : 0.; if (fl > .5) m.e += vec3(1., .6, .35) * rip * 1.2; if (id > 35. || rm > .5) { m.c = vec3(.6); m.e = vec3(.75, .88, 1.) * .9; } }
  else if (w < 2.5) { n = bump(n, p, fl > .5 ? 60. : 22., fl > .5 ? .4 : .16); m.sss = .15; m.c = fl > .5 ? vec3(.09, .26, .24) * (.75 + .5 * fbm(p * 14.)) : wl > .5 ? vec3(.80, .55, .36) : rm > .5 ? vec3(.90, .72, .30) : id < 37.5 ? vec3(.10, .34, .13) : id < 38.5 ? vec3(.9, .3, .36) : vec3(.30, .34, .62); m.c *= .92 + .16 * vn(p * 5.); }
  else if (w < 3.5) { vec2 g = floor(q.xz / .34); float h = h21(g); m.r = .9; m.c = wl > .5 ? vec3(.42, .68, .90) : rm > .5 ? vec3(.95, .85, .4) : id > 40.5 && id < 41.5 ? vec3(.95) : p.y < .02 ? mix(vec3(.80, .62, .30), vec3(.86, .70, .38), h) : p.y < .5 ? mix(vec3(.16, .46, .14), vec3(.24, .56, .16), h) : mix(vec3(.45, .40, .42), vec3(.62, .58, .58), h); if (n.y < .5 && p.y > .04 && p.y < .5 && id > 39. && id < 41.) m.c = vec3(.36, .22, .12); if (wl > .5) m.c *= .94 + .08 * h21(floor(p.xy / .34)); }
  else if (w < 4.5) { m.c = vec3(.02, .02, .03); m.r = fl > .5 ? .09 + .1 * fbm(p * 2.) : .5; m.coat = fl; if (wl > .5) m.c = vec3(.06, .035, .09); if (id > 41.9) m.e = (id > 42.2 ? vec3(.12, .62, 1.) : vec3(1., .25, .42)) * 2.2; if (rm > .5) m.e = vec3(1., .55, .3) * 1.2; }
  else if (w < 5.5) { vec2 u = fl > .5 ? p.xz : p.xy; mat2 r = rot(.5); vec2 h = fract(r * u * 7.) - .5; float tone = fl > .5 ? .30 + .10 * sin(u.x * 1.2) : .34 - .07 * p.y; float dt = smoothstep(.02, -.02, length(h) - tone); m.r = .9; m.c = fl > .5 ? mix(vec3(.95, .88, .74), vec3(.10, .52, .60), dt) : wl > .5 ? mix(vec3(.98, .74, .20), vec3(.95, .34, .36), dt) : rm > .5 ? vec3(.08, .12, .30) : id < 43.5 ? mix(vec3(.10, .52, .60), vec3(.08, .12, .30), smoothstep(.02, -.02, length(fract(rot(.5) * vec2(p.x + q.z, p.y) * 6.) - .5) - .22)) : vec3(.95, .34, .36); }
  else if (w < 6.5) { m.r = .45; m.c = fl > .5 ? vec3(.04, .04, .07) : vec3(.10, .09, .20); if (fl > .5) { m.r = .18 + .2 * fbm(p * 3.); m.coat = .5; if (abs(p.x) < .03 && fract(q.z * 1.5) < .5) m.c = vec3(.8, .6, .2); } if (id > 44.5) { vec2 u = abs(n.x) > .5 ? vec2(q.z + 2., p.y) : vec2(q.x, p.y); vec2 c = floor(u / vec2(.2, .24)), f = fract(u / vec2(.2, .24)); if (abs(n.y) < .5 && f.x > .28 && f.x < .72 && f.y > .25 && f.y < .75 && h21(c + floor(q.z) * 3. + sign(q.x)) > .42) m.e = mix(vec3(1., .72, .35), vec3(1., .55, .3), h21(c)) * 1.15; m.c = vec3(.11, .10, .24); } if (wl > .5) m.c = vec3(.07, .05, .16); if (rm > .5) m.e = vec3(1., .75, .4) * 1.; }
  else { m.c = vec3(.86, .83, .79); m.r = .75; if (id > 46.5) { m.c = vec3(.030, .026, .035); m.r = .8; } if (rm > .5) m.c = vec3(.9, .88, .85); } }
vec3 sky(vec3 d) { float w = gW; float u = smoothstep(-.2, 1., d.y); return w < .5 ? mix(vec3(.75, .62, .46), vec3(.62, .78, .80), u) * .7 : w < 1.5 ? vec3(.03, .09, .30) * .9 : w < 2.5 ? vec3(.62, .46, .34) * .6 : w < 3.5 ? vec3(.45, .65, .95) * .75 : w < 4.5 ? vec3(.03, .015, .05) : w < 5.5 ? vec3(.90, .80, .70) * .7 : w < 6.5 ? vec3(.06, .05, .16) : vec3(.86, .84, .82) * .78; }`,
  });
}
