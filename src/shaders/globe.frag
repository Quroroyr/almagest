// 03 — небесная сфера «сейчас»: стеклянная оболочка с созвездиями зодиака по настоящим координатам,
// эклиптика с рисками, планеты на своих долготах; внутри Земля, освещённая Солнцем с его настоящего направления,
// повёрнутая по звёздному времени. Рисуется поверх фона секции (альфа предумножена).
uniform sampler2D u_segTex;  // концы отрезков созвездий: texelFetch(x = 2i, 2i+1)
uniform int u_nseg;
uniform vec3 u_pl[10];       // Солнце, Луна, Меркурий… Плутон — единичные векторы, экваториальные
uniform int u_hl;
uniform float u_gmst;        // гринвичское звёздное время, рад
uniform vec2 u_city;         // широта, долгота города, рад
uniform vec3 u_cam, u_cf, u_cr, u_cu;
uniform float u_fl;

const float EPS = .40910518; // наклон эклиптики
const float RE = .17;        // радиус Земли внутри сферы (не в масштабе)

vec2 sph(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd), c = dot(ro, ro) - r * r, h = b * b - c;
  if (h < 0.) return vec2(-1.);
  h = sqrt(h); return vec2(-b - h, -b + h);
}
// яркость линий созвездий в точке сферы n; w — полуширина в радианах
float constLines(vec3 n, float w, float drawT) {
  float s = 0.;
  for (int i = 0; i < 128; i++) {
    if (i >= u_nseg) break;
    vec3 A = texelFetch(u_segTex, ivec2(2 * i, 0), 0).xyz;
    vec3 B = texelFetch(u_segTex, ivec2(2 * i + 1, 0), 0).xyz;
    vec3 M = normalize(A + B);
    float half_ = acos(clamp(dot(A, M), -1., 1.)) + w * 3.;
    if (dot(n, M) < cos(half_)) continue;      // дальние отрезки — мимо
    float k = clamp(drawT - float(i) * .012, 0., 1.);
    if (k <= 0.) continue;
    B = normalize(mix(A, B, k));
    vec3 c = normalize(cross(A, B));
    float d = abs(dot(n, c));
    if (dot(cross(A, n), c) < 0. || dot(cross(n, B), c) < 0.) d = min(length(n - A), length(n - B));
    s = max(s, exp(-d * d / (w * w)));
    float st = exp(-dot(n - A, n - A) / (w * w * 4.));  // звезда в узле
    s = max(s, st * 1.4);
  }
  return s;
}
float greatCircle(vec3 n, vec3 pole, float w) { float d = dot(n, pole); return exp(-d * d / (w * w)); }

// всё, что нарисовано на поверхности сферы в точке n; back — задняя стенка (тусклее)
vec3 shellMarks(vec3 n, float w, float back, out float a) {
  float drawT = u_enter * .9 - .2;
  vec3 col = vec3(0); a = 0.;
  float cl = constLines(n, w, drawT);
  col += vec3(.72, .82, .96) * cl * .9; a += cl * .75;
  vec3 pole = vec3(0., -sin(EPS), cos(EPS));
  float appear = smoothstep(.2, 1.2, u_enter);
  float ecl = greatCircle(n, pole, w * 1.2);
  // риски эклиптики: каждые 10°, знаки — каждые 30°
  vec3 e1 = vec3(1, 0, 0), e2 = normalize(cross(pole, e1));
  float lon = atan(dot(n, e2), dot(n, e1)) / TAU * 360.;
  float inBand = exp(-pow(dot(n, pole) / (w * 7.), 2.));
  float t10 = 1. - smoothstep(.0, .35, abs(fract(lon / 10. + .5) - .5) * 10. / (w * 57.3 * 1.4));
  float t30 = 1. - smoothstep(.0, .5, abs(fract(lon / 30. + .5) - .5) * 30. / (w * 57.3 * 1.6));
  float eclA = (ecl * .9 + inBand * (t10 * .35 + t30 * .9)) * appear;
  col += vec3(.86, .9, .97) * eclA * .55; a += eclA * .45;
  float eq = greatCircle(n, vec3(0, 0, 1), w) * .35 * appear;
  col += vec3(.55, .65, .8) * eq; a += eq * .4;
  // сетка: часовые круги через 2 ч и параллели ±30°, ±60° — как на настоящей небесной сфере
  float ra = atan(n.y, n.x), dec = asin(clamp(n.z, -1., 1.));
  float cosd = max(cos(dec), .05);
  float mer = exp(-pow(abs(fract(ra / (PI / 6.) + .5) - .5) * (PI / 6.) * cosd / w, 2.));
  float par = exp(-pow(abs(fract(dec / (PI / 6.) + .5) - .5) * (PI / 6.) / w, 2.)) * step(.2, abs(dec));
  float grid = max(mer, par) * .16 * appear;
  col += vec3(.5, .6, .76) * grid; a += grid * .25;
  // планеты
  for (int i = 0; i < 10; i++) {
    vec3 P = u_pl[i];
    float d = length(n - P);
    float hl = i == u_hl ? 1. : 0.;
    float r = w * (i == 0 ? 9. : i == 1 ? 6.5 : i == 5 || i == 6 ? 5.2 : 4.4) * (1. + hl * .5);
    vec3 pc = i == 0 ? vec3(1., .95, .86) : i == 1 ? vec3(.92, .95, 1.) : vec3(.78, .86, .98);
    float g = exp(-d * d / (r * r)) + .35 * exp(-d / (r * 2.5));
    float ring = hl * exp(-pow((d - r * 3.2) / (w * 1.2), 2.));
    float k = smoothstep(.6 + float(i) * .08, 1.2 + float(i) * .08, u_enter);
    col += pc * (g * (i == 0 ? 2.4 : 1.6) + ring) * k;
    a += (g + ring) * k;
  }
  col *= back; a *= back;
  return col;
}

void main() {
  vec2 p = viewPx();
  float half_ = .5 * min(u_res.x, u_res.y);
  vec2 uv = (p - .5 * u_res) / half_;
  vec3 ro = u_cam, rd = normalize(u_cf * u_fl + uv.x * u_cr + uv.y * u_cu);
  float D = length(u_cam);
  // угловой размер одного пикселя на сфере
  float w = .9 * u_px / (half_ * u_fl / sqrt(D * D - 1.));
  vec3 sun = normalize(u_pl[0]);
  float appear = smoothstep(0., 1.4, u_enter);

  vec3 col = vec3(0); float alpha = 0.;
  // мягкое свечение вокруг сферы
  float dmin = length(cross(ro, rd));
  float halo = exp(-max(dmin - 1., 0.) * 14.) * .1 * appear;
  col += vec3(.32, .45, .68) * halo; alpha += halo * .8;

  vec2 hs = sph(ro, rd, 1.);
  vec2 he = sph(ro, rd, RE);
  // ось мира — тонкий стержень через полюса, за Землёй не виден
  {
    vec3 ax = vec3(0, 0, 1);
    vec3 w0 = ro; float b = dot(rd, ax), d = dot(rd, w0), e = dot(ax, w0);
    float den = 1. - b * b;
    float tr = (b * e - d) / max(den, 1e-4), ta = (e - b * d) / max(den, 1e-4);
    float dist = length((ro + rd * tr) - ax * ta);
    float onAxis = step(abs(ta), 1.18) * step(0., tr);
    if (he.x > 0. && tr > he.x) onAxis = 0.;
    float axl = exp(-pow(dist / (w * 1.2), 2.)) * onAxis * .5 * appear;
    col += vec3(.7, .78, .9) * axl; alpha += axl * .6;
  }
  if (hs.x > 0.) {
    vec3 n0 = normalize(ro + rd * hs.x), n1 = normalize(ro + rd * hs.y);
    vec4 acc = vec4(0.);
    if (he.x > 0.) {
      // Земля: день и ночь по настоящему направлению на Солнце, тонкая атмосфера
      vec3 ne = normalize(ro + rd * he.x);
      float day = dot(ne, sun);
      float lit = smoothstep(-.12, .3, day);
      float g = -u_gmst;
      vec3 er = vec3(ne.x * cos(g) - ne.y * sin(g), ne.x * sin(g) + ne.y * cos(g), ne.z);
      float tone = fbm3(er * 2.2, 4);
      vec3 ec = mix(vec3(.035, .075, .15), vec3(.07, .12, .19), smoothstep(.45, .65, tone));
      ec *= .12 + 1.6 * lit;
      ec += vec3(.9, .95, 1.) * pow(max(dot(reflect(rd, ne), sun), 0.), 30.) * .25 * lit;
      float rim = pow(1. - max(dot(ne, -rd), 0.), 2.4);
      ec += vec3(.32, .55, .95) * rim * (.12 + .88 * smoothstep(-.3, .4, day)) * .8;
      float ra = u_gmst + u_city.y;
      vec3 cv = vec3(cos(u_city.x) * cos(ra), cos(u_city.x) * sin(ra), sin(u_city.x));
      float cd = length(ne - cv);
      ec += vec3(.95, .97, 1.) * exp(-cd * cd / (w * w * 9. / (RE * RE))) * .9;
      acc = vec4(ec * appear, appear);
    } else {
      float ab; vec3 bc = shellMarks(n1, w, .3, ab);
      acc = vec4(bc, clamp(ab, 0., 1.)) * appear;
    }
    // оболочки нет — только тонкая кромка сферы
    float fres = pow(1. - max(dot(n0, -rd), 0.), 5.);
    float ga = fres * .35 * appear;
    acc = vec4(vec3(.45, .58, .82) * ga + acc.rgb * (1. - ga), ga + acc.a * (1. - ga));
    float fa; vec3 fc = shellMarks(n0, w, 1., fa);
    acc.rgb += fc * appear;
    acc.a = clamp(acc.a + fa * appear, 0., 1.);
    col = acc.rgb + col * (1. - acc.a);
    alpha = acc.a + alpha * (1. - acc.a);
  }
  o = vec4(dither(col, p), clamp(alpha, 0., 1.));
}
