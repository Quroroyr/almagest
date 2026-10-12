// 03 — «Небо сегодня»: геоцентрическая сцена. Земля в центре освещена Солнцем с его настоящего направления
// и повёрнута по звёздному времени (день и ночь — на настоящих странах); вокруг в плоскости эклиптики —
// условные орбиты, а угол каждого тела на своей орбите — его настоящая эклиптическая долгота.
// Все экранные положения считает JS (src/app.js, раздел «Небо сегодня»); шейдер только рисует.
uniform sampler2D u_mw; uniform float u_mwOk;       // панорама Млечного Пути
uniform sampler2D u_day; uniform float u_dayOk;     // Земля днём
uniform sampler2D u_aux; uniform float u_auxOk;     // R — огни городов, G — облака, B — океан
uniform sampler2D u_atlas; uniform float u_atlasOk; // планеты 4×4 по 512×256
uniform sampler2D u_lab;                            // подписи (своя текстура из JS)
uniform sampler2D u_cseg;                           // отрезки созвездий, px вида: x1 y1 x2 y2
uniform vec4 u_cbox[12];                            // рамки созвездий для быстрого отсева
uniform vec2 u_crange[12];                          // диапазон отрезков созвездия
uniform int u_ncon;
uniform vec2 u_ec; uniform float u_er;              // центр и радиус Земли, px
uniform mat3 u_M;                                   // мир → экваториальные координаты
uniform float u_gmst, u_cloud;                      // звёздное время; дрейф облаков, рад
uniform vec3 u_sunW;                                // направление от Земли на Солнце (мир)
uniform vec3 u_cityW;                               // город на поверхности Земли (мир)
uniform vec2 u_orb;                                 // наклон плоскости орбит на экране: поворот, сжатие
uniform vec2 u_bo[10];                              // орбита тела: радиус px, угол на орбите
uniform vec4 u_bp[10];                              // тело: центр px, радиус px, глубина (+ к зрителю)
uniform vec3 u_bl[10];                              // свет на тело (мир)
uniform int u_hl;                                   // выделенное тело (−1)
uniform float u_hlA;
uniform vec4 u_lb[24];                              // подписи: центр px, размер px
uniform vec4 u_luv[24];                             // область подписи в текстуре
uniform vec4 u_lc[24];                              // цвет и прозрачность подписи
uniform int u_nlab;
uniform float u_play;                               // идёт ли время (для мелкой жизни сцены)

// атлас: 0 Луна, 1 Меркурий, 2 Венера, 3 Марс, 4 Юпитер, 5 Сатурн, 6 Уран, 7 Нептун, 8 Солнце, 9 Плутон, 10 кольцо
const int SLOT[10] = int[10](8, 0, 1, 2, 3, 4, 5, 6, 7, 9);   // тело → ячейка атласа
const float SPIN[10] = float[10](.004, 0., .015, .004, .02, .06, .05, .04, .04, .01);
vec3 atlas(int slot, vec2 uv, float lod) {
  vec2 cell = vec2(float(slot % 4), float(slot / 4));
  uv = clamp(uv, vec2(.006, .02), vec2(.994, .98));
  // uv — в координатах картинки (v вниз); текстура залита с переворотом по Y
  vec2 t = (cell + uv) / vec2(4., 4.);
  t.y = 1. - t.y;
  return textureLod(u_atlas, t, lod).rgb;
}
vec4 atlasRing(float x) {
  vec2 t = (vec2(2., 2.) + vec2(clamp(x, .01, .99), .5)) / vec2(4., 4.);
  t.y = 1. - t.y;
  return textureLod(u_atlas, t, 0.);
}

vec3 background(vec2 p, vec2 q) {
  float t = u_time;
  // панорама: галактическая полоса идёт по диагонали позади Земли; очень медленный дрейф
  vec2 rel = (p - u_ec) / u_res.y;
  float ang = -.5; vec2 r = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * rel;
  vec2 uv = vec2(.43 + r.x * .2 + t * .00015, .5 + r.y * .42);
  vec3 mw = texture(u_mw, uv).rgb * u_mwOk;
  vec3 col = vec3(.008, .012, .024) + mw * vec3(.8, .9, 1.05) * 1.35;
  // облака межзвёздной пыли: тёмные прожилки по полосе и холодная дымка
  float band = exp(-r.y * r.y * 9.);
  // пылевые облака и дымка — на среднем и высоком уровне; на низком остаётся сама панорама
  if (u_q > .5) {
    int O = oct(5);
    float dust = fbm(r * 3.2 + vec2(t * .002, 0.) + 7.3, O);
    float neb = fbm(r * 1.6 - vec2(t * .0015, 0.) + 2.1, O);
    col *= 1. - .55 * smoothstep(.5, .78, dust) * band;
    col += vec3(.06, .085, .14) * smoothstep(.45, .85, neb) * (.35 + band) * .6;
    if (u_q > 1.5) col += vec3(.1, .07, .13) * smoothstep(.62, .9, fbm(r * 2.4 + 11., O)) * band * .25;
  }
  // редкие яркие звёзды с мягким ореолом и тонкими лучами
  vec2 sp = p / u_px;
  vec2 g = floor(sp / 90.), f = sp - g * 90.;
  float h = hash12(g + 17.3);
  if (h < .18) {
    vec2 c = 14. + hash22(g + 3.1) * 62.;
    vec2 d = f - c; float dd = length(d);
    float m = pow(hash12(g + 9.7), 3.);
    float tw = .85 + .15 * sin(t * (1.2 + h * 4.) + h * 50.);
    float core = exp(-dd * dd / (1.2 + m * 2.));
    float halo = exp(-dd / (2.5 + m * 5.)) * .35;
    float spike = u_q < .5 ? 0. : (exp(-abs(d.x) * 1.4) * exp(-abs(d.y) / (6. + m * 22.)) + exp(-abs(d.y) * 1.4) * exp(-abs(d.x) / (6. + m * 22.))) * m;
    vec3 tint = mix(vec3(.75, .85, 1.), vec3(1., .92, .82), hash12(g + 5.5));
    col += tint * (core + halo + spike * .5) * (.35 + m * 1.6) * tw;
  }
  if (u_q > .5) col += starLayer(sp + 300., 28., .35, 4.4, t, .35);
  return col;
}

// созвездия зодиака: тонкие линии и звёзды-узлы
float constellations(vec2 p, out float stars) {
  float s = 0.; stars = 0.;
  for (int c = 0; c < 12; c++) {
    if (c >= u_ncon) break;
    vec4 b = u_cbox[c];
    if (p.x < b.x || p.y < b.y || p.x > b.z || p.y > b.w) continue;
    int i0 = int(u_crange[c].x), i1 = int(u_crange[c].y);
    for (int i = 0; i < 24; i++) {
      int k = i0 + i; if (k >= i1) break;
      vec4 sg = texelFetch(u_cseg, ivec2(k, 0), 0);
      float d = segDist(p, sg.xy, sg.zw) / u_px;
      s = max(s, exp(-d * d * 1.2));
      float e = min(length(p - sg.xy), length(p - sg.zw)) / u_px;
      stars = max(stars, exp(-e * e * .35));
    }
  }
  return s;
}

void main() {
  vec2 p = viewPx();
  vec2 q = viewQ(p);
  float t = u_time;
  vec3 col = background(p, q);
  float cs; float cl = constellations(p, cs);
  col += vec3(.6, .7, .86) * cl * .2 + vec3(.85, .9, 1.) * cs * .5;

  // плоскость орбит
  float rot = u_orb.x, sq = u_orb.y;
  vec2 rp = p - u_ec;
  vec2 pp = mat2(cos(-rot), sin(-rot), -sin(-rot), cos(-rot)) * rp; // в осях эллипса
  float k = length(vec2(pp.x, pp.y / sq));
  vec2 grad = vec2(pp.x / max(k, 1.), pp.y / (sq * sq * max(k, 1.)));
  float gl = max(length(grad), 1e-3);
  float phi = atan(pp.y / sq, pp.x);
  bool front = pp.y < 0.;
  float earthD = length(p - u_ec) / u_er;
  float orbBack = 0., orbFront = 0.;
  for (int i = 0; i < 10; i++) {
    float d = abs(k - u_bo[i].x) / gl / u_px;
    float line = exp(-d * d * 1.1);
    if (line < .01) continue;
    float behind = mod(u_bo[i].y - phi + PI * 3., TAU) - PI; // >0 — позади тела по ходу
    float trail = behind > 0. ? exp(-behind * 3.2) : 0.;
    float hl = (i == u_hl) ? u_hlA : 0.;
    float a = line * (.1 + .32 * trail + .45 * hl);
    if (front) orbFront = max(orbFront, a); else if (earthD > 1.) orbBack = max(orbBack, a);
  }
  col += vec3(.62, .72, .88) * orbBack;

  // тела: ищем ближайшее к зрителю под пикселем
  int hit = -1; float hitZ = -1e9;
  for (int i = 0; i < 10; i++) {
    vec4 b = u_bp[i];
    if (length(p - b.xy) < b.z && b.w > hitZ) { hit = i; hitZ = b.w; }
  }
  // Сатурн: кольца — задняя половина до диска, передняя после
  vec4 sb = u_bp[6];
  vec2 rq = p - sb.xy; float rr = 0.; vec2 rpS = vec2(0.);
  {
    float ra = -.42, rsq = .34;
    rpS = mat2(cos(-ra), sin(-ra), -sin(-ra), cos(-ra)) * rq;
    rr = length(vec2(rpS.x, rpS.y / rsq)) / sb.z;
  }
  vec4 ring = (rr > 1.22 && rr < 2.25) ? atlasRing((rr - 1.22) / 1.03) : vec4(0.);
  vec3 ringC = ring.rgb * (.35 + .75 * max(dot(normalize(vec3(rpS, 0.) + 1e-4), u_bl[6]) * .5 + .5, .2));
  float ringA = ring.a * u_atlasOk * .9;
  bool satBehindEarth = sb.w < 0. && length(sb.xy - u_ec) < u_er;
  if (rpS.y > 0. && !satBehindEarth) col = mix(col, ringC, ringA);

  vec3 bodyC = vec3(0.); float bodyA = 0.;
  if (hit >= 0) {
    vec4 b = u_bp[hit];
    vec2 d = (p - b.xy) / b.z; float r2 = dot(d, d);
    vec3 n = vec3(d, sqrt(max(1. - r2, 0.)));
    float sp = t * SPIN[hit] + float(hit) * 1.7;
    float lon = atan(n.x, n.z) + sp, lat = asin(clamp(n.y, -1., 1.));
    vec2 uv = vec2(fract(lon / TAU + .5), .5 - lat / PI);
    float lod = clamp(log2(256. / (PI * b.z * .5)), 0., 5.);
    vec3 alb = atlas(SLOT[hit], uv, lod) * u_atlasOk + (1. - u_atlasOk) * vec3(.5);
    if (hit == 0) {
      // Солнце: раскалённый диск
      vec3 sc = mix(vec3(1., .86, .66), vec3(1., .98, .94), smoothstep(.3, .9, dot(alb, vec3(.33))));
      bodyC = mix(sc, vec3(1.), .55 - .4 * r2) * (1.6 - .45 * r2);
    } else {
      float NdL = dot(n, u_bl[hit]);
      float lit = smoothstep(-.05, .5, NdL) * max(NdL, 0.) * .85 + smoothstep(-.05, .15, NdL) * .1;
      // слабая заливка неосвещённой стороны и холодный контровой край — тело не превращается в чёрный кружок
      bodyC = alb * ((hit == 1 ? .1 : .045) + 1.25 * lit) + vec3(.25, .32, .45) * pow(1. - n.z, 3.) * .25;
      // тонкая атмосфера у Венеры, Урана, Нептуна
      if (hit == 3 || hit == 7 || hit == 8) bodyC += vec3(.4, .55, .8) * pow(1. - n.z, 3.) * smoothstep(-.3, .4, NdL) * .4;
    }
    bodyA = smoothstep(1., .9, sqrt(r2));
    // за Землёй — не видно
    if (b.w < 0. && earthD < 1.) bodyA = 0.;
  }
  if (hit >= 0 && u_bp[hit].w < 0.) col = mix(col, bodyC, bodyA);

  // Земля
  float eA = 0.; vec3 eC = vec3(0.);
  if (earthD < 1.) {
    vec2 d = (p - u_ec) / u_er; float r2 = dot(d, d);
    vec3 n = vec3(d, sqrt(max(1. - r2, 0.)));
    vec3 e = u_M * n;
    float ra = atan(e.y, e.x), dec = asin(clamp(e.z, -1., 1.));
    float lon = ra - u_gmst;
    vec2 uv = vec2(fract(lon / TAU + .5), .5 + dec / PI);
    vec3 dayC = texture(u_day, uv).rgb;
    vec3 aux = texture(u_aux, uv).rgb;
    float cld = texture(u_aux, vec2(fract(uv.x - u_cloud), uv.y)).g;
    float NdL = dot(n, u_sunW);
    float dayK = smoothstep(-.1, .22, NdL);
    float lit = max(NdL, 0.);
    // тень облаков: облако со стороны Солнца
    float cshadow = u_q > .5 ? texture(u_aux, vec2(fract(uv.x - u_cloud - .0015), uv.y + .001)).g : 0.;
    vec3 surf = pow(dayC * u_dayOk + (1. - u_dayOk) * vec3(.05, .1, .2), vec3(1.15)) * (.012 + 1.35 * pow(lit, .75));
    surf *= 1. - cshadow * .35 * dayK;
    // блик солнца на воде
    vec3 hv = normalize(u_sunW + vec3(0., 0., 1.));
    surf += vec3(1., .94, .84) * pow(max(dot(n, hv), 0.), 70.) * aux.b * lit * .9 * u_auxOk;
    surf += vec3(.5, .62, .8) * pow(max(dot(n, hv), 0.), 12.) * aux.b * lit * .06 * u_auxOk;
    // облака
    vec3 cc = vec3(.96, .97, 1.) * (.02 + 1.2 * pow(lit, .8)) + vec3(.03, .04, .06) * (1. - dayK);
    surf = mix(surf, cc, cld * .9 * u_auxOk);
    // огни городов на ночной стороне
    float lights = pow(aux.r, 1.7) * (1. - dayK) * (1. - cld * .75) * u_auxOk;
    surf += vec3(1., .72, .42) * lights * 1.6;
    // сумерки у границы дня — едва тёплые
    surf += vec3(.4, .22, .1) * exp(-pow((NdL - .03) / .07, 2.)) * .12 * (1. - cld * .5);
    // атмосфера: дымка к краю диска на дневной стороне
    float rim = pow(1. - n.z, 2.2);
    vec3 atm = vec3(.32, .55, 1.) * (.1 + .9 * smoothstep(-.3, .4, NdL));
    surf = mix(surf, atm * (.25 + lit), rim * .55);
    surf += atm * pow(1. - n.z, 6.) * .5;
    // город — маленькая светлая точка
    if (u_cityW.z > 0.) {
      vec2 cp = u_ec + u_cityW.xy * u_er;
      float cdd = length(p - cp) / u_px;
      surf += vec3(.92, .96, 1.) * (exp(-cdd * cdd * .35) + exp(-pow(cdd - 6., 2.) * .6) * .5) * .9;
    }
    eC = surf; eA = smoothstep(1., .995, earthD);
  }
  col = mix(col, eC, eA);
  // внешний атмосферный обод — сильнее со стороны Солнца
  if (earthD > .98) {
    vec2 dn = normalize(p - u_ec);
    float side = dot(vec3(dn, 0.), u_sunW);
    float hpx = (earthD - 1.) * u_er / u_px;
    float halo = exp(-max(hpx, 0.) / 9.) * .8 + exp(-max(hpx, 0.) / 45.) * .18;
    col += vec3(.3, .52, 1.) * halo * (.15 + .85 * smoothstep(-.6, .5, side)) * smoothstep(.98, 1.005, earthD);
  }

  col += vec3(.68, .78, .92) * orbFront * (earthD < 1. ? .45 : 1.) * (1. - bodyA * step(0., hit >= 0 ? u_bp[hit].w : -1.));
  if (hit >= 0 && u_bp[hit].w >= 0.) col = mix(col, bodyC, bodyA);
  if (rpS.y <= 0. && !satBehindEarth) col = mix(col, ringC, ringA);

  // Солнце: корона и мягкий свет вокруг (если не за Землёй)
  {
    vec4 s = u_bp[0];
    float occ = (s.w < 0. && length(s.xy - u_ec) < u_er * .98) ? 0. : 1.;
    float dd = length(p - s.xy) / s.z;
    float ang = atan(p.y - s.xy.y, p.x - s.xy.x);
    float rays = .6 + .4 * fbm(vec2(ang * 3., t * .05), 3);
    float corona = exp(-max(dd - 1., 0.) * 2.2) * rays * .9 + exp(-max(dd - 1., 0.) * .5) * .22 + exp(-dd * .12) * .05;
    // шесть мягких лучей и горизонтальный блик — как у яркой звезды на снимке
    vec2 rel = p - s.xy;
    float spikes = 0.;
    for (int k = 0; k < 3; k++) { float a = float(k) * PI / 3. + .3; vec2 dir = vec2(cos(a), sin(a)); float al = abs(dot(rel, vec2(-dir.y, dir.x))); spikes += exp(-al / (s.z * .05)) * exp(-length(rel) / (s.z * 5.)); }
    float streak = exp(-pow(rel.y / (s.z * .14), 2.)) * exp(-abs(rel.x) / (s.z * 11.)) * .35;
    col += vec3(1., .9, .76) * (corona + streak + spikes * .35) * occ * step(1., dd);
  }

  // выделенное тело: тонкое кольцо и чуть больше света вокруг
  if (u_hl >= 0) {
    vec4 b = u_bp[u_hl];
    float dd = length(p - b.xy) / u_px - (b.z / u_px + 7.);
    col += vec3(.8, .88, 1.) * exp(-dd * dd * .5) * .7 * u_hlA;
    col += vec3(.5, .6, .8) * exp(-length(p - b.xy) / (b.z * 2.2)) * .12 * u_hlA;
  }

  // подписи
  for (int i = 0; i < 24; i++) {
    if (i >= u_nlab) break;
    vec4 lb = u_lb[i];
    vec2 rel = p - lb.xy;
    if (abs(rel.x) > lb.z * .5 || abs(rel.y) > lb.w * .5) continue;
    vec2 f = rel / lb.zw + .5;
    vec4 uvr = u_luv[i];
    float a = texture(u_lab, vec2(mix(uvr.x, uvr.z, f.x), mix(uvr.w, uvr.y, f.y))).a;
    col = mix(col, u_lc[i].rgb, a * u_lc[i].a);
  }

  // мягкие края вида — без шва с соседними секциями
  float fadePx = 120. * u_px;
  float edge = smoothstep(0., fadePx, p.y) * smoothstep(0., fadePx, u_res.y - p.y);
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
