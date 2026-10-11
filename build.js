// Собирает один самодостаточный файл index.html из src/page.html + скриптов.
// Запуск: node build.js
'use strict';
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const page = read('src/page.html');
const scripts = ['astro.js', 'stars.js', 'src/app.js'].map(f => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
const out = page.replace(/<!--SCRIPTS-->[\s\S]*<!--\/SCRIPTS-->/, scripts);
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('index.html', Math.round(out.length / 1024), 'КБ');

// Вариант для публикации артефактом: хостинг сам оборачивает страницу в <html><head><body>,
// поэтому берём содержимое head (title, шрифты, стили) и body без обёрток.
const head = out.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const body = out.match(/<body>([\s\S]*?)<\/body>/)[1];
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'almagest.html'), head.trim() + '\n' + body.trim() + '\n');
console.log('dist/almagest.html готов');
