// 09 — финал: ночное озеро. Небо и комета — процедурные; берег — фото-слой; вода отражает
// и небо, и берег (зеркально по линии воды) с рябью; комета пролетает один раз после входа в сцену.
uniform sampler2D u_shore; uniform float u_shoreOk;
uniform float u_comet; // секунды с начала пролёта, −1 — ещё не было

const float WL = .108;   // линия воды в картинке берега (доля высоты снизу)
float A_, YW;            // соотношение сторон и линия горизонта

vec2 cometPos(float k) { // путь кометы: справа сверху — влево вниз, чуть выпукло
  vec2 p0 = vec2(A_ * .48, .44), p1 = vec2(-A_ * .12, .14);
  vec2 m = mix(p0, p1, .5) + vec2(0., .08);
  return (1. - k) * (1. - k) * p0 + 2. * (1. - k) * k * m + k * k * p1;
}
float cometK() { return u_comet < 0. ? -1. : u_comet / 3.6; }

vec3 skyAt(vec2 q, vec2 p, bool refl) {
  float t = u_time;
  vec3 col = mix(vec3(.035, .055, .09), vec3(.006, .011, .024), smoothstep(YW, .5, q.y));
  col += vec3(.07, .1, .15) * exp(-pow((q.y - YW) * 6., 2.)) * .6;
  // Млечный Путь дугой через всё небо
  vec2 dir = normalize(vec2(1., .55));
  float perp = dot(q - vec2(.0, .22), vec2(-dir.y, dir.x));
  float band = exp(-perp * perp * 9.);
  int O = refl ? 3 : oct(5);
  float mw = fbm(q * 2.5 + 2.2, O), dust = fbm(q * 6. + 9., O);
  col += vec3(.52, .58, .72) * band * (.25 + .6 * mw) * (1. - .8 * smoothstep(.42, .72, dust)) * .34;
  vec2 sp = p / u_px;
  col += starLayer(sp, 44., .55, 4.4, t, 1.);
  col += starLayer(sp + 500., 20., .5, 6.6, t, .5) * (.5 + band);
  if (!refl && u_q > .5) col += starLayer(sp + 900., 11., .4, 8.8, t, .25) * (.4 + band * 1.2);
  // комета: голова, пылевой и ионный хвосты, след на небе растворяется
  float k = cometK();
  if (k >= 0.) {
    float kk = clamp(k, 0., 1.);
    float e = kk * kk * (3. - 2. * kk);
    vec2 H = cometPos(e), H2 = cometPos(max(e - .02, 0.));
    vec2 mv = normalize(H - H2 + vec2(1e-5));
    vec2 rel = q - H;
    float along = dot(rel, -mv), across = dot(rel, vec2(-mv.y, mv.x));
    float vis = smoothstep(0., .12, k) * (1. - smoothstep(.9, 1.15, k));
    float pxq = u_px / u_res.y;
    float head = exp(-dot(rel, rel) / (pxq * pxq * 9.)) + .5 * exp(-length(rel) / (pxq * 14.));
    float wd = .004 + along * .06, curve = along * along * .9;
    float dustT = along > 0. ? exp(-pow((across - curve) / wd, 2.)) * exp(-along * 4.) : 0.;
    float ionT = along > 0. ? exp(-pow(across / (.0025 + along * .02), 2.)) * exp(-along * 2.6) : 0.;
    col += (vec3(1., .97, .92) * head * 1.4 + vec3(.9, .9, .88) * dustT * .55 + vec3(.6, .75, 1.) * ionT * .45) * vis;
    // след вдоль пройденного пути гаснет за несколько секунд
    float fade = clamp(1. - (u_comet - 3.6) / 4., 0., 1.);
    float bestD = 1e3, bestK = 0.;
    for (int i = 0; i < 24; i++) { float s = float(i) / 23. * e; float d = length(q - cometPos(s)); if (d < bestD) { bestD = d; bestK = s; } }
    float trail = exp(-pow(bestD / (pxq * 2.2), 2.)) * smoothstep(0., .5, e - bestK) * (1. - smoothstep(.0, .5, e - bestK) * .6);
    col += vec3(.7, .78, .9) * trail * .35 * (k < 1. ? 1. : fade);
    // отсвет на небе вокруг кометы
    col += vec3(.25, .3, .4) * exp(-length(rel) * 9.) * .25 * vis;
  }
  return col;
}

void main() {
  vec2 p = viewPx();
  float a = u_res.x / u_res.y; A_ = a;
  vec2 q = viewQ(p);
  float t = u_time;
  float portrait = 1. - smoothstep(.75, 1.2, a);
  YW = mix(-.14, -.06, portrait);
  vec3 col;
  // берег: ширина «по экрану», линия воды на YW
  float pw = a + mix(0., 1.1, portrait), ph = pw / 2.816;
  float x0 = -a * .5 - (pw - a) * .7;
  vec2 m = vec2(0.);
  float k = cometK();
  float cl = k >= 0. ? clamp(1. - (u_comet - 3.6) / 3., 0., 1.) * smoothstep(0., .2, k) : 0.;
  vec2 H = k >= 0. ? cometPos(clamp(k, 0., 1.) * clamp(k, 0., 1.) * (3. - 2. * clamp(k, 0., 1.))) : vec2(9.);

  if (q.y >= YW) {
    col = skyAt(q, p, false);
    // редкие облака над горами — подсвечиваются кометой
    float cb = exp(-pow((q.y - YW - .16) / .07, 2.));
    float cn = smoothstep(.55, .8, fbm(q * vec2(2.2, 7.) + vec2(t * .01, 0.), oct(5))) * cb;
    vec3 cc = vec3(.05, .07, .1) + vec3(.6, .66, .76) * exp(-length(q - H) * 3.) * cl * .8;
    col = mix(col, cc, cn * .7);
    vec2 uv = vec2((q.x - m.x * .01 - x0) / pw, (q.y - YW) / ph + WL);
    vec4 sh = plate(u_shore, uv);
    vec3 sc = sh.rgb * vec3(.8, .86, .97) * .85 + vec3(.5, .58, .7) * exp(-length(q - H) * 2.5) * cl * .2;
    col = mix(col, sc, sh.a * u_shoreOk);
  } else {
    // вода: отражение по линии горизонта, рябь сильнее вблизи
    float depth = YW - q.y;
    float fr = .55 + .35 * smoothstep(0., .4, depth);
    float rip = fbm(vec2(q.x * 18., depth * 90. / (depth * 6. + .4)) + vec2(0., t * .35), 4) - .5;
    float rip2 = noise(vec2(q.x * 60., depth * 300. / (depth * 8. + .5) + t * .8)) - .5;
    vec2 off = vec2(rip * .012 + rip2 * .004, rip * .004) * (.3 + depth * 3.);
    vec2 mq = vec2(q.x, 2. * YW - q.y) + off;
    vec2 mp = vec2(p.x, (YW + .5) * u_res.y * 2. - p.y) + off * u_res.y;
    vec3 rc = skyAt(mq, mp, true);
    vec2 uv = vec2((mq.x - m.x * .01 - x0) / pw, (mq.y - YW) / ph + WL);
    vec4 sh = plate(u_shore, uv);
    rc = mix(rc, sh.rgb * vec3(.8, .86, .97) * .8, sh.a * u_shoreOk);
    col = rc * fr * vec3(.82, .88, .95);
    col = mix(col, vec3(.012, .02, .035), smoothstep(.05, .5, depth) * .45);
    // широкий блик кометы на воде
    col += vec3(.55, .62, .75) * exp(-pow((q.x - H.x) * 3., 2.)) * exp(-depth * 5.) * cl * .18 * (.6 + rip * 2.);
    // кромка у берега
    col += vec3(.3, .36, .45) * exp(-depth * 260.) * .25;
  }
  // верх вида — из общего фона
  float edge = smoothstep(0., 140. * u_px, u_res.y - p.y);
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
