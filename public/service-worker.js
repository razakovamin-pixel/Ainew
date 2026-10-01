/* ShiaIsnad offline-first service worker.
 *
 * Два кэша:
 *   SHELL_CACHE — оболочка сайта (HTML/JS/CSS/иконки). ВЕРСИЮ (rijal-vN)
 *                 увеличивайте при каждом изменении статических файлов или
 *                 самого service worker'а.
 *   DATA_CACHE  — тяжёлые JSON-базы (передатчики, книги хадисов). Версия
 *                 данных НЕ привязана к версии оболочки: пользователь не
 *                 перекачивает десятки МБ при каждом обновлении интерфейса.
 *
 * Стратегии:
 *   HTML (navigate)      — network-first, offline-fallback из кэша.
 *   JS / CSS / manifest  — stale-while-revalidate (мгновенно + обновление в фоне).
 *   JSON-базы и индексы  — network-first с ревалидацией (cache: 'no-cache':
 *                          условный запрос по ETag, при 304 тело не качается
 *                          заново) + fallback в кэш офлайн или при медленной сети.
 *                          Устаревший JSON из кэша при наличии сети не отдаётся.
 *   Картинки             — cache-first (обновляются при смене версии оболочки).
 *
 * При активации удаляются ВСЕ кэши, кроме текущих двух (в т.ч. старый rijal-v8,
 * в котором JSON хранились cache-first и могли быть устаревшими).
 */
const SHELL_CACHE = 'rijal-v9';
const DATA_CACHE = 'rijal-data-v1';
const KNOWN_CACHES = [SHELL_CACHE, DATA_CACHE];

// Если сеть не ответила за это время, а копия в кэше есть — отдаём копию
// (сетевой запрос при этом дорабатывает и обновляет кэш в фоне).
const DATA_NETWORK_TIMEOUT_MS = 6000;

const CORE = [
  '/',
  '/hadis/',
  '/statya/',
  '/site-lang.js',
  '/site-nav.js',
  '/translator.js',
  '/page-i18n.js',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isIndexData = (url) =>
  url.pathname === '/data/transmitters/meta.json' ||
  url.pathname === '/hadis/books-index.json';
const isHeavyData = (url) =>
  isIndexData(url) ||
  url.pathname.startsWith('/data/transmitters/') ||
  url.pathname.startsWith('/hadis/books/');
const isAssetCode = (url) => /\.(js|css|webmanifest)$/i.test(url.pathname) || url.pathname === '/manifest.json';
const isHtml = (url, request) =>
  request.mode === 'navigate' ||
  url.pathname.endsWith('.html') ||
  url.pathname.endsWith('/');
const isImage = (url) => /\.(png|jpe?g|webp|gif|svg|ico|avif)$/i.test(url.pathname);

async function putInCache(cacheName, request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) {}
  return response;
}

// Ищем копию сначала в нужном кэше, затем в любом другом из текущих.
async function matchCached(request, preferred) {
  const first = await (await caches.open(preferred)).match(request);
  if (first) return first;
  for (const name of KNOWN_CACHES) {
    if (name === preferred) continue;
    const hit = await (await caches.open(name)).match(request);
    if (hit) return hit;
  }
  return undefined;
}

function networkFirst(event, cacheName, fetchInit, timeoutMs) {
  const request = event.request;
  const networkPromise = fetch(request, fetchInit).then((response) => putInCache(cacheName, request, response));

  return (async () => {
    const cached = await matchCached(request, cacheName);

    // Копии нет — ждём сеть без таймаута, офлайн вернётся ошибка/fallback.
    if (!cached || !timeoutMs) {
      try {
        return await networkPromise;
      } catch (err) {
        const fallback = await matchCached(request, cacheName);
        if (fallback) return fallback;
        throw err;
      }
    }

    // Копия есть: сеть в приоритете, но не дольше timeoutMs.
    const guarded = networkPromise.catch(() => cached);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), timeoutMs));
    event.waitUntil(networkPromise.catch(() => null)); // дождаться обновления кэша в фоне
    return Promise.race([guarded, timeout]);
  })();
}

function staleWhileRevalidate(event, cacheName) {
  const request = event.request;
  return (async () => {
    const cached = await matchCached(request, cacheName);
    const refresh = fetch(request).then((response) => putInCache(cacheName, request, response)).catch(() => null);
    event.waitUntil(refresh);
    if (cached) return cached;
    const fresh = await refresh;
    return fresh || Response.error();
  })();
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // cache: 'reload' — мимо HTTP-кэша браузера, чтобы в новый кэш попали свежие файлы.
    await Promise.all(CORE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !KNOWN_CACHES.includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }
  if (!isSameOrigin(url)) return;

  // API воркера (/ai/*, /health) никогда не кэшируем.
  if (url.pathname.startsWith('/ai/') || url.pathname === '/health') return;

  // JSON-базы и индексы: свежие при наличии сети, из кэша — офлайн/при медленной сети.
  if (isHeavyData(url)) {
    event.respondWith(
      networkFirst(event, DATA_CACHE, { cache: 'no-cache' }, isIndexData(url) ? 0 : DATA_NETWORK_TIMEOUT_MS)
    );
    return;
  }

  // HTML: network-first, чтобы новые версии доходили до пользователя.
  if (isHtml(url, request)) {
    event.respondWith(
      networkFirst(event, SHELL_CACHE, undefined, 0).catch(async () => {
        if (request.mode !== 'navigate') return Response.error();
        return (await matchCached('/', SHELL_CACHE)) || Response.error();
      })
    );
    return;
  }

  // JS / CSS / manifest: stale-while-revalidate.
  if (isAssetCode(url)) {
    event.respondWith(staleWhileRevalidate(event, SHELL_CACHE));
    return;
  }

  // Картинки: cache-first.
  if (isImage(url)) {
    event.respondWith(
      matchCached(request, SHELL_CACHE).then((cached) =>
        cached || fetch(request).then((response) => putInCache(SHELL_CACHE, request, response))
      )
    );
  }
});
