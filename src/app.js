(function () {
  'use strict';
  const { positions, angles, moonPhase, nextPhase, nextStation, eclipticFromEquatorial, aspectBetween, angDiff, norm } = window.Sky;
  const RAD = Math.PI / 180;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const css = getComputedStyle(document.documentElement);
  const C = name => css.getPropertyValue(name).trim();
  const COL = { lazur: C('--lazur'), deep: C('--lazur-deep'), night: C('--night'), engrave: C('--engrave'), ivory: C('--ivory'), dim: C('--ivory-dim'), star: C('--star'), madder: C('--madder'), gamboge: C('--gamboge'), verdigris: C('--verdigris') };
  const F = { display: '"Old Standard TT", "PT Serif", Georgia, serif', body: '"PT Serif", Georgia, serif', sym: '"Noto Sans Symbols", "Segoe UI Symbol", "Apple Symbols", serif' };
  const VS = '︎'; // текстовое начертание символов, не эмодзи

  // ——— справочники ———
  const SIGNS = [
    ['aries', 'Овен', 'в Овне', 'Овна', '♈', 'fire', '21.03 — 19.04', 'напор и первый шаг'],
    ['taurus', 'Телец', 'в Тельце', 'Тельца', '♉', 'earth', '20.04 — 20.05', 'основательность и вкус к жизни'],
    ['gemini', 'Близнецы', 'в Близнецах', 'Близнецов', '♊', 'air', '21.05 — 20.06', 'любопытство и лёгкое слово'],
    ['cancer', 'Рак', 'в Раке', 'Рака', '♋', 'water', '21.06 — 22.07', 'забота и память о своих'],
    ['leo', 'Лев', 'во Льве', 'Льва', '♌', 'fire', '23.07 — 22.08', 'щедрость и желание быть замеченным'],
    ['virgo', 'Дева', 'в Деве', 'Девы', '♍', 'earth', '23.08 — 22.09', 'точность и полезное дело'],
    ['libra', 'Весы', 'в Весах', 'Весов', '♎', 'air', '23.09 — 22.10', 'чувство меры и партнёрство'],
    ['scorpio', 'Скорпион', 'в Скорпионе', 'Скорпиона', '♏', 'water', '23.10 — 21.11', 'глубина и полная отдача'],
    ['sagittarius', 'Стрелец', 'в Стрельце', 'Стрельца', '♐', 'fire', '22.11 — 21.12', 'поиск смысла и простор'],
    ['capricorn', 'Козерог', 'в Козероге', 'Козерога', '♑', 'earth', '22.12 — 19.01', 'выдержка и длинная цель'],
    ['aquarius', 'Водолей', 'в Водолее', 'Водолея', '♒', 'air', '20.01 — 18.02', 'свобода и непривычный взгляд'],
    ['pisces', 'Рыбы', 'в Рыбах', 'Рыб', '♓', 'water', '19.02 — 20.03', 'сочувствие и воображение'],
  ].map(([key, name, loc, gen, glyph, el, dates, kw]) => ({ key, name, loc, gen, glyph: glyph + VS, el, dates, kw }));
  const EL = {
    fire: { name: 'огонь', wash: COL.madder, line: 'Энергия приходит от действия: лучше начать и поправить, чем долго ждать.' },
    earth: { name: 'земля', wash: COL.verdigris, line: 'Опора — в том, что можно потрогать и проверить.' },
    air: { name: 'воздух', wash: COL.gamboge, line: 'Силы дают общение, новые люди и идеи.' },
    water: { name: 'вода', wash: '#4f8fc0', line: 'Решения приходят через чувство, а не через таблицу.' },
  };
  const PL = {
    sun: { name: 'Солнце', glyph: '☉', frame: 'Ядро характера', dom: 'воля', mag: -26 },
    moon: { name: 'Луна', glyph: '☽', frame: 'Что даёт покой', dom: 'чувства', mag: -12 },
    mercury: { name: 'Меркурий', glyph: '☿', frame: 'Как думаешь и говоришь', dom: 'ум', mag: 0 },
    venus: { name: 'Венера', glyph: '♀', frame: 'Что и как любишь', dom: 'любовь', mag: -4 },
    mars: { name: 'Марс', glyph: '♂', frame: 'Как добиваешься своего', dom: 'действие', mag: 0.5 },
    jupiter: { name: 'Юпитер', glyph: '♃', frame: 'Где растёшь и где везёт', dom: 'удача', mag: -2 },
    saturn: { name: 'Сатурн', glyph: '♄', frame: 'Где учишься терпению', dom: 'дисциплина', mag: 0.7 },
    uranus: { name: 'Уран', glyph: '♅', frame: 'Где хочешь перемен', dom: 'свобода', mag: 5.7 },
    neptune: { name: 'Нептун', glyph: '♆', frame: 'О чём мечтаешь', dom: 'мечта', mag: 7.8 },
    pluto: { name: 'Плутон', glyph: '♇', frame: 'Где перерождаешься', dom: 'сила', mag: 14 },
  };
  for (const k in PL) PL[k].glyph += VS;
  const ORDER = Object.keys(PL);
  const BY_BRIGHT = ORDER.slice().sort((a, b) => PL[a].mag - PL[b].mag);
  // Грани знаков: у каждой планеты своя, поэтому на одной карте фразы не повторяются.
  // core — суть (им. п.), emo — что даёт покой (им. п.), mind — как работает ум (наречие),
  // love — что главное в любви (им. п.), act — чем добиваешься (тв. п.), grow — где везёт (придаточное),
  // less — урок (инфинитив), first — первое впечатление (им. п.). Демонстрационные формулировки.
  const FACETS = {
    aries: { core: 'смелость и первый шаг', emo: 'движение и честный разговор начистоту', mind: 'быстро и напрямую', love: 'азарт и честность', act: 'напором и скоростью', grow: 'нужно начать первым', less: 'доводить начатое до конца', first: 'энергичный человек, который не ждёт разрешения' },
    taurus: { core: 'надёжность и вкус к жизни', emo: 'привычный порядок, вкусная еда и тишина', mind: 'медленно, но основательно', love: 'верность и телесная близость', act: 'упорством — тихо, но без отступлений', grow: 'есть время довести дело до результата', less: 'отпускать то, что уже не работает', first: 'спокойный человек, рядом с которым надёжно' },
    gemini: { core: 'любопытство и живой ум', emo: 'разговор и новая информация', mind: 'быстро, по нескольким темам сразу', love: 'лёгкость и интересные разговоры', act: 'словом и смекалкой', grow: 'нужно учиться и знакомиться', less: 'углубляться, а не скользить по верхам', first: 'лёгкий собеседник с вопросом наготове' },
    cancer: { core: 'забота и чувство дома', emo: 'свои люди рядом и уютный угол', mind: 'через чувство и память', love: 'защищённость и нежность', act: 'в обход — мягко, но настойчиво', grow: 'можно заботиться о других', less: 'не прятаться в панцирь от перемен', first: 'мягкий человек, который всё замечает' },
    leo: { core: 'щедрость и желание сиять', emo: 'признание и тёплые слова', mind: 'ярко, с размахом и уверенно', love: 'восхищение и красивые жесты', act: 'уверенностью и личным примером', grow: 'можно вести за собой', less: 'делить сцену с другими', first: 'человек, которого сложно не заметить' },
    virgo: { core: 'точность и полезное дело', emo: 'порядок и понятный план', mind: 'аналитически, внимательно к мелочам', love: 'забота делом, а не словами', act: 'методично, шаг за шагом', grow: 'можно улучшать и чинить', less: 'принимать неидеальное', first: 'собранный человек с острым взглядом' },
    libra: { core: 'чувство меры и партнёрство', emo: 'гармония и красота вокруг', mind: 'взвешенно, видя обе стороны', love: 'равенство и изящество отношений', act: 'дипломатией и обаянием', grow: 'нужно договариваться', less: 'решать, а не только взвешивать', first: 'приятный человек с хорошим вкусом' },
    scorpio: { core: 'глубина и полная отдача', emo: 'доверие и откровенность без масок', mind: 'пристально, докапываясь до сути', love: 'страсть и абсолютная верность', act: 'выдержкой и точным ударом', grow: 'нужно пройти через кризис', less: 'отпускать контроль', first: 'сдержанный человек с внимательным взглядом' },
    sagittarius: { core: 'поиск смысла и простор', emo: 'дорога, свобода и большие планы', mind: 'широко, через идеи и смыслы', love: 'приключение и общие горизонты', act: 'энтузиазмом и верой в успех', grow: 'можно учиться, учить и путешествовать', less: 'доводить мечты до практики', first: 'открытый человек, с которым весело' },
    capricorn: { core: 'выдержка и длинная цель', emo: 'понятные правила и сделанная работа', mind: 'практично, с прицелом на результат', love: 'серьёзность и надёжность', act: 'терпением и дисциплиной', grow: 'можно строить долго и надёжно', less: 'разрешать себе отдых', first: 'серьёзный человек, на которого можно положиться' },
    aquarius: { core: 'свобода и непривычный взгляд', emo: 'друзья, общая идея и личное пространство', mind: 'нестандартно, на шаг впереди', love: 'дружба и уважение к свободе', act: 'идеей и командой', grow: 'нужно изобретать и объединять людей', less: 'быть рядом не только мыслями', first: 'необычный человек со своим мнением' },
    pisces: { core: 'сочувствие и воображение', emo: 'тишина, музыка и мечты', mind: 'образно, на интуиции', love: 'романтика и полное растворение', act: 'мягкостью и обходным путём', grow: 'можно помогать и творить', less: 'держать свои границы', first: 'мягкий человек с мечтательным взглядом' },
  };
  const FRAME = {
    sun: f => `Ядро характера — ${f.core}.`,
    moon: f => `Покой даёт ${f.emo}.`,
    mercury: f => `Ум работает ${f.mind}.`,
    venus: f => `В любви главное — ${f.love}.`,
    mars: f => `Своего добиваешься ${f.act}.`,
    jupiter: f => `Везёт там, где ${f.grow}.`,
    saturn: f => `Главный урок — ${f.less}.`,
    asc: f => `С первого взгляда — ${f.first}.`,
  };
  // сферы планет в трёх падежах; pl — множественное число для согласования глагола
  const DOM = {
    sun: { n: 'воля', a: 'волю', i: 'волей' }, moon: { n: 'чувства', a: 'чувства', i: 'чувствами', pl: true }, mercury: { n: 'ум', a: 'ум', i: 'умом' },
    venus: { n: 'любовь', a: 'любовь', i: 'любовью' }, mars: { n: 'действие', a: 'действие', i: 'действием' }, jupiter: { n: 'удача', a: 'удачу', i: 'удачей' },
    saturn: { n: 'дисциплина', a: 'дисциплину', i: 'дисциплиной' }, uranus: { n: 'свобода', a: 'свободу', i: 'свободой' }, neptune: { n: 'мечта', a: 'мечту', i: 'мечтой' },
    pluto: { n: 'сила', a: 'силу', i: 'силой' }, asc: { n: 'первое впечатление', a: 'первое впечатление', i: 'первым впечатлением' },
  };
  const vb = (d, one, many) => (d.pl ? many : one);
  const ASP_VARIANTS = {
    conj: [(A, B) => `${cap(A.n)} и ${B.n} сплавлены: действуют заодно.`, (A, B) => `${cap(A.n)} ${vb(A, 'усиливает', 'усиливают')} ${B.a} — иногда без тормозов.`, (A, B) => `${cap(A.n)} и ${B.n} неразделимы: одно не бывает без другого.`],
    trine: [(A, B) => `${cap(A.n)} и ${B.n} легко помогают друг другу.`, (A, B) => `${cap(A.n)} ${vb(A, 'поддерживает', 'поддерживают')} ${B.a} без всяких усилий.`, (A, B) => `Между ${A.i} и ${B.i} нет спора — это готовый ресурс.`],
    sext: [(A, B) => `${cap(A.n)} и ${B.n} дают шанс — если им воспользоваться.`, (A, B) => `${cap(A.n)} ${vb(A, 'подталкивает', 'подталкивают')} ${B.a}, но первый шаг за тобой.`, (A, B) => `Между ${A.i} и ${B.i} есть мостик: стоит по нему пройти.`],
    square: [(A, B) => `${cap(A.n)} и ${B.n} спорят; из этого трения растёт сила.`, (A, B) => `${cap(A.n)} ${vb(A, 'давит', 'давят')} на ${B.a} — отсюда напряжение и рост.`, (A, B) => `Между ${A.i} и ${B.i} вечный спор: он закаляет, если от него не прятаться.`],
    opp: [(A, B) => `${cap(A.n)} и ${B.n} тянут в разные стороны — нужен баланс.`, (A, B) => `${cap(A.n)} ${vb(A, 'смотрит', 'смотрят')} на ${B.a} как в зеркало: противоположности притягиваются.`, (A, B) => `Между ${A.i} и ${B.i} качели: важно не застревать на одном краю.`],
  };
  // выбирает ещё не использованную на странице формулировку
  function aspectSentence(key, a, b, used) {
    const list = ASP_VARIANTS[key];
    for (let k = 0; k < list.length; k++) {
      const s = list[(used[key] = (used[key] || 0) + 1) % list.length](DOM[a], DOM[b]);
      if (!used.set) used.set = new Set();
      if (!used.set.has(s)) { used.set.add(s); return s; }
    }
    return list[0](DOM[a], DOM[b]);
  }
  // знак аспекта той же формой линии, что в круге: трин — сплошная, секстиль — точки, квадрат — штрих, оппозиция — двойная
  function aspectMark(key) {
    const L = 'stroke="currentColor" stroke-width="1.6"';
    const body = {
      trine: `<line x1="2" y1="12" x2="30" y2="12" ${L}/>`,
      sext: `<line x1="3" y1="12" x2="30" y2="12" ${L} stroke-dasharray="1.2 4" stroke-linecap="round"/>`,
      square: `<line x1="2" y1="12" x2="30" y2="12" ${L} stroke-dasharray="7 4"/>`,
      opp: `<line x1="2" y1="10" x2="30" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="2" y1="14" x2="30" y2="14" stroke="currentColor" stroke-width="1.2"/>`,
      conj: `<line x1="2" y1="12" x2="30" y2="12" stroke="currentColor" stroke-width="4"/>`, // слияние — жирная сплошная
    }[key];
    return `<svg viewBox="0 0 32 24" width="32" height="24" aria-hidden="true">${body}</svg>`;
  }
  const CITIES = [
    ['Москва', 55.76, 37.62, 3], ['Санкт-Петербург', 59.94, 30.31, 3], ['Новосибирск', 55.03, 82.92, 7], ['Екатеринбург', 56.84, 60.61, 5], ['Казань', 55.79, 49.12, 3],
    ['Нижний Новгород', 56.33, 44.0, 3], ['Челябинск', 55.16, 61.4, 5], ['Самара', 53.2, 50.15, 4], ['Омск', 54.99, 73.37, 6], ['Ростов-на-Дону', 47.24, 39.71, 3],
    ['Уфа', 54.74, 55.97, 5], ['Красноярск', 56.01, 92.89, 7], ['Воронеж', 51.66, 39.2, 3], ['Пермь', 58.01, 56.25, 5], ['Волгоград', 48.71, 44.51, 3],
    ['Краснодар', 45.04, 38.98, 3], ['Саратов', 51.53, 46.03, 4], ['Тюмень', 57.15, 65.53, 5], ['Иркутск', 52.29, 104.28, 8], ['Хабаровск', 48.48, 135.08, 10],
    ['Владивосток', 43.12, 131.89, 10], ['Калининград', 54.71, 20.51, 2], ['Сочи', 43.6, 39.73, 3], ['Минск', 53.9, 27.56, 3], ['Алматы', 43.24, 76.89, 5],
    ['Ташкент', 41.3, 69.24, 5], ['Ереван', 40.18, 44.51, 4], ['Тбилиси', 41.72, 44.79, 4],
  ];

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  const signOf = lon => SIGNS[Math.floor(norm(lon) / 30) % 12];
  function degIn(lon) { const x = norm(lon) % 30; const d = Math.floor(x); const m = Math.floor((x - d) * 60); return { d, m }; }
  const fmtPos = lon => { const { d, m } = degIn(lon); return `${d}°${String(m).padStart(2, '0')}′`; };
  const fmtDate = (t, opts) => t.toLocaleDateString('ru-RU', opts || { day: 'numeric', month: 'long' });
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const clamp01 = t => Math.min(1, Math.max(0, t));
  // детерминированный шум — чтобы акварель и фактура не «прыгали» между перерисовками
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ——— звёзды атласа в эклиптических координатах ———
  const STARS = [], CLINES = [], CONSTS = [];
  const constSign = { aries: 0, taurus: 1, gemini: 2, cancer: 3, leo: 4, virgo: 5, libra: 6, scorpius: 7, sagittarius: 8, capricornus: 9, aquarius: 10, pisces: 11 };
  for (const [ck, c] of Object.entries(window.CONSTELLATIONS)) {
    const map = {};
    const pts = [];
    for (const [k, h, m, dec, mag, name] of c.stars) {
      const e = eclipticFromEquatorial((h + m / 60) * 15, dec);
      // прецессия J2000 → нынешнее равноденствие, ~1,4° за век
      const s = { lon: norm(e.lon + 0.36), lat: e.lat, mag, name, cname: c.name, cgen: c.gen, latin: c.latin, key: ck + ':' + k, minor: !!c.minor };
      map[k] = s; STARS.push(s); pts.push(s);
    }
    for (const [a, b] of c.lines) if (map[a] && map[b]) CLINES.push([map[a], map[b], !!c.minor]);
    // центр созвездия по кругу долгот
    const ref = pts[0].lon;
    const lon = norm(ref + pts.reduce((acc, p) => acc + angDiff(p.lon, ref), 0) / pts.length);
    const lat = pts.reduce((acc, p) => acc + p.lat, 0) / pts.length;
    const spread = Math.max(...pts.map(p => Math.hypot(angDiff(p.lon, lon), p.lat - lat)));
    const sign = constSign[ck];
    CONSTS.push({ key: ck, name: c.name, latin: c.latin, lon, lat, spread, pts, minor: !!c.minor, el: sign !== undefined ? SIGNS[sign].el : null });
  }

  // ——— полоса атласа ———
  const band = $('band'), bctx = band.getContext('2d');
  const ruler = $('ruler'), tip = $('tip');
  const B = { W: 0, H: 0, dpr: 1, ppd: 8, ppdY: 8, center: 0, vel: 0, target: null, pointer: null, drag: null, intro: 0, introStart: 0, staticCv: null, now: null, period: 0, active: -1, avoid: [] };

  const EDGE = 30; // нижняя кромка листа со шкалой градусов
  function bandY(lat) { return B.H * 0.55 - lat * B.ppdY; }
  function staticX(lon) { return (360 - norm(lon)) * B.ppd; } // долгота растёт влево, как на картах неба
  function screenX(lon) {
    let x = staticX(lon) - (staticX(B.center) - B.W / 2);
    while (x < -B.period / 2) x += B.period;
    while (x > B.period / 2 + B.W) x -= B.period;
    return x;
  }

  // плавный шум для краёв акварели
  function makeNoise(seed) {
    const r = rng(seed), P = new Float32Array(512);
    for (let i = 0; i < 256; i++) P[i] = P[i + 256] = r();
    const h = (x, y) => P[(P[(x & 255)] * 255 | 0) + (y & 255)];
    const sm = t => t * t * (3 - 2 * t);
    const v = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      const u = sm(xf), w = sm(yf);
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    };
    return (x, y) => v(x, y) * 0.55 + v(x * 2.1, y * 2.1) * 0.3 + v(x * 4.3, y * 4.3) * 0.15;
  }
  const hexRgb = hx => { const n = parseInt(hx.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  // ручная акварель: пигмент по маске из звёзд созвездия и шума — мягкая заливка, тёмный натёк по краю, зерно
  function paintWash(g, c, noise, seedR) {
    const SC = 3; // считаем на сетке втрое реже экрана и растягиваем со сглаживанием
    const padDeg = 9;
    const cx = staticX(c.lon), cy = bandY(c.lat);
    const halfW = (c.spread + padDeg) * B.ppd, halfH = (c.spread * 0.75 + padDeg) * B.ppdY;
    const w = Math.ceil(halfW * 2 / SC), h = Math.ceil(halfH * 2 / SC);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), D = img.data;
    const [cr, cg, cb] = hexRgb(EL[c.el].wash);
    const sig = 4.2; // градусы
    const pts = c.pts.map(p => ({ x: (halfW - angDiff(c.lon, p.lon) * B.ppd) / SC, y: (halfH - (p.lat - c.lat) * B.ppdY) / SC, w: p.mag < 2.5 ? 1.15 : 1 }));
    const sx = 2 * (sig * B.ppd / SC) ** 2, sy = 2 * (sig * B.ppdY / SC) ** 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let f = 0;
      for (const p of pts) f += p.w * Math.exp(-((x - p.x) ** 2) / sx - ((y - p.y) ** 2) / sy);
      const n = noise((x + seedR * 97) * 0.045, (y + seedR * 53) * 0.045);
      const v = Math.min(f, 1.4) * 0.8 + (n - 0.5) * 0.55;
      if (v < 0.32) continue;
      const body = Math.min(1, (v - 0.32) / 0.12); // мягкий вход
      const lf = noise((x + seedR * 31) * 0.016, (y + seedR * 17) * 0.016); // крупные перепады плотности пигмента
      const lf2 = noise((x + seedR * 7) * 0.03, (y + seedR * 41) * 0.03);
      const edgeW = 0.028 + 0.05 * lf2; // мокрый край неровной ширины
      const edge = Math.exp(-(((v - 0.36) / edgeW) ** 2)) * (0.1 + 0.22 * lf2); // натёк у границы
      const bloom = Math.exp(-(((lf - 0.56) / 0.022) ** 2)) * body * 0.14; // затёк-«цветок» внутри заливки
      const gran = noise(x * 0.9 + seedR, y * 0.9) - 0.5; // зерно
      const paper = noise((x + seedR * 13) * 0.07, (y + seedR * 5) * 0.07) > 0.7 ? 0.3 : 1; // просветы бумаги
      const a = (body * (0.06 + 0.2 * lf) * paper + gran * 0.05 * body) + edge + bloom;
      const dark = Math.min(0.45, edge * 1.2 + bloom * 1.6);
      const i = (y * w + x) * 4;
      D[i] = cr * (1 - dark); D[i + 1] = cg * (1 - dark); D[i + 2] = cb * (1 - dark); D[i + 3] = Math.max(0, Math.min(255, a * 255));
    }
    ctx.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (const dx of [0, -B.period, B.period]) {
      const x0 = cx + dx - halfW;
      if (x0 > B.period || x0 + halfW * 2 < 0) continue;
      g.drawImage(cv, x0, cy - halfH, halfW * 2, halfH * 2);
    }
  }

  function buildStatic() {
    const cv = document.createElement('canvas');
    const w = Math.ceil(B.period * B.dpr), h = Math.ceil(B.H * B.dpr);
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.scale(B.dpr, B.dpr);
    g.fillStyle = COL.lazur; g.fillRect(0, 0, B.period, B.H);
    const r = rng(7);
    // гравировальная штриховка резцом: частые горизонтали с лёгким дрожанием нажима
    g.strokeStyle = COL.engrave; g.lineWidth = 0.55;
    for (let y = 48; y < B.H - EDGE; y += 2.6) {
      g.globalAlpha = 0.07 + r() * 0.05;
      g.beginPath(); g.moveTo(0, y); g.lineTo(B.period, y + (r() - 0.5) * 0.4); g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(241,233,211,0.07)';
    for (let i = 0; i < B.period * B.H / 180; i++) g.fillRect(r() * B.period, r() * B.H, 1, 1);
    // акварель зодиакальных созвездий
    const noise = makeNoise(11);
    CONSTS.forEach((c, i) => { if (!c.minor) paintWash(g, c, noise, i + 1); });
    // сетка: параллели эклиптики и меридианы
    g.strokeStyle = COL.engrave; g.fillStyle = COL.engrave;
    for (let lat = -80; lat <= 80; lat += 10) {
      if (lat === 0) continue;
      const y = bandY(lat); if (y < 46 || y > B.H - EDGE) continue;
      g.globalAlpha = 0.2; g.lineWidth = 0.6; g.setLineDash([2, 5]);
      g.beginPath(); g.moveTo(0, y); g.lineTo(B.period, y); g.stroke();
      g.setLineDash([]); g.globalAlpha = 0.45; g.font = `italic 10px ${F.display}`; g.textAlign = 'left';
      for (let lon = 15; lon < 360; lon += 30) g.fillText(`${lat > 0 ? '+' : '−'}${Math.abs(lat)}°`, staticX(lon) + 4, y - 3);
    }
    g.setLineDash([]);
    for (let lon = 0; lon < 360; lon += 10) {
      const x = staticX(lon), major = lon % 30 === 0;
      g.globalAlpha = major ? 0.34 : 0.13; g.lineWidth = major ? 0.8 : 0.5; g.setLineDash(major ? [] : [1, 4]);
      g.beginPath(); g.moveTo(x, 46); g.lineTo(x, B.H - EDGE); g.stroke();
    }
    g.setLineDash([]);
    // эклиптика с градусной шкалой внутри знака
    const ey = bandY(0);
    g.globalAlpha = 0.9; g.lineWidth = 1.2; g.strokeStyle = COL.gamboge;
    g.beginPath(); g.moveTo(0, ey); g.lineTo(B.period, ey); g.stroke();
    g.lineWidth = 0.7;
    for (let lon = 0; lon < 360; lon++) {
      const x = staticX(lon), len = lon % 10 === 0 ? 9 : lon % 5 === 0 ? 6 : 3;
      g.globalAlpha = lon % 10 === 0 ? 0.9 : 0.55;
      g.beginPath(); g.moveTo(x, ey - len); g.lineTo(x, ey + len); g.stroke();
    }
    g.globalAlpha = 0.75; g.fillStyle = COL.gamboge; g.font = `italic 11px ${F.display}`; g.textAlign = 'center';
    for (let lon = 0; lon < 360; lon += 10) g.fillText(String(lon % 30), staticX(lon), ey + 22);
    g.globalAlpha = 0.65; g.font = `italic 12px ${F.display}`; g.textAlign = 'left';
    g.fillText('эклиптика — путь Солнца', staticX(358), ey - 12);
    // кромка листа: двойная рамка и шкала 0–360°
    const by = B.H - EDGE;
    g.strokeStyle = COL.engrave; g.globalAlpha = 0.8; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, by); g.lineTo(B.period, by); g.stroke();
    g.globalAlpha = 0.4; g.beginPath(); g.moveTo(0, by + 4); g.lineTo(B.period, by + 4); g.stroke();
    g.globalAlpha = 0.4; g.beginPath(); g.moveTo(0, 50); g.lineTo(B.period, 50); g.stroke();
    for (let lon = 0; lon < 360; lon++) {
      const x = staticX(lon), len = lon % 10 === 0 ? 8 : lon % 5 === 0 ? 5 : 2.5;
      g.globalAlpha = lon % 10 === 0 ? 0.85 : 0.5; g.lineWidth = lon % 10 === 0 ? 0.9 : 0.6;
      g.beginPath(); g.moveTo(x, by + 4); g.lineTo(x, by + 4 + len); g.stroke();
    }
    g.globalAlpha = 0.85; g.fillStyle = COL.engrave; g.font = `10px ${F.display}`; g.textAlign = 'center';
    for (let lon = 0; lon < 360; lon += 10) g.fillText(`${lon}°`, staticX(lon), by + 24);
    // линии созвездий: зодиак ярче, соседи тише
    g.strokeStyle = COL.engrave;
    for (const [a, b, minor] of CLINES) {
      let xa = staticX(a.lon), xb = staticX(b.lon);
      if (Math.abs(xa - xb) > B.period / 2) { if (xa < xb) xa += B.period; else xb += B.period; }
      g.globalAlpha = minor ? 0.26 : 0.5; g.lineWidth = minor ? 0.7 : 0.95;
      for (const dx of [0, -B.period]) { g.beginPath(); g.moveTo(xa + dx, bandY(a.lat)); g.lineTo(xb + dx, bandY(b.lat)); g.stroke(); }
    }
    g.globalAlpha = 1;
    B.staticCv = cv;
  }

  // подписи созвездий рисуются поверх, чтобы не просвечивать сквозь картуш
  function drawConstLabels(g) {
    g.textAlign = 'center';
    for (const c of CONSTS) {
      const x = screenX(c.lon);
      if (x < -120 || x > B.W + 120) continue;
      const y = bandY(c.lat - c.spread * 0.85) + (c.minor ? 18 : 26);
      if (y < 60 || y > B.H - EDGE - 8) continue;
      g.font = `italic ${c.minor ? 13 : 16}px ${F.display}`;
      const latinW = g.measureText(c.latin).width;
      g.font = `${c.minor ? 9 : 10}px ${F.display}`;
      const ruW = g.measureText(c.name.toUpperCase()).width + 2.2 * c.name.length;
      g.font = `italic ${c.minor ? 13 : 16}px ${F.display}`;
      const w = Math.max(latinW, ruW) / 2 + 8;
      if (hitsAvoid(x - w, y - 16, w * 2, 36)) continue;
      g.globalAlpha = c.minor ? 0.45 : 0.75; g.fillStyle = COL.ivory;
      g.fillText(c.latin, x, y);
      g.globalAlpha = c.minor ? 0.35 : 0.55; g.fillStyle = COL.engrave; g.font = `${c.minor ? 9 : 10}px ${F.display}`;
      letterSpaced(g, c.name.toUpperCase(), x, y + 15, 2.2);
    }
    g.globalAlpha = 1;
  }
  function hitsAvoid(x, y, w, h) {
    for (const a of B.avoid) if (x < a.x + a.w && x + w > a.x && y < a.y + a.h && y + h > a.y) return true;
    return false;
  }

  function letterSpaced(g, text, x, y, sp) {
    const w = g.measureText(text).width + sp * (text.length - 1);
    let cx = x - w / 2;
    const align = g.textAlign; g.textAlign = 'left';
    for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
    g.textAlign = align;
  }

  function resizeBand() {
    const rect = band.getBoundingClientRect();
    B.dpr = Math.min(2, window.devicePixelRatio || 1);
    B.W = rect.width; B.H = rect.height;
    B.ppd = B.W < 760 ? Math.max(4.6, B.W / 78) : Math.max(6.5, B.W / 170);
    // по вертикали растягиваем так, чтобы соседние созвездия до ±38° заполнили лист
    B.ppdY = Math.max(B.ppd, (B.H * 0.55 - 70) / 38);
    B.period = 360 * B.ppd;
    band.width = Math.round(B.W * B.dpr); band.height = Math.round(B.H * B.dpr);
    buildStatic();
    buildRuler();
    drawBand();
  }

  function buildRuler() {
    ruler.innerHTML = '';
    SIGNS.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', `${s.name}, ${s.dates.replace(' — ', ' – ')}`);
      b.innerHTML = `<span class="sg" aria-hidden="true">${s.glyph}</span><span class="nm">${s.name}</span><span class="dt">${s.dates}</span><span class="deg" aria-hidden="true">${i * 30}°</span>`;
      b.addEventListener('click', () => { goTo(i * 30 + 15); setActive(i); });
      ruler.appendChild(b);
    });
    placeRuler();
  }
  function placeRuler() {
    const kids = ruler.children, w = 30 * B.ppd;
    for (let i = 0; i < 12; i++) {
      // знак i занимает долготы [30i, 30i+30); на листе он идёт справа налево
      const x = screenX(i * 30 + 30);
      kids[i].style.transform = `translateX(${x}px)`;
      kids[i].style.width = w + 'px';
    }
  }
  function setActive(i) {
    B.active = i;
    [...ruler.children].forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }
  function goTo(lon) {
    if (REDUCED) { B.center = norm(lon); drawBand(); return; }
    B.target = norm(lon); B.vel = 0; loop();
  }

  function starRadius(mag) { return Math.max(0.8, (5.0 - mag) * 0.95) * Math.min(1.25, B.ppd / 8 + 0.35); }

  // зоны, где подписи на листе не рисуются: под картушем и карточкой Луны (когда они лежат поверх листа).
  // Считаем при каждой отрисовке: карточка Луны меняет высоту, когда в неё приходит текст фазы.
  function computeAvoid() {
    B.avoid = [];
    if (B.W < 761) return;
    const rect = band.getBoundingClientRect();
    for (const el of document.querySelectorAll('.cartouche, .moon-card')) {
      const r = el.getBoundingClientRect();
      B.avoid.push({ x: r.left - rect.left - 8, y: r.top - rect.top - 8, w: r.width + 16, h: r.height + 16 });
    }
  }

  function drawBand(ts) {
    const g = bctx, W = B.W, H = B.H;
    computeAvoid();
    g.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // фон листа со сдвигом и бесшовным повтором
    const off = staticX(B.center) - W / 2;
    let sx = ((off % B.period) + B.period) % B.period;
    const reveal = REDUCED ? 1 : ease((B.intro - 0) / 0.55);
    g.save();
    g.beginPath(); g.rect(0, 0, W * reveal, H); g.clip();
    g.drawImage(B.staticCv, sx * B.dpr, 0, Math.min(B.period - sx, W) * B.dpr, H * B.dpr, 0, 0, Math.min(B.period - sx, W), H);
    if (B.period - sx < W) g.drawImage(B.staticCv, 0, 0, (W - (B.period - sx)) * B.dpr, H * B.dpr, B.period - sx, 0, W - (B.period - sx), H);
    g.restore();
    if (reveal < 1) {
      g.fillStyle = COL.lazur; g.fillRect(W * reveal, 0, W * (1 - reveal), H);
      g.strokeStyle = COL.gamboge; g.globalAlpha = 0.8; g.lineWidth = 1;
      g.beginPath(); g.moveTo(W * reveal, 0); g.lineTo(W * reveal, H); g.stroke(); g.globalAlpha = 1; // резец
    }
    // свет из-за листа
    const P = B.pointer;
    if (P) {
      const grd = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, 190);
      grd.addColorStop(0, 'rgba(255, 236, 190, 0.16)'); grd.addColorStop(0.5, 'rgba(255, 236, 190, 0.05)'); grd.addColorStop(1, 'rgba(255, 236, 190, 0)');
      g.fillStyle = grd; g.fillRect(P.x - 200, P.y - 200, 400, 400);
    }
    // звёзды-проколы: проступают по порядку яркости
    const magGate = REDUCED ? 99 : -1 + ease((B.intro - 0.25) / 0.6) * 7;
    for (const s of STARS) {
      if (s.mag > magGate) continue;
      const x = screenX(s.lon), y = bandY(s.lat);
      if (x < -20 || x > W + 20) continue;
      const near = P ? Math.exp(-((x - P.x) ** 2 + (y - P.y) ** 2) / (2 * 120 * 120)) : 0;
      const rr = starRadius(s.mag);
      const halo = rr * (3.2 + near * 5);
      const hg = g.createRadialGradient(x, y, 0, x, y, halo);
      hg.addColorStop(0, `rgba(255, 243, 207, ${0.45 + near * 0.5})`); hg.addColorStop(1, 'rgba(255, 243, 207, 0)');
      g.fillStyle = hg; g.fillRect(x - halo, y - halo, halo * 2, halo * 2);
      g.fillStyle = COL.star; g.beginPath(); g.arc(x, y, rr * (1 + near * 0.35), 0, Math.PI * 2); g.fill();
      if (s.name && (s.mag < 1.7 || near > 0.55)) {
        g.font = `italic ${s.mag < 1.7 ? 12 : 11}px ${F.display}`;
        const tw = g.measureText(s.name).width;
        if (!hitsAvoid(x + rr + 4, y - rr - 16, tw + 4, 18)) {
          g.fillStyle = COL.ivory; g.globalAlpha = 0.55 + near * 0.45; g.textAlign = 'left';
          g.fillText(s.name, x + rr + 6, y - rr - 3);
          g.globalAlpha = 1;
        }
      }
    }
    if (reveal > 0.98) drawConstLabels(g);
    // светила сейчас
    const pGate = REDUCED ? 1 : clamp01((B.intro - 0.7) / 0.3);
    if (B.now && pGate > 0) {
      g.globalAlpha = pGate;
      const placed = [];
      for (const k of BY_BRIGHT) {
        const p = B.now[k];
        const x = screenX(p.lon);
        if (x < -30 || x > W + 30) continue;
        let y = bandY(0) - 34;
        for (const q of placed) if (Math.abs(q.x - x) < 46 && Math.abs(q.y - y) < 30) y = q.y - 40;
        // тесно наверху (узкий лист на телефоне) — ставим под эклиптику
        if (y < 72) { y = bandY(0) + 38; for (const q of placed) if (Math.abs(q.x - x) < 46 && Math.abs(q.y - y) < 30) y = q.y + 40; }
        placed.push({ x, y });
        drawBody(g, k, x, y, p);
        g.strokeStyle = COL.gamboge; g.lineWidth = 0.8; g.globalAlpha = 0.6 * pGate;
        g.beginPath(); g.moveTo(x, y < bandY(0) ? y + 14 : y - 14); g.lineTo(x, y < bandY(0) ? bandY(0) - 2 : bandY(0) + 2); g.stroke();
        g.globalAlpha = pGate;
      }
      g.globalAlpha = 1;
    }
    placeRuler();
  }

  function drawBody(g, k, x, y, p) {
    if (k === 'moon') { drawMoonDisc(g, x, y, 12, moonPhase(new Date()).elong); }
    else {
      g.fillStyle = COL.night; g.strokeStyle = COL.gamboge; g.lineWidth = 1;
      g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      if (k === 'sun') for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; g.beginPath(); g.moveTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); g.lineTo(x + Math.cos(a) * (i % 2 ? 18 : 21), y + Math.sin(a) * (i % 2 ? 18 : 21)); g.stroke(); }
      g.fillStyle = COL.gamboge; g.font = `16px ${F.sym}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(PL[k].glyph, x, y + 1); g.textBaseline = 'alphabetic';
    }
    g.font = `italic 11px ${F.display}`; g.fillStyle = COL.ivory; g.textAlign = 'center';
    g.fillText(`${PL[k].name}${p.retro ? ' ℞' : ''}`, x, y - 20);
  }

  // освещённая часть диска; elong — элонгация Луны от Солнца, 0…360
  function drawMoonDisc(g, x, y, r, elong) {
    g.save();
    g.fillStyle = '#16324d'; g.strokeStyle = COL.engrave; g.lineWidth = 0.8;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
    const waxing = elong < 180;
    const e = waxing ? elong : 360 - elong;
    const k = Math.cos(e * RAD); // 1 — новолуние, −1 — полнолуние
    g.translate(x, y); if (!waxing) g.scale(-1, 1);
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    g.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    g.closePath();
    g.fillStyle = COL.star; g.fill();
    g.restore();
  }

  // большая Луна с морями
  function drawMoonBig(cv, elong) {
    const g = cv.getContext('2d'), S = cv.width, r = S * 0.44, x = S / 2, y = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#142b42'; g.fillRect(0, 0, S, S);
    // освещённая часть
    const waxing = elong < 180, e = waxing ? elong : 360 - elong, k = Math.cos(e * RAD);
    g.save(); g.translate(x, y); if (!waxing) g.scale(-1, 1);
    g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); g.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); g.closePath();
    const lg = g.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 1.05);
    lg.addColorStop(0, '#fff6dc'); lg.addColorStop(1, '#e9d9b0');
    g.fillStyle = lg; g.fill();
    // моря — только на освещённой части, по их расположению на видимой стороне (упрощённо)
    g.clip();
    if (!waxing) g.scale(-1, 1); // моря не зеркалим вместе с фазой
    const maria = [[-0.28, -0.32, 0.2], [-0.05, -0.18, 0.16], [0.18, -0.3, 0.14], [0.33, -0.05, 0.12], [0.1, 0.12, 0.18], [-0.32, 0.05, 0.22], [-0.12, 0.38, 0.1], [0.36, 0.3, 0.09]];
    for (const [mx, my, mr] of maria) {
      const mg = g.createRadialGradient(mx * r, my * r, 0, mx * r, my * r, mr * r);
      mg.addColorStop(0, 'rgba(150, 150, 150, 0.42)'); mg.addColorStop(1, 'rgba(150, 150, 150, 0)');
      g.fillStyle = mg; g.fillRect(-r, -r, r * 2, r * 2);
    }
    g.restore();
    g.restore();
    g.strokeStyle = COL.engrave; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    // градусная окантовка, как у лунной карты
    g.globalAlpha = 0.6;
    for (let a = 0; a < 360; a += 5) {
      const len = a % 30 === 0 ? 14 : 6, rad = a * RAD;
      g.beginPath(); g.moveTo(x + Math.cos(rad) * (r + 6), y + Math.sin(rad) * (r + 6)); g.lineTo(x + Math.cos(rad) * (r + 6 + len), y + Math.sin(rad) * (r + 6 + len)); g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ——— жесты на полосе ———
  function loop() {
    if (B.raf) return;
    const step = ts => {
      B.raf = 0;
      let again = false;
      if (B.intro < 1 && !REDUCED) { B.intro = Math.min(1, (ts - B.introStart) / 2600); again = B.intro < 1; }
      if (B.target !== null) {
        const d = angDiff(B.target, B.center);
        if (Math.abs(d) < 0.05) { B.center = B.target; B.target = null; } else { B.center = norm(B.center + d * 0.12); again = true; }
      } else if (Math.abs(B.vel) > 0.01 && !B.drag) { B.center = norm(B.center + B.vel); B.vel *= 0.93; again = true; }
      drawBand(ts);
      if (again) B.raf = requestAnimationFrame(step);
    };
    B.raf = requestAnimationFrame(step);
  }
  band.addEventListener('pointermove', e => {
    const r = band.getBoundingClientRect();
    B.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (B.drag) {
      const dx = e.clientX - B.drag.x;
      B.drag.x = e.clientX;
      const dl = dx / B.ppd; // вправо тянем — открываются более восточные (большие) долготы
      B.center = norm(B.center + dl); B.vel = dl; B.target = null;
    }
    hoverTip();
    if (!B.raf) { B.raf = requestAnimationFrame(t => { B.raf = 0; drawBand(t); }); }
  });
  band.addEventListener('pointerdown', e => { B.drag = { x: e.clientX }; band.setPointerCapture(e.pointerId); B.vel = 0; });
  const endDrag = () => { if (!B.drag) return; B.drag = null; if (!REDUCED) loop(); };
  band.addEventListener('pointerup', endDrag); band.addEventListener('pointercancel', endDrag);
  band.addEventListener('pointerleave', () => { B.pointer = null; tip.classList.remove('on'); drawBand(); });
  band.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) { e.preventDefault(); B.center = norm(B.center - (e.deltaX || e.deltaY) / B.ppd); B.target = null; drawBand(); } }, { passive: false });
  band.tabIndex = 0;
  band.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { goTo(B.center + 15); e.preventDefault(); } if (e.key === 'ArrowRight') { goTo(B.center - 15); e.preventDefault(); } });

  function hoverTip() {
    const P = B.pointer; if (!P || B.drag) { tip.classList.remove('on'); return; }
    let best = null, bd = 18;
    if (B.now) for (const k of ORDER) {
      const x = screenX(B.now[k].lon); const d = Math.hypot(x - P.x, (bandY(0) - 34) - P.y);
      if (d < 26 && d < bd + 8) { best = { x, y: bandY(0) - 48, html: `${PL[k].name} <i>${fmtPos(B.now[k].lon)} ${signOf(B.now[k].lon).gen}${B.now[k].retro ? ', ретроградный' : ''}</i>` }; bd = d; }
    }
    if (!best) for (const s of STARS) {
      const x = screenX(s.lon), y = bandY(s.lat), d = Math.hypot(x - P.x, y - P.y);
      if (d < bd) { bd = d; best = { x, y: y - 6, html: `${s.name || 'Звезда'} <i>· ${s.cname}, ${s.mag.toFixed(1).replace('.', ',')}ᵐ</i>` }; }
    }
    if (best) { tip.innerHTML = best.html; tip.style.left = best.x + 'px'; tip.style.top = (best.y + 46 * (B.W < 760 ? 0 : 0)) + 'px'; tip.classList.add('on'); }
    else tip.classList.remove('on');
  }

  // ——— натальная карта ———
  function buildChart(date, place, timeKnown) {
    const pos = positions(date);
    const ang = timeKnown ? angles(date, place.lat, place.lon) : null;
    const pts = ORDER.map(k => ({ key: k, lon: pos[k].lon, retro: pos[k].retro }));
    if (ang) pts.push({ key: 'asc', lon: ang.asc });
    const asps = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = aspectBetween(pts[i].lon, pts[j].lon);
      if (a) asps.push({ a: pts[i].key, b: pts[j].key, ...a });
    }
    return { date, place, timeKnown, pos, ang, pts, asps, rot: ang ? ang.asc : 0 };
  }

  const wheel = $('wheel'), syn = $('synastry');
  const W = { chart: null, prog: 1, hover: null, hits: [], start: 0 };
  const S = { a: null, b: null, prog: 1, start: 0, hits: [] };

  function sizeCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    return { s: r.width, dpr };
  }

  function drawWheel(cv, opts) {
    const { s, dpr } = sizeCanvas(cv);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2, R = s * 0.485, rSign = R - s * 0.085, rTick = rSign - s * 0.016;
    const rot = opts.rot || 0, p = opts.prog;
    const A = lon => Math.PI - (lon - rot) * RAD; // асцендент слева, знаки против часовой
    const P = (lon, r) => [cx + Math.cos(A(lon)) * r, cy + Math.sin(A(lon)) * r];
    const pRing = REDUCED ? 1 : ease(p / 0.3), pSigns = REDUCED ? 1 : ease((p - 0.15) / 0.3);
    // кольца и знаки
    g.globalAlpha = pRing;
    g.strokeStyle = COL.engrave; g.lineWidth = 1.2;
    for (const r of [R, R - 4, rSign]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2 * pRing); g.stroke(); }
    g.globalAlpha = pSigns;
    for (let i = 0; i < 12; i++) {
      const s0 = i * 30, sg = SIGNS[i];
      g.beginPath(); g.arc(cx, cy, R - 4, A(s0), A(s0 + 30), true); g.arc(cx, cy, rSign, A(s0 + 30), A(s0), false); g.closePath();
      g.fillStyle = EL[sg.el].wash; g.globalAlpha = 0.13 * pSigns; g.fill(); g.globalAlpha = pSigns;
      const [x0, y0] = P(s0, R - 4), [x1, y1] = P(s0, rSign);
      g.lineWidth = 0.9; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const [gx, gy] = P(s0 + 15, (R - 4 + rSign) / 2);
      g.fillStyle = COL.ivory; g.font = `${Math.round(s * 0.036)}px ${F.sym}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(sg.glyph, gx, gy);
    }
    g.textBaseline = 'alphabetic';
    for (let d = 0; d < 360; d++) {
      const len = d % 10 === 0 ? s * 0.018 : d % 5 === 0 ? s * 0.012 : s * 0.006;
      const [x0, y0] = P(d, rSign), [x1, y1] = P(d, rSign - len);
      g.lineWidth = d % 10 === 0 ? 0.9 : 0.5; g.globalAlpha = pSigns * (d % 5 === 0 ? 0.9 : 0.5);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    g.globalAlpha = 1;
    return { g, s, cx, cy, R, rSign, rTick, A, P };
  }

  function placeGlyphs(pts, minSep) {
    const sorted = pts.slice().sort((a, b) => a.lon - b.lon).map(p => ({ ...p, disp: p.lon }));
    for (let iter = 0; iter < 40; iter++) {
      let moved = false;
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i], b = sorted[(i + 1) % sorted.length];
        if (a === b) continue;
        const gap = norm(b.disp - a.disp);
        if (gap < minSep) { const push = (minSep - gap) / 2; a.disp = norm(a.disp - push); b.disp = norm(b.disp + push); moved = true; }
      }
      if (!moved) break;
    }
    return sorted;
  }

  function aspectStroke(g, key, x1, y1, x2, y2, alpha, lw) {
    g.globalAlpha = alpha; g.strokeStyle = COL.engrave; g.lineWidth = lw;
    if (key === 'opp') {
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l * 1.8, ny = dx / l * 1.8;
      g.setLineDash([]);
      for (const sgn of [1, -1]) { g.beginPath(); g.moveTo(x1 + nx * sgn, y1 + ny * sgn); g.lineTo(x2 + nx * sgn, y2 + ny * sgn); g.stroke(); }
      return;
    }
    g.setLineDash(key === 'square' ? [7, 5] : key === 'sext' ? [1.2, 4] : []);
    g.lineCap = key === 'sext' ? 'round' : 'butt';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.setLineDash([]); g.lineCap = 'butt';
  }

  function renderNatal() {
    const ch = W.chart; if (!ch) return;
    const base = drawWheel(wheel, { rot: ch.rot, prog: W.prog });
    const { g, s, cx, cy, rSign, rTick, P } = base;
    const p = REDUCED ? 1 : W.prog;
    // кольца по радиусу: глифы планет → градусы → линия домов (номера внутри) → круг аспектов
    const rPlan = rSign - s * 0.045, rDeg = rPlan - s * (s < 500 ? 0.056 : 0.042), rHouse = s * 0.285, rAsp = s * 0.235;
    // дома
    if (ch.ang) {
      g.globalAlpha = REDUCED ? 1 : ease((p - 0.25) / 0.3);
      g.strokeStyle = COL.engrave; g.lineWidth = 0.6;
      g.beginPath(); g.arc(cx, cy, rHouse, 0, Math.PI * 2); g.stroke();
      for (let h = 0; h < 12; h++) {
        const lon = ch.ang.asc + h * 30;
        const [x0, y0] = P(lon, rHouse), [x1, y1] = P(lon, rSign - s * 0.02);
        g.globalAlpha *= 1; g.lineWidth = h % 3 === 0 ? 1.4 : 0.5;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        const [nx, ny] = P(lon + 15, rHouse - s * 0.024); // своё кольцо между линией домов и кругом аспектов
        g.fillStyle = COL.engrave; g.font = `italic ${Math.max(9, Math.round(s * 0.022))}px ${F.display}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(h + 1), nx, ny);
      }
      const [ax, ay] = P(ch.ang.asc, rSign + 2);
      g.fillStyle = COL.gamboge; g.font = `700 ${Math.round(s * 0.024)}px ${F.display}`; g.textAlign = 'right';
      g.fillText('ASC', ax - 6, ay - s * 0.03);
      const [mx, my] = P(ch.ang.mc, rSign + 2);
      g.textAlign = 'center'; g.fillText('MC', mx, my - s * 0.025);
      g.textBaseline = 'alphabetic';
    }
    // аспекты
    W.hits = [];
    const hv = W.hover;
    const pAsp = REDUCED ? 1 : clamp01((p - 0.7) / 0.3);
    if (pAsp > 0) for (const a of ch.asps) {
      if (a.key === 'conj') continue;
      const pa = ch.pts.find(t => t.key === a.a), pb = ch.pts.find(t => t.key === a.b);
      const [x1, y1] = P(pa.lon, rAsp), [x2, y2] = P(pb.lon, rAsp);
      const on = !hv || a.a === hv || a.b === hv;
      const ex = x1 + (x2 - x1) * pAsp, ey = y1 + (y2 - y1) * pAsp;
      aspectStroke(g, a.key, x1, y1, ex, ey, on ? (hv ? 0.95 : 0.6) : 0.1, on && hv ? 1.6 : 1.1);
    }
    g.globalAlpha = 1;
    g.strokeStyle = COL.engrave; g.lineWidth = 0.6; g.globalAlpha = 0.5;
    g.beginPath(); g.arc(cx, cy, rAsp, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    // планеты: проявляются по яркости
    // на маленьком круге подписям нужно больше места по дуге
    const placed = placeGlyphs(ch.pts, s < 500 ? 18 : 10);
    for (const t of placed) {
      const idx = t.key === 'asc' ? BY_BRIGHT.length : BY_BRIGHT.indexOf(t.key);
      const appear = REDUCED ? 1 : ease((p - 0.35 - idx * 0.035) / 0.12);
      if (appear <= 0 || t.key === 'asc') continue;
      const [tx, ty] = P(t.lon, rTick), [tx2, ty2] = P(t.lon, rTick - s * 0.014);
      const [gx, gy] = P(t.disp, rPlan);
      const isHv = hv === t.key, dim = hv && !isHv && !ch.asps.some(a => (a.a === hv && a.b === t.key) || (a.b === hv && a.a === t.key));
      g.globalAlpha = appear * (dim ? 0.35 : 1);
      g.strokeStyle = COL.gamboge; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx2, ty2); g.stroke();
      const [lx, ly] = P(t.lon, rAsp);
      g.fillStyle = COL.star; g.beginPath(); g.arc(lx, ly, 2.2, 0, Math.PI * 2); g.fill();
      if (isHv) { const hg = g.createRadialGradient(gx, gy, 0, gx, gy, s * 0.06); hg.addColorStop(0, 'rgba(255,243,207,.35)'); hg.addColorStop(1, 'rgba(255,243,207,0)'); g.fillStyle = hg; g.fillRect(gx - s * 0.06, gy - s * 0.06, s * 0.12, s * 0.12); }
      g.fillStyle = isHv ? COL.star : COL.gamboge; g.font = `${Math.round(s * 0.045)}px ${F.sym}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(PL[t.key].glyph, gx, gy);
      const [dx, dy] = P(t.disp, rDeg);
      g.fillStyle = COL.ivory; g.font = `${Math.max(9, Math.round(s * 0.021))}px ${F.display}`;
      g.fillText(`${degIn(t.lon).d}°${t.retro ? '℞' : ''}`, dx, dy);
      g.textBaseline = 'alphabetic';
      W.hits.push({ key: t.key, x: gx, y: gy, r: s * 0.035 });
    }
    g.globalAlpha = 1;
  }

  function animateNatal() {
    if (REDUCED) { W.prog = 1; renderNatal(); return; }
    W.start = performance.now(); W.prog = 0;
    const step = now => { W.prog = clamp01((now - W.start) / 2400); renderNatal(); if (W.prog < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  wheel.addEventListener('pointermove', e => {
    const r = wheel.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = W.hits.find(t => Math.hypot(t.x - x, t.y - y) < t.r);
    const key = h ? h.key : null;
    if (key !== W.hover) { W.hover = key; renderNatal(); highlightReading(key); }
    wheel.style.cursor = h ? 'pointer' : 'default';
  });
  wheel.addEventListener('pointerleave', () => { W.hover = null; renderNatal(); highlightReading(null); });

  function highlightReading(key) {
    for (const li of $('reading').querySelectorAll('li')) li.classList.toggle('hl', !!key && (li.dataset.keys || '').split(' ').includes(key));
  }

  function renderReading(ch) {
    const ul = $('reading');
    const rows = [];
    const item = (glyph, cause, text, keys, isSym = true) => `<li data-keys="${keys}"><span class="g${isSym ? ' sym' : ''}" aria-hidden="true">${glyph}</span><span class="cause">${cause}</span><p class="text">${text}</p></li>`;
    rows.push('<h3>Планеты в знаках</h3>');
    const main = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    for (const k of main) {
      const lon = ch.pos[k].lon, sg = signOf(lon);
      let text = FRAME[k](FACETS[sg.key]);
      if (k === 'sun' || k === 'moon') text += ' ' + EL[sg.el].line;
      rows.push(item(PL[k].glyph, `${PL[k].name} ${sg.loc}, ${fmtPos(lon)}${ch.pos[k].retro ? ', ретроградный' : ''}`, text, k));
    }
    if (ch.ang) {
      const sg = signOf(ch.ang.asc);
      rows.push(`<li data-keys="asc"><span class="g" aria-hidden="true" style="font:700 .9rem/2 var(--f-display);letter-spacing:.08em">ASC</span><span class="cause">Асцендент ${sg.loc}, ${fmtPos(ch.ang.asc)}</span><p class="text">${FRAME.asc(FACETS[sg.key])}</p></li>`);
    }
    const strong = ch.asps.filter(a => a.key !== 'conj' || a.orb < 4).filter(a => main.includes(a.a) || a.a === 'asc').sort((x, y) => x.orb - y.orb).slice(0, 5);
    if (strong.length) {
      rows.push('<h3>Главные аспекты</h3>');
      const used = {};
      for (const a of strong) {
        const la = a.a === 'asc' ? 'Асцендент' : PL[a.a].name, lb = a.b === 'asc' ? 'асцендент' : PL[a.b].name;
        rows.push(item(aspectMark(a.key), `${la} — ${a.name} — ${lb}, орб ${a.orb.toFixed(1).replace('.', ',')}°`, aspectSentence(a.key, a.a, a.b, used), `${a.a} ${a.b}`, false));
      }
    }
    ul.innerHTML = rows.join('');
    for (const li of ul.querySelectorAll('li')) {
      li.addEventListener('pointerenter', () => { const k = li.dataset.keys.split(' ')[0]; W.hover = k; renderNatal(); });
      li.addEventListener('pointerleave', () => { W.hover = null; renderNatal(); });
    }
  }

  function setChart(ch, isSample) {
    W.chart = ch;
    const d = ch.date;
    const meta = [];
    if (isSample) meta.push('<span class="sample">Пример</span>');
    meta.push(`${fmtDate(new Date(d.getTime() + ch.place.tz * 3600e3), { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}`);
    meta.push(ch.timeKnown ? `${String(new Date(d.getTime() + ch.place.tz * 3600e3).getUTCHours()).padStart(2, '0')}:${String(new Date(d.getTime() + ch.place.tz * 3600e3).getUTCMinutes()).padStart(2, '0')}` : 'время неизвестно — дома не строятся');
    meta.push(ch.place.name);
    $('chartMeta').innerHTML = meta.join('<span aria-hidden="true">·</span>');
    renderReading(ch);
    animateNatal();
  }

  // ——— форма рождения ———
  const citySel = $('bCity');
  CITIES.forEach(([n], i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = n; citySel.appendChild(o); });
  const other = document.createElement('option'); other.value = 'other'; other.textContent = 'Другой город — по координатам'; citySel.appendChild(other);
  citySel.addEventListener('change', () => $('bCoords').classList.toggle('on', citySel.value === 'other'));
  $('bNoTime').addEventListener('change', e => { $('bTime').disabled = e.target.checked; });

  function readPlace() {
    if (citySel.value === 'other') {
      const lat = +$('bLat').value || 0, lon = +$('bLon').value || 0, tz = +$('bTz').value || 0;
      return { name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, lat, lon, tz };
    }
    const [name, lat, lon, tz] = CITIES[+citySel.value]; return { name, lat, lon, tz };
  }
  function localToUTC(dateStr, timeStr, tz) {
    const [y, m, d] = dateStr.split('-').map(Number), [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm) - tz * 3600e3);
  }
  $('birthForm').addEventListener('submit', e => {
    e.preventDefault();
    const ds = $('bDate').value;
    if (!ds) { $('bDate').focus(); $('bDate').setCustomValidity('Укажи дату рождения'); $('bDate').reportValidity(); return; }
    $('bDate').setCustomValidity('');
    const place = readPlace();
    const noTime = $('bNoTime').checked;
    const date = localToUTC(ds, noTime ? '12:00' : $('bTime').value, place.tz);
    const ch = buildChart(date, place, !noTime);
    // полоса атласа уходит к Солнцу рождения, страница — к карте
    goTo(ch.pos.sun.lon); setActive(Math.floor(ch.pos.sun.lon / 30));
    setChart(ch, false);
    document.getElementById('chart').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  });

  // ——— совместимость ———
  const SYN_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const PAIR_TEXT = {
    'sun-moon': 'один светит, другой откликается — классическая пара',
    'venus-mars': 'притяжение: любовь одного встречает действие другого',
    'moon-moon': 'похожие привычки и одинаковое ощущение уюта',
    'mercury-mercury': 'вам легко договариваться — или спорить о словах',
    'sun-sun': 'две воли рядом: общая цель или соревнование',
    'moon-venus': 'нежность и забота даются без усилий',
    'mars-mars': 'одинаковый темп; при квадрате — частые стычки',
    'saturn-sun': 'один даёт другому опору — и рамки',
    'saturn-moon': 'чувства под контролем: надёжно, но бывает холодно',
    'jupiter-sun': 'рядом друг с другом хочется расти',
  };
  function pairKey(a, b) { return PAIR_TEXT[`${a}-${b}`] ? `${a}-${b}` : PAIR_TEXT[`${b}-${a}`] ? `${b}-${a}` : null; }

  function renderSynastry() {
    if (!S.a) return;
    const base = drawWheel(syn, { rot: 0, prog: S.prog });
    const { g, s, cx, cy, rSign, rTick, P } = base;
    const p = REDUCED ? 1 : S.prog;
    const rA = rSign - s * 0.055, rSep = rSign - s * 0.1, rB = rSep - s * 0.05, rAsp = s * 0.25;
    g.strokeStyle = COL.engrave; g.lineWidth = 0.7; g.globalAlpha = 0.6;
    for (const r of [rSep, rAsp]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
    const pAsp = REDUCED ? 1 : clamp01((p - 0.65) / 0.35);
    for (const c of S.cross) {
      const [x1, y1] = P(S.a.pos[c.a].lon, rAsp), [x2, y2] = P(S.b.pos[c.b].lon, rAsp);
      aspectStroke(g, c.key === 'conj' ? 'trine' : c.key, x1, y1, x1 + (x2 - x1) * pAsp, y1 + (y2 - y1) * pAsp, 0.7, 1.2);
    }
    g.globalAlpha = 1;
    const draw = (chart, r, color, delay) => {
      const placed = placeGlyphs(SYN_KEYS.map(k => ({ key: k, lon: chart.pos[k].lon })), 9);
      for (const t of placed) {
        const appear = REDUCED ? 1 : ease((p - delay - BY_BRIGHT.indexOf(t.key) * 0.03) / 0.12);
        if (appear <= 0) continue;
        g.globalAlpha = appear;
        const [gx, gy] = P(t.disp, r), [lx, ly] = P(t.lon, rAsp);
        g.fillStyle = color; g.font = `${Math.round(s * 0.04)}px ${F.sym}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(PL[t.key].glyph, gx, gy);
        g.fillStyle = COL.star; g.beginPath(); g.arc(lx, ly, 2, 0, Math.PI * 2); g.fill();
      }
      g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
    };
    draw(S.a, rA, COL.gamboge, 0.3);
    draw(S.b, rB, COL.star, 0.45);
    // подписи колец
    g.font = `italic ${Math.round(s * 0.022)}px ${F.display}`; g.textAlign = 'center';
    g.fillStyle = COL.gamboge; g.fillText(S.nameA, cx, cy - s * 0.015);
    g.fillStyle = COL.star; g.fillText(S.nameB, cx, cy + s * 0.03);
  }

  function computePair() {
    const nameA = $('aName').value.trim() || 'Первый', nameB = $('cName').value.trim() || 'Второй';
    const da = $('aDate').value, db = $('cDate').value;
    if (!da || !db) { ($('aDate').value ? $('cDate') : $('aDate')).focus(); return; }
    const noon = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 9, 0)); };
    S.a = { pos: positions(noon(da)) }; S.b = { pos: positions(noon(db)) };
    S.nameA = nameA; S.nameB = nameB;
    S.cross = [];
    for (const a of SYN_KEYS) for (const b of SYN_KEYS) {
      const asp = aspectBetween(S.a.pos[a].lon, S.b.pos[b].lon, 0.8);
      if (asp) S.cross.push({ a, b, ...asp });
    }
    S.cross.sort((x, y) => x.orb - y.orb);
    const sa = signOf(S.a.pos.sun.lon), sb = signOf(S.b.pos.sun.lon);
    const friends = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
    let v;
    if (sa.el === sb.el) v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. Одна стихия, ${EL[sa.el].name}: вы понимаете друг друга с полуслова.`;
    else if (friends[sa.el] === sb.el) v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. ${cap(EL[sa.el].name)} и ${EL[sb.el].name} раздувают друг в друге лучшее.`;
    else v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. ${cap(EL[sa.el].name)} и ${EL[sb.el].name} говорят на разных языках — придётся переводить.`;
    $('verdict').textContent = v;
    const easy = S.cross.filter(c => ['trine', 'sext', 'conj'].includes(c.key)).length, hard = S.cross.length - easy;
    $('balEasy').textContent = `лёгких связей: ${easy}`; $('balHard').textContent = `напряжённых: ${hard}`;
    $('balBar').style.width = (S.cross.length ? (easy / S.cross.length) * 100 : 50) + '%';
    const used = {}, usedPairs = new Set();
    const rows = S.cross.slice(0, 6).map(c => {
      const pk = pairKey(c.a, c.b);
      // готовая фраза для известной пары планет — один раз; дальше — неповторяющиеся варианты по сферам
      const base = pk && !usedPairs.has(pk) ? (usedPairs.add(pk), cap(PAIR_TEXT[pk]) + '.') : aspectSentence(c.key, c.a, c.b, used);
      return `<li data-keys="${c.a} ${c.b}"><span class="g" aria-hidden="true">${aspectMark(c.key)}</span><span class="cause">${PL[c.a].name} · ${escapeHtml(nameA)} — ${c.name} — ${PL[c.b].name} · ${escapeHtml(nameB)}, орб ${c.orb.toFixed(1).replace('.', ',')}°</span><p class="text">${base}</p></li>`;
    });
    $('pairReading').innerHTML = rows.join('') || '<li><span class="g"></span><span class="cause">Тесных связей нет</span><p class="text">Планеты разошлись широко: отношения строятся на выборе, а не на «химии».</p></li>';
    if (REDUCED) { S.prog = 1; renderSynastry(); return; }
    S.start = performance.now(); S.prog = 0;
    const step = now => { S.prog = clamp01((now - S.start) / 2200); renderSynastry(); if (S.prog < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  $('pairForm').addEventListener('submit', e => { e.preventDefault(); $('pairSample').hidden = true; computePair(); });

  // ——— небо сейчас ———
  const PHASES = [[0, 'Новолуние'], [22.5, 'Растущий серп'], [67.5, 'Первая четверть'], [112.5, 'Растущая Луна'], [157.5, 'Полнолуние'], [202.5, 'Убывающая Луна'], [247.5, 'Последняя четверть'], [292.5, 'Убывающий серп'], [337.5, 'Новолуние']];
  const phaseName = el => { let n = PHASES[0][1]; for (const [a, name] of PHASES) if (el >= a) n = name; return n; };

  function updateNow() {
    const now = new Date();
    const pos = positions(now);
    B.now = pos;
    // на компьютере левую часть листа закрывает картуш: Солнце ставим в открытую правую часть
    if (!B.introDone) { B.center = norm(pos.sun.lon + (B.W >= 761 ? (0.72 - 0.5) * B.W / B.ppd : 0)); setActive(Math.floor(pos.sun.lon / 30)); }
    const ph = moonPhase(now);
    const ms = signOf(pos.moon.lon);
    drawMoonOnCard(ph.elong);
    $('moonSmallTitle').textContent = phaseName(ph.elong);
    $('moonSmallText').textContent = `Освещено ${Math.round(ph.illum * 100)}%, Луна ${ms.loc}`;
    drawMoonBig($('moonBig'), ph.elong);
    $('moonPhaseName').textContent = phaseName(ph.elong);
    const full = nextPhase(now, 180), nw = nextPhase(now, 0);
    $('moonPhaseSub').textContent = `Освещено ${Math.round(ph.illum * 100)}% · ${ms.loc}. Полнолуние — ${fmtDate(full)}, новолуние — ${fmtDate(nw)}.`;
    $('plateNote').textContent = `Положения на ${fmtDate(now, { day: 'numeric', month: 'long', year: 'numeric' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}. Тяни лист, чтобы пройти по зодиаку.`;
    $('ephCaption').textContent = `Эфемериды на ${fmtDate(now, { day: 'numeric', month: 'long' })}, ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} по твоему времени`;
    $('ephBody').innerHTML = ORDER.map(k => {
      const p = pos[k], sg = signOf(p.lon);
      const mv = k === 'sun' || k === 'moon' ? '' : p.retro ? 'ретроградное' : 'прямое';
      return `<tr><td class="g sym" aria-hidden="true">${PL[k].glyph}</td><th scope="row" style="font-weight:400;text-align:left">${PL[k].name}</th><td><span class="sym" aria-hidden="true" style="color:var(--engrave)">${sg.glyph}</span> ${sg.name}</td><td class="num">${fmtPos(p.lon)}</td><td class="${p.retro ? 'r' : ''}">${mv || (k === 'moon' ? `${Math.abs(p.speed).toFixed(1).replace('.', ',')}° в сутки` : '')}</td></tr>`;
    }).join('');
    const notes = [];
    for (const k of ['mercury', 'venus', 'mars']) if (pos[k].retro) {
      const st = nextStation(now, k, 120);
      notes.push(`<div class="notice"><b>${PL[k].name} ретроградный</b>${st ? `Попятное движение закончится ${fmtDate(st)}.` : ''} В астрологии это время пересматривать, а не начинать.</div>`);
    }
    $('notices').innerHTML = notes.join('');
    drawBand();
  }
  function drawMoonOnCard(elong) {
    const cv = $('moonSmall'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    drawMoonDisc(g, cv.width / 2, cv.height / 2, cv.width * 0.42, elong);
  }

  // ——— запуск ———
  function boot() {
    resizeBand();
    updateNow();
    B.introStart = performance.now();
    if (REDUCED) { B.intro = 1; drawBand(); } else loop();
    setTimeout(() => { B.introDone = true; }, 100);
    // пример карты, пока посетитель не ввёл свою
    const sample = { name: 'Москва', lat: 55.76, lon: 37.62, tz: 3 };
    setChart(buildChart(localToUTC('1995-06-14', '08:30', 3), sample, true), true);
    computePair();
    setInterval(updateNow, 60000);
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resizeBand(); renderNatal(); renderSynastry(); }, 150); });
  // символы и гравировальный шрифт должны быть загружены до рисования на холсте
  Promise.race([
    Promise.all([document.fonts.load(`16px ${F.sym}`, '☉♈'), document.fonts.load(`14px ${F.display}`, 'Aries'), document.fonts.load(`italic 12px ${F.display}`, 'Овен')]),
    new Promise(r => setTimeout(r, 2500)),
  ]).then(boot, boot);
})();
