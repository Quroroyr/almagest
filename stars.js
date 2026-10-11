// Звёзды зодиакальных созвездий: [ключ, прямое восхождение ч, мин, склонение °, блеск m, имя или null].
// Координаты J2000 округлены до 0,1′, этого с запасом хватает для рисунка атласа.
(function (global) {
  'use strict';
  const C = {
    aries: { name: 'Овен', latin: 'Aries', gen: 'Овна', stars: [
      ['hamal', 2, 7.2, 23.46, 2.0, 'Хамаль'], ['sheratan', 1, 54.6, 20.81, 2.6, 'Шератан'], ['mesarthim', 1, 53.5, 19.29, 3.9, 'Мезартим'], ['a41', 2, 50.0, 27.26, 3.6, null]],
      lines: [['hamal', 'sheratan'], ['sheratan', 'mesarthim'], ['hamal', 'a41']] },
    taurus: { name: 'Телец', latin: 'Taurus', gen: 'Тельца', stars: [
      ['aldebaran', 4, 35.9, 16.51, 0.9, 'Альдебаран'], ['elnath', 5, 26.3, 28.61, 1.7, 'Элнат'], ['zeta', 5, 37.6, 21.14, 3.0, null], ['ain', 4, 28.6, 19.18, 3.5, 'Айн'],
      ['gamma', 4, 19.8, 15.63, 3.7, 'Хиадум'], ['delta', 4, 22.9, 17.54, 3.8, null], ['theta', 4, 28.7, 15.87, 3.4, null], ['lambda', 4, 0.7, 12.49, 3.5, null],
      ['omicron', 3, 24.8, 9.03, 3.6, null], ['alcyone', 3, 47.5, 24.11, 2.9, 'Плеяды']],
      lines: [['lambda', 'gamma'], ['gamma', 'delta'], ['delta', 'ain'], ['ain', 'elnath'], ['gamma', 'theta'], ['theta', 'aldebaran'], ['aldebaran', 'zeta'], ['lambda', 'omicron']] },
    gemini: { name: 'Близнецы', latin: 'Gemini', gen: 'Близнецов', stars: [
      ['castor', 7, 34.6, 31.89, 1.6, 'Кастор'], ['pollux', 7, 45.3, 28.03, 1.1, 'Поллукс'], ['alhena', 6, 37.7, 16.4, 1.9, 'Альхена'], ['mebsuta', 6, 43.9, 25.13, 3.0, 'Мебсута'],
      ['tejat', 6, 23.0, 22.51, 2.9, 'Тежат'], ['propus', 6, 14.9, 22.51, 3.3, null], ['wasat', 7, 20.1, 21.98, 3.5, 'Васат'], ['mekbuda', 7, 4.1, 20.57, 3.8, null],
      ['alzirr', 6, 45.3, 12.9, 3.4, null], ['kappa', 7, 44.4, 24.4, 3.6, null], ['tau', 7, 11.1, 30.25, 4.4, null]],
      lines: [['castor', 'tau'], ['tau', 'mebsuta'], ['mebsuta', 'tejat'], ['tejat', 'propus'], ['pollux', 'kappa'], ['kappa', 'wasat'], ['wasat', 'mekbuda'], ['mekbuda', 'alhena'], ['castor', 'pollux'], ['alhena', 'alzirr']] },
    cancer: { name: 'Рак', latin: 'Cancer', gen: 'Рака', stars: [
      ['altarf', 8, 16.5, 9.19, 3.5, 'Альтарф'], ['acubens', 8, 58.5, 11.86, 4.3, 'Акубенс'], ['asellusA', 8, 44.7, 18.15, 3.9, 'Южный Ослик'], ['asellusB', 8, 43.3, 21.47, 4.7, 'Северный Ослик'], ['iota', 8, 46.7, 28.76, 4.0, null]],
      lines: [['altarf', 'asellusA'], ['asellusA', 'acubens'], ['asellusA', 'asellusB'], ['asellusB', 'iota']] },
    leo: { name: 'Лев', latin: 'Leo', gen: 'Льва', stars: [
      ['regulus', 10, 8.4, 11.97, 1.4, 'Регул'], ['eta', 10, 7.3, 16.76, 3.5, null], ['algieba', 10, 20.0, 19.84, 2.0, 'Альгиеба'], ['adhafera', 10, 16.7, 23.42, 3.4, 'Адхафера'],
      ['rasA', 9, 45.9, 23.77, 3.0, null], ['mu', 9, 52.8, 26.01, 3.9, null], ['zosma', 11, 14.1, 20.52, 2.6, 'Зосма'], ['chertan', 11, 14.2, 15.43, 3.3, 'Хертан'], ['denebola', 11, 49.1, 14.57, 2.1, 'Денебола']],
      lines: [['regulus', 'eta'], ['eta', 'algieba'], ['algieba', 'adhafera'], ['adhafera', 'mu'], ['mu', 'rasA'], ['algieba', 'zosma'], ['zosma', 'denebola'], ['denebola', 'chertan'], ['chertan', 'regulus'], ['chertan', 'zosma']] },
    virgo: { name: 'Дева', latin: 'Virgo', gen: 'Девы', stars: [
      ['spica', 13, 25.2, -11.16, 1.0, 'Спика'], ['porrima', 12, 41.7, -1.45, 2.7, 'Поррима'], ['vindemiatrix', 13, 2.2, 10.96, 2.8, 'Виндемиатрикс'], ['zavijava', 11, 50.7, 1.76, 3.6, 'Завийава'],
      ['zaniah', 12, 19.9, -0.67, 3.9, null], ['heze', 13, 34.7, -0.6, 3.4, 'Хезе'], ['minelauva', 12, 55.6, 3.4, 3.4, null], ['syrma', 14, 16.0, -6.0, 4.1, null], ['mu', 14, 43.1, -5.66, 3.9, null]],
      lines: [['zavijava', 'zaniah'], ['zaniah', 'porrima'], ['porrima', 'minelauva'], ['minelauva', 'vindemiatrix'], ['porrima', 'spica'], ['minelauva', 'heze'], ['heze', 'syrma'], ['syrma', 'mu']] },
    libra: { name: 'Весы', latin: 'Libra', gen: 'Весов', stars: [
      ['genubi', 14, 50.9, -16.04, 2.7, 'Зубен эль Генуби'], ['schamali', 15, 17.0, -9.38, 2.6, 'Зубен эш Шемали'], ['brachium', 15, 4.1, -25.28, 3.3, null], ['gamma', 15, 35.5, -14.79, 3.9, null]],
      lines: [['genubi', 'schamali'], ['schamali', 'gamma'], ['genubi', 'brachium'], ['gamma', 'genubi']] },
    scorpius: { name: 'Скорпион', latin: 'Scorpius', gen: 'Скорпиона', stars: [
      ['acrab', 16, 5.4, -19.81, 2.6, 'Акраб'], ['dschubba', 16, 0.3, -22.62, 2.3, 'Дшубба'], ['pi', 15, 58.9, -26.11, 2.9, null], ['antares', 16, 29.4, -26.43, 1.0, 'Антарес'],
      ['sigma', 16, 21.2, -25.59, 2.9, null], ['tau', 16, 35.9, -28.22, 2.8, null], ['epsilon', 16, 50.2, -34.29, 2.3, null], ['mu1', 16, 51.9, -38.05, 3.0, null],
      ['zeta2', 16, 54.6, -42.36, 3.6, null], ['eta', 17, 12.2, -43.24, 3.3, null], ['theta', 17, 37.3, -43.0, 1.9, 'Сарган'], ['iota1', 17, 47.6, -40.13, 3.0, null],
      ['kappa', 17, 42.5, -39.03, 2.4, null], ['shaula', 17, 33.6, -37.1, 1.6, 'Шаула'], ['lesath', 17, 30.8, -37.3, 2.7, 'Лесат']],
      lines: [['acrab', 'dschubba'], ['dschubba', 'pi'], ['dschubba', 'sigma'], ['sigma', 'antares'], ['antares', 'tau'], ['tau', 'epsilon'], ['epsilon', 'mu1'], ['mu1', 'zeta2'],
        ['zeta2', 'eta'], ['eta', 'theta'], ['theta', 'iota1'], ['iota1', 'kappa'], ['kappa', 'shaula'], ['shaula', 'lesath']] },
    sagittarius: { name: 'Стрелец', latin: 'Sagittarius', gen: 'Стрельца', stars: [
      ['kausAus', 18, 24.2, -34.38, 1.8, 'Каус Аустралис'], ['kausMed', 18, 21.0, -29.83, 2.7, null], ['kausBor', 18, 28.0, -25.42, 2.8, null], ['nunki', 18, 55.3, -26.3, 2.0, 'Нунки'],
      ['ascella', 19, 2.6, -29.88, 2.6, 'Асцелла'], ['tau', 19, 6.9, -27.67, 3.3, null], ['phi', 18, 45.7, -26.99, 3.2, null], ['alnasl', 18, 5.8, -30.42, 3.0, 'Альнасль']],
      lines: [['alnasl', 'kausMed'], ['kausMed', 'kausAus'], ['kausAus', 'ascella'], ['ascella', 'phi'], ['phi', 'kausMed'], ['kausMed', 'kausBor'], ['kausBor', 'phi'], ['phi', 'nunki'], ['nunki', 'tau'], ['tau', 'ascella'], ['alnasl', 'kausAus']] },
    capricornus: { name: 'Козерог', latin: 'Capricornus', gen: 'Козерога', stars: [
      ['algedi', 20, 18.1, -12.51, 3.6, 'Альгеди'], ['dabih', 20, 21.0, -14.78, 3.1, 'Дабих'], ['nashira', 21, 40.1, -16.66, 3.7, 'Нашира'], ['denebAlgedi', 21, 47.0, -16.13, 2.9, 'Денеб Альгеди'],
      ['theta', 21, 6.0, -17.23, 4.1, null], ['omega', 20, 51.8, -26.92, 4.1, null], ['psi', 20, 46.1, -25.27, 4.1, null], ['zeta', 21, 26.7, -22.41, 3.7, null], ['iota', 21, 22.2, -16.83, 4.3, null]],
      lines: [['algedi', 'dabih'], ['dabih', 'psi'], ['psi', 'omega'], ['omega', 'zeta'], ['zeta', 'denebAlgedi'], ['denebAlgedi', 'nashira'], ['nashira', 'iota'], ['iota', 'theta'], ['theta', 'dabih']] },
    aquarius: { name: 'Водолей', latin: 'Aquarius', gen: 'Водолея', stars: [
      ['sadalsuud', 21, 31.6, -5.57, 2.9, 'Садалсууд'], ['sadalmelik', 22, 5.8, -0.32, 2.9, 'Садалмелик'], ['sadachbia', 22, 21.6, -1.39, 3.8, null], ['zeta', 22, 28.8, -0.02, 3.6, null],
      ['eta', 22, 35.4, -0.12, 4.0, null], ['skat', 22, 54.7, -15.82, 3.3, 'Скат'], ['lambda', 22, 52.6, -7.58, 3.7, null], ['ancha', 22, 16.8, -7.78, 4.2, null], ['albali', 20, 47.7, -9.5, 3.8, 'Альбали'], ['phi', 23, 14.3, -6.05, 4.2, null]],
      lines: [['albali', 'sadalsuud'], ['sadalsuud', 'sadalmelik'], ['sadalmelik', 'sadachbia'], ['sadachbia', 'zeta'], ['zeta', 'eta'], ['sadalmelik', 'ancha'], ['ancha', 'lambda'], ['lambda', 'phi'], ['lambda', 'skat']] },
    pisces: { name: 'Рыбы', latin: 'Pisces', gen: 'Рыб', stars: [
      ['alrescha', 2, 2.0, 2.76, 3.8, 'Альриша'], ['omicron', 1, 45.4, 9.16, 4.3, null], ['eta', 1, 31.5, 15.35, 3.6, null], ['nu', 1, 41.4, 5.49, 4.4, null], ['mu', 1, 30.2, 6.14, 4.8, null],
      ['epsilon', 1, 2.9, 7.89, 4.3, null], ['delta', 0, 48.7, 7.59, 4.4, null], ['omega', 23, 59.3, 6.86, 4.0, null], ['iota', 23, 39.9, 5.63, 4.1, null], ['theta', 23, 28.0, 6.38, 4.3, null],
      ['gamma', 23, 17.2, 3.28, 3.7, null], ['kappa', 23, 27.0, 1.26, 4.9, null], ['lambda', 23, 42.0, 1.78, 4.5, null]],
      lines: [['alrescha', 'nu'], ['nu', 'mu'], ['mu', 'epsilon'], ['epsilon', 'delta'], ['delta', 'omega'], ['omega', 'iota'], ['iota', 'theta'], ['theta', 'gamma'], ['gamma', 'kappa'],
        ['kappa', 'lambda'], ['lambda', 'iota'], ['alrescha', 'omicron'], ['omicron', 'eta']] },
  };
  // соседи зодиака: заполняют лист выше и ниже эклиптики, рисуются тише (minor)
  const N = {
    orion: { name: 'Орион', latin: 'Orion', gen: 'Ориона', minor: true, stars: [
      ['betelgeuse', 5, 55.2, 7.41, 0.5, 'Бетельгейзе'], ['rigel', 5, 14.5, -8.2, 0.1, 'Ригель'], ['bellatrix', 5, 25.1, 6.35, 1.6, 'Беллатрикс'], ['mintaka', 5, 32.0, -0.3, 2.2, null],
      ['alnilam', 5, 36.2, -1.2, 1.7, null], ['alnitak', 5, 40.8, -1.94, 1.8, null], ['saiph', 5, 47.8, -9.67, 2.1, null], ['meissa', 5, 35.1, 9.93, 3.4, null]],
      lines: [['betelgeuse', 'meissa'], ['meissa', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['mintaka', 'rigel'], ['saiph', 'rigel']] },
    auriga: { name: 'Возничий', latin: 'Auriga', gen: 'Возничего', minor: true, stars: [
      ['capella', 5, 16.7, 46.0, 0.1, 'Капелла'], ['menkalinan', 5, 59.5, 44.95, 1.9, null], ['theta', 5, 59.7, 37.21, 2.6, null], ['iota', 4, 57.0, 33.17, 2.7, null], ['elnath', 5, 26.3, 28.61, 1.7, null]],
      lines: [['capella', 'menkalinan'], ['menkalinan', 'theta'], ['theta', 'elnath'], ['elnath', 'iota'], ['iota', 'capella']] },
    perseus: { name: 'Персей', latin: 'Perseus', gen: 'Персея', minor: true, stars: [
      ['mirfak', 3, 24.3, 49.86, 1.8, 'Мирфак'], ['algol', 3, 8.2, 40.96, 2.1, 'Алголь'], ['delta', 3, 42.9, 47.79, 3.0, null], ['epsilon', 3, 57.9, 40.01, 2.9, null], ['gamma', 3, 4.8, 53.51, 2.9, null], ['zeta', 3, 54.1, 31.88, 2.9, null]],
      lines: [['gamma', 'mirfak'], ['mirfak', 'delta'], ['delta', 'epsilon'], ['epsilon', 'zeta'], ['mirfak', 'algol']] },
    pegasus: { name: 'Пегас', latin: 'Pegasus', gen: 'Пегаса', minor: true, stars: [
      ['markab', 23, 4.8, 15.21, 2.5, 'Маркаб'], ['scheat', 23, 3.8, 28.08, 2.4, 'Шеат'], ['algenib', 0, 13.2, 15.18, 2.8, 'Альгениб'], ['alpheratz', 0, 8.4, 29.09, 2.1, 'Альферац'],
      ['enif', 21, 44.2, 9.88, 2.4, 'Эниф'], ['homam', 22, 41.5, 10.83, 3.4, null], ['biham', 22, 10.2, 6.2, 3.5, null]],
      lines: [['markab', 'scheat'], ['scheat', 'alpheratz'], ['alpheratz', 'algenib'], ['algenib', 'markab'], ['markab', 'homam'], ['homam', 'biham'], ['biham', 'enif']] },
    cetus: { name: 'Кит', latin: 'Cetus', gen: 'Кита', minor: true, stars: [
      ['menkar', 3, 2.3, 4.09, 2.5, 'Менкар'], ['diphda', 0, 43.6, -17.99, 2.0, 'Дифда'], ['mira', 2, 19.3, -2.98, 3.0, 'Мира'], ['baten', 1, 8.6, -10.18, 3.5, null], ['tau', 1, 44.1, -15.94, 3.5, null],
      ['theta', 1, 24.0, -8.18, 3.6, null], ['zeta', 1, 51.5, -10.34, 3.7, null], ['gamma', 2, 43.3, 3.24, 3.5, null], ['delta', 2, 39.5, 0.33, 4.1, null]],
      lines: [['menkar', 'gamma'], ['gamma', 'delta'], ['delta', 'mira'], ['mira', 'zeta'], ['zeta', 'tau'], ['tau', 'diphda'], ['diphda', 'baten'], ['baten', 'theta'], ['theta', 'zeta']] },
    corvus: { name: 'Ворон', latin: 'Corvus', gen: 'Ворона', minor: true, stars: [
      ['gienah', 12, 15.8, -17.54, 2.6, 'Гиена'], ['kraz', 12, 34.4, -23.4, 2.7, null], ['algorab', 12, 29.9, -16.52, 2.9, 'Альгораб'], ['minkar', 12, 10.1, -22.62, 3.0, null]],
      lines: [['gienah', 'algorab'], ['algorab', 'kraz'], ['kraz', 'minkar'], ['minkar', 'gienah']] },
    bootes: { name: 'Волопас', latin: 'Bootes', gen: 'Волопаса', minor: true, stars: [
      ['arcturus', 14, 15.7, 19.18, -0.05, 'Арктур'], ['izar', 14, 45.0, 27.07, 2.4, 'Ицар'], ['muphrid', 13, 54.7, 18.4, 2.7, null], ['seginus', 14, 32.1, 38.31, 3.0, null], ['nekkar', 15, 1.9, 40.39, 3.5, null], ['delta', 15, 15.5, 33.31, 3.5, null]],
      lines: [['arcturus', 'izar'], ['izar', 'delta'], ['delta', 'nekkar'], ['nekkar', 'seginus'], ['seginus', 'arcturus'], ['arcturus', 'muphrid']] },
    aquila: { name: 'Орёл', latin: 'Aquila', gen: 'Орла', minor: true, stars: [
      ['altair', 19, 50.8, 8.87, 0.8, 'Альтаир'], ['tarazed', 19, 46.3, 10.61, 2.7, null], ['alshain', 19, 55.3, 6.41, 3.7, null], ['zeta', 19, 5.4, 13.86, 3.0, null], ['delta', 19, 25.5, 3.11, 3.4, null], ['lambda', 19, 6.2, -4.88, 3.4, null], ['theta', 20, 11.3, -0.82, 3.2, null]],
      lines: [['tarazed', 'altair'], ['altair', 'alshain'], ['altair', 'delta'], ['delta', 'lambda'], ['delta', 'zeta'], ['alshain', 'theta']] },
    ophiuchus: { name: 'Змееносец', latin: 'Ophiuchus', gen: 'Змееносца', minor: true, stars: [
      ['rasalhague', 17, 34.9, 12.56, 2.1, 'Рас Альхаге'], ['sabik', 17, 10.4, -15.72, 2.4, 'Сабик'], ['yed', 16, 14.3, -3.69, 2.7, null], ['zeta', 16, 37.2, -10.57, 2.6, null], ['kappa', 16, 57.7, 9.38, 3.2, null], ['cebalrai', 17, 43.5, 4.57, 2.8, null]],
      lines: [['rasalhague', 'cebalrai'], ['cebalrai', 'sabik'], ['sabik', 'zeta'], ['zeta', 'yed'], ['yed', 'kappa'], ['kappa', 'rasalhague']] },
    canisminor: { name: 'Малый Пёс', latin: 'Canis Minor', gen: 'Малого Пса', minor: true, stars: [
      ['procyon', 7, 39.3, 5.22, 0.4, 'Процион'], ['gomeisa', 7, 27.2, 8.29, 2.9, null]], lines: [['procyon', 'gomeisa']] },
    hydra: { name: 'Гидра', latin: 'Hydra', gen: 'Гидры', minor: true, stars: [
      ['alphard', 9, 27.6, -8.66, 2.0, 'Альфард'], ['zeta', 8, 55.4, 5.95, 3.1, null], ['epsilon', 8, 46.8, 6.42, 3.4, null], ['iota', 9, 39.9, -1.14, 3.9, null], ['theta', 9, 14.4, 2.31, 3.9, null]],
      lines: [['epsilon', 'zeta'], ['zeta', 'theta'], ['theta', 'iota'], ['iota', 'alphard']] },
  };
  Object.assign(C, N);
  global.CONSTELLATIONS = C;
})(window);
