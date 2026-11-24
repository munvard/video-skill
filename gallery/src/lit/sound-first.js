// Sound first: three macro contacts you can almost hear: wood on a key, skin with sand, water. One idea per shot, every cut
// sits on a hit, no words at all. The last move leaves upward, the first one comes down: the loop has a rhythm.
{
  const D = 3.75, S = 1.25, HIT = .42; // seconds per shot, time of the hit inside it
  const tt = t => (t + .95) % D, sh = t => Math.min(2, floor(tt(t) / S + 1e-4)), loc = t => tt(t) - sh(t) * S; // the loop joins inside a shot
  const fall = u => u < HIT ? 2.3 * (1 - (u / HIT) ** 2) : 0;
  const rise = u => u > HIT ? Math.max(0, 5.2 * (u - HIT - .02) - 3.2 * (u - HIT - .02) ** 2) : 0;
  ray({
    dur: D, fps: 20, spp: 72, bounces: 4, steps: 130, stepk: .8, exposure: 1.2, bloom: .12, vig: .4, shutter: .5, fwd: 1, sat: 1.08,
    lights: t => [[{ p: [-2.6, 2.6, -.6], at: [0, .2, 0], s: [1.1, 1.6], c: [1, .78, .5], k: 60 }, { p: [2.6, 1.4, 2], at: [0, .3, 0], s: [1, 2], c: [.6, .75, 1], k: 12 }], [{ p: [2.4, 1.5, -1.8], at: [0, 0, 0], s: [1.6, 1], c: [1, .5, .3], k: 30 }, { p: [-2.6, 2.8, 1.4], at: [0, .3, 0], s: [1, 2], c: [1, .85, .7], k: 8 }], [{ p: [0, 2.4, -2.8], at: [0, 0, 0], s: [3, 1.6], c: [.45, .8, 1], k: 13 }, { p: [-2.4, 1.8, 1.6], at: [0, .3, 0], s: [1.4, 1.4], c: [1, .9, .8], k: 7 }]][sh(t)],
    cam: t => { const s = sh(t), u = loc(t), d = .10 * u, k = Math.exp(-Math.max(0, u - HIT) * 9) * (u > HIT ? 1 : 0) * .02 * sin(u * 70); return [{ p: [1.0 - d, .95 + k, 2.5 - d], at: [0, .34, 0], fov: 36, ap: .05, focus: 2.35 - d }, { p: [-.2 + d, .38 + k, 2.7 - d], at: [0, .42, 0], fov: 35, ap: .05, focus: 2.4 - d }, { p: [.15, 1.15 - d + k, 2.45], at: [0, .30, 0], fov: 37, ap: .045, focus: 2.35 }][s]; },
    uni: t => { const s = sh(t), u = loc(t), h = u - HIT, wet = h > 0 ? h : -1; let y = h < 0 ? fall(u) : rise(u); const dip = s === 0 ? (Math.abs(h) < .09 ? cos(h / .09 * PI / 2) * .14 : 0) : s === 1 ? (Math.abs(h) < .07 ? cos(h / .07 * PI / 2) * .12 : 0) : 0; if (s === 2) y = h < 0 ? fall(u) : h < .34 ? -1.1 * sin(PI * h / .34) * .72 : Math.max(0, 4.4 * (h - .34) - 2.4 * (h - .34) ** 2); const q = Math.abs(h) < .07 ? .16 * cos(h / .07 * PI / 2) : 0; return [[s, y - dip, q, wet], [dip, u, t, 0]]; },
    glsl: `
float wave(vec2 p) { float h = U[0].w, r = length(p), s = 0.; if (h > 0.) { float f = h * 1.9; s += .085 * exp(-h * 2.2) * cos((r - f) * 13.) * exp(-pow((r - f) * 2.2, 2.)) ; s += .05 * exp(-h * 3.) * cos((r - f * .6) * 16.) * exp(-pow((r - f * .6) * 3., 2.)); float c = h < .5 ? h / .5 : 1.; s += -.22 * exp(-pow(r * 2.8, 2.)) * smoothstep(.34, .0, h) + .26 * exp(-pow(r * 4.2, 2.)) * sin(clamp((h - .34) / .3, 0., 1.) * 3.14159); } return s + .006 * sin(p.x * 9. + U[1].z * 3.35) * sin(p.y * 8. - U[1].z * 1.676); }
float skin(vec2 p) { float h = U[0].w, r = length(p); float s = -U[1].x * exp(-r * r * 4.) ; if (h > 0.) s += .035 * exp(-h * 9.) * sin(h * 70.) * cos(r * 2.2) * step(.07, h); return s; }
vec2 map(vec3 p) {
  vec2 d; float s = U[0].x;
  if (s < .5) { // wooden keys of a toy instrument
    float i = clamp(floor(p.x / .62 + .5), -3., 3.); vec3 q = p; q.x -= i * .62; float press = i == 0. ? U[1].x : 0.; q.y += press * smoothstep(-2., .6, p.z) ; d = vec2(box(q - vec3(0, -.17, -.2), vec3(.285, .17, 1.25 - .06 * abs(i)), .05), 20. + i); d = un(d, vec2(p.y + .36, 1.)); vec3 pin = q - vec3(0, 0., .72); d = un(d, vec2(sph(pin * vec3(1., 1.4, 1.), .075) * .7, 2.)); pin = q - vec3(0, 0., -1.1); d = un(d, vec2(sph(pin * vec3(1., 1.4, 1.), .075) * .7, 2.)); }
  else if (s < 1.5) { // drum skin and sand
    float r = length(p.xz); d = vec2(max((p.y - skin(p.xz)) * .8, r - 1.6), 30.); d = un(d, vec2(length(vec2(r - 1.62, p.y - .02)) - .09, 31.)); d = un(d, vec2(max(abs(r - 1.66) - .05, abs(p.y + .6) - .6), 32.)); d = un(d, vec2(p.y + 1.1, 1.));
    if (p.y < 1.6) { vec2 g = floor(p.xz / .15); float w = 9.; for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) { vec2 c = g + vec2(a, b); float h = h21(c + 3.1); vec2 o = (c + .5 + .7 * (vec2(h21(c), h21(c + 9.)) - .5)) * .15; float rr_ = length(o); if (h < .35 || rr_ > 1.35) continue; float t = U[0].w - rr_ * .10, v = (1.2 + 1.5 * h) * exp(-rr_ * .9), y = 0.; if (t > 0.) { float T_ = 2. * v / 7.; y = t < T_ ? v * t - 3.5 * t * t : 0.; } w = min(w, sph(p - vec3(o.x, skin(o) + .018 + y, o.y), .02 + .014 * h)); } d = un(d, vec2(w * .85, 33.)); } }
  else { d = vec2((p.y - wave(p.xz)) * .75, 40.); float h = U[0].w; if (h > 0. && h < .95) for (int i = 0; i < 9; i++) { float f = float(i), a = f * 2.4, v = 1.5 + .9 * h11(f + .3), y = v * h * 1.35 - 3.6 * h * h; vec3 c = vec3(cos(a), 0., sin(a)) * (.25 + h * (.5 + .35 * h11(f + 2.))); d = un(d, vec2(sph(p - c - vec3(0, y, 0), .022 + .03 * h11(f + 5.)), 41.)); } }
  vec4 B = vec4(0, U[0].y + .34 * (1. - U[0].z) , .05, .34); return un(d, vec2(bal(p, B, U[0].z), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .5;
  if (id < 1.5) { m.c = vec3(.06, .035, .03); m.r = .6; } else if (id < 2.5) { m.c = vec3(.8, .55, .25); m.m = 1.; m.r = .22; }
  else if (id < 11.) ballM(m);
  else if (id < 28.) { float i = id - 20.; vec3 a = abs(i) < .5 ? vec3(.62, .36, .17) : vec3(.46, .25, .11) * (1. + .12 * sin(i * 5.)); float g = fbm(vec3(p.x * 14. + i * 7., p.y * 8., p.z * 1.4)); m.c = a * (.65 + .6 * g); m.r = .38; m.coat = .25; n = bump(n, p * vec3(1., 1., .15), 60., .06); }
  else if (id < 30.5) { m.c = vec3(.72, .64, .54) * (.85 + .25 * fbm(p * 4.)); m.r = .55; m.sss = .4; } else if (id < 31.5) { m.c = vec3(.8, .5, .3); m.m = 1.; m.r = .25; } else if (id < 32.5) { m.c = vec3(.30, .06, .04); m.r = .25; m.coat = .6; } else if (id < 33.5) { m.c = vec3(.95, .60, .22); m.r = .8; }
  else { m.c = vec3(.015, .05, .075); m.r = .03; m.coat = 1.; } }
vec3 sky(vec3 d) { return U[0].x < .5 ? vec3(.05, .035, .03) : U[0].x < 1.5 ? vec3(.04, .02, .03) : mix(vec3(.02, .05, .08), vec3(.10, .25, .36), smoothstep(0., .5, d.y)) * .8; }`,
  });
}
