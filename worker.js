/**
 * Cloudflare Worker — Ilm al-Rijal
 * ---------------------------------
 * Бесплатные улучшения:
 *   - кэш Cloudflare + in-memory fallback;
 *   - параллельный поиск по нескольким источникам;
 *   - приоритет ShiaIsnad и локальных источников;
 *   - больше бесплатных источников и форумов;
 *   - более аккуратное извлечение текста из HTML;
 *   - endpoints /ai/chat, /health;
 *   - поддержка нескольких вариантов поискового запроса.
 *
 * Env (основной ИИ — чат, ответы по риджалю/хадисам):
 *   AI_API_KEY        — Secret
 *   AI_BASE_URL       — Variable/Secret (например: https://smartapi.shop/backend)
 *   AI_MODEL          — Variable/Secret
 *   AI_PATH           — optional, default /v1/messages
 *   AI_TIMEOUT_MS     — optional, default 58000
 *
 * Env (ПЕРЕВОДЧИК — полностью отдельный от основного ИИ; запросы с
 * заголовком X-Translate: 1). Никогда не берёт AI_BASE_URL / AI_API_KEY /
 * AI_MODEL «по умолчанию» — если не настроен, перевод возвращает 503, а
 * основной ИИ продолжает работать как обычно (и наоборот):
 *   TRANSLATE_API_KEY  — Secret
 *   TRANSLATE_BASE_URL — Variable/Secret
 *   TRANSLATE_MODEL    — Variable/Secret
 *   TRANSLATE_PATH     — optional, default /v1/messages
 *   TRANSLATE_TIMEOUT_MS — optional, default 58000
 *
 * Старое имя TRANSLATE_MODEL_AI больше не используется.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
// Раздельные лимиты: чат ИИ и перевод считаются в независимых «корзинах»,
// поэтому массовый перевод глав не выбивает лимит чата (и наоборот).
const RATE_LIMIT_MAX_REQUESTS = { ai: 20, translate: 90 };
const RATE_BUCKETS_MAX_KEYS = 5000;
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
// Расширенный TTL кэша (было 10/5 минут) — большинство вопросов повторяются
// (одни и те же передатчики/хадисы спрашивают разные посетители), поэтому
// более долгий кэш заметно ускоряет типичный повторный запрос, отвечая из
// памяти/edge-кэша вместо нового похода в DuckDuckGo и на сайты-источники.
const MEMORY_CACHE_TTL_MS = 30 * 60_000;
const MEMORY_CTX_TTL_MS = 15 * 60_000;

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
  'arsh313.com',
  // ── Дополнительные шиитские форумы/сайты хадисов и слов учёных ──
  'balagh.net',
  'imamreza.net',
  'rafed.net',
  'sistani.org',
  'khamenei.ir',
  'islamic-laws.com',
  'al-mostafa.com',
  'maaref-foundation.com',
  'thaqalayn.net',
  'shiapen.com',
  'duas.org',
  'ziaraat.org',
  'taghrib.org',
  'yahusayn.com',
  'iqraonline.net',
  'al-shia.org',
  'ahlulbayt.org',
  'jafariyanews.com',
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
    hosts: [
      'shiachat.com',
      'shiatent.com',
      'twelvers.com',
      'shiaquest.net',
      'yahusayn.com',
    ],
  },
  { test: /(balagh|балаг)/i, hosts: ['balagh.net'] },
  { test: /(imam\s*reza|имам\s*реза)/i, hosts: ['imamreza.net'] },
  { test: /(rafed|рафед)/i, hosts: ['rafed.net'] },
  { test: /(sistani|систани)/i, hosts: ['sistani.org'] },
  { test: /(khamenei|хаменеи)/i, hosts: ['khamenei.ir'] },
  {
    test: /(islamic[\s-]?laws|исламские\s*законы)/i,
    hosts: ['islamic-laws.com'],
  },
  { test: /(al[\s-]?mostafa|аль[\s-]?мустафа)/i, hosts: ['al-mostafa.com'] },
  { test: /(maaref|маариф)/i, hosts: ['maaref-foundation.com'] },
  { test: /(thaqalayn|сакалайн)/i, hosts: ['thaqalayn.net'] },
  { test: /(shiapen|шиапен)/i, hosts: ['shiapen.com'] },
  { test: /(дуа|dua(?!h))/i, hosts: ['duas.org'] },
  { test: /(зиярат|ziaraat)/i, hosts: ['ziaraat.org'] },
  { test: /(тагриб|taghrib)/i, hosts: ['taghrib.org'] },
  { test: /(iqra|икра)/i, hosts: ['iqraonline.net'] },
  { test: /(al[\s-]?shia|аль[\s-]?шиа)/i, hosts: ['al-shia.org'] },
  { test: /(ahlulbayt|ахль\s*аль[\s-]?бейт|ахлюль\s*бейт)/i, hosts: ['ahlulbayt.org'] },
  { test: /(jafariya|джафария)/i, hosts: ['jafariyanews.com'] },
];

// Единый список хостов для хадисных/риджальных запросов без явного
// указания конкретного сайта — используется и как источник для инференса
// хостов (inferHosts), и как запасной список в collectSourceContext, чтобы
// не держать два расходящихся списка (раньше при добавлении нового форума
// приходилось помнить про оба места — легко было забыть про одно из них).
const DEFAULT_HADITH_HOSTS = [
  'shiaisnad.ru',
  'arsh313.com',
  'lib.eshia.ir',
  'shamela.ws',
  'noorlib.ir',
  'hawzah.net',
  'al-islam.org',
  'islamquest.net',
  'wikishia.net',
  'balagh.net',
  'imamreza.net',
  'al-mostafa.com',
  'thaqalayn.net',
  'shiapen.com',
  'shiachat.com',
  'shiatent.com',
  'twelvers.com',
  'yahusayn.com',
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
  'arsh313.com': 60,
  'sistani.org': 59,
  'khamenei.ir': 58,
  'islamic-laws.com': 57,
  'al-mostafa.com': 56,
  'maaref-foundation.com': 55,
  'thaqalayn.net': 54,
  'balagh.net': 53,
  'imamreza.net': 52,
  'rafed.net': 51,
  'shiapen.com': 50,
  'ahlulbayt.org': 49,
  'al-shia.org': 48,
  'taghrib.org': 47,
  'iqraonline.net': 46,
  'duas.org': 45,
  'ziaraat.org': 44,
  'jafariyanews.com': 42,
  'shiachat.com': 40,
  'shiatent.com': 38,
  'twelvers.com': 36,
  'shiavault.com': 34,
  'yahusayn.com': 32,
};

const rateBuckets = new Map();
const memoryCache = new Map();

// ── CORS ──────────────────────────────────────────────────────────────────
// Сайт ходит в /ai/chat по относительному пути (same-origin), поэтому CORS ему
// не нужен. Разрешены: собственный origin Worker'а (прод, workers.dev, wrangler
// dev), основной домен проекта и необязательные дополнительные origin'ы из
// переменной ALLOWED_ORIGINS (через запятую, например "https://www.shiaisnad.ru").
// Запрос с неизвестным Origin на /ai/chat отклоняется (403) до обращения к ИИ.
// Запрос без Origin (curl, серверные клиенты) обрабатывается как раньше.
const PRODUCTION_ORIGINS = ['https://shiaisnad.ru'];

function resolveCors(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return { present: false, allowed: true, origin: null };
  let allowed = PRODUCTION_ORIGINS.includes(origin);
  if (!allowed) {
    try { allowed = new URL(request.url).origin === origin; } catch (_) {}
  }
  if (!allowed && env && typeof env.ALLOWED_ORIGINS === 'string') {
    allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).includes(origin);
  }
  return { present: true, allowed, origin };
}

function corsHeaders(cors) {
  const headers = { Vary: 'Origin' };
  if (cors && cors.present && cors.allowed) {
    headers['Access-Control-Allow-Origin'] = cors.origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Translate, X-Hadith-Strict';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

// Единственная точка, где CORS-заголовки добавляются к ответам API.
function withCors(response, cors) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(cors))) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

let lastRatePrune = 0;

// Удаляет из rateBuckets записи, у которых не осталось запросов в текущем окне,
// чтобы Map не рос бесконечно (по одному ключу на каждый IP + тип запроса).
function pruneRateBuckets(now) {
  if (now - lastRatePrune < RATE_LIMIT_WINDOW_MS && rateBuckets.size < RATE_BUCKETS_MAX_KEYS) return;
  lastRatePrune = now;
  for (const [key, bucket] of rateBuckets) {
    const last = bucket.length ? bucket[bucket.length - 1] : 0;
    if (now - last >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(key);
  }
  // Защита от переполнения при всплеске уникальных IP: выбрасываем самые старые.
  if (rateBuckets.size >= RATE_BUCKETS_MAX_KEYS) {
    const overflow = rateBuckets.size - RATE_BUCKETS_MAX_KEYS + 1;
    let i = 0;
    for (const key of rateBuckets.keys()) {
      rateBuckets.delete(key);
      if (++i >= overflow) break;
    }
  }
}

// kind: 'ai' (чат) | 'translate' (перевод). Лимиты и корзины раздельные.
function isRateLimited(ip, kind = 'ai') {
  const now = Date.now();
  pruneRateBuckets(now);
  const key = `${kind}|${ip}`;
  const bucket = rateBuckets.get(key) || [];
  const recent = bucket.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateBuckets.set(key, recent);
  return recent.length > (RATE_LIMIT_MAX_REQUESTS[kind] || RATE_LIMIT_MAX_REQUESTS.ai);
}

// Глобальный лимит: Map выше живёт только внутри одного экземпляра (isolate) Worker'а
// и НЕ является глобальным ограничением. Для настоящего лимита подключите Workers
// Rate Limiting binding (RATE_LIMITER_AI / RATE_LIMITER_TRANSLATE — см. wrangler.toml).
// Если binding не настроен или недоступен, остаётся локальный лимит выше.
async function isRateLimitedGlobal(env, ip, kind) {
  const binding = kind === 'translate' ? env.RATE_LIMITER_TRANSLATE : env.RATE_LIMITER_AI;
  if (binding && typeof binding.limit === 'function') {
    try {
      const { success } = await binding.limit({ key: `${kind}|${ip}` });
      if (!success) return true;
    } catch (_) { /* binding недоступен — работает локальный лимит */ }
  }
  return isRateLimited(ip, kind);
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

const HADITH_QUERY_RE =
  /хадис|хадисы|хадиса|хадисов|хадисах|иснад|риджаль|передатчик|передатчиков|rijal|hadith|rawi|narrator/i;

function isHadithQuery(text) {
  return HADITH_QUERY_RE.test(normalizeText(text));
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
    hosts.push(...DEFAULT_HADITH_HOSTS);
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

async function fetchTextWithTimeout(url, timeoutMs = 11000) {
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

  // Оба DDG-эндпоинта ЗАПУСКАЮТСЯ одновременно (fire-and-await-lazily) вместо
  // строго последовательного "ждём html.duckduckgo.com целиком → и только
  // при пустом результате идём в lite.duckduckgo.com". Раньше это означало,
  // что при блокировке/пустом ответе html-эндпоинта пользователь ждал ДВА
  // полных таймаута подряд (до 12с + 12с). Теперь fallback стартует сразу же,
  // параллельно с primary, но ожидается только если primary не дал
  // результатов — в успешном случае (чаще всего) задержка не увеличивается,
  // а в случае блокировки primary — fallback уже почти готов, а не только
  // начинает выполняться.
  const primaryPromise = fetchDdgPage(
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
    9000,
  );
  const fallbackPromise = fetchDdgPage(
    `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`,
    { method: 'GET', headers: commonHeaders },
    9000,
  );

  let results = [];
  const primary = await primaryPromise;
  if (primary.ok && primary.body) {
    results = parseDdgLinks(primary.body, siteHost, limit);
  }

  if (results.length === 0) {
    const fallback = await fallbackPromise;
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

// ── Интернет-поиск (HadisX и чат ИИ) ─────────────────────────────────
// Простая линейная логика вместо прежнего каскада хост-за-хостом:
//
//   вопрос → нужен ли веб-поиск? → 1–2 поисковых запроса → ОДИН запрос
//   к DuckDuckGo на вариант с объединённым фильтром site:(a OR b OR …) →
//   дедупликация ссылок → открытие ≤ MAX_SOURCES_PER_ANSWER страниц →
//   контекст для модели.
//
// Всего ≤ 2 (поиск) × 2 (html+lite) + 4 (страницы) = ≤ 8 подзапросов на
// сообщение (раньше каскад мог сделать 30+ и упереться в лимит Cloudflare,
// из-за чего до самого ИИ дело не доходило — "502 Upstream request
// failed"). Любая ошибка поиска = пустой контекст: ИИ всё равно отвечает.
const SEARCH_DEADLINE_MS = 14_000;

const GREETING_RE =
  /^(привет|здравствуй|салам|ас-салам|ассалам|спасибо|благодар|ок|окей|хорошо|понятно|да|нет|hi|hello|thanks|مرحبا|السلام|شكرا)[\s!.,?)]*$/i;

// Нужен ли вообще интернет-поиск для этого сообщения.
function needsWebSearch(text) {
  const t = normalizeText(text).trim();
  if (t.length < 6) return false;
  if (GREETING_RE.test(t)) return false;
  if (extractUrls(t).length > 0) return true;
  if (isHadithQuery(t) || inferHosts(t).length > 0) return true;
  // общий вопрос: минимум 3 слова или знак вопроса
  return t.split(/\s+/).length >= 3 || /[?؟]/.test(t);
}

function withDeadline(promise, ms, fallback) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function collectSourceContext(userText) {
  const rawText = normalizeText(userText);
  if (!needsWebSearch(rawText)) return '';

  const cacheKey = `ctx:${rawText}`;
  const cachedMem = cacheGet(cacheKey);
  if (cachedMem) return cachedMem;

  const run = async () => {
    const sources = [];
    const seen = new Set();
    const push = (src) => {
      if (!src?.url || seen.has(src.url)) return;
      seen.add(src.url);
      sources.push(src);
    };

    // 1) Ссылки, которые пользователь прислал сам (только разрешённые хосты).
    const direct = extractUrls(rawText)
      .filter((u) => {
        try { return isAllowedHost(new URL(u).hostname); } catch { return false; }
      })
      .slice(0, MAX_SOURCES_PER_ANSWER);
    const openedDirect = await Promise.all(
      direct.map((u) => openAllowedUrl(u).catch(() => null)),
    );
    openedDirect.forEach(push);

    // 2) Поиск — только если прямых ссылок не хватило.
    if (sources.length < MAX_SOURCES_PER_ANSWER) {
      const variants = buildSearchQueries(rawText).slice(0, 2);
      const inferred = inferHosts(rawText);
      const hosts = (inferred.length ? inferred : DEFAULT_HADITH_HOSTS).slice(0, 8);
      const siteFilter =
        hosts.length > 1
          ? '(' + hosts.map((h) => `site:${h}`).join(' OR ') + ')'
          : `site:${hosts[0]}`;

      const found = (
        await Promise.all(
          variants.map((q) =>
            searchDuckDuckGo(`${siteFilter} ${q}`, null, SEARCH_LIMIT * 2).catch(() => []),
          ),
        )
      ).flat();
      found.sort((a, b) => (b.score || 0) - (a.score || 0));

      const toOpen = [];
      for (const item of found) {
        if (!item?.url || seen.has(item.url) || toOpen.some((x) => x.url === item.url)) continue;
        toOpen.push(item);
        if (toOpen.length >= MAX_SOURCES_PER_ANSWER - sources.length) break;
      }
      const opened = await Promise.all(
        toOpen.map((item) => openAllowedUrl(item.url, item.title).catch(() => null)),
      );
      opened.forEach(push);
    }

    sources.sort((a, b) => (b.score || 0) - (a.score || 0));
    return buildSourceContext(sources.slice(0, MAX_SOURCES_PER_ANSWER));
  };

  // Общий дедлайн: если поиск завис — отвечаем без него, а не ждём таймаут ИИ.
  const context = await withDeadline(run().catch(() => ''), SEARCH_DEADLINE_MS, '');
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

function upstreamPath(rawPath) {
  const value = normalizeText(rawPath || DEFAULT_AI_PATH).trim();
  if (!value.startsWith('/')) return DEFAULT_AI_PATH;
  return value;
}

// Две независимые конфигурации апстрима: основной ИИ и переводчик.
// Общих значений у них нет — ошибка/отсутствие настроек одного сервиса
// не затрагивает другой.
function resolveUpstream(env, isTranslate) {
  if (isTranslate) {
    return {
      kind: 'translate',
      apiKey: env.TRANSLATE_API_KEY,
      baseUrl: env.TRANSLATE_BASE_URL,
      model: env.TRANSLATE_MODEL,
      path: env.TRANSLATE_PATH,
      timeout: env.TRANSLATE_TIMEOUT_MS,
    };
  }
  return {
    kind: 'ai',
    apiKey: env.AI_API_KEY,
    baseUrl: env.AI_BASE_URL,
    model: env.AI_MODEL,
    path: env.AI_PATH,
    timeout: env.AI_TIMEOUT_MS,
  };
}

// Удаляет из JSON-ответа ИИ-провайдера любые поля, по которым можно узнать,
// какая именно модель/провайдер используется (например "model"). Если тело
// не парсится как JSON — возвращаем как есть (например, при ошибке апстрима).
function stripProviderInfo(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return rawText;
  }
  if (data && typeof data === 'object') {
    delete data.model;
    if (data.error && typeof data.error === 'object') {
      delete data.error.model;
    }
  }
  try {
    return JSON.stringify(data);
  } catch {
    return rawText;
  }
}

async function handleChat(request, env) {
  // Заголовки в Fetch API регистронезависимы. X-Translate: 1 → ТОЛЬКО
  // TRANSLATE_* (resolveUpstream), AI_* для перевода не используются никогда.
  const wantsTranslateModel = request.headers.get('x-translate') === '1';

  const upstreamCfg = resolveUpstream(env, wantsTranslateModel);
  if (!upstreamCfg.apiKey || !upstreamCfg.baseUrl || !upstreamCfg.model) {
    return json(
      wantsTranslateModel
        ? {
            error: 'Translator is not configured on the server: set TRANSLATE_API_KEY, TRANSLATE_BASE_URL and TRANSLATE_MODEL',
            code: 'TRANSLATE_NOT_CONFIGURED',
          }
        : { error: 'AI is not configured on the server', code: 'AI_NOT_CONFIGURED' },
      503,
    );
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (await isRateLimitedGlobal(env, ip, wantsTranslateModel ? 'translate' : 'ai')) {
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

  // Строгий режим "только локальная база хадисов" — используется чатом на
  // странице /hadis (см. public/hadis/index.html). Там система уже сама
  // передаёт найденные фрагменты из hadis_data.json прямо в system-промпте,
  // и веб-поиск (shiaisnad.ru/arsh313.com/и т.д.) специально пропускается —
  // и чтобы не тратить время/подзапросы, и чтобы модель не подмешивала
  // внешние источники там, где просили отвечать строго по локальному файлу.
  //
  // Запросы перевода (X-Translate: 1) — САМАЯ ЧАСТАЯ причина, почему
  // перевод биографии казался медленным: раньше даже для перевода воркер
  // всё равно запускал полный каскад веб-поиска по shiaisnad.ru/arsh313.com
  // и остальным источникам (десятки под-запросов) ПЕРЕД тем, как вообще
  // обратиться к модели — хотя промпт перевода уже содержит весь нужный
  // текст и никакого поиска не требует. Пропускаем поиск для них так же,
  // как и для строгого режима хадисов — это и есть основной выигрыш в
  // скорости, а не только выбор модели.
  const strictLocalHadith = request.headers.get('x-hadith-strict') === '1';

  const skipSourceSearch = strictLocalHadith || wantsTranslateModel;

  const sourceContext = skipSourceSearch
    ? ''
    : await collectSourceContext(lastUserText);

  if (sourceContext) {
    safePayload.system = mergeSystemText(safePayload.system, sourceContext);
  }

  safePayload.model = upstreamCfg.model;

  let targetUrl;
  try {
    targetUrl = new URL(upstreamPath(upstreamCfg.path), upstreamCfg.baseUrl).toString();
  } catch {
    return json({ error: upstreamCfg.kind === 'translate' ? 'Translator backend misconfigured' : 'AI backend misconfigured' }, 503);
  }

  const controller = new AbortController();
  const timeoutMs = clamp(
    Number(upstreamCfg.timeout || DEFAULT_TIMEOUT_MS),
    10_000,
    MAX_UPSTREAM_TIMEOUT_MS,
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': upstreamCfg.apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify(safePayload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    // Никогда не отдаём в браузер сведения о том, какой ИИ-провайдер или
    // какая именно модель стоит за чатом (поле "model" в ответе Anthropic-
    // совместимого API, а иногда и служебные "id"/"type" от провайдера).
    // Пользователь не должен иметь возможность увидеть это даже через
    // вкладку "Сеть" в инструментах разработчика.
    const sanitizedText = stripProviderInfo(text);
    return new Response(sanitizedText, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') ||
          'application/json; charset=utf-8',
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const cors = resolveCors(request, env);

    if (request.method === 'OPTIONS') {
      if (!cors.allowed) return new Response(null, { status: 403, headers: corsHeaders(cors) });
      return new Response(null, { status: 204, headers: corsHeaders(cors) });
    }


    // Pretty article URLs:
    // /statya/article-name.html -> /statya/articles/article-name.html
    // Keep only simple .html filenames to avoid path traversal and keep the public
    // URL clean while the physical folder remains separate.
    const articleMatch = url.pathname.match(/^\/statya\/([^/]+\.html)$/i);
    if (request.method === 'GET' && articleMatch) {
      const filename = articleMatch[1];
      if (!filename.includes('..') && !filename.includes('\\')) {
        const targetUrl = new URL(`/statya/articles/${filename}`, request.url);
        const assetRequest = new Request(targetUrl.toString(), request);
        if (env.ASSETS) {
          const articleResponse = await env.ASSETS.fetch(assetRequest);
          if (articleResponse.status !== 404) {
            return articleResponse;
          }
        }
      }
    }

    if (url.pathname === '/statya') {
      const targetUrl = new URL('/statya/', request.url);
      return Response.redirect(targetUrl.toString(), 301);
    }

    if (url.pathname === '/ai/chat') {
      if (!cors.allowed) {
        return withCors(json({ error: 'Origin not allowed' }, 403), cors);
      }
      if (request.method !== 'POST') {
        return withCors(json({ error: 'Method not allowed' }, 405), cors);
      }
      return withCors(await handleChat(request, env, ctx), cors);
    }

    if (url.pathname === '/health') {
      return withCors(json({
        ok: true,
        aiConfigured: Boolean(env.AI_API_KEY && env.AI_BASE_URL && env.AI_MODEL),
        translateConfigured: Boolean(env.TRANSLATE_API_KEY && env.TRANSLATE_BASE_URL && env.TRANSLATE_MODEL),
        sources: [...ALLOWED_SOURCE_HOSTS],
      }), cors);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found. Configure ASSETS binding to serve index.html.', {
      status: 404,
    });
  },
};