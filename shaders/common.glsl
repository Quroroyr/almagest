// Общее для всех сцен. Координаты: p — пиксели вида от левого нижнего угла.
#define PI 3.14159265
#define TAU 6.2831853
uniform vec2 u_res;      // полный размер вида, px устройства
uniform vec2 u_org;      // левый нижний угол вида на холсте, px устройства
uniform float u_time;    // секунды с загрузки (при «меньше движения» — константа)
uniform float u_enter;   // секунды с первого появления вида на экране
uniform vec2 u_mouse;    // указатель в долях вида, сглаженный
uniform float u_mouseOn; // 0…1 — указатель над видом
uniform float u_prog;    // прокрутка через вид, 0…1
uniform float u_q;       // качество: 0 низкое, 1 среднее, 2 высокое
uniform float u_px;      // px устройства на CSS-px
out vec4 o;

vec2 viewPx() { return gl_FragCoord.xy - u_org; }
// «высотные» координаты: y от −0.5 до 0.5, x пропорционально
vec2 viewQ(vec2 p) { return (p - 0.5 * u_res) / u_res.y; }

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  float a = mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y);
  float b = mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z);
}
const mat2 FBM_M = mat2(1.6, 1.2, -1.2, 1.6);
float fbm(vec2 p, int oct) {
  float a = .5, s = 0.;
  for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * noise(p); p = FBM_M * p; a *= .5; }
  return s;
}
float fbm3(vec3 p, int oct) {
  float a = .5, s = 0.;
  for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= .5; }
  return s;
}
int oct(int base) { return max(2, base + int(u_q) - 2); }

// слой звёзд: одна звезда на клетку, яркие редки; t — мерцание
vec3 starLayer(vec2 p, float cell, float density, float seed, float t, float bright) {
  vec2 g = floor(p / cell), f = p - g * cell;
  float h = hash12(g + seed);
  if (h > density) return vec3(0);
  float margin = 9. * u_px;
  vec2 pos = margin + hash22(g + seed * 1.7) * max(cell - 2. * margin, 1.);
  float d = length(f - pos);
  float mag = pow(hash12(g + seed * 3.1), 7.);
  float size = mix(.5, 1.45, mag) * u_px;
  float tw = 1. + .22 * sin(t * (1.3 + 3. * h) + h * 40.) * (1. - mag * .6);
  float core = exp(-d * d / (size * size));
  float glow = mag * exp(-d * d / (size * size * 7.)) * .5;
  vec3 tint = mix(vec3(.72, .83, 1.), vec3(1., .94, .86), hash12(g + seed * 5.3));
  return tint * (core + glow) * (.18 + 1.5 * mag) * tw * bright;
}
// точечный «источник» с ореолом в px
vec3 glowPoint(vec2 p, vec2 c, float r, vec3 col) {
  float d = length(p - c);
  return col * (exp(-d * d / (r * r)) + .35 * exp(-d / (r * 4.)));
}
float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.);
  return length(pa - ba * h);
}
// размещение картинки «по ширине», нижним краем в y0; возвращает uv (вне 0…1 — мимо)
vec2 plateUV(vec2 q, float aspectView, float imgAspect, float minW, float anchorX, float y0, vec2 shift) {
  float pw = max(aspectView, minW), ph = pw / imgAspect;
  float x0 = -aspectView * .5 - (pw - aspectView) * anchorX;
  return vec2((q.x - shift.x - x0) / pw, (q.y - shift.y - y0) / ph);
}
// «cover»: картинка закрывает вид целиком; anchor — какую часть оставить при обрезке (0…1)
vec2 coverUV(vec2 q, float aspectView, float imgAspect, vec2 anchor) {
  float pw = max(aspectView, imgAspect), ph = pw / imgAspect;
  vec2 o = vec2(-aspectView * .5 - (pw - aspectView) * anchor.x, -.5 - (ph - 1.) * anchor.y);
  return vec2((q.x - o.x) / pw, (q.y - o.y) / ph);
}
vec4 plate(sampler2D tex, vec2 uv) {
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec4(0);
  return texture(tex, uv);
}
// против полос в тёмных градиентах
vec3 dither(vec3 c, vec2 p) { return c + (hash12(p + fract(u_time) * 7.) - .5) / 255.; }
float sat(float x) { return clamp(x, 0., 1.); }
float ease3(float t) { t = sat(t); return 1. - pow(1. - t, 3.); }
