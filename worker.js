/**
 * Cloudflare Worker — прокси между твоим фронтендом (index.html)
 * и SmartAPI (https://smartapi.shop/backend/v1).
 *
 * Что делает:
 *  1. Принимает запросы вида POST /api/v1/messages от фронтенда.
 *  2. Пересылает их на SmartAPI, подставляя нужный путь и заголовки.
 *  3. Принудительно отключает стриминг (stream: false), чтобы не ловить
 *     ошибку "Unexpected token 'e'" (сервер иначе шлёт SSE: event:/data:).
 *  4. Возвращает чистый JSON и открывает CORS, чтобы можно было
 *     обращаться с любого источника (в т.ч. локальный HTML в Termux).
 *  5. Если клиент не прислал свой ключ — использует встроенный (fallback),
 *     чтобы приложение работало "из коробки".
 *
 * Деплой:
 *   1. cloudflareworkers.com → Create Worker → вставь этот код → Deploy.
 *   2. Либо через wrangler: `wrangler deploy` (см. wrangler.toml ниже).
 *   3. В index.html замени во всех fetch('/api/v1/messages', ...) на
 *      fetch('https://<твой-воркер>.workers.dev/api/v1/messages', ...)
 *      либо, если Worker висит на своём домене — оставь как есть.
 */

// ── Настройки ──────────────────────────────────────────────────────
const UPSTREAM_BASE = 'https://smartapi.shop/backend/v1';

// Резервный ключ на случай, если фронтенд не прислал свой (x-api-key).
// Лучше хранить это в Cloudflare Secrets (см. вариант ниже), а не в коде.
const FALLBACK_API_KEY = 'sk-smart-_eU79oohpMMo6XIlwWe0CJEh4CHIfCgQ4o3GiCBImRU';

// Разрешённый источник для CORS. '*' — разрешить всем (проще для
// локальной разработки/Termux). Для продакшена лучше указать конкретный домен.
const ALLOWED_ORIGIN = '*';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Preflight-запрос браузера
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Ожидаем пути вида /api/v1/messages, /api/v1/chat/completions и т.п.
    // Всё, что идёт после "/api", пробрасываем на UPSTREAM_BASE как есть.
    if (!url.pathname.startsWith('/api')) {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    const upstreamPath = url.pathname.replace(/^\/api(\/v1)?/, '') || '/messages';
    const upstreamUrl = UPSTREAM_BASE + upstreamPath + url.search;

    try {
      // Ключ: приоритет — то, что прислал клиент, иначе fallback.
      // env.SMARTAPI_KEY — если задашь секрет через `wrangler secret put SMARTAPI_KEY`,
      // он будет использован вместо FALLBACK_API_KEY.
      const clientKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      const apiKey = clientKey || (env && env.SMARTAPI_KEY) || FALLBACK_API_KEY;

      // Готовим тело запроса. Если это POST с JSON — принудительно
      // выключаем стриминг, чтобы получить единый чистый JSON-ответ.
      let body = null;
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const rawBody = await request.text();
        try {
          const parsed = rawBody ? JSON.parse(rawBody) : {};
          parsed.stream = false; // ключевой момент: без стриминга
          body = JSON.stringify(parsed);
        } catch (e) {
          // Тело не JSON — пробрасываем как есть
          body = rawBody;
        }
      }

      const upstreamHeaders = new Headers();
      upstreamHeaders.set('Content-Type', 'application/json');
      // Подставляем ключ в обоих распространённых форматах — SmartAPI
      // разберётся, какой ему нужен.
      upstreamHeaders.set('Authorization', `Bearer ${apiKey}`);
      upstreamHeaders.set('x-api-key', apiKey);

      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: upstreamHeaders,
        body,
      });

      // Читаем как текст — так мы гарантированно избегаем краша, даже
      // если апстрим всё же прислал что-то похожее на SSE.
      const rawText = await upstreamResponse.text();
      const cleanText = cleanupStreamArtifacts(rawText);

      return new Response(cleanText, {
        status: upstreamResponse.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Proxy error', message: String(err) }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }
  },
};

// Удаляет служебные префиксы SSE-стриминга (event:/data:) и markdown-обёртки,
// если апстрим всё же прислал поток вместо обычного JSON.
function cleanupStreamArtifacts(raw) {
  let cleaned = raw
    .replace(/^event:.*$/gm, '')
    .replace(/^data:\s*/gm, '')
    .replace(/```json|```/g, '')
    .trim();

  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    // Если это NDJSON-поток из нескольких строк — берём последнюю (финальный чанк)
    cleaned = lines[lines.length - 1];
  }
  return cleaned || raw;
}
