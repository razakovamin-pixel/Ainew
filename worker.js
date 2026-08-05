/**
 * Cloudflare Worker — Ilm al-Rijal
 * ---------------------------------
 * Бесплатные улучшения:
 *   - кэш Cloudflare + in-memory fallback;
 *   - параллельный поиск по нескольким источникам;
 *   - приоритет ShiaIsnad и локальных источников;
 *   - больше бесплатных источников и форумов;
 *   - более аккуратное извлечение текста из HTML;
 *   - endpoints /ai/search, /ai/open, /health;
 *   - поддержка нескольких вариантов поискового запроса.
 *
 * Env:
 *   AI_API_KEY        — Secret
 *   AI_BASE_URL       — Variable (например: https://smartapi.shop/backend)
 *   AI_MODEL          — Variable
 *   TRANSLATE_MODEL_AI — Secret/Variable, optional. Модель, используемая
 *                        специально для перевода интерфейса/карточек/хадисов
 *                        (запросы с заголовком X-Translate: 1). Если не задана,
 *                        используется AI_MODEL.
 *   AI_TIMEOUT_MS — optional, default 58000
 *   AI_PATH      — optional, default /v1/messages
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const USER_AGENT =
  'Mozilla/5.0 (compatible; IlmAlRijalBot/3.0; +https://shiaisnad.ru)';

// DuckDuckGo's html.duckduckgo.com endpoint aggressively blocks/challenges
// requests that look like bot/datacenter traffic (custom bot UA, GET query
// string). A normal-browser UA + POST form body (what an actual browser
// sends when submitting the search form) is far less likely to be blocked.
const DDG_BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEFAULT_AI_PATH = '/v1/messages';
const DEFAULT_TIMEOUT_MS = 58_000;
const MAX_UPSTREAM_TIMEOUT_MS = 120_000;
const MAX_PAYLOAD_BYTES = 200_000;
const MAX_MODEL_TOKENS = 8000;
const MAX_SOURCE_TEXT_CHARS = 6000;
const MAX_SOURCES_PER_ANSWER = 4;
const SEARCH_LIMIT = 4;
const MEMORY_CACHE_TTL_MS = 10 * 60_000;
const MEMORY_CTX_TTL_MS = 5 * 60_000;

const ALLOWED_SOURCE_HOSTS = new Set([
  'lib.eshia.ir',
  'shamela.ws',
  'shiaisnad.ru',
  'islamweb.net',
  'shiachat.com',
  'shiatent.com',
  'twelvers.com',
  'shiaquest.net',
  'wikishia.net',
  'al-islam.org',
  'noorlib.ir',
  'hawzah.net',
  'aqaed.com',
  'imam-us.org',
  'alkafeel.net',
  'archive.org',
  'abna24.com',
  'islamquest.net',
  'shiavault.com',
]);

const SOURCE_KEYWORDS = [
  { test: /(shia\s*chat|shiachat|шиа\s*чат)/i, hosts: ['shiachat.com'] },
  { test: /(shia\s*tent|shiatent|шия\s*тент)/i, hosts: ['shiatent.com'] },
  { test: /(twelvers|твелверс|двунадесят)/i, hosts: ['twelvers.com'] },
  { test: /(shia\s*quest|shiaquest|шиа\s*квест)/i, hosts: ['shiaquest.net'] },
  { test: /(wiki\s*shia|wikishia|wiki\s*шиа)/i, hosts: ['wikishia.net'] },
  { test: /(al[\s-]?islam|ал[\s-]?ислам)/i, hosts: ['al-islam.org'] },
  { test: /(noorlib|нурлиб|nurlib)/i, hosts: ['noorlib.ir'] },
  { test: /(hawzah|хавза|хауза)/i, hosts: ['hawzah.net'] },
  { test: /(aqaed|акида|акайд)/i, hosts: ['aqaed.com'] },
  { test: /(imam[\s-]?us|имам[\s-]?ус)/i, hosts: ['imam-us.org'] },
  { test: /(alkafeel|аль[\s-]?кафиль|аль[\s-]?кафил)/i, hosts: ['alkafeel.net'] },
  { test: /(archive\.org|архив)/i, hosts: ['archive.org'] },
  { test: /(abna24|абна24)/i, hosts: ['abna24.com'] },
  { test: /(islamquest|исламквест)/i, hosts: ['islamquest.net'] },
  { test: /(shiavault|шиаваульт)/i, hosts: ['shiavault.com'] },
  { test: /(lib\.eshia|eshia|lib\s*shia)/i, hosts: ['lib.eshia.ir'] },
  { test: /(shamela|шамела)/i, hosts: ['shamela.ws'] },
  { test: /(islamweb|исламвеб)/i, hosts: ['islamweb.net'] },
  {
    test: /(shiaisnad|shia\s*isnad|риджаль|иснад|хадис|хадисы|передатчик)/i,
    hosts: ['shiaisnad.ru'],
  },
  {
    test: /(ya\s*husayn|yahusayn|ya-husayn|йа\s*хусейн|я\s*хусейн)/i,
    hosts: ['shiachat.com', 'shiatent.com', 'twelvers.com'],
  },
  {
    test: /(форум|discussion|дискусс|community|сообщество|forum)/i,
    hosts: ['shiachat.com', 'shiatent.com', 'twelvers.com', 'shiaquest.net'],
  },
];

const SOURCE_PRIORITY = {
  'shiaisnad.ru': 100,
  'lib.eshia.ir': 96,
  'shamela.ws': 92,
  'noorlib.ir': 90,
  'hawzah.net': 88,
  'al-islam.org': 86,
  'islamquest.net': 84,
  'aqaed.com': 82,
  'alkafeel.net': 80,
  'wikishia.net': 78,
  'imam-us.org': 76,
  'archive.org': 74,
  'abna24.com': 72,
  'islamweb.net': 68,
  'shiaquest.net': 64,
  'shiachat.com': 40,
  'shiatent.com': 38,
  'twelvers.com': 36,
  'shiavault.com': 34,
};

const rateBuckets = new Map();
const memoryCache = new Map();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateBuckets.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function normalizeText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((part) => normalizeText(part)).filter(Boolean).join(' ');
  }
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function truncate(text, maxChars) {
  const s = normalizeText(text);
  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars).trimEnd() + '\n…[обрезано]';
}

function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function stripHtml(html) {
  let text = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<\/(p|div|br|li|tr|h[1-6]|section|article|header|footer|main|blockquote)>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, ' ');

  text = decodeHtmlEntities(text);
  text = text.replace(/\r/g, '');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n[ \t]+\n/g, '\n\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function extractTitle(html) {
  const m = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return decodeHtmlEntities(stripHtml(m[1])).trim();
}

function getLastUserText(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== 'user') continue;
    return normalizeText(msg.content).trim();
  }
  return '';
}

function extractUrls(text) {
  const raw = normalizeText(text);
  const matches = raw.match(/https?:\/\/[^\s<>"'`)+\]]+/gi) || [];
  return [...new Set(matches.map((u) => u.replace(/[),.;]+$/g, '')))];
}

function isAllowedHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  for (const allowed of ALLOWED_SOURCE_HOSTS) {
    if (host === allowed || host.endsWith('.' + allowed)) return true;
  }
  return false;
}

function sourcePriority(hostname) {
  const host = String(hostname || '').toLowerCase();
  return SOURCE_PRIORITY[host] ?? 1;
}

function inferHosts(queryText) {
  const t = normalizeText(queryText).toLowerCase();
  const hosts = [];

  for (const rule of SOURCE_KEYWORDS) {
    if (rule.test.test(t)) hosts.push(...rule.hosts);
  }

  const hadithish =
    /хадис|хадисы|иснад|риджаль|передатчик|передатчиков|rijal|hadith|rawi|narrator/i.test(
      t,
    );

  if (hosts.length === 0 && hadithish) {
    hosts.push(
      'shiaisnad.ru',
      'lib.eshia.ir',
      'shamela.ws',
      'noorlib.ir',
      'hawzah.net',
      'al-islam.org',
      'islamquest.net',
      'wikishia.net',
      'shiachat.com',
      'shiatent.com',
      'twelvers.com',
    );
  }

  return [...new Set(hosts)].filter((h) => isAllowedHost(h));
}

function normalizeArabicSearchVariant(text) {
  let q = normalizeText(text).trim();
  if (!q) return q;
  q = q
    .replace(/\b(ibn|bin|ben|bnu|bint)\b/gi, 'بن')
    .replace(/\b(abu|abū|abo)\b/gi, 'أبو')
    .replace(/\b(umm|um)\b/gi, 'أم')
    .replace(/\b(al|el|al-)\b/gi, 'ال')
    .replace(/[-_,.:;!?()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return q;
}

function buildSearchQueries(queryText) {
  const raw = normalizeText(queryText).trim();
  const cleaned = stripCommandWords(raw);
  const variants = new Set();

  if (cleaned) variants.add(cleaned);
  if (raw && raw !== cleaned) variants.add(raw);

  const arabicish = normalizeArabicSearchVariant(cleaned);
  if (arabicish && arabicish !== cleaned) variants.add(arabicish);

  const spaced = cleaned.replace(/\s+/g, ' ').trim();
  if (spaced) variants.add(spaced);

  const short = spaced
    .replace(/\b(кто|что|как|какой|какая|какие|о|об|про|это|тот|эта|эти)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (short && short !== spaced) variants.add(short);

  return [...variants].filter(Boolean).slice(0, 5);
}

function stripCommandWords(text) {
  return normalizeText(text)
    .replace(/@Рассуждение/gi, ' ')
    .replace(
      /\b(открой|открыть|найди|найти|проверь|проверить|посмотри|посмотреть|покажи|показать|поищи|поиск|source|источник|источники)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheGet(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value, ttlMs) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function cacheRequestKey(prefix, key) {
  return `https://cache.local/${prefix}/${encodeURIComponent(key)}`;
}

async function cacheMatchText(prefix, key) {
  if (!globalThis.caches?.default) return null;
  const req = new Request(cacheRequestKey(prefix, key), { method: 'GET' });
  const cached = await caches.default.match(req);
  return cached;
}

async function cachePutText(prefix, key, response) {
  if (!globalThis.caches?.default) return;
  const req = new Request(cacheRequestKey(prefix, key), { method: 'GET' });
  await caches.default.put(req, response);
}

async function fetchTextWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'ru,en;q=0.8',
      },
      signal: controller.signal,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const body = await res.text();

    return {
      ok: res.ok,
      status: res.status,
      url: res.url || url,
      contentType,
      body,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeDuckDuckGoUrl(href) {
  let u = String(href || '').trim();
  if (!u) return '';
  if (u.startsWith('//')) u = 'https:' + u;

  try {
    const parsed = new URL(u, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return parsed.toString();
  } catch {
    return u;
  }
}

function extractMainHtml(html) {
  const source = String(html);

  const candidates = [];
  const pushMatches = (re) => {
    let m;
    while ((m = re.exec(source))) {
      candidates.push(m[1]);
    }
  };

  pushMatches(/<main[^>]*>([\s\S]*?)<\/main>/gi);
  pushMatches(/<article[^>]*>([\s\S]*?)<\/article>/gi);
  pushMatches(
    /<div[^>]*(?:id|class)="[^"]*(?:content|post|article|main|entry|body|page|forum|topic|thread|comment|discussion)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  );

  let best = '';
  let bestLen = 0;
  for (const c of candidates) {
    const len = stripHtml(c).length;
    if (len > bestLen) {
      best = c;
      bestLen = len;
    }
  }

  return best || source;
}

// Fetches a DuckDuckGo results page using a real-browser fingerprint
// (POST form submit, browser UA/headers) instead of a GET query string
// with a self-declared bot UA — the latter is what DDG's anti-bot system
// reliably blocks/challenges from datacenter IPs like Cloudflare Workers.
async function fetchDdgPage(url, init, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: '' };
  } finally {
    clearTimeout(timeout);
  }
}

// Parses DuckDuckGo result links without depending on a specific CSS
// class (DDG changes its markup often — the previous code only matched
// class="result__a", which silently returns zero matches whenever that
// class name isn't present). Instead we scan every <a href> and rely on
// the allowed-host whitelist to filter out navigation/ad/internal links.
function parseDdgLinks(html, siteHost, limit) {
  const results = [];
  if (!html) return results;

  const re = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = re.exec(html)) && results.length < limit) {
    const rawHref = match[1];
    // Skip DuckDuckGo's own chrome (nav, ads, "About", etc.) — real result
    // links either redirect via /l/?uddg=... or point straight at the
    // target site.
    if (/^\/(y|l)\.js/i.test(rawHref)) continue;

    const url = decodeDuckDuckGoUrl(rawHref);
    const title = stripHtml(match[2]).replace(/\s+/g, ' ').trim();
    if (!url || !title) continue;

    let host;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      continue;
    }

    if (host.endsWith('duckduckgo.com')) continue;
    if (siteHost && !(host === siteHost || host.endsWith('.' + siteHost))) continue;
    if (!isAllowedHost(host)) continue;

    results.push({ url, title, host, score: sourcePriority(host) });
  }

  return results;
}

async function searchDuckDuckGo(query, siteHost, limit = SEARCH_LIMIT) {
  const q = siteHost ? `site:${siteHost} ${query}` : query;
  const cacheKey = `ddg:${siteHost || 'all'}:${q}:${limit}`;

  const cachedMem = cacheGet(cacheKey);
  if (cachedMem) return cachedMem;

  const cached = await cacheMatchText('search', cacheKey);
  if (cached) {
    try {
      return await cached.json();
    } catch {}
  }

  const commonHeaders = {
    'user-agent': DDG_BROWSER_USER_AGENT,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'ru,en;q=0.8',
  };

  // Primary attempt: html.duckduckgo.com via POST form submit (matches
  // what a real browser sends — GET with a query string is the classic
  // scraper fingerprint and gets blocked far more often).
  let results = [];
  const primary = await fetchDdgPage(
    'https://html.duckduckgo.com/html/',
    {
      method: 'POST',
      headers: {
        ...commonHeaders,
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'https://html.duckduckgo.com',
        referer: 'https://html.duckduckgo.com/html/',
      },
      body: `q=${encodeURIComponent(q)}`,
    },
    12000,
  );
  if (primary.ok && primary.body) {
    results = parseDdgLinks(primary.body, siteHost, limit);
  }

  // Fallback: lite.duckduckgo.com — simpler markup, sometimes reachable
  // when the html endpoint is challenged.
  if (results.length === 0) {
    const fallback = await fetchDdgPage(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`,
      { method: 'GET', headers: commonHeaders },
      12000,
    );
    if (fallback.ok && fallback.body) {
      results = parseDdgLinks(fallback.body, siteHost, limit);
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  const finalResults = results.slice(0, limit);

  cacheSet(cacheKey, finalResults, MEMORY_CACHE_TTL_MS);
  try {
    await cachePutText(
      'search',
      cacheKey,
      new Response(JSON.stringify(finalResults), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      }),
    );
  } catch {}
  return finalResults;
}

async function openAllowedUrl(url, fallbackTitle = '') {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!isAllowedHost(parsed.hostname)) return null;

  const cacheKey = `open:${parsed.toString()}`;

  const cachedMem = cacheGet(cacheKey);
  if (cachedMem) return cachedMem;

  const cached = await cacheMatchText('open', cacheKey);
  if (cached) {
    try {
      return await cached.json();
    } catch {}
  }

  const res = await fetchTextWithTimeout(parsed.toString(), 15000);
  if (!res.ok || !res.body) return null;

  let finalUrl;
  try {
    finalUrl = new URL(res.url);
  } catch {
    return null;
  }

  if (!isAllowedHost(finalUrl.hostname)) return null;

  const title = fallbackTitle || extractTitle(res.body) || finalUrl.toString();
  let text = '';

  if (res.contentType.includes('html')) {
    const mainHtml = extractMainHtml(res.body);
    text = stripHtml(mainHtml);
  } else if (
    res.contentType.includes('text/plain') ||
    res.contentType.includes('application/json') ||
    res.contentType.includes('text/')
  ) {
    text = normalizeText(res.body).trim();
  } else {
    return null;
  }

  text = truncate(text, MAX_SOURCE_TEXT_CHARS);
  if (!text) return null;

  const result = {
    url: finalUrl.toString(),
    title,
    text,
    status: res.status,
    host: finalUrl.hostname.toLowerCase(),
    score: sourcePriority(finalUrl.hostname.toLowerCase()),
  };

  cacheSet(cacheKey, result, MEMORY_CACHE_TTL_MS);
  try {
    await cachePutText(
      'open',
      cacheKey,
      new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=600',
        },
      }),
    );
  } catch {}
  return result;
}

function buildSourceContext(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return '';

  const blocks = sources.map((src, idx) => {
    return [
      `Источник ${idx + 1}: ${src.title || src.url}`,
      `URL: ${src.url}`,
      `HTTP: ${src.status || 'unknown'}`,
      `Текст:`,
      src.text,
    ].join('\n');
  });

  return [
    'СЕРВЕРНЫЕ ИСТОЧНИКИ',
    'Используй этот текст как приоритетный контекст для ответа.',
    'Если источники расходятся, скажи об этом прямо и не выдумывай.',
    ...blocks,
  ].join('\n\n');
}

async function collectSourceContext(userText) {
  const rawText = normalizeText(userText);
  if (!rawText) return '';

  const cacheKey = `ctx:${rawText}`;
  const cachedMem = cacheGet(cacheKey);
  if (cachedMem) return cachedMem;

  const directUrls = extractUrls(rawText);
  const queryVariants = buildSearchQueries(rawText);

  const sources = [];
  const seen = new Set();

  const pushSource = (src) => {
    if (!src?.url || seen.has(src.url)) return false;
    seen.add(src.url);
    sources.push(src);
    return true;
  };

  for (const url of directUrls) {
    try {
      const opened = await openAllowedUrl(url);
      if (opened) pushSource(opened);
    } catch {}
    if (sources.length >= MAX_SOURCES_PER_ANSWER) break;
  }

  if (sources.length < MAX_SOURCES_PER_ANSWER) {
    const hostPlan = inferHosts(rawText);
    const hosts = (
      hostPlan.length
        ? hostPlan
        : [
            'shiaisnad.ru',
            'lib.eshia.ir',
            'shamela.ws',
            'noorlib.ir',
            'hawzah.net',
            'al-islam.org',
            'islamquest.net',
            'wikishia.net',
            'shiachat.com',
            'shiatent.com',
            'twelvers.com',
          ]
    ).slice(0, 6);

    // ── Subrequest budget guard ──────────────────────────────────
    // Cloudflare caps the number of fetch() subrequests a single Worker
    // invocation may issue (as low as 50 on some plans). The previous
    // version looped `for (host of hosts) for (q of queryVariants)`,
    // firing one searchDuckDuckGo() call PER HOST — up to 11 hosts ×
    // 5 query variants = 55 calls, each doing up to 2 fetches (primary
    // + lite.duckduckgo.com fallback) = up to ~110 fetch subrequests
    // for search alone, plus up to 8 more to open result pages.
    // Once that budget is exhausted, every fetch() after it — including
    // the real call to the AI provider below — throws immediately,
    // which is exactly what produced "502 Upstream request failed" on
    // every chat message.
    //
    // Fix: combine all candidate hosts into ONE DuckDuckGo query per
    // query variant using an OR'd site: filter, and cap the number of
    // variants actually sent over the network. This turns "hosts ×
    // variants" fetches into just "variants" fetches (≤ 2), leaving
    // plenty of headroom for the upstream AI request.
    const siteFilter =
      hosts.length > 1
        ? '(' + hosts.map((h) => `site:${h}`).join(' OR ') + ')'
        : hosts[0]
          ? `site:${hosts[0]}`
          : '';

    const searchVariants = queryVariants.slice(0, 2);
    const searchTasks = searchVariants.map((q) =>
      searchDuckDuckGo(
        siteFilter ? `${siteFilter} ${q}` : q,
        null,
        SEARCH_LIMIT * hosts.length,
      ).catch(() => []),
    );

    const searchResults = (await Promise.all(searchTasks)).flat();

    searchResults.sort(
      (a, b) =>
        (b.score || 0) - (a.score || 0) ||
        String(a.title || '').localeCompare(String(b.title || '')),
    );

    const uniqueResults = [];
    for (const item of searchResults) {
      if (!item?.url) continue;
      if (seen.has(item.url)) continue;
      uniqueResults.push(item);
      seen.add(item.url);
      if (uniqueResults.length >= 12) break;
    }

    const opened = await Promise.all(
      uniqueResults.slice(0, MAX_SOURCES_PER_ANSWER).map((item) =>
        openAllowedUrl(item.url, item.title).catch(() => null),
      ),
    );

    for (const item of opened) {
      if (item) pushSource(item);
      if (sources.length >= MAX_SOURCES_PER_ANSWER) break;
    }
  }

  sources.sort((a, b) => (b.score || 0) - (a.score || 0));

  const context = buildSourceContext(sources.slice(0, MAX_SOURCES_PER_ANSWER));
  if (context) cacheSet(cacheKey, context, MEMORY_CTX_TTL_MS);
  return context;
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m) => m && typeof m === 'object' && typeof m.role === 'string')
    .map((m) => ({ ...m, content: m.content }));
}

function mergeSystemText(originalSystem, injectedContext) {
  const base = normalizeText(originalSystem).trim();
  const extra = normalizeText(injectedContext).trim();
  if (base && extra) return `${base}\n\n${extra}`;
  return base || extra || '';
}

function upstreamPath(env) {
  const value = normalizeText(env.AI_PATH || DEFAULT_AI_PATH).trim();
  if (!value.startsWith('/')) return DEFAULT_AI_PATH;
  return value;
}

async function handleChat(request, env) {
  if (!env.AI_API_KEY || !env.AI_BASE_URL || !env.AI_MODEL) {
    return json({ error: 'AI is not configured on the server' }, 503);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return json({ error: 'Rate limit exceeded' }, 429);
  }

  const payload = await readJsonBody(request);
  if (!payload) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const allowedKeys = ['messages', 'system', 'max_tokens', 'temperature'];
  const safePayload = {};
  for (const key of allowedKeys) {
    if (key in payload) safePayload[key] = payload[key];
  }

  safePayload.messages = normalizeMessages(safePayload.messages);

  if (!Array.isArray(safePayload.messages) || safePayload.messages.length === 0) {
    return json({ error: 'messages field is required' }, 400);
  }

  const approxSize = JSON.stringify(safePayload).length;
  if (approxSize > MAX_PAYLOAD_BYTES) {
    return json({ error: 'Payload too large' }, 413);
  }

  if (typeof safePayload.max_tokens === 'number') {
    safePayload.max_tokens = clamp(safePayload.max_tokens, 1, MAX_MODEL_TOKENS);
  }

  const lastUserText = getLastUserText(safePayload.messages);
  const sourceContext = await collectSourceContext(lastUserText);

  if (sourceContext) {
    safePayload.system = mergeSystemText(safePayload.system, sourceContext);
  }

  const wantsTranslateModel =
    request.headers.get('x-translate') === '1' ||
    request.headers.get('X-Translate') === '1';
  safePayload.model =
    (wantsTranslateModel && env.TRANSLATE_MODEL_AI) || env.AI_MODEL;

  let targetUrl;
  try {
    targetUrl = new URL(upstreamPath(env), env.AI_BASE_URL).toString();
  } catch {
    return json({ error: 'AI backend misconfigured' }, 503);
  }

  const controller = new AbortController();
  const timeoutMs = clamp(
    Number(env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    10_000,
    MAX_UPSTREAM_TIMEOUT_MS,
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.AI_API_KEY,
        Accept: 'application/json',
      },
      body: JSON.stringify(safePayload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ||
          'application/json; charset=utf-8',
        ...corsHeaders(),
      },
    });
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return json({ error: 'Upstream timeout' }, 504);
    }
    return json({ error: 'Upstream request failed' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function handleSearch(request) {
  const url = new URL(request.url);
  let query = url.searchParams.get('q') || '';
  let host = url.searchParams.get('host') || '';
  let limit = Number(url.searchParams.get('limit') || SEARCH_LIMIT);

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    if (body && typeof body === 'object') {
      query = normalizeText(body.query || query);
      host = normalizeText(body.host || host);
      limit = Number(body.limit || limit);
    }
  }

  query = stripCommandWords(query);
  host = host.trim().toLowerCase();
  limit = clamp(Number.isFinite(limit) ? limit : SEARCH_LIMIT, 1, 5);

  if (!query) {
    return json({ error: 'query is required' }, 400);
  }

  if (host && !isAllowedHost(host)) {
    return json({ error: 'host is not allowed' }, 400);
  }

  const results = await searchDuckDuckGo(query, host || undefined, limit);
  return json({ query, host: host || null, results });
}

async function handleOpen(request) {
  const url = new URL(request.url);
  let target = url.searchParams.get('url') || '';

  if (request.method === 'POST') {
    const body = await readJsonBody(request);
    if (body && typeof body === 'object') {
      target = normalizeText(body.url || target);
    }
  }

  if (!target) {
    return json({ error: 'url is required' }, 400);
  }

  const opened = await openAllowedUrl(target);
  if (!opened) {
    return json({ error: 'url is not allowed or cannot be opened' }, 400);
  }

  return json(opened);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/ai/chat') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return handleChat(request, env, ctx);
    }

    if (url.pathname === '/ai/search' || url.pathname === '/api/search') {
      if (request.method !== 'GET' && request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return handleSearch(request);
    }

    if (url.pathname === '/ai/open' || url.pathname === '/api/open') {
      if (request.method !== 'GET' && request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return handleOpen(request);
    }

    if (url.pathname === '/health') {
      return json({
        ok: true,
        aiConfigured: Boolean(env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL),
        sources: [...ALLOWED_SOURCE_HOSTS],
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found. Configure ASSETS binding to serve index.html.', {
      status: 404,
    });
  },
};