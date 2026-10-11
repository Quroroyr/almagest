// Расчёт неба для «Альмагеста». Без внешних библиотек.
// Положения планет — по элементам орбит (P. Schlyter, «How to compute planetary positions»),
// точность около 1–2′ для планет и нескольких минут для Луны в диапазоне 1900–2100 гг.
// Долготы тропические, от равноденствия даты.
(function (global) {
  'use strict';
  const RAD = Math.PI / 180;
  const sin = x => Math.sin(x * RAD), cos = x => Math.cos(x * RAD), tan = x => Math.tan(x * RAD);
  const atan2 = (y, x) => Math.atan2(y, x) / RAD;
  const norm = a => ((a % 360) + 360) % 360;

  // d — сутки от 2000-01-00.0 UT
  const dayNumber = date => date.getTime() / 86400000 + 2440587.5 - 2451543.5;
  const julianDay = date => date.getTime() / 86400000 + 2440587.5;
  const obliquity = d => 23.4393 - 3.563e-7 * d;

  const EL = {
    sun: d => ({ N: 0, i: 0, w: 282.9404 + 4.70935e-5 * d, a: 1, e: 0.016709 - 1.151e-9 * d, M: 356.047 + 0.9856002585 * d }),
    moon: d => ({ N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.0549, M: 115.3654 + 13.0649929509 * d }),
    mercury: d => ({ N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }),
    venus: d => ({ N: 76.6799 + 2.4659e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.891 + 1.38374e-5 * d, a: 0.72333, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }),
    mars: d => ({ N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }),
    jupiter: d => ({ N: 100.4542 + 2.76854e-5 * d, i: 1.303 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.895 + 0.0830853001 * d }),
    saturn: d => ({ N: 113.6634 + 2.3898e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.967 + 0.0334442282 * d }),
    uranus: d => ({ N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d }),
    neptune: d => ({ N: 131.7806 + 3.0173e-5 * d, i: 1.77 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d }),
  };

  function kepler(M, e) {
    M = norm(M);
    let E = M + (e / RAD) * sin(M) * (1 + e * cos(M));
    for (let k = 0; k < 8; k++) {
      const dE = (E - (e / RAD) * sin(E) - M) / (1 - e * cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-6) break;
    }
    return E;
  }

  // орбитальная позиция в плоскости эклиптики (гелиоцентрическая; для Луны — геоцентрическая)
  function orbit(el) {
    const E = kepler(el.M, el.e);
    const xv = el.a * (cos(E) - el.e);
    const yv = el.a * Math.sqrt(1 - el.e * el.e) * sin(E);
    const v = atan2(yv, xv), r = Math.hypot(xv, yv);
    const vw = v + el.w;
    const x = r * (cos(el.N) * cos(vw) - sin(el.N) * sin(vw) * cos(el.i));
    const y = r * (sin(el.N) * cos(vw) + cos(el.N) * sin(vw) * cos(el.i));
    const z = r * sin(vw) * sin(el.i);
    return { lon: norm(atan2(y, x)), lat: atan2(z, Math.hypot(x, y)), r, v, vw };
  }

  function sunPos(d) {
    const el = EL.sun(d);
    const E = kepler(el.M, el.e);
    const xv = cos(E) - el.e, yv = Math.sqrt(1 - el.e * el.e) * sin(E);
    const v = atan2(yv, xv), r = Math.hypot(xv, yv);
    const lon = norm(v + el.w);
    return { lon, lat: 0, r, x: r * cos(lon), y: r * sin(lon) };
  }

  function moonPos(d) {
    const m = EL.moon(d), s = EL.sun(d);
    const o = orbit(m);
    const Ms = s.M, Mm = m.M, Ls = s.M + s.w, Lm = m.M + m.w + m.N;
    const D = Lm - Ls, F = Lm - m.N;
    const dlon =
      -1.274 * sin(Mm - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms) - 0.059 * sin(2 * Mm - 2 * D) -
      0.057 * sin(Mm - 2 * D + Ms) + 0.053 * sin(Mm + 2 * D) + 0.046 * sin(2 * D - Ms) + 0.041 * sin(Mm - Ms) -
      0.035 * sin(D) - 0.031 * sin(Mm + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(Mm - 4 * D);
    const dlat = -0.173 * sin(F - 2 * D) - 0.055 * sin(Mm - F - 2 * D) - 0.046 * sin(Mm + F - 2 * D) + 0.033 * sin(F + 2 * D) + 0.017 * sin(2 * Mm + F);
    return { lon: norm(o.lon + dlon), lat: o.lat + dlat };
  }

  function planetPos(name, d, sun) {
    const el = EL[name](d);
    const o = orbit(el);
    let lon = o.lon, lat = o.lat;
    const Mj = EL.jupiter(d).M, Ms = EL.saturn(d).M, Mu = EL.uranus(d).M;
    if (name === 'jupiter') lon += -0.332 * sin(2 * Mj - 5 * Ms - 67.6) - 0.056 * sin(2 * Mj - 2 * Ms + 21) + 0.042 * sin(3 * Mj - 5 * Ms + 21) - 0.036 * sin(Mj - 2 * Ms) + 0.022 * cos(Mj - Ms) + 0.023 * sin(2 * Mj - 3 * Ms + 52) - 0.016 * sin(Mj - 5 * Ms - 69);
    if (name === 'saturn') { lon += 0.812 * sin(2 * Mj - 5 * Ms - 67.6) - 0.229 * cos(2 * Mj - 4 * Ms - 2) + 0.119 * sin(Mj - 2 * Ms - 3) + 0.046 * sin(2 * Mj - 6 * Ms - 69) + 0.014 * sin(Mj - 3 * Ms + 32); lat += -0.02 * cos(2 * Mj - 4 * Ms - 2) + 0.018 * sin(2 * Mj - 6 * Ms - 49); }
    if (name === 'uranus') lon += 0.04 * sin(Ms - 2 * Mu + 6) + 0.035 * sin(Ms - 3 * Mu + 33) - 0.015 * sin(Mj - Mu + 20);
    const xh = o.r * cos(lon) * cos(lat), yh = o.r * sin(lon) * cos(lat), zh = o.r * sin(lat);
    const xg = xh + sun.x, yg = yh + sun.y;
    return { lon: norm(atan2(yg, xg)), lat: atan2(zh, Math.hypot(xg, yg)) };
  }

  function plutoPos(d, sun) {
    const S = 50.03 + 0.033459652 * d, P = 238.95 + 0.003968789 * d;
    const lon = 238.9508 + 0.00400703 * d - 19.799 * sin(P) + 19.848 * cos(P) + 0.897 * sin(2 * P) - 4.956 * cos(2 * P) + 0.61 * sin(3 * P) + 1.211 * cos(3 * P) - 0.341 * sin(4 * P) - 0.19 * cos(4 * P) + 0.128 * sin(5 * P) - 0.034 * cos(5 * P) - 0.038 * sin(6 * P) + 0.031 * cos(6 * P) + 0.02 * sin(S - P) - 0.01 * cos(S - P);
    const lat = -3.9082 - 5.453 * sin(P) - 14.975 * cos(P) + 3.527 * sin(2 * P) + 1.673 * cos(2 * P) - 1.051 * sin(3 * P) + 0.328 * cos(3 * P) + 0.179 * sin(4 * P) - 0.292 * cos(4 * P) + 0.019 * sin(5 * P) + 0.1 * cos(5 * P) - 0.031 * sin(6 * P) - 0.026 * cos(6 * P) + 0.011 * cos(S - P);
    const r = 40.72 + 6.68 * sin(P) + 6.9 * cos(P) - 1.18 * sin(2 * P) - 0.03 * cos(2 * P) + 0.15 * sin(3 * P) - 0.14 * cos(3 * P);
    const L = lon + 3.82394e-5 * d; // от J2000 к равноденствию даты
    const xh = r * cos(L) * cos(lat), yh = r * sin(L) * cos(lat), zh = r * sin(lat);
    const xg = xh + sun.x, yg = yh + sun.y;
    return { lon: norm(atan2(yg, xg)), lat: atan2(zh, Math.hypot(xg, yg)) };
  }

  const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  function longitudesAt(d) {
    const sun = sunPos(d);
    const out = { sun: sun.lon, moon: moonPos(d).lon };
    for (const p of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) out[p] = planetPos(p, d, sun).lon;
    out.pluto = plutoPos(d, sun).lon;
    return out;
  }

  const angDiff = (a, b) => { let x = norm(a - b); if (x > 180) x -= 360; return x; }; // a − b в (−180, 180]

  function positions(date) {
    const d = dayNumber(date);
    const now = longitudesAt(d), before = longitudesAt(d - 0.25), after = longitudesAt(d + 0.25);
    const res = {};
    for (const b of BODIES) {
      const speed = angDiff(after[b], before[b]) * 2; // градусов в сутки
      res[b] = { lon: now[b], speed, retro: b !== 'sun' && b !== 'moon' && speed < 0 };
    }
    return res;
  }

  // Асцендент и MC по местному звёздному времени; φ — широта, λ — долгота (восточная +)
  function angles(date, lat, lonEast) {
    const jd = julianDay(date), d = dayNumber(date);
    const gmst = norm(280.46061837 + 360.98564736629 * (jd - 2451545));
    const ramc = norm(gmst + lonEast);
    const eps = obliquity(d);
    const asc = norm(atan2(cos(ramc), -(sin(ramc) * cos(eps) + tan(lat) * sin(eps))));
    const mc = norm(atan2(sin(ramc), cos(ramc) * cos(eps)));
    return { asc, mc, ramc };
  }

  function moonPhase(date) {
    const d = dayNumber(date);
    const elong = norm(moonPos(d).lon - sunPos(d).lon);
    return { elong, illum: (1 - cos(elong)) / 2, age: (elong / 360) * 29.530588 };
  }

  // ближайший момент после date, когда элонгация Луны проходит target (0 — новолуние, 180 — полнолуние)
  function nextPhase(date, target) {
    const f = t => angDiff(moonPhase(t).elong, target);
    let t0 = new Date(date.getTime());
    let v0 = f(t0);
    for (let i = 0; i < 70; i++) {
      const t1 = new Date(t0.getTime() + 12 * 3600e3), v1 = f(t1);
      if (v0 < 0 && v1 >= 0 && Math.abs(v1 - v0) < 90) {
        let a = t0, b = t1;
        for (let k = 0; k < 30; k++) { const m = new Date((a.getTime() + b.getTime()) / 2); if (f(m) < 0) a = m; else b = m; }
        return b;
      }
      t0 = t1; v0 = v1;
    }
    return null;
  }

  // когда планета сменит направление движения (станция), шагом в сутки
  function nextStation(date, body, maxDays = 400) {
    const dir = s => (s < 0 ? -1 : 1);
    const start = dir(positions(date)[body].speed);
    for (let i = 1; i <= maxDays; i++) {
      const t = new Date(date.getTime() + i * 86400e3);
      if (dir(positions(t)[body].speed) !== start) return t;
    }
    return null;
  }

  // эклиптические координаты звезды из экваториальных (градусы)
  function eclipticFromEquatorial(ra, dec, eps = 23.4393) {
    const lon = norm(atan2(sin(ra) * cos(eps) + tan(dec) * sin(eps), cos(ra)));
    const lat = Math.asin(sin(dec) * cos(eps) - cos(dec) * sin(eps) * sin(ra)) / RAD;
    return { lon, lat };
  }

  const ASPECTS = [
    { key: 'conj', angle: 0, orb: 8, name: 'соединение', glyph: '☌' },
    { key: 'sext', angle: 60, orb: 4, name: 'секстиль', glyph: '⚹' },
    { key: 'square', angle: 90, orb: 6, name: 'квадрат', glyph: '□' },
    { key: 'trine', angle: 120, orb: 6, name: 'трин', glyph: '△' },
    { key: 'opp', angle: 180, orb: 8, name: 'оппозиция', glyph: '☍' },
  ];

  function aspectBetween(a, b, orbScale = 1) {
    const sep = Math.abs(angDiff(a, b));
    for (const asp of ASPECTS) {
      const orb = Math.abs(sep - asp.angle);
      if (orb <= asp.orb * orbScale) return { ...asp, orb };
    }
    return null;
  }

  global.Sky = { positions, angles, moonPhase, nextPhase, nextStation, eclipticFromEquatorial, aspectBetween, angDiff, norm, ASPECTS, BODIES, dayNumber };
})(window);
