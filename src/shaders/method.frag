// 07 — «Как мы считаем»: обсерватория (фото-слой) и армиллярная сфера, просчитанная лучом:
// кольца вращаются с разными скоростями, при входе в секцию собираются, свет из окна меняется на прокрутке.
uniform sampler2D u_room; uniform float u_roomOk;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1, 0, 0, 0, c, s, 0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0, -s, 0, 1, 0, s, 0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0, -s, c, 0, 0, 0, 1); }
float sdTorus(vec3 p, float R, float r) { vec2 q = vec2(length(p.xz) - R, p.y); return length(q) - r; }
// плоское кольцо-лента (как обод со шкалой)
float sdBand(vec3 p, float R, float w, float th) { vec2 q = vec2(length(p.xz) - R, p.y); vec2 d = abs(q) - vec2(th, w); return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdCap(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdCyl(vec3 p, float r, float h) { vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }

float T, ASM[6];
// сцена: возвращает расстояние; id — деталь (для материала и рисок)
vec2 scene(vec3 p) {
  float tilt = .409; // наклон эклиптики к экватору
  vec2 res = vec2(1e5, 0.);
  // меридиан — неподвижный вертикальный обод
  float d = sdBand(rotX(PI * .5) * (rotY(.0) * p), 1.08, .028, .022);
  if (d < res.x) res = vec2(d, 1.);
  // горизонт — широкий плоский обод
  d = sdBand(p - vec3(0., -.02, 0.), 1.16, .012, .05);
  if (d < res.x) res = vec2(d, 2.);
  // всё внутреннее — вокруг оси мира, наклонённой к горизонту
  vec3 q = rotZ(-.6) * p;
  // экватор и колюры — медленно вращаются, при сборке прилетают с поворотом
  float a0 = T * .05 + (1. - ASM[0]) * 2.2;
  d = sdTorus(rotY(a0) * q, .92 + (1. - ASM[0]) * .25, .022);
  if (d < res.x) res = vec2(d, 3.);
  float a1 = T * .05 + (1. - ASM[1]) * -1.8;
  d = sdTorus(rotX(PI * .5) * (rotY(a1) * q), .9 + (1. - ASM[1]) * .3, .018);
  if (d < res.x) res = vec2(d, 3.);
  d = sdTorus(rotZ(PI * .5) * (rotY(a1) * q), .88, .016 * ASM[2] + .001);
  if (d < res.x) res = vec2(d, 3.);
  // эклиптика — лента со шкалой, вращается своим темпом
  vec3 qe = rotX(tilt + (1. - ASM[3]) * .9) * (rotY(-T * .11 + (1. - ASM[3]) * 3.) * q);
  d = sdBand(qe, .8, .07, .016);
  if (d < res.x) res = vec2(d, 4.);
  // внутреннее кольцо Луны
  vec3 qm = rotX(tilt + .09) * (rotY(T * .19 + (1. - ASM[4]) * -2.5) * q);
  d = sdTorus(qm, .62 * (.6 + .4 * ASM[4]), .012);
  if (d < res.x) res = vec2(d, 3.);
  // ось и Земля в центре
  d = sdCap(q, vec3(0., -1.2, 0.), vec3(0., 1.2, 0.), .014);
  if (d < res.x) res = vec2(d, 5.);
  d = min(length(q - vec3(0., 1.22, 0.)), length(q + vec3(0., 1.22, 0.))) - .035;
  if (d < res.x) res = vec2(d, 5.);
  d = length(q) - .13 * (.4 + .6 * ASM[5]);
  if (d < res.x) res = vec2(d, 6.);
  // подставка
  d = sdCyl(p - vec3(0., -1.42, 0.), .035, .26);
  if (d < res.x) res = vec2(d, 5.);
  d = sdCyl(p - vec3(0., -1.7, 0.), .42, .035);
  if (d < res.x) res = vec2(d, 7.);
  d = sdCyl(p - vec3(0., -1.64, 0.), .3, .03);
  if (d < res.x) res = vec2(d, 7.);
  return res;
}
vec3 normalAt(vec3 p) {
  vec2 e = vec2(.0015, -.0015);
  return normalize(e.xyy * scene(p + e.xyy).x + e.yyx * scene(p + e.yyx).x + e.yxy * scene(p + e.yxy).x + e.xxx * scene(p + e.xxx).x);
}
float softShadow(vec3 ro, vec3 rd) {
  float res = 1., t = .02;
  for (int i = 0; i < 18; i++) {
    float h = scene(ro + rd * t).x;
    res = min(res, 9. * h / t);
    t += clamp(h, .02, .25);
    if (res < .02 || t > 3.) break;
  }
  return clamp(res, 0., 1.);
}

void main() {
  vec2 p = viewPx();
  float a = u_res.x / u_res.y;
  vec2 q = viewQ(p);
  float portrait = 1. - smoothstep(.75, 1.2, a);
  // на телефоне инструмент — в первом экране секции, в пикселях от её верха (секция длинная)
  float topQ = .5 - 232. * u_px / u_res.y;
  T = u_time;
  for (int i = 0; i < 6; i++) ASM[i] = ease3((u_enter - .2 - float(i) * .22) / 1.9);
  float pr = u_prog;

  // интерьер — фото-слой «по размеру», слева затемнён под текст
  vec2 ruv = coverUV(q, a, 1.833, vec2(mix(.6, .66, portrait), .4));
  vec4 room = plate(u_room, ruv);
  vec3 col = room.rgb * u_roomOk * vec3(.8, .86, .98);
  col = mix(vec3(.02, .03, .05), col, room.a * u_roomOk);
  // свет из окна усиливается к середине прокрутки и уходит дальше
  float beamK = .35 + .65 * sin(clamp(pr, 0., 1.) * PI);
  vec2 bq = q - vec2(a * mix(.22, .1, portrait), mix(.38, topQ + .05, portrait));
  vec2 bd = normalize(vec2(-.42, -1.));
  float along = dot(bq, bd), across = dot(bq, vec2(-bd.y, bd.x));
  float beam = smoothstep(.0, .2, along) * exp(-across * across / (.012 + along * .03)) * exp(-along * .9);
  float motes = 0.;
  if (u_q > .5) {
    vec2 mp = (p / u_px + vec2(0., T * 6.)) / 7.;
    vec2 gi = floor(mp), gf = fract(mp) - .5;
    float h = hash12(gi);
    motes = step(.93, h) * exp(-dot(gf, gf) * 40.) * (.5 + .5 * sin(T * 1.7 + h * 30.));
  }
  col += vec3(.45, .55, .7) * beam * (.16 + motes * 1.6 * smoothstep(.05, .4, beam)) * beamK;
  // слева темнее — тексту нужен спокойный фон

  // армиллярная сфера справа (на телефоне — сверху)
  vec2 ac = mix(vec2(a * .22, -.1), vec2(0., topQ), portrait);
  float scale = mix(.25, 150. * u_px / u_res.y / .63, portrait);
  // контактная тень основания на полу — инструмент стоит, а не висит
  vec2 base = ac + vec2(.02 * scale, -1.76 * .52 * scale);
  vec2 sd = (q - base) / (vec2(.62, .1) * .52 * scale * 1.6);
  vec2 sd2 = sd * vec2(.5, .8) - vec2(.25, 0.);
  col *= 1. - .55 * exp(-dot(sd, sd) * 1.6) - .25 * exp(-dot(sd2, sd2) * 1.2);
  // слева (на телефоне — ниже инструмента) темнее: тексту нужен спокойный фон
  float below = smoothstep(.5 - 430. * u_px / u_res.y, .5 - 500. * u_px / u_res.y, q.y);
  float textSide = mix(smoothstep(.15 * a, -.45 * a, q.x), below * .9, portrait);
  col *= 1. - .62 * textSide;
  vec2 uv = (q - ac) / scale;
  vec3 ro = vec3(0., .25, 4.6);
  vec3 rd = normalize(vec3(uv, -2.4) + vec3(0., -.05, 0.));
  float yaw = .35;
  ro = rotY(yaw) * ro; rd = rotY(yaw) * rd;
  // ограничивающая сфера
  float b = dot(ro, rd), c0 = dot(ro, ro) - 3.6, h0 = b * b - c0;
  if (h0 > 0.) {
    float t = max(-b - sqrt(h0), 0.), tEnd = -b + sqrt(h0);
    int steps = u_q > 1.5 ? 90 : u_q > .5 ? 64 : 44;
    vec2 hit = vec2(-1.);
    for (int i = 0; i < 90; i++) {
      if (i >= steps) break;
      vec2 s = scene(ro + rd * t);
      if (s.x < .0012 * t) { hit = vec2(t, s.y); break; }
      t += s.x * .9;
      if (t > tEnd) break;
    }
    if (hit.x > 0.) {
      vec3 pos = ro + rd * hit.x, n = normalAt(pos);
      vec3 Lm = normalize(vec3(-.45, .5, -.72));  // луна из окна за инструментом — контровой
      vec3 Ll = normalize(vec3(-.9, .12, .4));    // лампа на столе слева — тёплая, слабая
      float id = hit.y;
      // латунь с патиной: пятна зеленоватого окисла
      float pat = smoothstep(.45, .75, fbm3(pos * 7., 3));
      vec3 brass = mix(vec3(.62, .47, .27), vec3(.33, .37, .31), pat * .6);
      vec3 alb = id == 4. ? brass * 1.08 : id == 6. ? vec3(.22, .3, .4) : id == 7. ? vec3(.2, .16, .11) : brass;
      // риски на эклиптике
      if (id == 4.) {
        vec3 q2 = rotX(.409) * (rotY(-T * .11 + (1. - ASM[3]) * 3.) * (rotZ(-.6) * pos));
        float ang = atan(q2.z, q2.x) / TAU * 72.;
        alb *= .75 + .4 * smoothstep(.42, .5, abs(fract(ang) - .5));
      }
      float sh = u_q > .5 ? softShadow(pos + n * .004, Ll) : 1.;
      float shm = u_q > 1.5 ? softShadow(pos + n * .004, Lm) : 1.;
      vec3 V = -rd;
      float dm = max(dot(n, Lm), 0.), dl = max(dot(n, Ll), 0.);
      float spm = pow(max(dot(reflect(-Lm, n), V), 0.), 36.), spl = pow(max(dot(reflect(-Ll, n), V), 0.), 24.);
      float rim = pow(1. - max(dot(n, V), 0.), 3.);
      float ao = clamp(scene(pos + n * .06).x / .06, 0., 1.);
      // отражение комнаты: размытый кусок фото рядом с точкой, смещённый по отражённому лучу
      vec3 R = reflect(rd, n);
      vec2 hq = ac + (pos.xy - vec2(0., .25)) * .52 * scale;
      vec2 anc = vec2(mix(.6, .66, portrait), .4);
      vec3 env = textureLod(u_room, coverUV(hq + R.xy * .22, a, 1.833, anc), 4.5).rgb * u_roomOk;
      vec3 amb = textureLod(u_room, coverUV(hq, a, 1.833, anc), 7.).rgb * u_roomOk;
      float fres = .35 + .65 * pow(1. - max(dot(n, V), 0.), 4.);
      vec3 lc = alb * (amb * 1.4 * (.5 + .5 * ao) + vec3(.5, .62, .85) * dm * shm * .35 * (.6 + beamK) + vec3(.9, .7, .45) * dl * sh * .3);
      lc += env * mix(alb, vec3(1.), .25) * fres * 1.6 * ao;
      // контровой свет из окна по кромкам и блики
      lc += vec3(.62, .74, .95) * rim * smoothstep(-.2, .6, dot(n, Lm)) * .55 * (.5 + beamK);
      lc += mix(alb, vec3(1.), .4) * (vec3(.7, .82, 1.) * spm * shm * (.6 + beamK) + vec3(1., .8, .55) * spl * sh * .35);
      col = lc;
    } else {
      // тень инструмента на полу не рисуем; лёгкое свечение вокруг сферы от окна
      col += vec3(.3, .38, .5) * exp(-dot(uv, uv) * .9) * .04 * beamK;
    }
  }
  col += (hash12(p + fract(T * 13.) * 91.) - .5) * .022; // зерно, как у фото
  // мягкие края вида
  float fadePx = 120. * u_px;
  float edge = smoothstep(0., fadePx, p.y) * smoothstep(0., fadePx, u_res.y - p.y);
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
