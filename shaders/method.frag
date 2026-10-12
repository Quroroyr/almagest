// 07 — «Как мы считаем»: кабинет обсерватории с армиллярной сферой (фотография).
// Живой здесь свет, а не предметы: при входе в секцию лунный свет разгорается, в луче из окна
// плывут пылинки, в окне мерцают звёзды, по латуни медленно проходит блик; на прокрутке свет из окна
// усиливается к середине секции и уходит дальше.
uniform sampler2D u_room; uniform float u_roomOk;
uniform float u_vh; // высота экрана в долях секции

// точки снимка (доли кадра, y — сверху): окно, луна, сфера, пятно света на полу
const vec2 WIN_A = vec2(.505, .04), WIN_B = vec2(.69, .52);
const vec2 MOON = vec2(.597, .137);
const vec2 SPHERE = vec2(.68, .37);
const vec2 FLOOR = vec2(.68, .9);

void main() {
  vec2 p = viewPx();
  float a = u_res.x / u_res.y;
  vec2 q = viewQ(p);
  // секция длиннее экрана: «портрет» определяется по пропорции экрана, а не секции
  float portrait = 1. - smoothstep(.75, 1.2, a / max(u_vh, .05));
  float T = u_time;
  float pr = u_prog;

  // снимок: на широком экране закрывает вид целиком; на телефоне — полосой в первом экране секции
  // (высотой ~500 CSS px, сфера по центру), ниже уходит в темноту под текст
  vec2 ruv;
  float stripQ = 500. * u_px / u_res.y;
  if (portrait > .5) {
    float pw = stripQ * 1.833;
    float anc = clamp((SPHERE.x * pw - a * .5) / max(pw - a, 1e-3), 0., 1.);
    ruv = plateUV(q, a, 1.833, pw, anc, .5 - stripQ, vec2(0.));
  } else {
    // по высоте экрана (с запасом), по центру секции; если экран шире снимка — по ширине
    float hq = max(u_vh, .35) * 1.08;
    float pw = max(a, hq * 1.833);
    ruv = plateUV(q, a, 1.833, pw, .62, -pw / 1.833 * .5, vec2(0.));
  }
  vec4 room = plate(u_room, ruv);
  room.a *= smoothstep(0., .1, ruv.y) * smoothstep(1., .9, ruv.y); // верх и низ снимка уходят в темноту
  vec2 im = vec2(ruv.x, 1. - ruv.y); // координаты снимка, y сверху

  // вход: свет разгорается из темноты за ~2 с; прокрутка: луна ярче к середине секции
  float on = ease3((u_enter - .1) / 2.2);
  float beamK = .55 + .45 * sin(clamp(pr, 0., 1.) * PI);
  vec3 col = room.rgb * u_roomOk * vec3(.84, .9, 1.) * (.25 + .75 * on);

  // латунь (тёплое и светлое на снимке) — по ней медленно проходит блик
  vec3 c = room.rgb;
  float brass = smoothstep(.06, .2, c.r - c.b) * smoothstep(.18, .45, dot(c, vec3(.33)));
  float sweep = sin((im.x * 2.2 - im.y * 1.1) * 6. - T * .35);
  col += c * brass * pow(max(sweep, 0.), 14.) * .55 * on * u_roomOk;

  // звёзды в окне: только по тёмно-синему небу снимка
  float inWin = step(WIN_A.x, im.x) * step(im.x, WIN_B.x) * step(WIN_A.y, im.y) * step(im.y, WIN_B.y);
  float skyPix = smoothstep(.08, .2, c.b - c.r) * smoothstep(.5, .3, dot(c, vec3(.33))) * inWin;
  if (skyPix > 0. && u_q > .5) {
    vec2 sp = im * vec2(1.833, 1.) * 260.;
    vec2 gi = floor(sp), gf = fract(sp) - .5;
    float h = hash12(gi);
    float tw = .5 + .5 * sin(T * (1.3 + h * 2.) + h * 40.);
    col += vec3(.75, .85, 1.) * step(.985, h) * exp(-dot(gf, gf) * 18.) * tw * skyPix * .5 * on;
  }
  // луна в окне дышит ореолом
  vec2 dm = (im - MOON) * vec2(1.833, 1.);
  col += vec3(.55, .66, .85) * exp(-dot(dm, dm) * 260.) * (.06 + .03 * sin(T * .4)) * beamK * on * u_roomOk;

  // лунный луч от окна к полу и пылинки в нём
  vec2 bA = vec2(.6, .3), bB = FLOOR + vec2(-.07, 0.);
  vec2 ba = (bB - bA) * vec2(1.833, 1.), pa = (im - bA) * vec2(1.833, 1.);
  float tb = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  float dist = length(pa - ba * tb);
  float wid = mix(.05, .2, tb);
  float beam = exp(-dist * dist / (wid * wid)) * smoothstep(0., .15, tb) * smoothstep(1., .75, tb);
  col += vec3(.42, .52, .7) * beam * .07 * beamK * on * u_roomOk;
  if (u_q > .5 && beam > .02) {
    float motes = 0.;
    for (int k = 0; k < 2; k++) {
      float fk = float(k);
      vec2 mp = im * vec2(1.833, 1.) * (90. + fk * 55.) + vec2(T * (.6 + fk * .3), T * (1.4 + fk * .5));
      vec2 gi = floor(mp), gf = fract(mp) - .5;
      float h = hash12(gi + fk * 17.);
      gf += (vec2(hash12(gi + 3.1), hash12(gi + 7.7)) - .5) * .6;
      motes += step(.9, h) * exp(-dot(gf, gf) * 70.) * (.4 + .6 * sin(T * 1.5 + h * 50.));
    }
    col += vec3(.7, .8, 1.) * motes * beam * .5 * beamK * on;
  }

  // слева (на телефоне — ниже снимка) темнее: тексту нужен спокойный фон
  float below = smoothstep(.5 - stripQ * .78, .5 - stripQ, q.y);
  float textSide = mix(smoothstep(.12 * a, -.42 * a, q.x), below, portrait);
  col *= 1. - mix(.58, 1., portrait) * textSide;
  col = mix(vec3(.016, .027, .05), col, room.a * u_roomOk + (1. - u_roomOk));

  col += (hash12(p + fract(T * 13.) * 91.) - .5) * .02; // зерно, как у фото
  // мягкие края вида
  float fadePx = 120. * u_px;
  float edge = smoothstep(0., fadePx, p.y) * smoothstep(0., fadePx, u_res.y - p.y);
  col = mix(vec3(.016, .027, .05), col, edge);
  o = vec4(dither(col, p), 1.);
}
