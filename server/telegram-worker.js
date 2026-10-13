// Обработчик заявок «Альмагеста» для Cloudflare Workers: принимает заявку с сайта и пересылает в Telegram.
// Токен бота хранится в секретах воркера, на сайт не попадает.
//
// Переменные воркера:
//   BOT_TOKEN       — токен бота от @BotFather (секрет)
//   CHAT_ID         — куда слать: id чата астролога (узнать — написать боту и открыть
//                     https://api.telegram.org/bot<токен>/getUpdates)
//   ALLOWED_ORIGIN  — адрес сайта, например https://quroroyr.github.io
// Публикация: dash.cloudflare.com → Workers → Create → вставить этот файл → Settings → Variables.

const LIMITS = { service: 60, name: 80, contact: 120, birth: 200, partner: 200, comment: 1500, page: 300 };

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors);
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) return json({ ok: false, error: 'origin' }, 403, cors);

    let d;
    try { d = await req.json(); } catch (e) { return json({ ok: false, error: 'json' }, 400, cors); }
    if (d.website) return json({ ok: true }, 200, cors); // поле-ловушка для ботов: человек его не видит
    const f = {};
    for (const [k, max] of Object.entries(LIMITS)) f[k] = String(d[k] || '').trim().slice(0, max);
    if (!f.name || !f.contact) return json({ ok: false, error: 'required' }, 400, cors);

    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const lines = [
      `<b>Заявка: ${esc(f.service || 'консультация')}</b>`,
      `Имя: ${esc(f.name)}`,
      `Связь: ${esc(f.contact)}`,
      f.birth && `Рождение: ${esc(f.birth)}`,
      f.partner && `Партнёр: ${esc(f.partner)}`,
      f.comment && `\n${esc(f.comment)}`,
      f.page && `\n<i>${esc(f.page)}</i>`,
    ].filter(Boolean);

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!tg.ok) return json({ ok: false, error: 'telegram' }, 502, cors);
    return json({ ok: true }, 200, cors);
  },
};

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });
}
