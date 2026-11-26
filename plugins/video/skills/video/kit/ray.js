// A small path tracer for signed distance fields, in one WebGL2 shader. It makes every lit piece of the gallery.
// Real area lights, soft shadows, bounce light, GGX reflections, glass, depth of field, haze, and motion blur:
// every sample has its own time, lens point, light point and path. Then an edge-aware filter, bloom and a film curve.
//
// ray({dur, fps, w, h, spp, bounces, fog, exposure, bloom, lights(t), cam(t), uni(t), glsl, tex, sdf})
//   glsl must define: vec2 map(vec3 p)  distance and material id
//                     void mate(inout M m, vec3 p, inout vec3 n, float id)
//                     vec3 sky(vec3 d)
//   lights(t) -> [{p:[x,y,z], at:[x,y,z], s:[w,h], c:[r,g,b], k:power}]   rectangles that face `at`
//   cam(t)    -> {p, at, fov, ap, focus, roll}     y is up
//   uni(t)    -> array of vec4, read in the shader as U[i]
//   tex       -> {w, h, draw(c, t)} drawn once per frame, read as texture(uTex, uv)
//   sdf       -> {w, h, draw(c)} black on white shape, turned into a distance field, read as sdTex(uv) in units of its height
const V = {
  sub: (a, b) => a.map((x, i) => x - b[i]), add: (a, b) => a.map((x, i) => x + b[i]), mul: (a, k) => a.map(x => x * k), dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm: a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); }, mix: (a, b, t) => a.map((x, i) => x + (b[i] - x) * t),
};
const RAY_LIB = `
struct M { vec3 c; float r; float m; vec3 e; float coat; float sss; float tr; float ior; };
float sph(vec3 p, float r) { return length(p) - r; }
float box(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float box2(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, q.y), 0.); }
float cyl(vec3 p, float h, float r, float b) { vec2 q = vec2(length(p.xz) - r, abs(p.y) - h) + b; return min(max(q.x, q.y), 0.) + length(max(q, 0.)) - b; }
float cap(vec3 p, vec3 a, vec3 b, float r) { vec3 q = p - a, d = b - a; return length(q - d * clamp(dot(q, d) / dot(d, d), 0., 1.)) - r; }
float tor(vec3 p, float R_, float r) { return length(vec2(length(p.xz) - R_, p.y)) - r; }
float cone(vec3 p, float h, float r1, float r2, float b) { float k = clamp((p.y + h) / (2. * h), 0., 1.), R_ = mix(r1, r2, k); vec2 q = vec2(length(p.xz) - R_, abs(p.y) - h) + b; float s = (r1 - r2) / (2. * h); q.x /= sqrt(1. + s * s); return min(max(q.x, q.y), 0.) + length(max(q, 0.)) - b; }
float ell(vec3 p, vec3 r) { float a = length(p / r), b = length(p / (r * r)); return a * (a - 1.) / max(b, 1e-5); }
float bal(vec3 p, vec4 c, float q) { p -= c.xyz; return ell(p, c.w * vec3(1. + q * .6, 1. - q, 1. + q * .6)); }
float ext(float d, float z, float h, float r) { vec2 w = vec2(d, abs(z) - h) + r; return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - r; }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.) / k; return min(a, b) - h * h * k * .25; }
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 un(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h31(vec3 p) { p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f); return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y), mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= .5; } return s; }
// Bend a normal by a height function value pattern: call with the gradient of noise.
vec3 bump(vec3 n, vec3 p, float f, float k) { vec2 e = vec2(.6, 0.); float a = vn(p * f); return normalize(n - k * (vec3(vn(p * f + e.xyy), vn(p * f + e.yxy), vn(p * f + e.yyx)) - a) / .6); }
const vec3 OR = vec3(1., .165, .02);
void ballM(inout M m) { m.c = OR; m.r = .34; m.coat = .5; m.sss = .25; }
`;
const RAY_MAIN = `
float rnd_base; int rnd_d;
uint ph(uint x) { x = x * 747796405u + 2891336453u; x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u; return (x >> 22u) ^ x; }
uvec2 PX;
const float AL[32] = float[32](.618034,.754878,.569840,.819173,.671044,.549700,.856675,.733892,.628707,.538632,.414214,.732051,.236068,.645751,.316625,.605551,.123106,.358899,.795832,.385165,.567764,.082763,.403124,.557439,.855655,.280110,.810250,.348469,.440307,.630146,.681146,.717798);
float rnd() { uint h = ph(PX.x + ph(PX.y + ph(uint(rnd_d)))); float u = float(h >> 8) / 16777216.; float a = AL[rnd_d & 31]; if (rnd_d > 31) { h = ph(h + uint(uS) * 7919u); u = float(h >> 8) / 16777216.; rnd_d++; return u; } rnd_d++; return fract(u + a * float(uS)); }
vec2 rnd2() { float a = rnd(); return vec2(a, rnd()); }
bool march(vec3 ro, vec3 rd, float tmax, float sgn, out float t, out float id) {
  t = .0; id = -1.; float prev = 0.;
  for (int i = 0; i < STEPS; i++) { vec2 d = map(ro + rd * t); d.x *= sgn; id = d.y; if (d.x < .0004 + t * .0002) return true; t += d.x * STEPK; if (t > tmax) return false; }
  return t < tmax && map(ro + rd * t).x * sgn < .01 + t * .002;
}
vec3 normal(vec3 p, float t) { vec3 n = vec3(0); float e = .0006 + t * .0002; for (int i = 0; i < 4; i++) { vec3 k = .5773 * (2. * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.); n += k * map(p + k * e).x; } return normalize(n); }
void basis(vec3 n, out vec3 a, out vec3 b) { float s = n.z >= 0. ? 1. : -1., k = -1. / (s + n.z), q = n.x * n.y * k; a = vec3(1. + s * n.x * n.x * k, s * q, -s * n.x); b = vec3(q, s + n.y * n.y * k, -n.y); }
vec3 cosDir(vec3 n) { vec2 u = rnd2(); float r = sqrt(u.x), f = 6.2831853 * u.y; vec3 a, b; basis(n, a, b); return normalize(a * r * cos(f) + b * r * sin(f) + n * sqrt(1. - u.x)); }
vec3 ggx(vec3 v, vec3 n, float r) { vec2 u = rnd2(); float a = r * r, c = sqrt((1. - u.x) / (1. + (a * a - 1.) * u.x)), s = sqrt(max(0., 1. - c * c)), f = 6.2831853 * u.y; vec3 x, y; basis(n, x, y); vec3 h = x * s * cos(f) + y * s * sin(f) + n * c; return reflect(-v, h); }
float shadow(vec3 ro, vec3 rd, float tmax) { float t = .006, vis = 1.; bool in_ = false; for (int i = 0; i < SSTEPS; i++) { vec2 d = map(ro + rd * t); if (d.x < .0006) { if (d.y > 89.) { if (!in_) { vis *= .78; in_ = true; } t += max(.03, abs(d.x)); continue; } return 0.; } in_ = d.x < 0.; t += max(d.x * STEPK, .0015); if (t > tmax) break; } return vis; }
// Specular and camera-like rays see the light panels.
vec3 panels(vec3 ro, vec3 rd, float tmax) { vec3 s = vec3(0); for (int i = 0; i < NL; i++) { vec3 n = normalize(cross(LU[i], LV[i])); float dn = dot(rd, n); if (dn > -.0001) continue; float t = dot(LP[i] - ro, n) / dn; if (t < 0. || t > tmax) continue; vec3 q = ro + rd * t - LP[i]; float a = dot(q, LU[i]) / dot(LU[i], LU[i]), b = dot(q, LV[i]) / dot(LV[i], LV[i]); if (abs(a) < 1. && abs(b) < 1.) { float e = smoothstep(1., .8, abs(a)) * smoothstep(1., .8, abs(b)); s += LC[i] * e; } } return s; }
float D(float nh, float r) { float a = r * r, a2 = a * a, d = nh * nh * (a2 - 1.) + 1.; return a2 / (3.14159 * d * d); }
vec3 direct(int i, vec3 p, vec3 n, vec3 v, M m, float fogk) {
  vec2 u = rnd2() * 2. - 1.; vec3 q = LP[i] + LU[i] * u.x + LV[i] * u.y, l = q - p; float d2 = dot(l, l), d = sqrt(d2); l /= d;
  vec3 ln = normalize(cross(LU[i], LV[i])); float cl = dot(-l, ln); if (cl <= 0.) return vec3(0);
  float area = 4. * length(cross(LU[i], LV[i])); vec3 L = LC[i] * cl * area / max(d2, .05);
  if (fogk > 0.) return L * shadow(p, l, d - .02) * .0796;
  float nl = dot(n, l); float wrap = m.sss > 0. ? max(0., (nl + m.sss) / (1. + m.sss)) : max(nl, 0.); if (wrap <= 0.) return vec3(0);
  float sh = shadow(p + n * .004, l, d - .02); if (sh <= 0. && m.sss <= 0.) return vec3(0);
  vec3 h = normalize(l + v); float nh = max(dot(n, h), 0.), vh = max(dot(v, h), 0.), nv = max(dot(n, v), .05); vec3 f0 = mix(vec3(.04), m.c, m.m), F = f0 + (1. - f0) * pow(1. - vh, 5.);
  vec3 o = m.c * (1. - m.m) * (1. - F) * .3183 * mix(wrap, pow(wrap, 1.), 1.) * (m.sss > 0. ? mix(vec3(1), vec3(1.15, .85, .7), m.sss * (1. - max(nl, 0.))) : vec3(1));
  if (nl > 0.) { if (m.r > .22) { float k = (m.r + 1.) * (m.r + 1.) / 8.; o += F * D(nh, m.r) * nl / (4. * (nl * (1. - k) + k) * (nv * (1. - k) + k)); } }
  return o * L * mix(sh, max(sh, .12 * m.sss), 1.);
}
layout(location = 0) out vec4 oC; layout(location = 1) out vec4 oA; layout(location = 2) out vec4 oN;
void main() {
  PX = uvec2(gl_FragCoord.xy); rnd_d = 0; vec2 jit = rnd2(); jit = vec2(jit.x < .5 ? sqrt(2. * jit.x) - 1. : 1. - sqrt(2. - 2. * jit.x), jit.y < .5 ? sqrt(2. * jit.y) - 1. : 1. - sqrt(2. - 2. * jit.y));
  vec2 uv = (2. * (gl_FragCoord.xy + jit * .7) - R) / R.y;
  gUV = uv; vec3 f = normalize(camT - camP), r = normalize(cross(f, vec3(sin(camL.w), cos(camL.w), 0.))), up = cross(r, f), ro = camP, rd = normalize(f + (uv.x * r + uv.y * up) * camL.x);
  if (camL.z > 0.) { vec2 l = rnd2(); float a = 6.2831853 * l.y, q = sqrt(l.x) * camL.z; vec3 fp = ro + rd * camL.y / dot(rd, f); ro += (r * cos(a) + up * sin(a)) * q; rd = normalize(fp - ro); }
  vec3 col = vec3(0), th = vec3(1), alb = vec3(1), nn = vec3(0); float dep = 40.; bool spec = true; float sgn = 1.; int glass = 0;
  vec3 disp = vec3(1); float dch = 0.;
  for (int b = 0; b < BOUNCES; b++) {
    float t, id; bool hit = march(ro, rd, TMAX, sgn, t, id);
    if (spec && b > 0 && sgn > 0.) { col += th * panels(ro, rd, hit ? t : TMAX); }
    if (FOG > 0. && b == 0) { float tf = hit ? t : TMAX; float ext_ = exp(-FOG * tf); float s = rnd(); float ts = -log(1. - s * (1. - ext_)) / FOG; vec3 pf = ro + rd * ts; int li = min(NL - 1, int(rnd() * float(NL))); col += (1. - ext_) * FOGC * direct(li, pf, rd, -rd, M(vec3(1), 1., 0., vec3(0), 0., 0., 0., 1.), 1.) * float(NL) * 1.6; th *= ext_; col += (1. - ext_) * FOGA; }
    if (!hit) { col += th * sky(rd); break; }
    vec3 p = ro + rd * t, n = normal(p, t) * sgn; M m = M(vec3(.8), .6, 0., vec3(0), 0., 0., 0., 1.5); vec3 gn = n; mate(m, p, n, id); if (dot(n, rd) > 0. && dot(gn, rd) < 0.) n = gn;
    if (b == 0) { alb = m.tr > .5 ? vec3(1) : max(m.c, .15); nn = n; dep = t; }
    col += th * m.e * (b == 0 || spec ? 1. : 1.);
    vec3 v = -rd;
    if (m.tr > .5) {
      if (dch == 0. && DISP > 0.) { dch = 1. + floor(rnd() * 3.); disp = dch < 1.5 ? vec3(3, 0, 0) : dch < 2.5 ? vec3(0, 3, 0) : vec3(0, 0, 3); th *= disp; }
      float io = m.ior + (dch - 2.) * DISP * step(.5, dch), e = sgn > 0. ? 1. / io : io, c = dot(v, n), k = 1. - e * e * (1. - c * c), f0 = pow((1. - io) / (1. + io), 2.), F = k < 0. ? 1. : f0 + (1. - f0) * pow(1. - (sgn > 0. ? c : sqrt(max(k, 0.))), 5.);
      if (sgn < 0.) th *= exp(-(1. - m.c) * t * ABS_);
      vec3 hn = m.r > .01 ? normalize(n + m.r * .5 * (vec3(rnd(), rnd(), rnd()) - .5)) : n;
      if (rnd() < F) { rd = reflect(rd, hn); ro = p + n * .003; } else { vec3 q = refract(rd, hn, e); if (dot(q, q) < .1) q = reflect(rd, hn); else sgn = -sgn; rd = q; ro = p + rd * .003 - n * .003 * 0.; ro = p + rd * .006; }
      spec = true; if (++glass > 7) break; if (b == BOUNCES - 1) { col += th * sky(rd) * .6; } continue;
    }
    if (b == 0) { for (int i = 0; i < NL; i++) col += th * direct(i, p, n, v, m, 0.); } else { int li = min(NL - 1, int(rnd() * float(NL))); vec3 c_ = th * direct(li, p, n, v, m, 0.) * float(NL); col += min(c_, vec3(4.)); }
    if (b == BOUNCES - 1) break;
    float nv = max(dot(n, v), 0.); vec3 f0 = mix(vec3(.04), m.c, m.m), F = f0 + (max(vec3(1. - m.r), f0) - f0) * pow(1. - nv, 5.); float Fc = m.coat * (.04 + .96 * pow(1. - nv, 5.));
    float ps = clamp(max(F.x, max(F.y, F.z)) , m.m > .5 ? .9 : .06, .95), pc = clamp(Fc * 1.0, 0., .6); if (m.coat <= 0.) pc = 0.; float q = rnd();
    if (q < pc) { rd = reflect(rd, n); th *= Fc / pc; spec = true; }
    else if (q < pc + (1. - pc) * ps) { float rr_ = m.r; rd = ggx(v, n, rr_); if (dot(rd, n) <= 0.) break; th *= F * (1. - Fc) / ((1. - pc) * ps); spec = rr_ <= .22; }
    else { rd = cosDir(n); th *= m.c * (1. - m.m) * (1. - F) * (1. - Fc) / ((1. - pc) * (1. - ps)); spec = false; }
    ro = p + n * .004; if (max(th.x, max(th.y, th.z)) < .015) break;
  }
  float lum = max(col.x, max(col.y, col.z)); if (lum > CLAMP) col *= CLAMP / lum; if (any(isnan(col)) || any(isinf(col))) col = vec3(0);
  oC = vec4(col, 1); oA = vec4(alb, dep); oN = vec4(nn, 1);
}`;
function ray(o) {
  o = Object.assign({ dur: 3, fps: 24, w: 480, h: 480, spp: 64, bounces: 3, fog: 0, fogc: [1, 1, 1], foga: [0, 0, 0], exposure: 1, bloom: .12, steps: 110, ssteps: 60, stepk: .92, tmax: 40, shutter: .5, disp: 0, abs: 1, clampv: 8, dn: 1, sat: 1.06, vig: .22, contrast: 1, uni: () => [] }, o);
  let gl, prog, loc, fbA, fbD, den, outp, quad, texA, texD, tex2, tc, sdfT, NL;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const l = gl.getShaderInfoLog(s), m = /:(\d+):/.exec(l), L = m ? src.split('\n').slice(Math.max(0, m[1] - 3), +m[1] + 1).join('\n').slice(0, 900) : ''; throw Error(l.slice(0, 500) + '\n' + L); } return s; };
  const mk = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main(){gl_Position=vec4(a,0,1);}')); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p)); return p; };
  const ft = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); return t; };
  const fb = ts => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); ts.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0)); gl.drawBuffers(ts.map((_, i) => gl.COLOR_ATTACHMENT0 + i)); return f; };
  const F = x => Number.isInteger(x) ? x + '.' : '' + x, v3 = a => `vec3(${a.map(F).join(',')})`;
  scene({
    dur: o.dur, fps: o.fps, w: o.w, h: o.h, ss: 1, draw() { },
    async init() {
      const cv = mkc(o.w, o.h); gl = cv.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true }); gl.getExtension('EXT_color_buffer_float'); gl.getExtension('EXT_float_blend'); gl.getExtension('OES_texture_float_linear');
      NL = o.lights(0).length;
      prog = mk(`#version 300 es\nprecision highp float; precision highp int; precision highp sampler2D;\n#define NL ${NL}\n#define STEPS ${o.steps}\n#define SSTEPS ${o.ssteps}\n#define STEPK ${F(o.stepk)}\n#define TMAX ${F(o.tmax)}\n#define BOUNCES ${o.bounces}\n#define FOG ${F(o.fog)}\n#define FOGC ${v3(o.fogc)}\n#define FOGA ${v3(o.foga)}\n#define DISP ${F(o.disp)}\n#define ABS_ ${F(o.abs)}\n#define CLAMP ${F(o.clampv)}\nuniform vec2 R; uniform int uS; uniform float T; uniform vec3 camP, camT; uniform vec4 camL; uniform vec4 U[32]; uniform vec3 LP[NL], LU[NL], LV[NL], LC[NL]; uniform sampler2D uTex, uSdf; vec2 gUV;\nfloat sdTex(vec2 uv) { return texture(uSdf, clamp(uv, .001, .999)).r; }\n${RAY_LIB}\n${o.glsl}\n${RAY_MAIN}`);
      den = mk(`#version 300 es\nprecision highp float; uniform sampler2D C,A,N; uniform int st; uniform float n; out vec4 o; void main(){ivec2 q=ivec2(gl_FragCoord.xy),sz=textureSize(C,0)-1;vec4 c0=texelFetch(C,q,0),a0=texelFetch(A,q,0),n0=texelFetch(N,q,0);vec3 al=max(a0.rgb,.03);vec3 b0=c0.rgb/al;float l0=dot(b0,vec3(.3,.6,.1));vec3 s=vec3(0);float w=0.;float k[3]=float[3](.375,.25,.0625);for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){ivec2 p=clamp(q+ivec2(x,y)*st,ivec2(0),sz);vec4 c=texelFetch(C,p,0),a=texelFetch(A,p,0),m=texelFetch(N,p,0);vec3 b=c.rgb/max(a.rgb,.03);float l=dot(b,vec3(.3,.6,.1));float e=k[abs(x)]*k[abs(y)]*exp(-dot(n0.rgb-m.rgb,n0.rgb-m.rgb)*18.-abs(a0.a-a.a)/(.04*a0.a+.02)*.6-dot(a0.rgb-a.rgb,a0.rgb-a.rgb)*60.-abs(sqrt(l)-sqrt(l0))/(.11*n)*1.);s+=b*e;w+=e;}o=vec4(s/w*al,c0.a);}`);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); quad = gl.createVertexArray(); gl.bindVertexArray(quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); for (const p of [prog, den]) if (gl.getAttribLocation(p, 'a') !== 0) { gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p); }
      texA = [ft(o.w, o.h), ft(o.w, o.h), ft(o.w, o.h)]; fbA = fb(texA); texD = [ft(o.w, o.h), ft(o.w, o.h)]; fbD = texD.map(t => fb([t]));
      loc = {}; const gu = n => loc[n] ??= gl.getUniformLocation(prog, n); S.gu = gu;
      if (o.tex) { tc = mkc(o.tex.w, o.tex.h); tex2 = gl.createTexture(); }
      if (o.sdf) { const W = o.sdf.w, H = o.sdf.h, c2 = mkc(W, H), c = c2.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.fillStyle = '#000'; o.sdf.draw(c); const d = c.getImageData(0, 0, W, H).data, INF = 1e9, edt = inside => { const g = new Float64Array(W * H); for (let i = 0; i < W * H; i++) { const a = 1 - d[i * 4] / 255, v = inside ? a : 1 - a; g[i] = v >= .99 ? 0 : v <= .01 ? INF : Math.max(0, .5 - v) ** 2 + (v < .5 ? 0 : 0); if (v > .01 && v < .99) g[i] = Math.max(0, .5 - (v - .5)) ** 2 * .25; } const run = (n, get, set) => { const f = new Float64Array(n), vv = new Int32Array(n), z = new Float64Array(n + 1); for (let i = 0; i < n; i++) f[i] = get(i); let k = 0; vv[0] = 0; z[0] = -INF; z[1] = INF; for (let q = 1; q < n; q++) { let s = ((f[q] + q * q) - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]); while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[vv[k]] + vv[k] * vv[k])) / (2 * q - 2 * vv[k]); } k++; vv[k] = q; z[k] = s; z[k + 1] = INF; } k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; set(q, (q - vv[k]) ** 2 + f[vv[k]]); } }; for (let x = 0; x < W; x++) run(H, y => g[y * W + x], (y, v) => g[y * W + x] = v); for (let y = 0; y < H; y++) run(W, x => g[y * W + x], (x, v) => g[y * W + x] = v); return g; }; const a = edt(true), b = edt(false), f = new Float32Array(W * H); for (let i = 0; i < W * H; i++) f[(H - 1 - (i / W | 0)) * W + i % W] = (Math.sqrt(a[i]) - Math.sqrt(b[i])) / H; sdfT = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, sdfT); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, W, H, 0, gl.RED, gl.FLOAT, f); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); }
    },
  });
  S.ray = i => {
    const gu = S.gu, t0 = i / o.fps; gl.viewport(0, 0, o.w, o.h); gl.bindVertexArray(quad); gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(prog); gl.uniform2f(gu('R'), o.w, o.h);
    if (o.tex) { const c = tc.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); o.tex.draw(c, t0); gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tex2); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.LINEAR); for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE); gl.uniform1i(gu('uTex'), 4); }
    if (sdfT) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, sdfT); gl.uniform1i(gu('uSdf'), 5); }
    const spp = Math.max(4, Math.round(o.spp * (window.SPPK || 1)));
    for (let s = 0; s < spp; s++) {
      let t = t0 + (o.shutter ? ((s * .7548776662 + .5) % 1 - (o.fwd ? 0 : .5)) * o.shutter / o.fps : 0); t = ((t % o.dur) + o.dur) % o.dur;
      const cm = o.cam(t), L = o.lights(t), u = o.uni(t); gl.uniform1i(gu('uS'), s); gl.uniform1f(gu('T'), t); gl.uniform3fv(gu('camP'), cm.p); gl.uniform3fv(gu('camT'), cm.at); gl.uniform4f(gu('camL'), Math.tan((cm.fov || 40) * PI / 360), cm.focus || Math.hypot(...V.sub(cm.at, cm.p)), cm.ap || 0, cm.roll || 0);
      const LP = [], LU = [], LV = [], LC = []; for (const l of L) { const n = V.norm(V.sub(l.at || [0, 0, 0], l.p)), a = V.norm(V.cross(Math.abs(n[1]) > .95 ? [1, 0, 0] : [0, 1, 0], n)), b = V.cross(n, a); LP.push(...l.p); LU.push(...V.mul(a, l.s[0] / 2)); LV.push(...V.mul(b, l.s[1] / 2)); LC.push(...V.mul(l.c, l.k)); }
      gl.uniform3fv(gu('LP'), LP); gl.uniform3fv(gu('LU'), LU); gl.uniform3fv(gu('LV'), LV); gl.uniform3fv(gu('LC'), LC); if (u.length) { const f = new Float32Array(128); u.forEach((q, k) => f.set(q, k * 4)); gl.uniform4fv(gu('U'), f); }
      gl.drawArrays(gl.TRIANGLES, 0, 3); if (s % 4 === 3) gl.finish();
    }
    gl.disable(gl.BLEND);
    // Average, then filter.
    const px = [0, 1, 2].map(k => { const a = new Float32Array(o.w * o.h * 4); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbA); gl.readBuffer(gl.COLOR_ATTACHMENT0 + k); gl.readPixels(0, 0, o.w, o.h, gl.RGBA, gl.FLOAT, a); for (let q = 0; q < a.length; q++) a[q] /= spp; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA[k]); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, o.w, o.h, gl.RGBA, gl.FLOAT, a); return a; });
    let C = px[0];
    if (o.dn) { gl.useProgram(den); let src = texA[0]; for (let k = 0; k < 4; k++) { gl.bindFramebuffer(gl.FRAMEBUFFER, fbD[k % 2]); [['C', src], ['A', texA[1]], ['N', texA[2]]].forEach(([n, tx], q) => { gl.activeTexture(gl.TEXTURE0 + q); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(gl.getUniformLocation(den, n), q); }); gl.uniform1i(gl.getUniformLocation(den, 'st'), 1 << k); gl.uniform1f(gl.getUniformLocation(den, 'n'), o.dn * (k ? .7 : 1)); gl.drawArrays(gl.TRIANGLES, 0, 3); src = texD[k % 2]; } C = new Float32Array(o.w * o.h * 4); gl.readPixels(0, 0, o.w, o.h, gl.RGBA, gl.FLOAT, C); }
    const W = o.w, H = o.h, im = S.oc.createImageData(W, H), d = im.data;
    // Bloom at quarter size.
    const bw = W >> 2, bh = H >> 2; let B = new Float32Array(bw * bh * 3); if (o.bloom) { for (let y = 0; y < bh * 4; y++) for (let x = 0; x < bw * 4; x++) { const p = (y * W + x) * 4, q = ((y >> 2) * bw + (x >> 2)) * 3; for (let k = 0; k < 3; k++) B[q + k] += Math.min(6, Math.max(0, C[p + k] * o.exposure - .75)) / 16; } for (const r of [3, 9]) for (const [dx, dy] of [[1, 0], [0, 1]]) { const N2 = new Float32Array(B.length); for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) for (let k = 0; k < 3; k++) { let s = 0, w = 0; for (let j = -r; j <= r; j++) { const X = x + dx * j, Y = y + dy * j, g = Math.exp(-j * j / (r * r * .5)); w += g; if (X >= 0 && Y >= 0 && X < bw && Y < bh) s += B[(Y * bw + X) * 3 + k] * g; } N2[(y * bw + x) * 3 + k] = s / w; } B = N2; } }
    const aces = x => { x = Math.max(0, x); return Math.min(1, (x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4, q = ((H - 1 - y) * W + x) * 4; let c = [0, 1, 2].map(k => C[p + k] * o.exposure);
      if (o.bloom) { const gx = Math.min(bw - 1.001, Math.max(0, x / 4 - .375)), gy = Math.min(bh - 1.001, Math.max(0, y / 4 - .375)), X = gx | 0, Y = gy | 0, fx = gx - X, fy = gy - Y; for (let k = 0; k < 3; k++) { const g = (a, b) => B[((Y + b) * bw + X + a) * 3 + k]; c[k] += o.bloom * 2.2 * lerp(lerp(g(0, 0), g(1, 0), fx), lerp(g(0, 1), g(1, 1), fx), fy); } }
      const vx = (x / W - .5) * 2, vy = (y / H - .5) * 2, vg = 1 - o.vig * Math.min(1, (vx * vx + vy * vy) * .5) ** 1.3; c = c.map(v => aces(v * vg * .82)); const l = .3 * c[0] + .59 * c[1] + .11 * c[2]; for (let k = 0; k < 3; k++) { let v = l + (c[k] - l) * o.sat; v = Math.max(0, v); if (o.contrast !== 1) v = Math.pow(v / .35, o.contrast) * .35; d[q + k] = ENC[Math.min(4096, v * 4096 | 0)]; } d[q + 3] = 255;
    }
    if (o.post) o.post(im, i, t0);
    S.oc.putImageData(im, 0, 0);
    if (o.over) { S.oc.save(); o.over(S.oc, t0, i); S.oc.restore(); }
    return S.paintOnly ? undefined : S.out.toDataURL('image/png').slice(22);
  };
}
// Bake helpers for hops: height of a bouncing thing, squash around a contact.
const hopY = (t, a, b, h) => t > a && t < b ? E.arc((t - a) / (b - a)) * h : 0;
const squashAt = (t, at, k = .25) => { const d = t - at; return d < 0 ? k * .8 * Math.max(0, 1 + d / .16) * (d > -.16 ? 1 : 0) : k * Math.exp(-d * 10) * cos(d * 30); };
