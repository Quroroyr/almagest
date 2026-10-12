// Альмагест: данные, расчёты и интерфейс. Графика сцен — gl.js и src/shaders.
(function () {
  'use strict';
  const { positions, angles, moonPhase, nextPhase, nextStation, aspectBetween, angDiff, norm } = window.Sky;
  const Stage = window.Stage;
  const REDUCED = Stage.REDUCED;
  const RAD = Math.PI / 180;
  const $ = id => document.getElementById(id);
  const F = { display: '"Cormorant Garamond", "PT Serif", Georgia, serif', body: '"PT Serif", Georgia, serif', sym: '"Noto Sans Symbols", "Segoe UI Symbol", "Apple Symbols", serif' };
  // палитра холстов; madder/verdigris/gamboge — старые имена стихий в справочнике
  const COL = { moon: '#e9eef4', moonDim: '#b2bfce', steel: '#8fa9c4', steelDim: '#5f7894', harm: '#7fa7d8', tense: '#c98593', warm: '#d8bd92', ink: '#04070d', madder: '#c98593', verdigris: '#7fa7a0', gamboge: '#d8bd92' };
  const VS = '︎'; // текстовое начертание символов, не эмодзи
  const lineCol = a => `rgba(170, 196, 222, ${a})`;
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpAng = (a, b, t) => norm(a + angDiff(b, a) * t);
  const isHarm = k => k === 'trine' || k === 'sext';
  const isTense = k => k === 'square' || k === 'opp';
  const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

  const PHASES = [[0, 'Новолуние'], [22.5, 'Растущий серп'], [67.5, 'Первая четверть'], [112.5, 'Растущая Луна'], [157.5, 'Полнолуние'], [202.5, 'Убывающая Луна'], [247.5, 'Последняя четверть'], [292.5, 'Убывающий серп'], [337.5, 'Новолуние']];
  const phaseName = el => { let n = PHASES[0][1]; for (const [a, name] of PHASES) if (el >= a) n = name; return n; };
  const houseOf = (lon, asc) => Math.floor(norm(lon - asc) / 30) + 1;
  // названия планет в творительном падеже: «трин с Марсом»
  const INSTR = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  // ——— шапка и мобильное меню ———
  const top = $('top');
  const onScrollHeader = () => top.classList.toggle('solid', window.scrollY > 40);
  window.addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();
  const navLinks = [...document.querySelectorAll('.nav a')];
  const sectObs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) for (const a of navLinks) a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false');
  }, { rootMargin: '-45% 0px -50% 0px' });
  for (const id of ['chart', 'pair', 'now', 'method', 'offer']) sectObs.observe($(id));

  const menu = $('menu'), burger = $('burger');
  let menuReturn = null;
  function openMenu() {
    menuReturn = document.activeElement;
    menu.classList.add('open'); burger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => $('menuClose').focus(), 30);
  }
  function closeMenu(focusBack = true) {
    if (!menu.classList.contains('open')) return;
    menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    if (focusBack && menuReturn) menuReturn.focus();
  }
  burger.addEventListener('click', openMenu);
  $('menuClose').addEventListener('click', () => closeMenu());
  for (const a of menu.querySelectorAll('nav a')) a.addEventListener('click', () => closeMenu(false));
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('a, button')];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
    else if (!e.shiftKey && i === f.length - 1) { f[0].focus(); e.preventDefault(); }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 1080) closeMenu(false); });

  // свет на кнопках следует за указателем
  document.addEventListener('pointermove', e => {
    const b = e.target.closest && e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // ——— 01 первый экран ———
  const hero = $('hero');
  // созвездия по настоящим координатам звёзд из stars.js, касательная проекция
  function projectConst(key, cx, cy, size, aspect) {
    const c = window.CONSTELLATIONS[key];
    const st = c.stars.map(([k, h, m, dec, mag, name]) => ({ k, ra: (h + m / 60) * 15 * RAD, dec: dec * RAD, mag, name }));
    let sx = 0, sy = 0; for (const s of st) { sx += Math.cos(s.ra); sy += Math.sin(s.ra); }
    const ra0 = Math.atan2(sy, sx), dec0 = st.reduce((a, s) => a + s.dec, 0) / st.length;
    const pts = st.map(s => {
      const cosc = Math.sin(dec0) * Math.sin(s.dec) + Math.cos(dec0) * Math.cos(s.dec) * Math.cos(s.ra - ra0);
      const x = Math.cos(s.dec) * Math.sin(s.ra - ra0) / cosc;
      const y = (Math.cos(dec0) * Math.sin(s.dec) - Math.sin(dec0) * Math.cos(s.dec) * Math.cos(s.ra - ra0)) / cosc;
      return { ...s, x: -x, y }; // восток слева, как на небе
    });
    const ext = Math.max(...pts.map(p => Math.hypot(p.x, p.y))) || 1;
    return { pts: pts.map(p => ({ ...p, fx: cx + p.x / ext * size / aspect, fy: cy + p.y / ext * size })), lines: c.lines };
  }
  const HU = { cs: new Float32Array(72), ncs: 0, cl: new Float32Array(48), ncl: 0, sel: 0, open: 0, hover: 0, hoverTo: 0, opening: false };
  function layoutHeroStars() {
    const r = hero.getBoundingClientRect(), a = r.width / Math.max(1, r.height);
    const portrait = a < 0.9;
    const list = portrait
      ? [['leo', 0.42, 0.66, 0.15], ['orion', 0.2, 0.9, 0.08]]
      : [['leo', 0.6, 0.73, 0.2], ['orion', 0.44, 0.86, 0.1]];
    let ni = 0, nl = 0;
    for (const [key, cx, cy, size] of list) {
      const pr = projectConst(key, cx, cy, size, a);
      const idx = {};
      for (const p of pr.pts) {
        if (ni >= 24) break;
        idx[p.k] = ni;
        HU.cs.set([p.fx, p.fy, Math.min(1, Math.max(0.12, (4.3 - p.mag) / 4.2))], ni * 3);
        if (p.name === 'Регул') HU.sel = ni;
        ni++;
      }
      for (const [x, y] of pr.lines) if (idx[x] !== undefined && idx[y] !== undefined && nl < 24) { HU.cl.set([idx[x], idx[y]], nl * 2); nl++; }
    }
    HU.ncs = ni; HU.ncl = nl;
  }
  layoutHeroStars();
  // фото-слои: на высоком качестве — 2560 px, иначе 1408 (телефон, слабый компьютер)
  // (пути записаны целиком, чтобы сборка проставила им метку версии)
  const PLATES = {
    'hero-far': ['assets/hero-far.webp', 'assets/hero-far-s.webp'], 'hero-near': ['assets/hero-near.webp', 'assets/hero-near-s.webp'],
    'intro-valley': ['assets/intro-valley.webp', 'assets/intro-valley-s.webp'], 'method-room': ['assets/method-room.webp', 'assets/method-room-s.webp'],
  };
  const plateUrl = n => PLATES[n][Stage.tier === 'high' ? 0 : 1];
  const heroView = Stage.view(hero, 'hero', {
    textures: { u_far: plateUrl('hero-far'), u_near: plateUrl('hero-near') },
    uniforms: (gl, L, v, now, dt) => {
      HU.hover += (HU.hoverTo - HU.hover) * (1 - Math.exp(-dt * 6));
      gl.uniform3fv(L('u_cs'), HU.cs); gl.uniform1i(L('u_ncs'), HU.ncs);
      gl.uniform2fv(L('u_cl'), HU.cl); gl.uniform1i(L('u_ncl'), HU.ncl);
      gl.uniform1i(L('u_sel'), HU.sel); gl.uniform1f(L('u_open'), HU.open); gl.uniform1f(L('u_hover'), HU.hover);
    },
  });
  // тексты первого экрана появляются, когда небо уже проявилось
  const heroIn = [...hero.querySelectorAll('[data-in]')];
  const HERO_AT = [1.7, 2.2, 2.7, 3.2, 3.8];
  function heroTexts(now) {
    if (REDUCED || !Stage.ok) { heroIn.forEach(el => el.classList.add('on')); return false; }
    if (!heroView.seen) return true;
    const t = (now - heroView.enterAt) / 1000;
    let pending = false;
    heroIn.forEach((el, i) => { if (t >= HERO_AT[Math.min(i, HERO_AT.length - 1)]) el.classList.add('on'); else pending = true; });
    return pending;
  }
  Stage.onFrame(now => heroTexts(now));
  if (!Stage.ok || REDUCED) heroTexts(0);
  // запасной таймер: если кадров нет (вкладка в фоне), тексты всё равно появятся
  setTimeout(() => heroIn.forEach(el => el.classList.add('on')), 6000);

  const openBtn = $('openChart');
  openBtn.addEventListener('pointerenter', () => { HU.hoverTo = 1; Stage.invalidate(); });
  openBtn.addEventListener('pointerleave', () => { HU.hoverTo = 0; Stage.invalidate(); });
  openBtn.addEventListener('focus', () => { HU.hoverTo = 1; Stage.invalidate(); });
  openBtn.addEventListener('blur', () => { HU.hoverTo = 0; Stage.invalidate(); });
  openBtn.addEventListener('click', () => {
    if (REDUCED || !Stage.ok || !heroView.visible) { goChart(false); return; }
    if (HU.opening) return;
    HU.opening = true; hero.classList.add('opening');
    const t0 = performance.now();
    const step = now => {
      HU.open = Math.min(1, (now - t0) / 1600);
      Stage.invalidate();
      if (HU.open < 1) requestAnimationFrame(step);
      else {
        goChart(true);
        setTimeout(() => { HU.open = 0; HU.opening = false; hero.classList.remove('opening'); Stage.invalidate(); }, 500);
      }
    };
    requestAnimationFrame(step);
  });
  function goChart(cut) {
    const target = $('chart');
    if (cut) {
      const html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      target.scrollIntoView({ block: 'start' });
      html.style.scrollBehavior = prev;
      if (W.chart) ceremony(W.chart, true);
    } else target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
  }

  // Луна сегодня — маленький диск в углу первого экрана
  function drawMoonDisc(cv, elong) {
    const g = cv.getContext('2d'), S = cv.width, r = S * 0.42, x = S / 2, y = S / 2;
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#121c2b'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const waxing = elong < 180, e = waxing ? elong : 360 - elong, k = Math.cos(e * RAD);
    g.save(); g.translate(x, y); if (!waxing) g.scale(-1, 1);
    g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); g.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0); g.closePath();
    g.fillStyle = COL.moon; g.fill(); g.restore();
    g.strokeStyle = lineCol(0.5); g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  }

  // ——— 02 вселенная в тебе ———
  const uni = $('universe'), uniStage = $('uniStage');
  const UNI = { hl: -1, sp: 0 };
  const uniList = $('planetList');
  // порядок на экране — от Солнца наружу; в шейдере тот же порядок
  const UNI_ORDER = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  uniList.innerHTML = UNI_ORDER.map((k, i) => `<li><button type="button" data-i="${i}"><span class="sym" aria-hidden="true">${PL[k].glyph}</span>${PL[k].name}</button></li>`).join('');
  for (const b of uniList.querySelectorAll('button')) {
    const on = () => { UNI.hl = +b.dataset.i; uniList.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); Stage.invalidate(); };
    const off = () => { UNI.hl = -1; b.classList.remove('on'); Stage.invalidate(); };
    b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off);
    b.addEventListener('focus', on); b.addEventListener('blur', off);
  }
  Stage.view(uniStage, 'intro', {
    progEl: uni, textures: { u_valley: plateUrl('intro-valley') },
    uniforms: (gl, L) => { gl.uniform1f(L('u_sp'), UNI.sp); gl.uniform1i(L('u_hl'), UNI.hl); },
  });
  Stage.onFrame(() => {
    const r = uni.getBoundingClientRect(), vh = window.innerHeight;
    const sp = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
    UNI.sp = REDUCED ? Math.max(sp, 0.35) : sp;
    const ca = REDUCED ? 1 : Math.min(1, Math.max(0, (sp - 0.12) / 0.2)) * (1 - Math.min(1, Math.max(0, (sp - 0.86) / 0.14)) * 0.0);
    uniStage.style.setProperty('--copy-a', ca.toFixed(3));
    uniStage.style.setProperty('--list-a', (REDUCED ? 1 : Math.min(1, Math.max(0, (sp - 0.2) / 0.2))).toFixed(3));
    return false;
  });

  // ——— 03 небо сегодня: геоцентрическая сцена (шейдер src/shaders/sky.frag) ———
  // Земля в центре, вокруг в плоскости эклиптики — условные орбиты; угол тела на орбите — его настоящая
  // эклиптическая долгота. Земля повёрнута по звёздному времени и освещена Солнцем с его направления.
  const EPS = 23.4392 * RAD;
  const eclToEq = (lon, lat) => {
    const l = lon * RAD, b = (lat || 0) * RAD;
    const x = Math.cos(b) * Math.cos(l), y = Math.cos(b) * Math.sin(l), z = Math.sin(b);
    return [x, y * Math.cos(EPS) - z * Math.sin(EPS), y * Math.sin(EPS) + z * Math.cos(EPS)];
  };
  const m3 = (a, b) => { const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]); return r; };
  const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const Rx = a => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
  const Rz = a => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];

  const skySec = $('now'), skyViz = $('skyViz'), skyTip = $('skyTip');
  const SQ = 0.44, INC = Math.acos(SQ), ROLL = 0.3, SUN_PHI = -26 * RAD; // наклон плоскости орбит и место Солнца на экране
  // кольца по «геоцентрическому» порядку; размеры тел — в долях радиуса Земли (не в масштабе)
  const RING = ['moon', 'mercury', 'venus', 'sun', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const BODY_R = { sun: .1, moon: .15, mercury: .075, venus: .1, mars: .095, jupiter: .18, saturn: .14, uranus: .12, neptune: .12, pluto: .06 };
  const CITY_FULL = { 'Москва': 'Москва, Россия', 'Санкт-Петербург': 'Санкт-Петербург, Россия', 'Минск': 'Минск, Беларусь', 'Алматы': 'Алматы, Казахстан', 'Ташкент': 'Ташкент, Узбекистан', 'Ереван': 'Ереван, Армения', 'Тбилиси': 'Тбилиси, Грузия' };
  const SKY = { target: Date.now(), disp: Date.now(), live: true, play: false, hl: -1, hlA: 0, pin: -1, hover: -1, cityIdx: 0, pos: null, lastMin: '', dayKey: '', S: 1, lay: null, bodies: [], segDirty: true, labDirty: true };
  const cityOf = () => { const [name, lat, lon, tz] = CITIES[SKY.cityIdx]; return { name, lat, lon, tz }; };

  // зодиакальные созвездия: звёзды в эклиптических координатах, фигура относительно центра
  const ZOD = [];
  for (const [ck, c] of Object.entries(window.CONSTELLATIONS)) {
    if (c.minor) continue;
    const pts = {}, list = [];
    for (const [k, h, m, dec] of c.stars) { const e = window.Sky.eclipticFromEquatorial((h + m / 60) * 15, dec); pts[k] = { lon: norm(e.lon + 0.36), lat: e.lat }; list.push(pts[k]); }
    const ref = list[0].lon;
    const lonC = norm(ref + list.reduce((a, p) => a + angDiff(p.lon, ref), 0) / list.length);
    const latC = list.reduce((a, p) => a + p.lat, 0) / list.length;
    ZOD.push({ name: c.name, lonC, latC, pts, lines: c.lines.filter(([a, b]) => pts[a] && pts[b]) });
  }

  // подписи — своя текстура, чтобы текст рисовался в той же сцене и не отставал при прокрутке
  const LABELS = [...UNI_ORDER.map(k => ({ text: PL[k].name, kind: 'body' })), ...ZOD.map(z => ({ text: z.name.toUpperCase(), kind: 'con' })), { text: '', kind: 'city' }];
  const labCv = document.createElement('canvas');
  function buildLabels(S) {
    const g = labCv.getContext('2d');
    const rowH = Math.ceil(30 * S);
    labCv.width = 1024; labCv.height = rowH * LABELS.length;
    g.clearRect(0, 0, labCv.width, labCv.height);
    g.fillStyle = '#fff'; g.textBaseline = 'middle';
    LABELS[LABELS.length - 1].text = cityOf().name;
    LABELS.forEach((l, i) => {
      const y = i * rowH + rowH / 2;
      if (l.kind === 'con') {
        g.font = `500 ${(window.innerWidth < 760 ? 9 : 11) * S}px ${F.display}`;
        let x = 4 * S; for (const ch of l.text) { g.fillText(ch, x, y); x += g.measureText(ch).width + 2.6 * S; }
        l.w = x + 2 * S;
      } else {
        const small = window.innerWidth < 760;
        g.font = `italic 500 ${(l.kind === 'city' ? 12 : small ? 12.5 : 15) * S}px ${F.display}`;
        g.fillText(l.text, 4 * S, y); l.w = g.measureText(l.text).width + 8 * S;
      }
      l.h = rowH; l.v0 = i * rowH / labCv.height; l.v1 = (i + 1) * rowH / labCv.height; l.u1 = Math.min(1, l.w / labCv.width);
    });
    SKY.labDirty = true;
  }

  // экранная раскладка сцены: всё в px холста (начало — левый нижний угол секции)
  function skyLayout(sr, S) {
    const vr = skyViz.getBoundingClientRect();
    const vx = (vr.left - sr.left) * S, vy = (sr.bottom - vr.bottom) * S, vw = vr.width * S, vh = vr.height * S;
    const portrait = window.innerWidth <= 960 || vw < vh * 1.05; // на телефоне сцена над таблицей — компактная раскладка
    const er = Math.min(vh * (portrait ? .25 : .27), vw * (portrait ? .2 : .19));
    return { S, er, ec: [vx + vw * .5, vy + vh * (portrait ? .5 : .5)], vx, vy, vw, vh, portrait };
  }
  // матрица мир → экваториальные (столбцами для GLSL) и точки тел
  function skyFrame(d) {
    const pos = positions(d); SKY.pos = pos;
    const lay = SKY.lay, S = lay.S, er = lay.er;
    const lam0 = pos.sun.lon * RAD - SUN_PHI;
    const A = m3(m3(m3(Rz(ROLL), Rx(-INC)), Rz(-lam0)), Rx(-EPS));
    SKY.A = A;
    // радиусы колец: Луна ближе, у Солнца отдельный зазор, чтобы новая Луна не «закрывала» его на схеме
    const RR = { moon: 1.34, mercury: 1.5, venus: 1.64, sun: 1.86, mars: 2.02, jupiter: 2.16, saturn: 2.3, uranus: 2.44, neptune: 2.58, pluto: 2.72 };
    const ringR = k => er * RR[k] * (lay.portrait ? .9 : 1);
    const place = (lon, r) => {
      const ph = lon * RAD - lam0;
      const x = Math.cos(ph) * r, y = Math.sin(ph) * r * SQ, z = -Math.sin(ph) * r * Math.sin(INC);
      const c = Math.cos(ROLL), s = Math.sin(ROLL);
      return { x: lay.ec[0] + x * c - y * s, y: lay.ec[1] + x * s + y * c, z, ph, w: [x * c - y * s, x * s + y * c, z] };
    };
    const sunP = place(pos.sun.lon, ringR('sun'));
    const sunW = sunP.w.map(v => v / Math.hypot(...sunP.w));
    SKY.sunW = sunW;
    SKY.bodies = UNI_ORDER.map(k => {
      const P = place(pos[k].lon, ringR(k));
      let toSun = k === 'sun' ? [0, 0, 1] : (() => { const v = [sunP.w[0] - P.w[0], sunP.w[1] - P.w[1], sunP.w[2] - P.w[2]]; const l = Math.hypot(...v); return v.map(x => x / l); })();
      // внешние планеты с Земли всегда видны почти полными — свет на них сильнее спереди
      // Луна — с настоящей фазой: освещённая доля по элонгации, светлый край смотрит на Солнце на экране
      if (k === 'moon') { const e = moonPhase(d).elong * RAD, dx = sunP.x - P.x, dy = sunP.y - P.y, dl = Math.hypot(dx, dy) || 1; toSun = [dx / dl * Math.sin(e), dy / dl * Math.sin(e), -Math.cos(e)]; }
      if (['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(k)) { const z = Math.max(toSun[2], 0.6), l = Math.hypot(toSun[0], toSun[1], z); toSun = [toSun[0] / l, toSun[1] / l, z / l]; }
      return { k, x: P.x, y: P.y, z: P.z, r: er * BODY_R[k], ring: ringR(k), ph: P.ph, light: toSun };
    });
    // город на Земле → мир
    const city = cityOf(), gm = angles(d, 0, 0).ramc * RAD;
    SKY.gmst = gm;
    const ra = gm + city.lon * RAD, la = city.lat * RAD;
    SKY.cityW = mv(A, [Math.cos(la) * Math.cos(ra), Math.cos(la) * Math.sin(ra), Math.sin(la)]);
    // созвездия на внешнем кольце, каждое на своей долготе
    const lamKey = Math.round(lam0 / RAD * 4) + ':' + Math.round(er);
    if (lamKey !== SKY.segKey) {
      SKY.segKey = lamKey;
      const segs = [], boxes = [], ranges = [], conLab = [];
      const pxDeg = er * .034;
      for (const z of ZOD) {
        const P = place(z.lonC, er * 3.05 * (lay.portrait ? .82 : 1));
        const cy = P.y + (z.latC * pxDeg) * .5;
        const at = p => [P.x - angDiff(p.lon, z.lonC) * pxDeg, cy + (p.lat - z.latC) * pxDeg];
        const i0 = segs.length / 4;
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (const [a, b] of z.lines) {
          const A1 = at(z.pts[a]), B1 = at(z.pts[b]);
          segs.push(A1[0], A1[1], B1[0], B1[1]);
          bx0 = Math.min(bx0, A1[0], B1[0]); by0 = Math.min(by0, A1[1], B1[1]); bx1 = Math.max(bx1, A1[0], B1[0]); by1 = Math.max(by1, A1[1], B1[1]);
        }
        const pad = 6 * S;
        boxes.push(bx0 - pad, by0 - pad, bx1 + pad, by1 + pad); ranges.push(i0, segs.length / 4);
        conLab.push({ x: (bx0 + bx1) / 2, y: by0 - 14 * S });
      }
      SKY.segs = new Float32Array(segs); SKY.boxes = new Float32Array(boxes); SKY.ranges = new Float32Array(ranges); SKY.conLab = conLab;
      SKY.segDirty = true;
    }
  }

  // таблица: строится один раз, дальше меняются только значения
  const ephBody = $('ephBody');
  ephBody.innerHTML = UNI_ORDER.map((k, i) => `<tr data-i="${i}" style="--i:${i}"><td class="g sym" aria-hidden="true">${PL[k].glyph}</td><th scope="row">${PL[k].name}</th><td class="sg-c"></td><td class="num pos-c"></td><td class="mv-c"></td></tr>`).join('');
  const rows = [...ephBody.querySelectorAll('tr')];
  rows.forEach((tr, i) => {
    tr.addEventListener('pointerenter', () => { SKY.hover = i; });
    tr.addEventListener('pointerleave', () => { SKY.hover = -1; });
    tr.addEventListener('click', () => pinBody(SKY.pin === i ? -1 : i));
  });
  function fillTable(pos) {
    rows.forEach((tr, i) => {
      const k = UNI_ORDER[i], p = pos[k], sg = signOf(p.lon);
      const c = tr.children;
      c[2].innerHTML = `<span class="sym sg" aria-hidden="true">${sg.glyph}</span>${sg.name}`;
      c[3].innerHTML = `${fmtPos(p.lon)}${p.retro ? '<span class="rx" title="ретроградное">℞</span>' : ''}`;
      const mvTxt = k === 'moon' ? `${Math.abs(p.speed).toFixed(1).replace('.', ',')}° в сутки` : k === 'sun' ? 'прямое' : p.retro ? 'ретроградное' : 'прямое';
      c[4].textContent = mvTxt; c[4].className = 'mv-c' + (p.retro ? ' r' : '');
    });
  }
  function fillMoon(d, pos) {
    const ph = moonPhase(d), sg = signOf(pos.moon.lon);
    $('moonTitle').textContent = `Луна ${sg.loc}`;
    $('moonText').textContent = FRAME.moon(FACETS[sg.key]);
    $('moonLine').textContent = `${phaseName(ph.elong)}, освещено ${Math.round(ph.illum * 100)}%. Полнолуние — ${fmtDate(nextPhase(d, 180))}, новолуние — ${fmtDate(nextPhase(d, 0))}.`;
    drawMoonReal($('moonCard'), ph.elong);
    const notes = [];
    for (const k of ['mercury', 'venus', 'mars']) if (pos[k].retro) { const st = nextStation(d, k, 120); notes.push(`${PL[k].name} ${k === 'venus' ? 'ретроградна' : 'ретрограден'}${st ? ` до ${fmtDate(st)}` : ''}`); }
    $('notices').textContent = notes.length ? notes.join(' · ') + '.' : '';
  }
  const localOf = (ms, tz) => new Date(ms + tz * 3600e3);
  const hhmm = (ms, tz) => { const l = localOf(ms, tz); return `${String(l.getUTCHours()).padStart(2, '0')}:${String(l.getUTCMinutes()).padStart(2, '0')}`; };
  function fillWhen(ms) {
    const city = cityOf(), l = localOf(ms, city.tz);
    $('whenDate').textContent = fmtDate(l, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
    $('whenTime').textContent = (SKY.live ? 'сейчас, ' : SKY.play ? 'ход времени, ' : '') + hhmm(ms, city.tz) + ' по местному времени';
    $('ephCaption').textContent = SKY.live ? 'Положения на эту минуту — страница пересчитывает их сама.' : 'Положения на выбранное время. «Сейчас» вернёт текущую минуту.';
  }

  // шкала суток: светлая полоса — когда Солнце над горизонтом города, значки — моменты наибольшей высоты Солнца и Луны
  const tl = $('tl'), tlKnob = $('tlKnob'), tlLabel = $('tlLabel');
  tl.querySelector('.tl-ticks').innerHTML = Array.from({ length: 25 }, (_, h) => `<i style="left:${h / 24 * 100}%" class="${h % 6 ? '' : 'big'}">${h % 6 ? '' : `<b>${String(h).padStart(2, '0')}:00</b>`}</i>`).join('');
  const dayStart = (ms, tz) => Math.floor((ms + tz * 3600e3) / 86400e3) * 86400e3 - tz * 3600e3;
  function altOf(d, lonEcl, latEcl, lat, lon) {
    const v = eclToEq(lonEcl, latEcl), ra = Math.atan2(v[1], v[0]), dec = Math.asin(v[2]);
    const H = angles(d, lat, lon).ramc * RAD - ra, la = lat * RAD;
    return Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H)) / RAD;
  }
  function buildDay(ms) {
    const city = cityOf(), d0 = dayStart(ms, city.tz), key = d0 + ':' + SKY.cityIdx;
    if (key === SKY.dayKey) return; SKY.dayKey = key; SKY.d0 = d0;
    const stops = []; let sunMax = -99, sunT = 0, moonMax = -99, moonT = 0;
    for (let i = 0; i <= 96; i++) {
      const t = d0 + i * 900e3, dd = new Date(t), pp = positions(dd);
      const as = altOf(dd, pp.sun.lon, 0, city.lat, city.lon), am = altOf(dd, pp.moon.lon, pp.moon.lat || 0, city.lat, city.lon);
      if (as > sunMax) { sunMax = as; sunT = i / 96; } if (am > moonMax) { moonMax = am; moonT = i / 96; }
      const day = Math.min(1, Math.max(0, as / 18)), dusk = as > -8 && as < 2 ? 1 - Math.abs(as + 3) / 6 : 0;
      // днём — светлая сталь, у полудня чуть теплее, в сумерках — приглушённый тёплый отблеск
      const warm = day * day * .45, a = 0.18 + 0.72 * day + 0.2 * Math.max(0, dusk);
      const r = 80 + 150 * day + 30 * warm + 90 * Math.max(0, dusk), g2 = 95 + 140 * day + 5 * warm + 40 * Math.max(0, dusk), b = 125 + 125 * day - 70 * warm - 20 * Math.max(0, dusk);
      stops.push(`rgba(${r | 0}, ${g2 | 0}, ${b | 0}, ${a.toFixed(2)}) ${(i / 96 * 100).toFixed(2)}%`);
    }
    $('tlBand').style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    $('tlSun').style.left = (sunT * 100) + '%'; $('tlSun').title = `Солнце выше всего в ${hhmm(d0 + sunT * 86400e3, city.tz)}`;
    $('tlMoon').style.left = (moonT * 100) + '%'; $('tlMoon').title = `Луна выше всего в ${hhmm(d0 + moonT * 86400e3, city.tz)}`;
  }
  function placeKnob(ms) {
    const city = cityOf(), f = Math.min(1, Math.max(0, (ms - dayStart(ms, city.tz)) / 86400e3));
    tlKnob.style.left = (f * 100) + '%';
    const txt = hhmm(ms, city.tz);
    tlLabel.textContent = txt; tlKnob.setAttribute('aria-valuenow', Math.round(f * 1439)); tlKnob.setAttribute('aria-valuetext', txt);
  }
  function setTarget(ms, fromUser) {
    SKY.target = ms;
    if (fromUser) { SKY.live = false; setPlay(false); }
    Stage.invalidate();
  }
  function timeFromX(clientX) {
    const r = tl.getBoundingClientRect(), f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return (SKY.d0 || dayStart(SKY.target, cityOf().tz)) + f * 86400e3;
  }
  let dragging = false;
  tl.addEventListener('pointerdown', e => { dragging = true; tl.setPointerCapture(e.pointerId); setTarget(timeFromX(e.clientX), true); tlKnob.focus({ preventScroll: true }); });
  tl.addEventListener('pointermove', e => { if (dragging) setTarget(timeFromX(e.clientX), true); });
  tl.addEventListener('pointerup', () => { dragging = false; });
  tl.addEventListener('pointercancel', () => { dragging = false; });
  tlKnob.addEventListener('keydown', e => {
    const step = (e.shiftKey ? 60 : 5) * 60e3;
    const keys = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step };
    if (keys[e.key] !== undefined) { setTarget(SKY.target + keys[e.key], true); e.preventDefault(); }
    if (e.key === 'Home') { setTarget(SKY.d0, true); e.preventDefault(); }
    if (e.key === 'End') { setTarget(SKY.d0 + 86399e3, true); e.preventDefault(); }
  });
  const playBtn = $('skyPlay');
  function setPlay(on) {
    SKY.play = on;
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.setAttribute('aria-label', on ? 'Остановить ход времени' : 'Запустить ход времени: сутки за полторы минуты');
    playBtn.innerHTML = on ? '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2v10M10 2v10" stroke="currentColor" stroke-width="1.5"/></svg>' : '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4.5 2.2l7 4.8-7 4.8z" fill="currentColor"/></svg>';
    if (on) SKY.live = false;
    Stage.invalidate();
  }
  playBtn.addEventListener('click', () => setPlay(!SKY.play));
  $('nowBtn').addEventListener('click', () => { SKY.live = true; setPlay(false); SKY.target = Date.now(); Stage.invalidate(); });
  setPlay(false);

  // город: от него зависят местное время, светлая часть суток и точка на Земле
  const skyCity = $('skyCity');
  CITIES.forEach(([n], i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = CITY_FULL[n] || n; skyCity.appendChild(o); });
  function setSkyCity(i) {
    SKY.cityIdx = i; skyCity.value = String(i);
    const c = cityOf();
    $('whenCoords').textContent = `${Math.abs(c.lat).toFixed(4).replace('.', ',')}° ${c.lat >= 0 ? 'с. ш.' : 'ю. ш.'}  ${Math.abs(c.lon).toFixed(4).replace('.', ',')}° ${c.lon >= 0 ? 'в. д.' : 'з. д.'}`;
    SKY.dayKey = ''; SKY.lastMin = ''; buildLabels(SKY.S); Stage.invalidate();
  }
  skyCity.addEventListener('change', () => setSkyCity(+skyCity.value));

  // выбор тела: наведение на строку или на само тело в сцене; клик закрепляет и показывает подпись
  function pinBody(i) {
    SKY.pin = i;
    rows.forEach((tr, j) => tr.classList.toggle('pin', j === i));
    if (i < 0) skyTip.classList.remove('on');
    Stage.invalidate();
  }
  function bodyAt(clientX, clientY) {
    const sr = skySec.getBoundingClientRect(), S = SKY.S;
    let best = -1, bd = 1e9;
    SKY.bodies.forEach((b, i) => {
      const x = sr.left + b.x / S, y = sr.bottom - b.y / S;
      const behind = b.z < 0 && Math.hypot(b.x - SKY.lay.ec[0], b.y - SKY.lay.ec[1]) < SKY.lay.er;
      const d = Math.hypot(clientX - x, clientY - y);
      if (!behind && d < b.r / S + 10 && d < bd) { bd = d; best = i; }
    });
    return best;
  }
  skySec.addEventListener('pointermove', e => {
    if (e.target.closest('.sky-left, .sky-when, .sky-time, .sky-tip')) return;
    const i = bodyAt(e.clientX, e.clientY);
    SKY.hover = i; skySec.style.cursor = i >= 0 ? 'pointer' : '';
  });
  skySec.addEventListener('pointerleave', () => { SKY.hover = -1; });
  skySec.addEventListener('click', e => {
    if (e.target.closest('.sky-left, .sky-when, .sky-time, .sky-tip')) return;
    const i = bodyAt(e.clientX, e.clientY);
    pinBody(i === SKY.pin ? -1 : i);
  });
  function placeTip() {
    const i = SKY.pin; if (i < 0 || !SKY.pos) return;
    const b = SKY.bodies[i], k = UNI_ORDER[i], p = SKY.pos[k], S = SKY.S, sr = skySec.getBoundingClientRect();
    const html = `<b><span class="sym">${PL[k].glyph}</span> ${PL[k].name}</b><span>${fmtPos(p.lon)} ${signOf(p.lon).gen}</span><span>${k === 'moon' ? `${phaseName(moonPhase(new Date(SKY.disp)).elong).toLowerCase()}` : k === 'sun' ? 'видимое движение — прямое' : p.retro ? 'ретроградное движение' : 'прямое движение'}</span>`;
    if (skyTip.dataset.k !== k + SKY.lastMin) { skyTip.innerHTML = html; skyTip.dataset.k = k + SKY.lastMin; }
    skyTip.style.left = (b.x / S + b.r / S + 14) + 'px'; skyTip.style.top = (sr.height - b.y / S) + 'px';
    skyTip.classList.add('on');
  }

  // текстуры подписей и созвездий — свои, в отдельных слотах (движок занимает 0…3)
  const SKY_GL = { lab: null, seg: null };
  function upload(gl) {
    if (!SKY_GL.lab) SKY_GL.lab = gl.createTexture();
    if (SKY.labDirty) {
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, SKY_GL.lab);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labCv);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      SKY.labDirty = false;
    }
    if (!SKY_GL.seg) SKY_GL.seg = gl.createTexture();
    if (SKY.segDirty && SKY.segs) {
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, SKY_GL.seg);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SKY.segs.length / 4, 1, 0, gl.RGBA, gl.FLOAT, SKY.segs);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      SKY.segDirty = false;
    }
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, SKY_GL.lab);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, SKY_GL.seg);
  }

  // кадр сцены: время плавно догоняет цель, всё пересчитывается из настоящих положений
  const big = Stage.tier === 'high';
  const lb = new Float32Array(96), luv = new Float32Array(96), lc = new Float32Array(96);
  const bp = new Float32Array(40), bl = new Float32Array(30), bo = new Float32Array(20);
  let lastFill = 0;
  Stage.view(skySec, 'sky', {
    textures: { u_mw: `assets/sky/milkyway-${big ? '4k' : '2k'}.webp`, u_day: `assets/sky/earth-day-${big ? '4k' : '2k'}.webp`, u_aux: `assets/sky/earth-aux-${big ? '4k' : '2k'}.webp`, u_atlas: 'assets/sky/planets.webp' },
    uniforms: (gl, L, v, now, dt) => {
      const S = gl.drawingBufferWidth / gl.canvas.clientWidth;
      if (Math.abs(S - SKY.S) > 0.01 || !labCv.width) { SKY.S = S; buildLabels(S); }
      if (SKY.live) SKY.target = Date.now();
      else if (SKY.play && !REDUCED) SKY.target += dt * 1000 * 1000; // сутки ≈ за полторы минуты
      const diff = SKY.target - SKY.disp;
      SKY.disp = Math.abs(diff) < 1000 || REDUCED ? SKY.target : SKY.disp + diff * (1 - Math.exp(-dt * 7));
      const d = new Date(SKY.disp);
      SKY.lay = skyLayout(v.rect, S);
      skyFrame(d);
      // таблица, карточка Луны, шкала — не чаще 4 раз в секунду и только когда сменилась минута
      const city = cityOf(), minKey = hhmm(SKY.disp, city.tz) + ':' + Math.floor(SKY.disp / 86400e3) + ':' + SKY.cityIdx + ':' + SKY.live + SKY.play;
      if (minKey !== SKY.lastMin && now - lastFill > 240) {
        SKY.lastMin = minKey; lastFill = now;
        fillTable(SKY.pos); fillWhen(SKY.disp); buildDay(SKY.disp);
        if (Math.floor(SKY.disp / 3600e3) !== SKY.moonHour) { SKY.moonHour = Math.floor(SKY.disp / 3600e3); fillMoon(d, SKY.pos); }
      }
      placeKnob(SKY.disp);
      // выделение
      const want = SKY.hover >= 0 ? SKY.hover : SKY.pin;
      if (want >= 0) SKY.hl = want;
      SKY.hlA += ((want >= 0 ? 1 : 0) - SKY.hlA) * (1 - Math.exp(-dt * 8));
      rows.forEach((tr, j) => tr.classList.toggle('on', j === want));
      // тела
      SKY.bodies.forEach((b, i) => {
        bp.set([b.x, b.y, b.r, b.z], i * 4); bl.set(b.light, i * 3);
        bo.set([b.ring, b.ph], i * 2);
      });
      // подписи
      let n = 0;
      const pushLab = (l, x, y, col, a) => { lb.set([x, y, l.w, l.h], n * 4); luv.set([0, l.v0, l.u1, l.v1], n * 4); lc.set([...col, a], n * 4); n++; };
      const ec = SKY.lay.ec, er = SKY.lay.er;
      // подписи тел: из нескольких мест вокруг тела берём первое, где подпись не задевает другие тела и подписи
      const vis = SKY.bodies.map((b, i) => ({ i, b, l: LABELS[i], hidden: b.z < 0 && Math.hypot(b.x - ec[0], b.y - ec[1]) < er + b.r })).filter(o => o.l.w && !o.hidden);
      vis.sort((a, b) => b.b.r - a.b.r);
      const placed = [];
      const hitsRect = (x, y, w, h) => SKY.bodies.some(b => { const rr = b.k === 'sun' ? b.r * 2.6 : b.r; return Math.abs(b.x - x) < w / 2 + rr && Math.abs(b.y - y) < h / 2 + rr; }) || placed.some(r => Math.abs(r.x - x) < (w + r.w) / 2 && Math.abs(r.y - y) < (h + r.h) / 2) || Math.hypot(x - ec[0], y - ec[1]) < er + 4 * S;
      for (const o of vis) {
        const { b, l } = o, w = l.w, h = l.h * .6, g = 6 * S;
        const cand = [[b.x + b.r * .3 + w / 2, b.y - b.r - g - h / 2], [b.x - b.r * .3 - w / 2, b.y - b.r - g - h / 2], [b.x + b.r + g + w / 2, b.y], [b.x - b.r - g - w / 2, b.y], [b.x, b.y + b.r + g + h / 2], [b.x + b.r * .3 + w / 2, b.y - b.r - g * 3 - h * 1.5]];
        let pos = cand.find(([x, y]) => !hitsRect(x, y, w, h)) || cand[0];
        placed.push({ x: pos[0], y: pos[1], w, h });
        const on = SKY.hl === o.i ? SKY.hlA : 0;
        pushLab(l, pos[0], pos[1], [.78 + .2 * on, .83 + .15 * on, .9 + .1 * on], .82 + .18 * on);
      }
      ZOD.forEach((z, i) => { const l = LABELS[10 + i], p = SKY.conLab[i]; if (l.w && p && Math.hypot(p.x - ec[0], p.y - ec[1]) > er * 1.12 && p.y > 120 * S && !SKY.lay.portrait) pushLab(l, p.x, p.y, [.55, .64, .76], .55); });
      const cl = LABELS[LABELS.length - 1];
      if (cl.w && SKY.cityW[2] > 0.15) pushLab(cl, ec[0] + SKY.cityW[0] * er + cl.w / 2 + 6 * S, ec[1] + SKY.cityW[1] * er + 12 * S, [.92, .95, 1], .85);
      upload(gl);
      gl.uniform1i(L('u_lab'), 6); gl.uniform1i(L('u_cseg'), 7);
      gl.uniform4fv(L('u_cbox'), SKY.boxes); gl.uniform2fv(L('u_crange'), SKY.ranges); gl.uniform1i(L('u_ncon'), ZOD.length);
      gl.uniform2f(L('u_ec'), ec[0], ec[1]); gl.uniform1f(L('u_er'), er);
      gl.uniformMatrix3fv(L('u_M'), false, new Float32Array(SKY.A));
      gl.uniform1f(L('u_gmst'), SKY.gmst); gl.uniform1f(L('u_cloud'), (now / 1000) * 0.0035);
      gl.uniform3f(L('u_sunW'), ...SKY.sunW); gl.uniform3f(L('u_cityW'), ...SKY.cityW);
      gl.uniform2f(L('u_orb'), ROLL, SQ);
      gl.uniform2fv(L('u_bo'), bo); gl.uniform4fv(L('u_bp'), bp); gl.uniform3fv(L('u_bl'), bl);
      gl.uniform1i(L('u_hl'), SKY.hlA > 0.01 ? SKY.hl : -1); gl.uniform1f(L('u_hlA'), SKY.hlA);
      gl.uniform4fv(L('u_lb'), lb); gl.uniform4fv(L('u_luv'), luv); gl.uniform4fv(L('u_lc'), lc); gl.uniform1i(L('u_nlab'), n);
      gl.uniform1f(L('u_play'), SKY.play ? 1 : 0);
      placeTip();
    },
  });
  const ephTable = $('eph');
  new IntersectionObserver((es, o) => { for (const e of es) if (e.isIntersecting) { ephTable.classList.add('shown'); o.disconnect(); } }, { threshold: 0.25 }).observe(ephTable);
  // первое заполнение до первого кадра сцены (и для браузеров без WebGL)
  function skyInit() {
    setSkyCity(0);
    const d = new Date(); SKY.pos = positions(d);
    fillTable(SKY.pos); fillWhen(d.getTime()); buildDay(d.getTime()); placeKnob(d.getTime()); fillMoon(d, SKY.pos);
    const ph = moonPhase(d), ms = signOf(SKY.pos.moon.lon);
    drawMoonDisc($('moonSmall'), ph.elong);
    $('moonSmallTitle').textContent = phaseName(ph.elong);
    $('moonSmallText').textContent = ` · освещено ${Math.round(ph.illum * 100)}%, ${ms.loc}`;
  }
  // Луна для карточки — по карте поверхности из атласа (ортографическая проекция видимой стороны)
  const moonImg = new Image(); let moonPx = null;
  moonImg.onload = () => {
    try { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.drawImage(moonImg, 0, 0, 512, 256, 0, 0, 512, 256); moonPx = g.getImageData(0, 0, 512, 256).data; } catch (e) { moonPx = null; }
    if (SKY.pos) drawMoonReal($('moonCard'), moonPhase(new Date(SKY.disp)).elong);
  };
  moonImg.src = 'assets/sky/planets.webp';
  function drawMoonReal(cv, elong) {
    if (!moonPx) { drawMoonDisc(cv, elong); return; }
    const g = cv.getContext('2d'), N = cv.width, R = N * .46, im = g.createImageData(N, N), e = elong * RAD;
    const L = [Math.sin(e), 0, -Math.cos(e)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x - N / 2 + .5) / R, dy = (y - N / 2 + .5) / R, r2 = dx * dx + dy * dy, o = (y * N + x) * 4;
      if (r2 >= 1) { im.data[o + 3] = 0; continue; }
      const z = Math.sqrt(1 - r2), lat = Math.asin(-dy), lon = Math.atan2(dx, z);
      const u = Math.floor((lon / (2 * Math.PI) + .5) * 511), v = Math.floor((.5 - lat / Math.PI) * 255);
      const s = (v * 512 + u) * 4, lam = Math.max(0, dx * L[0] + z * L[2]);
      const k = Math.min(1, lam * 1.15 + 0.13), edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 1.2);
      im.data[o] = moonPx[s] * k; im.data[o + 1] = moonPx[s + 1] * k; im.data[o + 2] = Math.min(255, moonPx[s + 2] * k * 1.04); im.data[o + 3] = 255 * edge;
    }
    g.clearRect(0, 0, N, N); g.putImageData(im, 0, 0);
  }
  // город из карты рождения — и в «Небе сегодня»
  const skySetCityFromChart = place => { const i = CITIES.findIndex(c => c[0] === place.name); if (i >= 0) setSkyCity(i); };

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => buildLabels(SKY.S));

  // ——— 04 натальная карта ———
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
    asps.sort((x, y) => x.orb - y.orb);
    return { date, place, timeKnown, pos, ang, pts, asps, rot: ang ? ang.asc : 0 };
  }

  const wheel = $('wheel');
  const W = { chart: null, prev: null, start: -1e9, morph: false, hover: null, auto: null, hits: [], layer: null, s: 0, dpr: 1, dim: 0, playing: false, visible: false };
  // звёзды внутри круга — медленно плывут, пока карта на экране
  const WSTARS = (() => { let k = 99; const r = () => ((k = (k * 1664525 + 1013904223) >>> 0) / 4294967296); return Array.from({ length: 150 }, () => ({ r: Math.sqrt(r()), a: r() * 6.283, m: Math.pow(r(), 3), p: r() * 6.283 })); })();
  function sizeWheel() {
    const r = wheel.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W.s = r.width; W.dpr = dpr;
    wheel.width = Math.round(r.width * dpr); wheel.height = Math.round(r.height * dpr);
  }
  const at = (T, a, b) => (REDUCED ? 1 : Math.min(1, Math.max(0, (T - a) / (b - a))));
  const eo = t => 1 - Math.pow(1 - t, 3);
  const CER_END = 3.45, MORPH_END = 1.9;

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

  // рисует круг в момент T церемонии; возвращает true, пока идёт анимация
  function renderNatal(now) {
    const ch = W.chart; if (!ch || !W.s) return false;
    const T = REDUCED ? 99 : (now - W.start) / 1000;
    const g = wheel.getContext('2d'), s = W.s;
    g.setTransform(W.dpr, 0, 0, W.dpr, 0, 0); g.clearRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2, R = s * 0.47, rSign = R - s * 0.08, rPlan = rSign - s * 0.052, rDeg = rPlan - s * (s < 520 ? 0.058 : 0.044), rHouse = s * 0.285, rAsp = s * 0.225;
    const morph = W.morph && W.prev;
    const mk = morph ? eo(at(T, 0.05, 1.2)) : 1;
    const rot = morph ? lerpAng(W.prev.rot, ch.rot, mk) : ch.rot;
    const A = lon => Math.PI - (lon - rot) * RAD; // асцендент слева, знаки против часовой
    const P = (lon, r) => [cx + Math.cos(A(lon)) * r, cy + Math.sin(A(lon)) * r];
    const lay = W.layer;
    const hv = W.hover || W.auto;
    // 1. световая точка в центре
    const pPoint = morph ? 1 : at(T, 0, 0.35);
    const pointFade = morph ? 0 : 1 - at(T, 0.9, 1.5);
    if (pPoint > 0 && pointFade > 0.05) {
      const k = pPoint * pointFade, rr = s * 0.03;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      rg.addColorStop(0, `rgba(240, 245, 252, ${0.95 * k})`); rg.addColorStop(0.18, `rgba(220, 232, 246, ${0.35 * k})`); rg.addColorStop(1, 'rgba(220, 232, 246, 0)');
      g.fillStyle = rg; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      g.strokeStyle = `rgba(235, 242, 250, ${0.55 * k})`; g.lineWidth = 0.8;
      const ray = s * 0.05 * (0.5 + pPoint * 0.5);
      g.beginPath(); g.moveTo(cx - ray, cy); g.lineTo(cx + ray, cy); g.moveTo(cx, cy - ray); g.lineTo(cx, cy + ray); g.stroke();
    }
    // 2. внешние круги и градусные риски гравируются по ходу часовой
    const sweep = morph ? 1 : eo(at(T, 0.25, 1.05));
    const a0 = Math.PI; // от асцендента
    g.lineWidth = 1;
    if (sweep > 0) {
      g.strokeStyle = lineCol(0.62);
      for (const r of [R, R - 3, rSign]) { g.beginPath(); g.arc(cx, cy, r, a0, a0 + Math.PI * 2 * sweep); g.stroke(); }
      for (let d = 0; d < 360; d++) {
        const ang = (d / 360);
        if (ang > sweep) break;
        const th = a0 + ang * Math.PI * 2;
        const len = d % 10 === 0 ? s * 0.02 : d % 5 === 0 ? s * 0.013 : s * 0.007;
        g.strokeStyle = lineCol(d % 5 === 0 ? 0.55 : 0.3); g.lineWidth = d % 10 === 0 ? 0.9 : 0.6;
        g.beginPath(); g.moveTo(cx + Math.cos(th) * rSign, cy + Math.sin(th) * rSign); g.lineTo(cx + Math.cos(th) * (rSign - len), cy + Math.sin(th) * (rSign - len)); g.stroke();
      }
    }
    // 3. знаки зодиака
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const k = morph ? 1 : at(T, 0.85 + i * 0.045, 1.15 + i * 0.045);
      if (k <= 0) continue;
      const s0 = i * 30;
      const [x0, y0] = P(s0, R - 3), [x1, y1] = P(s0, rSign);
      g.globalAlpha = k; g.strokeStyle = lineCol(0.45); g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const [gx, gy] = P(s0 + 15, (R - 3 + rSign) / 2);
      g.fillStyle = COL.moonDim; g.font = `${Math.round(s * 0.034)}px ${F.sym}`;
      g.fillText(SIGNS[i].glyph, gx, gy + (1 - k) * 4);
    }
    g.globalAlpha = 1;
    // дома
    if (ch.ang) {
      const kh = morph ? 1 : at(T, 1.25, 1.8);
      const emph = lay === 'houses' ? 1 : lay ? 0.35 : 0.7;
      if (kh > 0) {
        g.globalAlpha = kh * emph;
        g.strokeStyle = lineCol(0.5); g.lineWidth = 0.6;
        g.beginPath(); g.arc(cx, cy, rHouse, 0, Math.PI * 2); g.stroke();
        for (let h = 0; h < 12; h++) {
          const lon = ch.ang.asc + h * 30;
          const [x0, y0] = P(lon, rHouse), [x1, y1] = P(lon, rSign - s * 0.02);
          g.lineWidth = h % 3 === 0 ? 1.3 : 0.5; g.strokeStyle = lineCol(h % 3 === 0 ? 0.7 : 0.4);
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          const [nx, ny] = P(lon + 15, rHouse - s * 0.026);
          g.fillStyle = COL.steel; g.font = `500 ${Math.max(10, Math.round(s * 0.021))}px ${F.display}`;
          g.fillText(ROMAN[h], nx, ny);
        }
        g.fillStyle = COL.moon; g.font = `600 ${Math.round(s * 0.024)}px ${F.display}`;
        const [ax, ay] = P(ch.ang.asc, rSign + 2); g.textAlign = 'right'; g.fillText('ASC', ax - 8, ay - s * 0.03);
        const [mx, my] = P(ch.ang.mc, rSign + 2); g.textAlign = 'center'; g.fillText('MC', mx, my - s * 0.028);
        g.globalAlpha = 1;
      }
    }
    // круг аспектов
    g.strokeStyle = lineCol(0.3); g.lineWidth = 0.6; g.globalAlpha = morph ? 1 : at(T, 1.2, 1.7);
    g.beginPath(); g.arc(cx, cy, rAsp, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    // звёздное поле внутри круга — живёт, пока карта на экране
    const kStars = morph ? 1 : at(T, 1.0, 2.2);
    if (kStars > 0) {
      const tt = REDUCED ? 0 : now / 1000;
      for (const st of WSTARS) {
        const ang = st.a + tt * 0.012, rr = st.r * rAsp * 0.96;
        const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
        g.globalAlpha = kStars * (0.12 + 0.55 * st.m) * (0.7 + 0.3 * Math.sin(tt * 1.3 + st.p));
        g.fillStyle = COL.moonDim;
        const sz = 0.6 + st.m * 1.4;
        g.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    }
    // 4. планеты; при пересчёте — переезд из старых положений
    const lonOf = k => { const n = ch.pts.find(t => t.key === k); if (!morph) return n.lon; const o = W.prev.pts.find(t => t.key === k); return o ? lerpAng(o.lon, n.lon, mk) : n.lon; };
    const pts = ch.pts.map(t => ({ ...t, lon: lonOf(t.key) }));
    // 5. аспекты — по очереди, от самых точных
    const aspA = lay === 'planets' ? 0.12 : 1;
    const drawAsp = (list, kOf) => {
      list.forEach((a, i) => {
        if (a.key === 'conj') return;
        const k = kOf(i); if (k <= 0) return;
        const pa = pts.find(t => t.key === a.a), pb = pts.find(t => t.key === a.b); if (!pa || !pb) return;
        const [x1, y1] = P(pa.lon, rAsp), [x2, y2] = P(pb.lon, rAsp);
        const on = !hv || a.a === hv || a.b === hv;
        g.strokeStyle = isHarm(a.key) ? COL.harm : COL.tense;
        g.globalAlpha = aspA * (on ? (hv ? 0.95 : lay === 'aspects' ? 0.85 : 0.6) : 0.08) * Math.min(1, k * 1.5);
        g.lineWidth = on && hv ? 1.6 : 1;
        g.setLineDash(a.key === 'sext' || a.key === 'square' ? [5, 4] : []);
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 + (x2 - x1) * eo(k), y1 + (y2 - y1) * eo(k)); g.stroke();
      });
      g.setLineDash([]); g.globalAlpha = 1;
    };
    if (morph) {
      const out = 1 - at(T, 0, 0.35);
      if (out > 0) { g.save(); g.globalAlpha = out; drawAsp(W.prev.asps, () => out); g.restore(); }
      drawAsp(ch.asps, i => at(T, 0.6 + i * 0.03, 1.0 + i * 0.03));
    } else drawAsp(ch.asps, i => at(T, 2.0 + i * 0.045, 2.35 + i * 0.045));
    // по линиям аспектов бегут огоньки — карта не застывает
    const kPulse = REDUCED ? 0 : (morph ? at(T, 1.3, 1.9) : at(T, 3.0, 3.8));
    if (kPulse > 0) {
      const tt = now / 1000;
      ch.asps.forEach((a, i) => {
        if (a.key === 'conj') return;
        const pa = pts.find(t => t.key === a.a), pb = pts.find(t => t.key === a.b); if (!pa || !pb) return;
        const on = !hv || a.a === hv || a.b === hv;
        const ph = (tt / (5 + (i % 4)) + i * 0.37) % 1;
        const [x1, y1] = P(pa.lon, rAsp), [x2, y2] = P(pb.lon, rAsp);
        const x = x1 + (x2 - x1) * ph, y = y1 + (y2 - y1) * ph;
        const al = Math.sin(ph * Math.PI) * kPulse * (on ? (hv ? 0.95 : 0.5) : 0.08);
        const rr = hv && on ? 9 : 6;
        const rg = g.createRadialGradient(x, y, 0, x, y, rr);
        rg.addColorStop(0, `rgba(235, 242, 250, ${al})`); rg.addColorStop(1, 'rgba(235, 242, 250, 0)');
        g.fillStyle = rg; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      });
    }
    // планеты — проявляются по яркости, каждая с короткой вспышкой
    W.hits = [];
    const placed = placeGlyphs(pts, s < 520 ? 17 : 10);
    for (const t of placed) {
      if (t.key === 'asc') continue;
      const idx = BY_BRIGHT.indexOf(t.key);
      const k = morph ? 1 : at(T, 1.3 + idx * 0.075, 1.55 + idx * 0.075);
      if (k <= 0) continue;
      const [tx, ty] = P(t.lon, rSign), [tx2, ty2] = P(t.lon, rSign - s * 0.016);
      const [gx, gy] = P(t.disp, rPlan);
      const isHv = hv === t.key;
      const related = !hv || isHv || ch.asps.some(a => (a.a === hv && a.b === t.key) || (a.b === hv && a.a === t.key));
      const emph = lay === 'aspects' || lay === 'houses' ? 0.5 : 1;
      g.globalAlpha = k * (related ? 1 : 0.28) * emph;
      g.strokeStyle = COL.moon; g.lineWidth = 1.1;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx2, ty2); g.stroke();
      const [lx, ly] = P(t.lon, rAsp);
      g.fillStyle = COL.moon; g.beginPath(); g.arc(lx, ly, 2.1, 0, Math.PI * 2); g.fill();
      const flare = (1 - k) * (morph ? 0 : 1) + (isHv ? 0.6 : 0);
      if (flare > 0.02) {
        const fr = s * (0.05 + 0.04 * (1 - k));
        const fg = g.createRadialGradient(gx, gy, 0, gx, gy, fr);
        fg.addColorStop(0, `rgba(235, 242, 250, ${0.45 * flare})`); fg.addColorStop(1, 'rgba(235, 242, 250, 0)');
        g.fillStyle = fg; g.fillRect(gx - fr, gy - fr, fr * 2, fr * 2);
      }
      g.fillStyle = isHv ? '#ffffff' : COL.moon; g.font = `${Math.round(s * 0.043)}px ${F.sym}`;
      g.fillText(PL[t.key].glyph, gx, gy);
      const [dx, dy] = P(t.disp, rDeg);
      g.fillStyle = COL.moonDim; g.font = `500 ${Math.max(10, Math.round(s * 0.021))}px ${F.display}`;
      g.fillText(`${degIn(t.lon).d}°${t.retro ? '℞' : ''}`, dx, dy);
      W.hits.push({ key: t.key, x: gx, y: gy, r: s * 0.035 });
    }
    g.globalAlpha = 1;
    // 6. световая волна по окружности
    const pw = morph ? at(T, 1.15, 1.85) : at(T, 2.55, 3.25);
    if (pw > 0 && pw < 1) {
      const head = Math.PI + pw * Math.PI * 2;
      for (let i = 0; i < 26; i++) {
        const th = head - i * 0.022;
        g.strokeStyle = `rgba(235, 242, 250, ${(1 - i / 26) * 0.75 * Math.sin(pw * Math.PI)})`;
        g.lineWidth = 2.2 - i * 0.06;
        g.beginPath(); g.arc(cx, cy, R - 1.5, th - 0.024, th); g.stroke();
      }
    }
    // фон секции гаснет на время церемонии
    W.dim = morph ? 0 : at(T, 0, 0.35) * (1 - at(T, 2.6, 3.4));
    const playing = !REDUCED && T < (morph ? MORPH_END : CER_END);
    return playing;
  }
  function ceremony(ch, fresh) {
    if (W.chart && !fresh) { W.prev = W.chart; W.morph = true; } else { W.prev = null; W.morph = false; }
    W.chart = ch; W.start = performance.now(); W.playing = true;
    const cards = $('reading');
    cards.classList.remove('built');
    setTimeout(() => cards.classList.add('built'), REDUCED ? 0 : (W.morph ? 900 : 2700));
    Stage.invalidate();
  }
  Stage.onFrame(now => {
    const auto = autoKey();
    if (auto !== W.auto) { W.auto = auto; markAuto(); }
    if (!W.playing && !(W.visible && !REDUCED)) return false;
    const playing = renderNatal(now);
    if (W.playing && !playing) { W.playing = false; renderNatal(now); }
    return W.playing || (W.visible && !REDUCED);
  });
  new IntersectionObserver(es => { for (const e of es) { W.visible = e.isIntersecting; if (W.visible) Stage.invalidate(); } }).observe(wheel);
  // карточка ближе всех к середине экрана — её планета выделяется на круге (только когда круг рядом, на широком экране)
  function autoKey() {
    if (W.hover || !W.visible || window.innerWidth <= 960 || W.playing) return null;
    const mid = window.innerHeight * 0.5;
    let best = null, bd = 1e9;
    for (const c of document.querySelectorAll('#reading .card')) {
      const r = c.getBoundingClientRect();
      if (r.bottom < 90 || r.top > window.innerHeight - 60) continue;
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (d < bd) { bd = d; best = c.dataset.key; }
    }
    return bd < window.innerHeight * 0.32 ? best : null;
  }
  function markAuto() {
    for (const c of document.querySelectorAll('#reading .card')) c.classList.toggle('auto', c.dataset.key === W.auto);
    if (!W.hover) { connPath.style.transition = 'none'; updateConnector(true); }
  }
  const redrawWheel = () => renderNatal(performance.now());
  Stage.view($('chart'), 'quiet', { uniforms: (gl, L) => { gl.uniform1f(L('u_variant'), 1); gl.uniform1f(L('u_dim'), W.dim); } });

  // наведение: планета ↔ карточка, соединённые световой линией
  const connPath = $('connPath'), connDot = $('connDot');
  function setHover(key, from) {
    if (key === W.hover) return;
    W.hover = key;
    const cards = $('reading');
    const hasCard = !!key && !!cards.querySelector(`.card[data-key="${key}"]`);
    cards.classList.toggle('focus', hasCard);
    for (const c of cards.querySelectorAll('.card')) c.classList.toggle('hl', hasCard && c.dataset.key === key);
    if (!W.playing) redrawWheel();
    connPath.style.transition = 'none';
    updateConnector(true);
  }
  function updateConnector(restart) {
    const key = W.hover || W.auto;
    const card = key && $('reading').querySelector(`.card[data-key="${key}"]`);
    const hit = key && W.hits.find(h => h.key === key);
    if (!card || !hit) { connPath.setAttribute('d', ''); connDot.setAttribute('r', 0); return; }
    const wr = wheel.getBoundingClientRect(), cr = card.getBoundingClientRect();
    if (cr.bottom < 0 || cr.top > window.innerHeight) { connPath.setAttribute('d', ''); connDot.setAttribute('r', 0); return; }
    const x0 = wr.left + hit.x, y0 = wr.top + hit.y;
    const side = cr.right < wr.left + 20; // карточка слева от круга
    const x1 = side ? cr.right : cr.left + cr.width / 2, y1 = side ? cr.top + Math.min(cr.height / 2, 34) : cr.top;
    // линия выходит из планеты наружу по радиусу, обходит круг по внешней кромке и уходит к карточке
    const wcx = wr.left + wr.width / 2, wcy = wr.top + wr.height / 2, Ro = wr.width * 0.49;
    const tp = Math.atan2(y0 - wcy, x0 - wcx);
    const tc = Math.atan2(y1 - wcy, x1 - wcx);
    let dt = tc - tp; while (dt > Math.PI) dt -= 2 * Math.PI; while (dt < -Math.PI) dt += 2 * Math.PI;
    const ax = wcx + Math.cos(tp) * Ro, ay = wcy + Math.sin(tp) * Ro;
    const bx = wcx + Math.cos(tp + dt) * Ro, by = wcy + Math.sin(tp + dt) * Ro;
    const d = `M${x0},${y0} L${ax},${ay} A${Ro},${Ro} 0 0 ${dt > 0 ? 1 : 0} ${bx},${by} C${(bx + x1) / 2},${by} ${(bx + x1) / 2},${y1} ${x1},${y1}`;
    connPath.setAttribute('d', d);
    const grad = document.getElementById('cg'); grad.setAttribute('x1', x0); grad.setAttribute('y1', y0); grad.setAttribute('x2', x1); grad.setAttribute('y2', y1);
    connDot.setAttribute('cx', x0); connDot.setAttribute('cy', y0); connDot.setAttribute('r', 2.5);
    if (restart && !REDUCED) {
      const len = connPath.getTotalLength();
      connPath.style.strokeDasharray = len; connPath.style.strokeDashoffset = len;
      connPath.getBoundingClientRect();
      connPath.style.transition = 'stroke-dashoffset .5s cubic-bezier(.2,.7,.2,1)'; connPath.style.strokeDashoffset = 0;
    }
  }
  Stage.onFrame(() => { if (W.hover || W.auto) updateConnector(false); return false; });
  wheel.addEventListener('pointermove', e => {
    const r = wheel.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const h = W.hits.find(t => Math.hypot(t.x - x, t.y - y) < t.r);
    setHover(h ? h.key : null, 'wheel');
    wheel.style.cursor = h ? 'pointer' : 'default';
  });
  wheel.addEventListener('pointerleave', () => setHover(null));
  for (const b of document.querySelectorAll('.layers button')) b.addEventListener('click', () => {
    W.layer = W.layer === b.dataset.layer ? null : b.dataset.layer;
    for (const x of document.querySelectorAll('.layers button')) x.setAttribute('aria-pressed', String(x.dataset.layer === W.layer));
    if (!W.playing) redrawWheel();
  });

  // 05 расшифровка: карточки — продолжение карты
  function renderReading(ch) {
    const main = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    const used = {};
    const aspList = key => ch.asps.filter(a => (a.a === key || a.b === key) && (a.key !== 'conj' || a.orb < 4)).slice(0, 3)
      .map(a => { const o = a.a === key ? a.b : a.a; return `<span style="color:${a.key === 'conj' ? COL.moon : isHarm(a.key) ? COL.harm : COL.tense}">${a.name}</span> ${o === 'asc' ? 'с асцендентом' : 'с ' + INSTR[o]}`; }).join(', ') || 'тесных нет';
    const cards = main.map((k, i) => {
      const lon = ch.pos[k].lon, sg = signOf(lon);
      let text = FRAME[k](FACETS[sg.key]);
      if (k === 'sun' || k === 'moon') text += ' ' + EL[sg.el].line;
      const first = ch.asps.find(a => (a.a === k || a.b === k) && a.key !== 'conj');
      if (first) text += ' ' + aspectSentence(first.key, first.a, first.b, used);
      return `<article class="card" data-key="${k}" style="--i:${i}" tabindex="0"><span class="g sym" aria-hidden="true">${PL[k].glyph}</span><h4>${PL[k].name} ${sg.loc}</h4><p class="text">${text}</p>
        <dl><dt>Знак</dt><dd>${sg.name}</dd><dt>Градус</dt><dd class="num">${fmtPos(lon)}${ch.pos[k].retro ? ', ретроградный' : ''}</dd>${ch.ang ? `<dt>Дом</dt><dd>${ROMAN[houseOf(lon, ch.ang.asc) - 1]}</dd>` : ''}<dt>Аспекты</dt><dd>${aspList(k)}</dd></dl></article>`;
    });
    if (ch.ang) {
      const sg = signOf(ch.ang.asc);
      cards.push(`<article class="card" data-key="asc" style="--i:7" tabindex="0"><span class="g" aria-hidden="true" style="font:600 .9rem/2 var(--f-display);letter-spacing:.1em">ASC</span><h4>Асцендент ${sg.loc}</h4><p class="text">${FRAME.asc(FACETS[sg.key])}</p><dl><dt>Градус</dt><dd class="num">${fmtPos(ch.ang.asc)}</dd><dt>Аспекты</dt><dd>${aspList('asc')}</dd></dl></article>`);
    }
    const box = $('reading');
    box.innerHTML = cards.join('');
    for (const c of box.querySelectorAll('.card')) {
      c.addEventListener('pointerenter', () => setHover(c.dataset.key, 'card'));
      c.addEventListener('pointerleave', () => setHover(null));
      c.addEventListener('focus', () => setHover(c.dataset.key, 'card'));
      c.addEventListener('blur', () => setHover(null));
    }
  }
  function setChart(ch, isSample, fresh) {
    const local = new Date(ch.date.getTime() + ch.place.tz * 3600e3);
    const meta = [];
    if (isSample) meta.push('<span class="sample">Пример</span>');
    meta.push(fmtDate(local, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }));
    meta.push(ch.timeKnown ? `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}` : 'время неизвестно — дома не строятся');
    meta.push(escapeHtml(ch.place.name));
    $('chartMeta').innerHTML = meta.join('<span aria-hidden="true">·</span>');
    skySetCityFromChart(ch.place);
    renderReading(ch);
    ceremony(ch, fresh);
  }

  // форма рождения
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
  // дата рождения: заполнена и в пределах 1900–2099, иначе — подсказка у поля
  function validDate(inp) {
    const v = inp.value, y = +v.slice(0, 4);
    const msg = !v ? 'Укажи дату рождения' : y < 1900 || y > 2099 ? 'Год — от 1900 до 2099' : '';
    inp.setCustomValidity(msg);
    if (msg) { inp.reportValidity(); inp.focus(); return false; }
    return true;
  }
  for (const id of ['bDate', 'aDate', 'cDate']) $(id).addEventListener('input', e => e.target.setCustomValidity(''));
  function localToUTC(dateStr, timeStr, tz) {
    const [y, m, d] = dateStr.split('-').map(Number), [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    return new Date(Date.UTC(y, m - 1, d, hh, mm) - tz * 3600e3);
  }
  $('birthForm').addEventListener('submit', e => {
    e.preventDefault();
    const ds = $('bDate').value;
    if (!validDate($('bDate'))) return;
    const noTime = $('bNoTime').checked;
    const place = readPlace();
    const ch = buildChart(localToUTC(ds, noTime ? '12:00' : $('bTime').value, place.tz), place, !noTime);
    setChart(ch, false, false);
    // на телефоне круг выше формы — показать его
    if (window.innerWidth <= 960) wheel.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
  });
  // первый показ секции с картой — церемония для примера
  let chartSeen = false;
  new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && !chartSeen) { chartSeen = true; if (W.chart && !W.morph) ceremony(W.chart, true); } }, { threshold: 0.35 }).observe(wheel);

  // ——— 06 совместимость ———
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
  const pairKey = (a, b) => (PAIR_TEXT[`${a}-${b}`] ? `${a}-${b}` : PAIR_TEXT[`${b}-${a}`] ? `${b}-${a}` : null);
  const SYN_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
  const pcv = $('pairCanvas');
  const PR = { a: null, b: null, cross: [], start: -1e9, enterAt: -1, visible: false, w: 0, h: 0, dpr: 1, hl: -1, hits: [], names: ['', ''] };
  const PP = window.PAIR_POINTS;
  // заранее: случайные фазы и стартовые позиции точек (разлетаются и собираются в силуэт при входе)
  function prepCloud(c, seed) {
    let s = seed;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const n = c.pts.length;
    const phase = new Float32Array(n), sx = new Float32Array(n), sy = new Float32Array(n), dl = new Float32Array(n);
    for (let i = 0; i < n; i++) { phase[i] = rnd() * 6.283; const a = rnd() * 6.283, r = 0.35 + rnd() * 0.5; sx[i] = Math.cos(a) * r; sy[i] = Math.sin(a) * r; dl[i] = rnd() * 0.6; }
    return { ...c, phase, sx, sy, dl };
  }
  const CL = PP ? [prepCloud(PP.a, 7), prepCloud(PP.b, 11)] : null;
  const glowSprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, 'rgba(235,242,250,1)'); rg.addColorStop(0.25, 'rgba(200,220,245,.35)'); rg.addColorStop(1, 'rgba(200,220,245,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32); return c;
  })();
  function sizePair() {
    const r = pcv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    PR.w = r.width; PR.h = r.height; PR.dpr = dpr;
    pcv.width = Math.round(r.width * dpr); pcv.height = Math.round(r.height * dpr);
  }
  function pairGeom() {
    const w = PR.w, h = PR.h;
    const rad = Math.min(h * 0.42, w * 0.21);
    const cxA = w / 2 - rad * 0.86, cxB = w / 2 + rad * 0.86, cy = h * 0.47;
    return { rad, A: [cxA, cy], B: [cxB, cy], mid: [w / 2, cy], box: Math.min(h * 0.96, rad * 2.3) };
  }
  // планета на кольце вокруг силуэта: угол — её долгота, как на маленькой карте
  const ringPos = (c, rad, lon) => [c[0] + Math.cos(Math.PI - lon * RAD) * rad, c[1] + Math.sin(Math.PI - lon * RAD) * rad];
  function renderPair(now) {
    if (!PR.w || !CL) return false;
    const g = pcv.getContext('2d');
    g.setTransform(PR.dpr, 0, 0, PR.dpr, 0, 0); g.clearRect(0, 0, PR.w, PR.h);
    const t = REDUCED ? 30 : now / 1000;
    const enter = REDUCED || PR.enterAt < 0 ? (PR.enterAt < 0 && !REDUCED ? 0 : 1) : Math.min(1, (now - PR.enterAt) / 2600);
    const T = REDUCED ? 99 : (now - PR.start) / 1000;
    const G = pairGeom();
    const litA = PR.a ? at(T, 0, 0.6) * (1 - at(T, 0.9, 1.6) * 0.6) : 0, litB = PR.a ? at(T, 0.4, 1.0) * (1 - at(T, 1.3, 2.0) * 0.6) : 0;
    // кольца-зодиаки и точка пересечения
    g.lineWidth = 1;
    for (const [c, lit] of [[G.A, litA], [G.B, litB]]) {
      g.strokeStyle = lineCol(0.18 + lit * 0.4); g.beginPath(); g.arc(c[0], c[1], G.rad, 0, Math.PI * 2); g.stroke();
      for (let d = 0; d < 360; d += 30) { const [x0, y0] = ringPos(c, G.rad, d), [x1, y1] = ringPos(c, G.rad - 6, d); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    }
    const pulse = 0.55 + 0.45 * Math.sin(t * 1.3);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 + 0.4 * pulse * enter;
    const sz = 22 + 10 * pulse;
    g.drawImage(glowSprite, G.mid[0] - sz / 2, G.mid[1] - sz / 2, sz, sz);
    // силуэты из пыли
    CL.forEach((c, ci) => {
      const ctr = ci === 0 ? G.A : G.B, box = G.box, lit = ci === 0 ? litA : litB;
      const ox = ctr[0] - box / 2, oy = G.mid[1] - box * 0.47;
      const n = c.pts.length, rim = c.rim;
      const pxs = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const e = REDUCED ? 1 : eo(Math.min(1, Math.max(0, (enter - c.dl[i] * 0.5) / 0.55)));
        const bx = ox + c.pts[i][0] * box + Math.sin(t * 0.5 + c.phase[i]) * 0.7;
        const by = oy + c.pts[i][1] * box + Math.cos(t * 0.43 + c.phase[i] * 1.3) * 0.7;
        const x = bx + c.sx[i] * box * (1 - e), y = by + c.sy[i] * box * (1 - e);
        pxs[i * 2] = x; pxs[i * 2 + 1] = y;
        const tw = 0.6 + 0.4 * Math.sin(t * (0.8 + (i % 7) * 0.21) + c.phase[i]);
        g.globalAlpha = Math.min(1, (i < rim ? 0.95 : 0.42) * tw * (0.45 + 0.55 * e) + lit * 0.4);
        g.fillStyle = i % 7 === 0 ? '#eef3f9' : i < rim ? '#c3d3e6' : '#8ea8c6';
        const r = (i < rim ? 1.7 : 1.35) * (i % 11 === 0 ? 1.5 : 1);
        g.fillRect(x - r / 2, y - r / 2, r, r);
      }
      // «созвездие» силуэта
      g.globalAlpha = 0.28 * enter + lit * 0.3; g.strokeStyle = '#c5d5e8'; g.lineWidth = 0.8;
      for (const [a, b] of c.lines) { const ia = c.stars[a], ib = c.stars[b]; g.beginPath(); g.moveTo(pxs[ia * 2], pxs[ia * 2 + 1]); g.lineTo(pxs[ib * 2], pxs[ib * 2 + 1]); g.stroke(); }
      for (const si of c.stars) { const s2 = 10 + (si % 3) * 4; g.globalAlpha = (0.7 + lit * 0.3) * enter; g.drawImage(glowSprite, pxs[si * 2] - s2 / 2, pxs[si * 2 + 1] - s2 / 2, s2, s2); }
    });
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // планеты на кольцах и связи между ними
    PR.hits = [];
    if (PR.a) {
      const pA = {}, pB = {};
      for (const k of SYN_KEYS) { pA[k] = ringPos(G.A, G.rad, PR.a.pos[k].lon); pB[k] = ringPos(G.B, G.rad, PR.b.pos[k].lon); }
      PR.cross.forEach((c, i) => {
        const k = at(T, 1.0 + i * 0.12, 1.5 + i * 0.12); if (k <= 0) return;
        const a = pA[c.a], b = pB[c.b];
        const cxm = G.mid[0], cym = G.mid[1] + (i % 2 ? 1 : -1) * (G.rad * 0.35 + i * G.rad * 0.07);
        const hl = PR.hl === i, dimmed = PR.hl >= 0 && !hl;
        g.strokeStyle = c.key === 'conj' ? COL.moon : isHarm(c.key) ? COL.harm : COL.tense;
        g.globalAlpha = (dimmed ? 0.12 : hl ? 1 : 0.55) * Math.min(1, k * 1.4);
        g.lineWidth = hl ? 1.8 : 1;
        g.beginPath(); g.moveTo(a[0], a[1]);
        const steps = 24, kk = eo(k);
        for (let j = 1; j <= steps * kk; j++) { const u = j / steps; g.lineTo((1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * cxm + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * cym + u * u * b[1]); }
        g.stroke();
        PR.hits.push({ i, a, b, c: [cxm, cym] });
      });
      g.globalAlpha = 1;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const related = (side, k) => PR.hl < 0 || (side === 0 ? PR.cross[PR.hl].a === k : PR.cross[PR.hl].b === k);
      for (const [side, pts] of [[0, pA], [1, pB]]) for (const k of SYN_KEYS) {
        const kk = at(T, 0.3 + side * 0.4 + SYN_KEYS.indexOf(k) * 0.05, 0.7 + side * 0.4 + SYN_KEYS.indexOf(k) * 0.05);
        if (kk <= 0) continue;
        const [x, y] = pts[k];
        g.globalAlpha = kk * (related(side, k) ? 1 : 0.3);
        g.fillStyle = 'rgba(4, 7, 13, .85)'; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill();
        g.strokeStyle = lineCol(0.5); g.lineWidth = 0.8; g.stroke();
        g.fillStyle = COL.moon; g.font = `13px ${F.sym}`; g.fillText(PL[k].glyph, x, y + 0.5);
      }
      g.globalAlpha = 1;
    }
    const animating = !REDUCED && (enter < 1 || T < 1.2 + PR.cross.length * 0.12 + 0.6);
    return PR.visible && !REDUCED ? true : animating;
  }
  Stage.onFrame(now => (PR.visible ? renderPair(now) : false));
  new IntersectionObserver(es => {
    for (const e of es) {
      PR.visible = e.isIntersecting;
      if (e.isIntersecting && PR.enterAt < 0) PR.enterAt = performance.now();
      if (e.isIntersecting) Stage.invalidate();
    }
  }, { threshold: 0.15 }).observe(pcv);
  pcv.addEventListener('pointermove', e => {
    const r = pcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bd = 10;
    for (const h of PR.hits) for (let j = 0; j <= 20; j++) {
      const u = j / 20, px = (1 - u) * (1 - u) * h.a[0] + 2 * (1 - u) * u * h.c[0] + u * u * h.b[0], py = (1 - u) * (1 - u) * h.a[1] + 2 * (1 - u) * u * h.c[1] + u * u * h.b[1];
      const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = h.i; }
    }
    setPairHl(best);
  });
  pcv.addEventListener('pointerleave', () => setPairHl(-1));
  function setPairHl(i) {
    if (i === PR.hl) return;
    PR.hl = i;
    const ul = $('pairReading');
    ul.classList.toggle('focus', i >= 0);
    for (const li of ul.querySelectorAll('li')) li.classList.toggle('hl', +li.dataset.i === i);
    Stage.invalidate();
  }
  function computePair(fromUser) {
    const nameA = $('aName').value.trim() || 'Первый', nameB = $('cName').value.trim() || 'Второй';
    const da = $('aDate').value, db = $('cDate').value;
    if (!validDate($('aDate')) || !validDate($('cDate'))) return;
    const noon = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 9, 0)); };
    PR.a = { pos: positions(noon(da)) }; PR.b = { pos: positions(noon(db)) };
    PR.cross = [];
    for (const a of SYN_KEYS) for (const b of SYN_KEYS) {
      const asp = aspectBetween(PR.a.pos[a].lon, PR.b.pos[b].lon, 0.8);
      if (asp) PR.cross.push({ a, b, ...asp });
    }
    PR.cross.sort((x, y) => x.orb - y.orb);
    const sa = signOf(PR.a.pos.sun.lon), sb = signOf(PR.b.pos.sun.lon);
    $('signA').textContent = sa.glyph; $('signB').textContent = sb.glyph;
    const friends = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
    let v;
    if (sa.el === sb.el) v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. Одна стихия, ${EL[sa.el].name}: вы понимаете друг друга с полуслова.`;
    else if (friends[sa.el] === sb.el) v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. ${cap(EL[sa.el].name)} и ${EL[sb.el].name} раздувают друг в друге лучшее.`;
    else v = `${nameA} — ${sa.name}, ${nameB} — ${sb.name}. ${cap(EL[sa.el].name)} и ${EL[sb.el].name} говорят на разных языках — придётся переводить.`;
    $('verdict').textContent = v;
    const easy = PR.cross.filter(c => ['trine', 'sext', 'conj'].includes(c.key)).length;
    $('cntAll').textContent = PR.cross.length; $('cntEasy').textContent = easy; $('cntHard').textContent = PR.cross.length - easy;
    const used = {}, usedPairs = new Set();
    PR.cross = PR.cross.slice(0, 8);
    const rows = PR.cross.map((c, i) => {
      const pk = pairKey(c.a, c.b);
      const base = pk && !usedPairs.has(pk) ? (usedPairs.add(pk), cap(PAIR_TEXT[pk]) + '.') : aspectSentence(c.key, c.a, c.b, used);
      const cls = c.key === 'conj' ? '' : isHarm(c.key) ? 'harm' : 'tense';
      return `<li data-i="${i}" class="${cls}"><span class="g" aria-hidden="true">${aspectMark(c.key)}</span><span class="cause">${PL[c.a].name} · ${escapeHtml(nameA)} — ${c.name} — ${PL[c.b].name} · ${escapeHtml(nameB)}, орб ${c.orb.toFixed(1).replace('.', ',')}°</span><p class="text">${base}</p></li>`;
    });
    const ul = $('pairReading');
    ul.innerHTML = rows.join('') || '<li><span class="g"></span><span class="cause">Тесных связей нет</span><p class="text">Планеты разошлись широко: отношения строятся на выборе, а не на «химии».</p></li>';
    for (const li of ul.querySelectorAll('li[data-i]')) { li.addEventListener('pointerenter', () => setPairHl(+li.dataset.i)); li.addEventListener('pointerleave', () => setPairHl(-1)); }
    PR.names = [nameA, nameB];
    PR.start = fromUser ? performance.now() : -1e9;
    if (fromUser && !PR.visible) PR.start = performance.now() + 400;
    Stage.invalidate();
  }
  $('pairForm').addEventListener('submit', e => { e.preventDefault(); $('pairSample').hidden = true; computePair(true); });
  Stage.view($('pair'), 'quiet', { uniforms: (gl, L) => { gl.uniform1f(L('u_variant'), 2); gl.uniform1f(L('u_dim'), 0); } });

  // ——— 07 как мы считаем ———
  Stage.view($('method'), 'method', {
    textures: { u_room: plateUrl('method-room') },
    // высота экрана в долях секции: снимок кабинета подгоняется под экран, а не под всю длинную секцию
    uniforms: (gl, L) => gl.uniform1f(L('u_vh'), Math.min(1, window.innerHeight / Math.max(1, $('method').offsetHeight))),
  });

  // ——— 08 консультации ———
  const offers = $('offers');
  function sizeFrames() {
    for (const o of offers.querySelectorAll('.offer')) {
      const r = o.getBoundingClientRect(), rect = o.querySelector('.frame rect');
      rect.setAttribute('width', Math.max(0, r.width - 1)); rect.setAttribute('height', Math.max(0, r.height - 1));
      o.style.setProperty('--len', Math.ceil(2 * (r.width + r.height)));
    }
  }
  new IntersectionObserver((es, ob) => { for (const e of es) if (e.isIntersecting) { offers.classList.add('shown'); ob.disconnect(); } }, { threshold: 0.2 }).observe(offers);
  for (const o of offers.querySelectorAll('.offer')) o.addEventListener('pointermove', e => {
    const r = o.getBoundingClientRect();
    o.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); o.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  });
  Stage.view($('offer'), 'quiet', { uniforms: (gl, L) => { gl.uniform1f(L('u_variant'), 3); gl.uniform1f(L('u_dim'), 0); } });

  // ——— 09 финал: одна комета после входа в сцену, потом фраза ———
  const END = { comet: -1 };
  const endSec = $('end'), finale = $('finale');
  Stage.view(endSec, 'lake', {
    textures: { u_shore: 'assets/lake-shore.webp' },
    uniforms: (gl, L, v, now) => { gl.uniform1f(L('u_comet'), END.comet < 0 ? -1 : (now - END.comet) / 1000); },
  });
  new IntersectionObserver((es, ob) => {
    for (const e of es) if (e.isIntersecting) {
      ob.disconnect();
      if (REDUCED || !Stage.ok) { finale.classList.add('on'); return; }
      setTimeout(() => { END.comet = performance.now(); Stage.invalidate(); setTimeout(() => finale.classList.add('on'), 3300); }, 500);
    }
  }, { threshold: 0.55 }).observe(endSec);

  // ——— запуск ———
  function boot() {
    sizeWheel(); sizePair(); sizeFrames();
    skyInit();
    const sample = { name: 'Москва', lat: 55.76, lon: 37.62, tz: 3 };
    const ch = buildChart(localToUTC('1995-06-14', '08:30', 3), sample, true);
    setChart(ch, true, true);
    if (!chartSeen) { W.playing = false; W.start = -1e9; }
    redrawWheel();
    computePair(false);
    $('reading').classList.add('built');
  }
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { layoutHeroStars(); sizeWheel(); sizePair(); sizeFrames(); redrawWheel(); Stage.invalidate(); }, 120);
  });
  // глифы и шрифт подписей должны загрузиться до рисования на холстах
  Promise.race([
    Promise.all([document.fonts.load(`16px ${F.sym}`, '☉♈'), document.fonts.load(`500 14px ${F.display}`, 'ASC Овен')]),
    new Promise(r => setTimeout(r, 2500)),
  ]).then(boot, boot);
})();
