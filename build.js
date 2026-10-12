// Собирает index.html из src/page.html, шейдеров и скриптов. Картинки остаются отдельными файлами в assets/.
// Запуск: node build.js
'use strict';
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const shaders = {};
for (const f of fs.readdirSync(path.join(__dirname, 'src/shaders')).sort()) {
  if (/\.(glsl|frag)$/.test(f)) shaders[f.replace(/\.(glsl|frag)$/, '')] = read('src/shaders/' + f);
}
const parts = [
  '// шейдеры сцен (src/shaders)\nwindow.SHADERS = ' + JSON.stringify(shaders) + ';',
  read('astro.js'), read('stars.js'), read('src/pair-points.js'), read('src/gl.js'), read('src/app.js'),
];
const scripts = parts.map(s => `<script>\n${s.replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
const page = read('src/page.html');
// метка версии у картинок: после пересборки браузер и GitHub Pages не отдадут старый слой из кэша
const crypto = require('crypto');
const stamp = f => crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, 'assets', f))).digest('hex').slice(0, 8);
const out = page.replace(/<!--SCRIPTS-->[\s\S]*<!--\/SCRIPTS-->/, () => scripts)
  .replace(/assets\/([\w-]+\.webp)(?![?\w])/g, (m, f) => (fs.existsSync(path.join(__dirname, 'assets', f)) ? `assets/${f}?v=${stamp(f)}` : m));
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('index.html', Math.round(out.length / 1024), 'КБ; шейдеры:', Object.keys(shaders).join(', '));
