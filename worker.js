/**
 * Cloudflare Worker — Ilm al-Rijal
 * ─────────────────────────────────────────────────────────────────
 * Отвечает за две вещи:
 *   1) Отдаёт статический index.html (через ASSETS / Workers Sites).
 *   2) Проксирует POST /ai/chat к реальному AI-провайдеру, используя
 *      ТОЛЬКО серверные секреты — клиент их не видит и не задаёт.
 *
 * Требуемые переменные окружения (Settings → Variables and Secrets):
 *   AI_API_KEY   — секрет, ваш реальный ключ провайдера   (Secret)
 *   AI_BASE_URL  — адрес реального AI-провайдера           (Variable)
 *   AI_MODEL     — имя модели                               (Variable)
 *
 * Клиент НИКОГДА не передаёт ключ, модель или base URL — сервер решает
 * это сам. Если какая-то из переменных не настроена, Worker отвечает
 * 503 и ИИ на сайте отключается — никаких встроенных/резервных
 * значений по умолчанию нет.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20; // на один IP в минуту

// Простое in-memory ограничение — переживает только "тёплый" воркер,
// для строгого лимита используйте Cloudflare Rate Limiting или KV/Durable Objects.
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateBuckets.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── CORS preflight ──────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // ── AI proxy ────────────────────────────────────────────────
    if (url.pathname === '/ai/chat') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }

      // Конфигурация отсутствует — ИИ отключён, без встроенных данных.
      if (!env.AI_API_KEY || !env.AI_BASE_URL || !env.AI_MODEL) {
        return json({ error: 'AI is not configured on the server' }, 503);
      }

      const ip = request.headers.get('cf-connecting-ip') || 'unknown';
      if (isRateLimited(ip)) {
        return json({ error: 'Rate limit exceeded' }, 429);
      }

      let payload;
      try {
        payload = await request.json();
      } catch (e) {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      // ── Валидация: разрешаем только ожидаемые поля (anti-SSRF/anti-injection) ──
      const allowedKeys = ['messages', 'system', 'max_tokens', 'temperature'];
      const safePayload = {};
      for (const key of allowedKeys) {
        if (key in payload) safePayload[key] = payload[key];
      }

      if (!Array.isArray(safePayload.messages) || safePayload.messages.length === 0) {
        return json({ error: 'messages field is required' }, 400);
      }
      const approxSize = JSON.stringify(safePayload).length;
      if (approxSize > 200_000) {
        return json({ error: 'Payload too large' }, 413);
      }
      if (typeof safePayload.max_tokens === 'number') {
        safePayload.max_tokens = Math.min(safePayload.max_tokens, 8000);
      }

      // Модель и Base URL — исключительно из env, клиент их не задаёт и не видит.
      safePayload.model = env.AI_MODEL;

      let targetUrl;
      try {
        targetUrl = new URL('/v1/messages', env.AI_BASE_URL).toString();
      } catch (e) {
        return json({ error: 'AI backend misconfigured' }, 503);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 58_000);

      try {
        const upstream = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.AI_API_KEY,
          },
          body: JSON.stringify(safePayload),
          signal: controller.signal,
        });

        const text = await upstream.text();
        return new Response(text, {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      } catch (e) {
        if (e.name === 'AbortError') {
          return json({ error: 'Upstream timeout' }, 504);
        }
        return json({ error: 'Upstream request failed' }, 502);
      } finally {
        clearTimeout(timeout);
      }
    }

    // ── Статика: отдаём index.html и остальные ассеты ──────────────
    // Если вы используете Workers Sites / Assets binding, раскомментируйте:
    // return env.ASSETS.fetch(request);

    // Заглушка на случай, если ASSETS ещё не подключены:
    return new Response('Not found. Configure ASSETS binding to serve index.html.', {
      status: 404,
    });
  },
};