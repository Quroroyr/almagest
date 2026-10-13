// 02 — «Вселенная в тебе»: глубокий космос в несколько планов, планеты на своих орбитах
// с настоящим соотношением скоростей (закон Кеплера), на прокрутке камера опускается через туман к долине.
uniform sampler2D u_valley; uniform float u_valleyOk;
uniform float u_sp;  // прокрутка внутри «липкой» сцены, 0…1
uniform int u_hl;    // подсвеченное светило: 0 — Солнце, 1 — Луна, 2… — планеты

// большие полуоси, а.е. — для угловых скоростей; Луна идёт вместе с Землёй
const float AU[10] = float[10](0., 1., .387, .723, 1.524, 5.203, 9.537, 19.19, 30.07, 39.48);
const float SIZE[10] = float[10](0., .016, .014, .026, .019, .068, .056, .035, .034, .011);
const float OFF[10] = float[10](0., .05, .22, -.2, .14, -.12, .2, -.16, .1, -.22);
// радиусы орбит на экране — в долях расстояния от Солнца до центра кадра; [1] — орбита Земли (с Луной)
const float RK[10] = float[10](0., .82, .66, .74, .9, 1., 1.1, 1.19, 1.27, 1.34);

vec3 surface(int i, vec3 n, float t) {
  // поворот поверхности вокруг оси планеты
  float sp = t * (i >= 5 && i <= 8 ? .05 : .02);
  vec3 m = vec3(n.x * cos(sp) - n.z * sin(sp), n.y, n.x * sin(sp) + n.z * cos(sp));
  float lat = n.y;
  if (i == 5 || i == 6) { // газовые гиганты: полосы с вихрями
    float turb = fbm3(m * vec3(2., 6., 2.) + float(i), 4);
    float bands = sin(lat * (i == 5 ? 18. : 13.) + turb * 3.2);
    vec3 a = i == 5 ? vec3(.62, .58, .52) : vec3(.66, .63, .56);
    vec3 b = i == 5 ? vec3(.44, .39, .34) : vec3(.55, .52, .46);
    return mix(a, b, .5 + .5 * bands) * (.92 + .16 * turb);
  }
  if (i == 7 || i == 8) { // ледяные: ровные, холодные
    float bands = sin(lat * 7. + fbm3(m * 3., 3) * 1.5);
    return (i == 7 ? vec3(.58, .7, .74) : vec3(.36, .48, .66)) * (.94 + .06 * bands);
  }
  if (i == 3) return vec3(.78, .74, .64) * (.9 + .12 * fbm3(m * 3.5, 4)); // Венера: сплошные облака
  // твёрдые: Луна, Меркурий, Марс, Плутон
  float r = fbm3(m * 5. + float(i) * 3.1, 5);
  vec3 base = i == 4 ? vec3(.55, .4, .33) : i == 9 ? vec3(.62, .58, .54) : vec3(.6, .6, .62);
  return base * (.68 + .5 * r);
}

void main() {
  vec2 p = viewPx();
  float a = u_res.x / u_res.y;
  vec2 q = viewQ(p);
  float t = u_time;
  float sp = u_sp;
  int O = oct(5);
  float portrait = 1. - smoothstep(.75, 1.2, a);

  // камера опускается: дальние планы смещаются меньше
  float cam = sp * 1.15;
  vec3 col = mix(vec3(.004, .008, .018), vec3(.02, .033, .058), smoothstep(.5, -.6, q.y + cam * .2));
  vec2 dir = normalize(vec2(1., -1.25));
  float perp = dot(q - vec2(.05, .05 + cam * .15), vec2(-dir.y, dir.x));
  float band = exp(-perp * perp * 7.);
  float mw = fbm(q * 2.2 + vec2(1.3, cam * .4), O), dust = fbm(q * 5.5 + vec2(7., cam * .9), O);
  col += vec3(.45, .52, .66) * band * (.2 + .55 * mw) * (1. - .8 * smoothstep(.45, .72, dust)) * .3;
  vec2 spx = p / u_px;
  float H = u_res.y / u_px;
  col += starLayer(spx + vec2(0., cam * H * .08), 50., .5, 2.1, t, 1.);
  col += starLayer(spx + vec2(0., cam * H * .18) + 300., 24., .45, 5.3, t, .55);
  if (u_q > .5) col += starLayer(spx + vec2(0., cam * H * .34) + 800., 12., .4, 8.7, t, .3) * (.5 + band);

  // Солнце — за кадром слева сверху; от него свет и орбиты
  vec2 S = vec2(-a * .5 - .55, .95) + vec2(0., cam * .55);
  float dS = length(q - S);
  float sunHl = u_hl == 0 ? 1. : 0.;
  col += vec3(.75, .8, .88) * exp(-dS * 1.4) * (.16 + .2 * sunHl);
  col += vec3(.95, .9, .82) * exp(-dS * 4.) * (.08 + .12 * sunHl);

  vec2 toC = -S; float dc = length(toC); float thc = atan(toC.y, toC.x);
  float pxQ = u_px / u_res.y;
  // орбиты, ореолы и поиск тела под пикселем — в цикле; поверхность красится один раз после него
  int hitI = -1; vec2 hitC = vec2(0.); float hitR = 1.;
  vec2 satC = vec2(9.); float satR = 1.;
  for (int i = 1; i < 10; i++) {
    float rad = dc * RK[i];
    float w = .0175 / pow(max(AU[i], .3), 1.5); // рад/с: период Земли ≈ 6 минут
    float th = thc + OFF[i] - t * w;
    vec2 c = S + rad * vec2(cos(th), sin(th));
    vec2 earth = c;
    if (i == 1) c = earth + .045 * vec2(cos(t * .3), sin(t * .3)); // Луна обходит Землю
    float depth = float(i) / 9.;
    vec2 lift = vec2(0., cam * (.25 + .35 * (1. - depth)));
    float zoom = 1. + sp * .12 * (1. - depth);
    c = (c + lift) * zoom;
    float R = SIZE[i] * mix(1., .8, portrait);
    // орбита: тонкая линия, ярче позади планеты (след)
    vec2 oc = S + lift;
    float dl = abs(length(q - oc) - rad) / pxQ;
    float behind = mod(atan(q.y - oc.y, q.x - oc.x) - th + PI * 3., TAU) - PI;
    float trail = behind > 0. ? exp(-behind * 5.) : 0.;
    col += vec3(.55, .65, .8) * exp(-dl * dl * .9) * (.07 + .22 * trail + (u_hl == i ? .25 : 0.));
    float rr = length(q - c) / R;
    if (u_hl == i) col += vec3(.7, .78, .9) * exp(-pow((rr - 1.6) * R / pxQ * .35, 2.)) * .5 + vec3(.5, .6, .75) * exp(-max(rr - 1., 0.) * 2.) * .12;
    if (rr < 1.) { hitI = i; hitC = c; hitR = R; }
    if (i == 6) { satC = c; satR = R; }
    if (i == 1) {
      vec2 ec = (earth + lift) * zoom;
      float RE = .02 * mix(1., .8, portrait);
      if (length(q - ec) < RE) { hitI = 10; hitC = ec; hitR = RE; }
    }
  }
  // кольца Сатурна: задняя половина — до диска, передняя — поверх
  vec2 rq = q - satC; float tilt = .3;
  vec2 rp = vec2(rq.x * .94 + rq.y * .34, (-rq.x * .34 + rq.y * .94) / tilt) / satR;
  float rr = length(rp);
  float ringA = 0.;
  if (rr > 1.25 && rr < 2.3) ringA = (.35 + .4 * sin(rr * 22.) * sin(rr * 7.)) * smoothstep(1.25, 1.35, rr) * smoothstep(2.3, 2.15, rr) * (1. - smoothstep(1.66, 1.7, rr) * smoothstep(1.78, 1.74, rr));
  vec2 Ls = normalize(S - satC);
  float ringLit = .45 + .4 * dot(normalize(rp + 1e-4), vec2(Ls.x, Ls.y * tilt));
  if (ringA > 0. && rp.y > 0.) col = mix(col, vec3(.7, .67, .6) * ringLit, ringA * .8);
  if (hitI > 0) {
    vec2 d = (q - hitC) / hitR; float r2 = dot(d, d);
    vec3 n = vec3(d, sqrt(max(1. - r2, 0.)));
    vec3 L = normalize(vec3(normalize(S - hitC) * .95, .35));
    float lam = dot(n, L);
    float lit = smoothstep(-.06, .5, lam) * max(lam, 0.) * .9 + smoothstep(-.06, .2, lam) * .12;
    vec3 pc;
    if (hitI == 10) { // Земля: океан и облака
      pc = mix(vec3(.08, .16, .3), vec3(.75, .8, .86), smoothstep(.55, .75, fbm3(n * 3. + vec3(t * .02, 0., 0.), 4))) * (.015 + lit);
      pc += vec3(.3, .5, .85) * pow(1. - n.z, 3.) * smoothstep(-.3, .4, lam) * .5;
    } else {
      pc = surface(hitI, n, t) * (.012 + 1.05 * lit);
      // тонкая атмосфера у Венеры и ледяных
      if (hitI == 3 || hitI == 7 || hitI == 8) pc += vec3(.35, .5, .7) * pow(1. - n.z, 3.) * smoothstep(-.3, .4, lam) * .35;
    }
    col = mix(col, pc, smoothstep(1., .96, sqrt(r2)));
  }
  if (ringA > 0. && rp.y <= 0.) col = mix(col, vec3(.7, .67, .6) * ringLit, ringA * .85);

  // туман: на второй половине прокрутки камера проходит сквозь невысокий слой
  // облака рваные, клочьями (деформированный шум), а не ровной лентой; полупрозрачные, звёзды сквозь них видны
  float fogY = mix(-1.3, 1.2, smoothstep(.4, .95, sp));
  vec2 fq = q * vec2(1.1, 2.4) + vec2(t * .012, sp * 1.1);
  vec2 wq = vec2(fbm(fq * .6 + 3.1, 3), fbm(fq * .6 + 8.4, 3));
  float fogN = fbm(fq + wq * 1.8, O);
  float env = exp(-pow((q.y - fogY) / .45, 2.)) * smoothstep(.36, .5, sp);
  float fog = smoothstep(.48, .86, fogN) * env;
  col = mix(col, vec3(.12, .15, .2) * (.75 + .5 * fogN), fog * .55);

  // долина появляется под туманом
  float vy = mix(-1.55, -.62, smoothstep(.55, 1., sp));
  vec2 vuv = plateUV(q, a, 1.833, a + mix(0., .9, portrait), .5, vy, vec2(0.));
  vec4 val = plate(u_valley, vuv);
  val.a *= smoothstep(0., .14, vuv.y); // нижний край снимка уходит в темноту, а не обрывается
  vec3 vc = val.rgb * vec3(.78, .84, .95) * .85;
  vc = mix(vc, vec3(.1, .13, .18), .25);
  col = mix(col, vc, val.a * u_valleyOk);
  // остатки тумана над долиной
  vec2 lq = q * vec2(1.8, 5.) + vec2(t * .015, 0.);
  float low = smoothstep(.5, .85, fbm(lq + 1.5 * vec2(fbm(lq * .5, 3), fbm(lq * .5 + 4.3, 3)), O)) * exp(-pow((q.y - vy - .42) / .14, 2.)) * smoothstep(.6, .95, sp);
  col = mix(col, vec3(.24, .29, .36), low * .35);

  // верхний край вида сливается с первым экраном
  float edge = smoothstep(0., 200. * u_px, u_res.y - p.y) * smoothstep(0., 90. * u_px, p.y); // и нижний — со следующей секцией
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
