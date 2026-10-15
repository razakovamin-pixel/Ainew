const CACHE = 'ainew-v8';
const APP_CACHE_PREFIX = 'ainew-';

function isVersionSensitiveData(url) {
  const path = new URL(url).pathname;
  return /\/(?:data\/|hadis\/).+\.json$/i.test(path) || /\/data\/index\.json$/i.test(path);
}

function shouldMigrateOldAsset(url) {
  const path = new URL(url).pathname;
  // Never migrate the previous app shell or code into a new cache version.
  // The current HTML points to split JS/CSS resources that the old release did
  // not have; mixing the two releases can break offline startup after deploy.
  if (path.endsWith('/') || /\.html?$/i.test(path)) return false;
  if (/\/(?:css|js)\//i.test(path)) return false;
  return true;
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const cache = await caches.open(CACHE);
    // Preserve reusable static assets, but never copy old book/index JSON into
    // the new cache namespace: an old offline dataset must not masquerade as current.
    for (const name of names) {
      if (name === CACHE || !name.startsWith(APP_CACHE_PREFIX)) continue;
      const oldCache = await caches.open(name);
      for (const request of await oldCache.keys()) {
        if (isVersionSensitiveData(request.url) || !shouldMigrateOldAsset(request.url)) continue;
        if (await cache.match(request)) continue;
        const response = await oldCache.match(request);
        if (response) await cache.put(request, response);
      }
      await caches.delete(name);
    }
    for (const name of await caches.keys()) {
      if (name.startsWith(APP_CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const exact = await cache.match(request);
      if (exact) return exact;
      // Do not ignore a version query for data JSON: that could return a stale
      // index or book from a previous schema and silently mismatch stable IDs.
      if (isVersionSensitiveData(request.url)) throw error;
      const compatible = await cache.match(request, { ignoreSearch: true });
      if (compatible) return compatible;
      throw error;
    }
  })());
});
