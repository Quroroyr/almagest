// Метки версий у файлов сайта: «css/main.css?v=1a2b3c4d». Изменился файл — изменилась метка, и браузер
// берёт свежий, а не старый из кэша (GitHub Pages отдаёт файлы с кэшем на 10 минут).
// Запуск перед заливкой: node scripts/stamp.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const hash = buf => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
const ref = /(["'(])((?:\.\.\/)?(?:assets|css|js)\/[\w\-./]+\.(?:webp|png|jpg|css|js))(?:\?v=[0-9a-f]+)?(?=["')])/g;

let changed = 0;
function stamp(file) {
  // пути в CSS — от самого файла стилей, в скриптах и разметке — от страницы
  const full = path.join(root, file), dir = file.endsWith('.css') ? path.dirname(full) : root;
  const src = fs.readFileSync(full, 'utf8');
  const out = src.replace(ref, (m, q, p) => {
    const target = path.join(dir, p);
    return fs.existsSync(target) ? `${q}${p}?v=${hash(fs.readFileSync(target))}` : m;
  });
  if (out !== src) { fs.writeFileSync(full, out); changed++; }
}

// шейдеры подгружаются из js/gl.js — одна метка на все
const shDir = path.join(root, 'shaders');
const shHash = hash(fs.readdirSync(shDir).sort().map(f => fs.readFileSync(path.join(shDir, f), 'utf8')).join('\n'));
const glPath = path.join(root, 'js/gl.js');
const gl = fs.readFileSync(glPath, 'utf8');
const gl2 = gl.replace(/const SHADER_V = '[0-9a-f]*';/, `const SHADER_V = '${shHash}';`);
if (gl2 !== gl) { fs.writeFileSync(glPath, gl2); changed++; }

// порядок важен: сначала файлы, на которые ссылается страница, потом сама страница
stamp('css/main.css');
stamp('js/app.js');
stamp('index.html');
console.log('метки обновлены, файлов изменено:', changed, '· шейдеры', shHash);
