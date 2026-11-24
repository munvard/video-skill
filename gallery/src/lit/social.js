// Social card: the word, the ball as its dot, and a shelf of small worlds behind round glass. One still frame, 1280 x 640.
// Reads a frame of eight finished previews, so build those first.
window.READY = (async () => {
  const SRC = [['pixel-art', .2], ['blueprint', .45], ['toy-diorama', .5], ['riso-print', .4], ['isometric-city', .15], ['comic-panels', .05], ['glass-light', .3], ['paper-collage', .25], ['one-take-thread', .55], ['time-machine', .35]], S = 160, XH = 1.3, font = '640 380px Inter';
  const ims = []; for (const [s, k] of SRC) { const d = new ImageDecoder({ data: await (await fetch('/' + s + '.webp')).arrayBuffer(), type: 'image/webp' }); await d.tracks.ready; await d.completed; ims.push((await d.decode({ frameIndex: floor(d.tracks.selectedTrack.frameCount * k) })).image); }
  await document.fonts.load(font, 'video'); let IX = 0;
  ray({
    dur: 1, fps: 1, w: 1280, h: 640, spp: 360, bounces: 4, shutter: 0, exposure: 1.1, bloom: .08, vig: .25, sat: 1.1, dn: .8, steps: 160,
    lights: () => [{ p: [-4.2, 5.4, 4.6], at: [0, .9, 0], s: [1.9, 1.9], c: [1, .95, .88], k: 34 }, { p: [4.6, 2.2, 3], at: [0, .8, 0], s: [1.4, 3], c: [.8, .9, 1], k: 5 }],
    cam: () => ({ p: [.15, 1.62, 8.1], at: [0, 1.60, 0], fov: 33, ap: .05, focus: 7.7 }),
    uni: () => [[IX, XH + .20, 0, 0]],
    tex: { w: 2560, h: 1024, draw(c) { ims.forEach((m, i) => c.drawImage(m, (i % 5) * 512, floor(i / 5) * 512, 512, 512)); } },
    sdf: { w: 1024, h: 512, draw(c) { c.font = font; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; const base = 448, ro = XH / 2 * S + 3, parts = ['v', 'ı', 'd', 'e'], w = parts.map(s => c.measureText(s).width), tot = w.reduce((a, b) => a + b, 0) + ro * 2 + 16; let x = (1024 - tot) / 2; parts.forEach((s, i) => { c.fillText(s, x, base); if (i === 1) IX = (x + w[1] / 2 - 512) / S; x += w[i]; }); const ox = x + 8 + ro; c.beginPath(); c.arc(ox, base - ro + 3, ro, 0, TAU); c.arc(ox, base - ro + 3, .385 * S, 0, TAU, true); c.fill(); } },
    glsl: `
// Portholes: ten circles in two rows on the wall. Returns center and index.
vec3 hole(vec2 p) { float row = p.y > 2.75 ? 1. : 0.; float off = row > .5 ? 0. : 0.; float i = clamp(floor((p.x - off) / 1.5 + .5), -2., 2.); return vec3(i * 1.5 + off, row > .5 ? 3.02 : 99., i + 2. + row * 5. - 5. * step(.5, row)); }
vec2 map(vec3 p) {
  vec2 d = vec2(p.y, 1.); vec2 q = p.xy; float best = 9.;
  for (int k = 0; k < 2; k++) { float y = 2.95 - float(k) * 10.; float i = clamp(floor(q.x / 1.36 + .5), -2., 2.); best = min(best, length(q - vec2(i * 1.36, y)) - .52); }
  for (int k = 0; k < 2; k++) { float s = k == 0 ? -1. : 1.; best = min(best, length(q - vec2(s * 4.12, 2.95)) - .52); best = min(best, length(q - vec2(s * 4.35, 1.35)) - .62); }
  float w = smax(abs(p.z + .9) - .5, -max(best, -(p.z + .72)), .03); d = un(d, vec2(w, 2.));
  d = un(d, vec2(length(vec2(best, p.z + .40)) - .045, 4.));
  float s = sdTex(vec2(p.x / 6.4 + .5, (p.y + .4) / 3.2)) * 3.2; vec2 e = vec2(s, abs(p.z - .25) - .16) + .03; d = un(d, vec2((min(max(e.x, e.y), 0.) + length(max(e, 0.)) - .03) * .9, 3.));
  return un(d, vec2(sph(p - vec3(U[0].xy + vec2(0, .02), .25), .235), 10.)); }
void mate(inout M m, vec3 p, inout vec3 n, float id) {
  m.r = .75; if (id < 1.5) m.c = vec3(.84, .81, .77); else if (id < 2.5) { m.c = vec3(.86, .83, .79); if (p.z < -.6 && n.z > .5) { vec2 c; float k = -1., R_ = .52; float i = clamp(floor(p.x / 1.36 + .5), -2., 2.); c = vec2(i * 1.36, 2.95); k = i + 2.; if (length(p.xy - c) > .56) { float s = sign(p.x); if (p.y > 2.2) { c = vec2(s * 4.12, 2.95); k = s < 0. ? 5. : 6.; } else { c = vec2(s * 4.35, 1.35); R_ = .62; k = s < 0. ? 7. : 8.; } } vec2 u = (p.xy - c) / R_ * .5 + .5; u = clamp(u, .01, .99); vec2 cell = vec2(mod(k, 5.), k < 4.5 ? 1. : 0.); vec3 t = pow(texture(uTex, (cell + u) / vec2(5., 2.)).rgb, vec3(2.2)); m.c = t * .5; m.e = t * .62; m.r = .9; } }
  else if (id < 3.5) { m.c = vec3(.032, .028, .036); m.r = .7; } else if (id < 4.5) { m.c = vec3(.92, .9, .86); m.r = .4; } else { ballM(m); m.r = .3; } }
vec3 sky(vec3 d) { return vec3(.86, .84, .82) * .75; }`,
  });
})();
