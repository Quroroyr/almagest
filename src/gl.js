// Общий холст сцен. Один WebGL2-контекст на всю страницу: каждая секция регистрирует «вид» —
// элемент и шейдер; за кадр рисуются только видимые части видов. Никаких библиотек.
(function () {
  'use strict';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const TIERS = { high: { dpr: 1.5, q: 2 }, medium: { dpr: 1.25, q: 1 }, low: { dpr: 1, q: 0 } };
  const ORDER = ['high', 'medium', 'low'];
  let tier = TIERS[params.get('quality')] ? params.get('quality') : (coarse || window.innerWidth < 760 ? 'medium' : 'high');
  const fixedTier = !!TIERS[params.get('quality')];

  const cv = document.getElementById('gl');
  let gl = null;
  try { gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  const frameFns = [];
  const Stage = {
    ok: !!gl, REDUCED, get tier() { return tier; },
    view() { return { data: {}, visible: false }; }, texture() { return { ok: 0 }; },
    onFrame(fn) { frameFns.push(fn); }, invalidate() { kick(); },
  };
  window.Stage = Stage;

  // кадры для 2D-холстов страницы идут через тот же цикл, даже если WebGL нет
  let raf = 0, last = 0, t0 = performance.now(), loopFn = null;
  function kick() { if (!raf && loopFn) raf = requestAnimationFrame(loopFn); }

  if (!gl) {
    document.documentElement.classList.add('no-gl');
    cv.style.display = 'none';
    loopFn = now => { raf = 0; const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now; let again = false; for (const f of frameFns) if (f(now, dt)) again = true; if (again && !REDUCED) kick(); };
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('load', kick);
    kick();
    return;
  }

  const SH = window.SHADERS;
  const VERT = '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.clearColor(0.016, 0.027, 0.05, 1);

  // шейдеры компилируются в фоне (KHR_parallel_shader_compile): прокрутка не замирает на сборке,
  // сцена рисуется, когда её программа готова. Без расширения — заранее, по одной программе с паузами.
  const PAR = gl.getExtension('KHR_parallel_shader_compile');
  const progs = {};
  let vsShared = null;
  function startProgram(name) {
    if (progs[name]) return progs[name];
    if (!SH || !SH[name]) return (progs[name] = { failed: true });
    if (!vsShared) { vsShared = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vsShared, VERT); gl.compileShader(vsShared); }
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, '#version 300 es\nprecision highp float;\n' + SH.common + '\n' + SH[name]); gl.compileShader(fs);
    const p = gl.createProgram(); gl.attachShader(p, vsShared); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
    const locs = {};
    return (progs[name] = { p, fs, pending: true, failed: false, loc: n => (n in locs ? locs[n] : (locs[n] = gl.getUniformLocation(p, n))) });
  }
  function ready(name) {
    const P = progs[name];
    if (!P || P.failed) return null;
    if (P.pending) {
      if (PAR && !gl.getProgramParameter(P.p, PAR.COMPLETION_STATUS_KHR)) return null;
      P.pending = false;
      if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) { console.error('шейдер ' + name + ':\n' + gl.getShaderInfoLog(P.fs) + gl.getProgramInfoLog(P.p)); P.failed = true; return null; }
    }
    return P;
  }
  // очередь: сначала сцены, которые выше на странице
  let queued = false;
  function queueCompile() {
    if (queued) return; queued = true;
    const names = [...new Set(views.slice().sort((a, b) => a.el.getBoundingClientRect().top - b.el.getBoundingClientRect().top).map(v => v.scene))];
    if (PAR) { names.forEach(startProgram); return; }
    const step = () => { const n = names.shift(); if (!n) return; startProgram(n); ready(n); setTimeout(step, 80); };
    setTimeout(step, 300);
  }

  // текстуры: грузятся лениво; пока нет — сцена рисуется без них (uniform <имя>Ok = 0…1, плавное появление)
  const texCache = {};
  Stage.texture = function (url) {
    if (texCache[url]) return texCache[url];
    const t = { tex: null, ok: 0, loaded: false, failed: false, at: 0, w: 1, h: 1 };
    texCache[url] = t;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        t.tex = tex; t.w = img.naturalWidth; t.h = img.naturalHeight; t.loaded = true; t.at = performance.now();
      } catch (e) { t.failed = true; } // file:// — браузер не даёт картинку в WebGL; сцена обойдётся без слоя
      kick();
    };
    img.onerror = () => { t.failed = true; };
    img.src = url;
    return t;
  };

  const views = [];
  // el — где рисовать; progEl — по какому элементу считать прокрутку (для «липких» сцен)
  const OFF_SCENES = (params.get('noscene') || '').split(','); // отладка: ?noscene=globe,lake
  Stage.view = function (el, scene, opts = {}) {
    if (OFF_SCENES.includes(scene)) return { data: {}, visible: false, seen: false, el, rect: null };
    const v = { el, scene, blend: !!opts.blend, progEl: opts.progEl || el, uniforms: opts.uniforms, tex: {}, preload: opts.preload, data: {}, visible: false, seen: false, enterAt: 0, mouse: [0.5, 0.5], mouseOn: 0, rect: null };
    for (const [k, url] of Object.entries(opts.textures || {})) v.tex[k] = { url, t: null };
    views.push(v);
    return v;
  };

  // указатель: поле, а не прицел — значения сглаживаются в кадре
  const ptr = { x: -1, y: -1, in: false };
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.in = true; kick(); } }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.in = false; });
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; kick(); } });

  let W = 0, H = 0, S = 1, cssH = 1;
  function resize() {
    const s = Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr);
    const w = Math.round(cv.clientWidth * s), h = Math.round(cv.clientHeight * s);
    if (w !== W || h !== H || s !== S) { W = cv.width = w; H = cv.height = h; S = s; }
    cssH = cv.clientHeight;
  }

  // автоматический выбор качества: если кадр стабильно дольше ~28 мс — ступенью ниже (обратно не поднимаемся)
  let ema = 16, emaN = 0, warm = 0;
  function watch(dt) {
    if (fixedTier || REDUCED || dt > 0.25) return;
    warm += dt; if (warm < 3) return;
    ema = ema * 0.95 + dt * 1000 * 0.05; emaN++;
    if (emaN > 90 && ema > 28) {
      const i = ORDER.indexOf(tier);
      if (i < ORDER.length - 1) { tier = ORDER[i + 1]; document.documentElement.dataset.quality = tier; console.info('Альмагест: качество снижено до', tier, '(кадр', ema.toFixed(1), 'мс)'); }
      ema = 16; emaN = 0;
    }
  }
  Stage.stats = () => ({ tier, frameMs: +ema.toFixed(1), dpr: S, canvas: [W, H] });

  const STILL_T = 40; // при «меньше движения» сцены рисуются в этот момент времени, без анимации
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    resize();
    const time = REDUCED ? STILL_T : (now - t0) / 1000;
    const k = 1 - Math.exp(-dt * 3.2);
    let any = false, pend = false;
    gl.viewport(0, 0, W, H); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      v.rect = r;
      const vis = r.bottom > 0 && r.top < cssH && r.width > 0;
      if (!vis) { v.visible = false; continue; }
      if (!v.visible) v.visible = true;
      any = true;
      if (!progs[v.scene]) startProgram(v.scene);
      const P = ready(v.scene); if (!P) { if (!progs[v.scene].failed) pend = true; continue; }
      // отсчёт появления — с первого настоящего кадра сцены
      if (!v.seen) { v.seen = true; v.enterAt = now; }
      // вьюпорт — только видимая часть; шейдер знает начало вида (u_org) и его полный размер (u_res)
      const x0 = Math.max(0, r.left), x1 = Math.min(cv.clientWidth, r.right), y0 = Math.max(0, r.top), y1 = Math.min(cssH, r.bottom);
      const vx = Math.floor(x0 * S), vy = Math.floor((cssH - y1) * S), vw = Math.ceil((x1 - x0) * S), vh = Math.ceil((y1 - y0) * S);
      if (vw <= 0 || vh <= 0) continue;
      gl.viewport(vx, vy, vw, vh);
      if (v.blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
      gl.useProgram(P.p);
      gl.enableVertexAttribArray(0); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      // указатель внутри вида
      const inside = ptr.in && ptr.x >= r.left && ptr.x <= r.right && ptr.y >= r.top && ptr.y <= r.bottom;
      if (inside) { const mx = (ptr.x - r.left) / r.width, my = 1 - (ptr.y - r.top) / r.height; v.mouse[0] += (mx - v.mouse[0]) * k; v.mouse[1] += (my - v.mouse[1]) * k; }
      v.mouseOn += ((inside ? 1 : 0) - v.mouseOn) * k;
      const pr = v.progEl.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (cssH - pr.top) / (cssH + pr.height)));
      v.prog = prog;
      gl.uniform2f(P.loc('u_res'), r.width * S, r.height * S);
      gl.uniform2f(P.loc('u_org'), r.left * S, (cssH - r.bottom) * S);
      gl.uniform1f(P.loc('u_time'), time);
      gl.uniform1f(P.loc('u_enter'), REDUCED ? STILL_T : (now - v.enterAt) / 1000);
      gl.uniform2f(P.loc('u_mouse'), v.mouse[0], v.mouse[1]);
      gl.uniform1f(P.loc('u_mouseOn'), REDUCED ? 0 : v.mouseOn);
      gl.uniform1f(P.loc('u_prog'), prog);
      gl.uniform1f(P.loc('u_q'), TIERS[tier].q);
      gl.uniform1f(P.loc('u_px'), S);
      let unit = 0;
      for (const [name, slot] of Object.entries(v.tex)) {
        if (!slot.t) slot.t = Stage.texture(slot.url);
        const t = slot.t;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t.tex || null);
        gl.uniform1i(P.loc(name), unit);
        const ok = t.loaded ? (REDUCED ? 1 : Math.min(1, (now - t.at) / 900)) : 0;
        gl.uniform1f(P.loc(name + 'Ok'), ok);
        gl.uniform2f(P.loc(name + 'Size'), t.w, t.h);
        if (t.loaded && ok < 1) any = true;
        unit++;
      }
      if (v.uniforms) v.uniforms(gl, P.loc, v, now, dt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // заранее подгрузить текстуры видов, к которым подъезжаем (полтора экрана вперёд)
    for (const v of views) if (!v.visible && v.rect && v.rect.top < cssH * 2.5 && v.rect.bottom > -cssH) for (const slot of Object.values(v.tex)) if (!slot.t) slot.t = Stage.texture(slot.url);
    queueCompile();
    let again = false;
    for (const f of frameFns) if (f(now, dt)) again = true;
    watch(dt);
    // при «меньше движения» кадры идут только пока сцена не собрана или не догрузилась
    if ((!REDUCED && (any || again)) || pend) kick();
  }
  loopFn = frame;
  document.documentElement.dataset.quality = tier;
  kick();
})();
