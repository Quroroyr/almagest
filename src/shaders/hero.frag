// 01 — первый экран: ночное небо, Луна с направленным светом, облака двумя слоями,
// дымка, дальние горы и терраса обсерватории (отдельные слои), созвездия и переход к карте.
uniform sampler2D u_far; uniform float u_farOk;
uniform sampler2D u_near; uniform float u_nearOk;
uniform vec3 u_cs[24];   // звёзды созвездий: xy — доли вида, z — яркость 0…1
uniform int u_ncs;
uniform vec2 u_cl[24];   // линии: индексы звёзд
uniform int u_ncl;
uniform int u_sel;       // звезда, которая раскрывается в круг карты
uniform float u_open;    // 0…1 — переход «Открыть карту»
uniform float u_hover;   // 0…1 — наведение на кнопку: звезда отзывается

vec2 toQ(vec2 f, float a) { return (f - .5) * vec2(a, 1.); }

// облачность: деформированный фрактальный шум
float cloudField(vec2 q, float t, float sc, vec2 vel, float seed, int o) {
  vec2 p = q * sc + vel * t;
  vec2 w = vec2(fbm(p * .55 + seed, 3), fbm(p * .55 + seed + 5.2, 3));
  return fbm(p + 1.7 * w + vec2(0., t * .01), o);
}
// кратеры: ячеистый шум — яркий вал и тёмная чаша
vec2 craters(vec2 p) {
  vec2 g = floor(p), f = fract(p); float rim = 0., bowl = 0.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = vec2(i, j), h = hash22(g + c);
    if (h.x > .3) continue;
    float r = .18 + .3 * h.y;
    float d = length(c + h * .8 + .1 - f) / r;
    rim += smoothstep(.75, 1., d) * smoothstep(1.25, 1., d) * (.6 + h.y);
    bowl += smoothstep(1., .55, d) * (.5 + h.y);
  }
  return vec2(rim, bowl);
}

void main() {
  vec2 p = viewPx();
  float a = u_res.x / u_res.y;
  vec2 q = viewQ(p);
  float t = u_time;
  float e = u_enter;
  // слои картинки от курсора не двигаются; курсор даёт только мягкий свет и сдвиг звёздной пыли
  vec2 m = vec2(0.);
  float portrait = 1. - smoothstep(.75, 1.2, a);
  int O = oct(5);

  // режиссура появления: 0–0.8 тьма, 0.8–2.5 контур Луны и редкие звёзды, потом созвездия
  float skyA = smoothstep(.0, 1.1, e);
  float starsA1 = smoothstep(.8, 2.4, e), starsA2 = smoothstep(1.6, 3.4, e), starsA3 = smoothstep(2.4, 4.2, e);
  float contourA = smoothstep(.8, 1.7, e);
  float fillA = smoothstep(1.5, 3.2, e);
  float landA = smoothstep(.4, 2.2, e);

  // Луна: справа сверху; на телефоне — выше и меньше
  vec2 mc = mix(vec2(a * .5 - .38, .1), vec2(a * .2, .17), portrait) + m * vec2(.006, .004);
  float R = mix(.285, .165, portrait);

  // небо: к горизонту светлее и холоднее
  vec3 col = mix(vec3(.034, .056, .092), vec3(.006, .011, .024), smoothstep(-.42, .5, q.y));
  col += vec3(.06, .09, .13) * exp(-pow((q.y + .2) * 3.2, 2.)) * .55;
  float dmc = length(q - mc);
  col += vec3(.26, .32, .42) * exp(-max(dmc - R, 0.) * 3.) * .2 * fillA;
  col *= skyA;

  // Млечный Путь: полоса с тёмными прожилками пыли
  vec2 dir = normalize(vec2(1., -.62));
  vec2 rel = q - vec2(-.15, .26);
  float perp = dot(rel, vec2(-dir.y, dir.x));
  float band = exp(-perp * perp * 11.);
  float mw = fbm(q * 2.8 + vec2(3.1, 1.7), O);
  float dust = fbm(q * 6.5 + vec2(11., 4.), O);
  vec3 mwc = vec3(.5, .58, .72) * band * (.25 + .5 * mw) * (1. - .75 * smoothstep(.42, .72, dust));
  col += mwc * .2 * starsA2;

  // звёзды трёх планов; планы чуть смещаются за указателем
  vec2 sp = p / u_px;
  col += starLayer(sp + m * 6., 46., .5, 1.3, t, 1.) * starsA1;
  col += starLayer(sp + m * 3. + 300., 22., .45, 7.1, t, .55) * starsA2;
  if (u_q > .5) col += starLayer(sp + m * 1.5 + 700., 12., .35, 3.7, t, .3) * starsA3 * (.4 + band * .9);

  // звёздная пыль: мелкие частицы расходятся от указателя как от лёгкого ветра, без рывков
  vec2 mq = toQ(u_mouse, a);
  vec2 away = q - mq; float fall = exp(-dot(away, away) * 26.) * u_mouseOn;
  vec2 dq = normalize(away + 1e-4) * fall * .018;
  vec2 dp = (q - dq) * u_res.y / u_px;
  float dustA = starsA3 * (.35 + band * .7);
  col += starLayer(dp * 1.0 + vec2(91., 13.), 9., .22, 9.9, t * 2., .22) * dustA;

  // Луна
  vec2 d = (q - mc) / R; float r2 = dot(d, d), r = sqrt(r2);
  if (r < 1.) {
    vec3 n = vec3(d, sqrt(1. - r2));
    // свет справа сверху; блик медленно гуляет
    vec3 L = normalize(vec3(.78 + .06 * sin(t * .045), .3 + .05 * cos(t * .037), .52));
    float lam = max(dot(n, L), 0.);
    vec2 s = vec2(atan(n.x, n.z), asin(n.y));
    float mar = fbm(s * 1.5 + vec2(4.2, 1.3), 4);
    float maria = smoothstep(.46, .58, mar) * (.75 + .25 * fbm(s * 5. + 2., 3));
    vec2 cr = craters(s * 6.) * .8 + craters(s * 15. + 3.) * .4;
    float grain = fbm(s * 22., 3);
    float alb = mix(.92, .46, maria) * (.9 + .16 * grain) + cr.x * .08 * (1. - maria) - cr.y * .045;
    float lit = pow(lam, .8);
    vec3 mcol = vec3(.9, .93, .97) * alb * (.008 + 1.1 * lit);
    mcol += vec3(.03, .045, .07) * (1. - lit) * .35; // пепельный свет
    float edge = smoothstep(1., .985, r);
    col = mix(col, mcol, edge * fillA);
  }
  // контур проявляется первым
  float ringPx = abs(r - 1.) * R * u_res.y / u_px;
  col += vec3(.75, .82, .92) * exp(-ringPx * ringPx * .6) * contourA * (1. - fillA * .75) * .7;
  // ореол
  col += vec3(.55, .64, .78) * exp(-max(r - 1., 0.) * 7.) * .16 * fillA * step(1., r);

  // облака: дальний слой медленный, ближний быстрее и проходит по низу Луны
  float lightAt = exp(-dmc * 2.4);
  vec2 cursorL = (q - mq); float cl = exp(-dot(cursorL, cursorL) * 9.) * u_mouseOn * .08;
  float b1 = exp(-pow((q.y + .1) / .17, 2.));
  float n1 = cloudField(q + m * .01, t, 2.1, vec2(.012, 0.), 1.3, O);
  float c1 = smoothstep(.4, .68, n1) * b1;
  vec3 cc1 = mix(vec3(.1, .12, .16), vec3(.7, .75, .84), clamp(lightAt * 1.15 + cl, 0., 1.)) * mix(1., .55, smoothstep(.6, .9, n1));
  col = mix(col, cc1, c1 * .85 * landA);
  float b2 = exp(-pow((q.y - (mc.y - R * .78)) / .13, 2.));
  float n2 = cloudField(q + m * .016 + vec2(0., .02), t, 3.3, vec2(.022, .002), 7.7, O);
  float c2 = smoothstep(.42, .7, n2) * b2;
  vec3 cc2 = mix(vec3(.08, .1, .14), vec3(.8, .85, .92), clamp(lightAt * 1.2 + cl, 0., 1.)) * mix(1., .5, smoothstep(.6, .9, n2));
  col = mix(col, cc2, c2 * .82 * landA);

  // дальние горы — фото-слой; на них ложится холодная дымка
  vec2 farUV = plateUV(q, a, 1.833, mix(1., 1.35, portrait) * a + mix(0., .6, portrait), .52, mix(-.64, -.6, portrait), m * vec2(.008, .003));
  vec4 far = plate(u_far, farUV);
  vec3 farC = far.rgb * vec3(.78, .84, .95) * .82;
  float hz = smoothstep(.2, -.25, q.y);
  farC = mix(farC, vec3(.07, .1, .15), .22 + .25 * hz);
  col = mix(col, farC, far.a * u_farOk * landA);

  // туман в долине, перед горами
  float mist = smoothstep(.42, .82, fbm(q * vec2(2.2, 7.) + vec2(t * .018, 0.) + m * .02, O)) * exp(-pow((q.y + .2) / .1, 2.));
  col = mix(col, vec3(.3, .36, .45) * (.5 + lightAt * .4), mist * .4 * landA);

  // терраса обсерватории — ближний слой
  vec2 nearUV = plateUV(q, a, 1.833, a + mix(0., .75, portrait), mix(.2, .44, portrait), -.6 + mix(0., -.02, portrait), m * vec2(.022, .006));
  vec4 near = plate(u_near, nearUV);
  near.a *= smoothstep(1., .9, nearUV.y);
  vec3 nearC = near.rgb * vec3(.82, .87, .97) * .78;
  nearC += vec3(.25, .3, .38) * lightAt * .12;
  col = mix(col, nearC, near.a * u_nearOk * landA);

  // созвездия: точки, затем линии вычерчиваются по очереди
  float qpx = u_res.y / u_px;
  for (int i = 0; i < 24; i++) {
    if (i >= u_ncs) break;
    vec2 c = toQ(u_cs[i].xy, a) + m * vec2(.009, .006);
    float br = u_cs[i].z;
    float appear = smoothstep(2.0 + float(i) * .03, 2.8 + float(i) * .03, e);
    float dpx = length(q - c) * qpx;
    float isSel = (i == u_sel) ? 1. : 0.;
    float rr = 1.1 + br * 1.4 + isSel * (u_hover * 1.2 + u_open * 3.);
    col += vec3(.86, .91, 1.) * (exp(-dpx * dpx / (rr * rr)) + .4 * exp(-dpx / (rr * 4.))) * (.35 + .9 * br) * appear;
    if (i == u_sel) col += vec3(.8, .86, .95) * exp(-dpx / (10. + 30. * u_open)) * (.18 * u_hover + 1.2 * u_open) * appear;
  }
  for (int i = 0; i < 24; i++) {
    if (i >= u_ncl) break;
    vec2 A = toQ(u_cs[int(u_cl[i].x)].xy, a) + m * vec2(.009, .006);
    vec2 B = toQ(u_cs[int(u_cl[i].y)].xy, a) + m * vec2(.009, .006);
    float pr = ease3((e - 2.7 - float(i) * .14) / .5);
    if (pr <= 0.) continue;
    float dl = segDist(q, A, mix(A, B, pr)) * qpx;
    col += vec3(.62, .72, .86) * exp(-dl * dl * 1.4) * .32;
  }

  // «Открыть карту»: небо гаснет, выбранная звезда раскрывается кругами карты с рисками
  if (u_open > 0.) {
    vec2 sc = toQ(u_cs[u_sel].xy, a) + m * vec2(.009, .006);
    float k = ease3(u_open);
    col *= 1. - .78 * smoothstep(0., .55, u_open);
    vec2 rel2 = q - sc; float rd = length(rel2) * qpx;
    float ang = atan(rel2.y, rel2.x);
    float R1 = k * 1.15 * u_res.y / u_px, R2 = R1 * .86, R3 = R1 * .6;
    float fade = 1. - smoothstep(.75, 1., u_open);
    vec3 ringC = vec3(.82, .88, .96);
    col += ringC * (exp(-pow(rd - R1, 2.) * .5) + exp(-pow(rd - R2, 2.) * .5) * .8 + exp(-pow(rd - R3, 2.) * .6) * .55) * fade;
    // риски градусов между внешними кругами
    float deg = ang / TAU * 360.;
    float tick = 1. - smoothstep(.0, .09, abs(fract(deg / 5. + .5) - .5) * 5. * (rd / max(R1, 1.)) * .9);
    float band30 = 1. - smoothstep(0., .06, abs(fract(deg / 30. + .5) - .5) * 30. * (rd / max(R1, 1.)) * .9);
    float inBand = step(R2, rd) * step(rd, R1);
    float inLong = step(R3, rd) * step(rd, R1);
    col += ringC * (tick * inBand * .35 + band30 * inLong * .45) * fade;
    col += vec3(.9, .94, 1.) * exp(-rd / (6. + 40. * k)) * fade * .6;
  }

  o = vec4(dither(col, p), 1.);
}
