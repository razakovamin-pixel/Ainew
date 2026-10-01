/*!
 * translator.js — единый модуль перевода для всего сайта.
 *
 *   Translator.translate(text, targetLang, opts)        -> Promise<string>
 *   Translator.translateMany(texts[], targetLang, opts) -> Promise<string[]>
 *   Translator.cached(text, targetLang)                 -> string | null   (синхронно)
 *
 * Правила:
 *  - Перевод идёт ТОЛЬКО через воркер: POST /ai/chat с заголовком X-Translate: 1.
 *    Воркер использует ОТДЕЛЬНЫЕ TRANSLATE_BASE_URL / TRANSLATE_MODEL /
 *    TRANSLATE_API_KEY (см. wrangler.toml). Ключей на клиенте нет.
 *  - Кэш: «исходный текст + целевой язык → перевод» в localStorage
 *    (ключ 'rijal_tr_cache_v1'). Повторно один и тот же текст в API не уходит.
 *  - Одинаковые запросы, выполняемые одновременно, объединяются.
 *  - При любой ошибке возвращается ИСХОДНЫЙ текст (оригинал не теряется),
 *    а ошибка не кэшируется.
 */
(function (global) {
  'use strict';

  var CACHE_KEY = 'rijal_tr_cache_v1';
  var MAX_ENTRIES = 3000;          // ограничение размера localStorage
  var BATCH_SIZE = 12;             // текстов в одном запросе
  var BATCH_CHARS = 7000;          // и не более стольких символов
  var TIMEOUT_MS = 55000;
  var LANG_NAMES = {
    ar: 'Arabic (Modern Standard, with correct Shia/Islamic terminology)',
    fa: 'Persian (Farsi), with accurate Shia/Islamic terminology',
    ru: 'Russian'
  };
  var SUPPORTED_TARGETS = { ar: 1, fa: 1, ru: 1 };

  var cache = {};
  var order = [];
  try {
    var raw = JSON.parse(global.localStorage.getItem(CACHE_KEY) || '{}');
    cache = raw.m || {};
    order = raw.o || Object.keys(cache);
  } catch (e) { cache = {}; order = []; }

  var saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      while (order.length > MAX_ENTRIES) delete cache[order.shift()];
      try {
        global.localStorage.setItem(CACHE_KEY, JSON.stringify({ m: cache, o: order }));
      } catch (e) {
        // переполнение хранилища — выбрасываем старую половину и пробуем ещё раз
        var drop = Math.floor(order.length / 2);
        for (var i = 0; i < drop; i++) delete cache[order.shift()];
        try { global.localStorage.setItem(CACHE_KEY, JSON.stringify({ m: cache, o: order })); } catch (e2) {}
      }
    }, 400);
  }

  // Два независимых 32-битных хеша + длина → ключ почти без коллизий.
  function hash(str) {
    var h1 = 0x811c9dc5, h2 = 5381;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 ^= c; h1 = Math.imul(h1, 16777619);
      h2 = (Math.imul(h2, 33) + c) | 0;
    }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + '.' + str.length;
  }
  function keyOf(text, lang) { return lang + '|' + hash(text); }

  function cached(text, lang) {
    var v = cache[keyOf(String(text || ''), lang)];
    return v === undefined ? null : v;
  }
  function put(text, lang, translation) {
    var k = keyOf(text, lang);
    if (cache[k] === undefined) order.push(k);
    cache[k] = translation;
    scheduleSave();
  }

  var inflight = {};   // key -> Promise<string|null>

  function extractText(data) {
    return (data && data.content && data.content[0] && data.content[0].text) ||
      (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  }

  function parseJsonArray(raw) {
    var s = String(raw || '').replace(/```json|```/g, '').trim();
    var a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a === -1 || b === -1) throw new Error('no JSON array');
    return JSON.parse(s.slice(a, b + 1));
  }

  async function requestBatch(items, lang) {
    var list = JSON.stringify(items.map(function (t, i) { return { id: i + 1, text: t }; }));
    var prompt =
      'You are a professional translator of Islamic texts (hadith and rijal). ' +
      'Translate every "text" value into ' + (LANG_NAMES[lang] || lang) + '. ' +
      'Keep names of the Imams, narrators and books accurate and use the standard spelling of the target language. ' +
      'Do not add comments, do not shorten, do not merge items. ' +
      'Reply with ONLY a JSON array of the same length: [{"id":1,"text":"..."}, ...].\n\n' + list;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    try {
      var res = await fetch('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Translate': '1' },
        signal: controller.signal,
        body: JSON.stringify({ max_tokens: 4000, temperature: 0.2, messages: [{ role: 'user', content: prompt }] })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var arr = parseJsonArray(extractText(await res.json()));
      var out = new Array(items.length).fill(null);
      arr.forEach(function (it) {
        var idx = (it && it.id) - 1;
        if (idx >= 0 && idx < items.length && typeof it.text === 'string' && it.text.trim()) out[idx] = it.text.trim();
      });
      return out;
    } finally {
      clearTimeout(timer);
    }
  }

  async function translateMany(texts, lang, opts) {
    texts = (texts || []).map(function (t) { return String(t == null ? '' : t); });
    var result = texts.slice();                        // по умолчанию — оригинал
    if (!lang || !SUPPORTED_TARGETS[lang]) return result;
    var onItem = opts && opts.onItem;

    var maxBatch = (opts && opts.batchSize) || BATCH_SIZE;
    var todo = [];                                     // { idx, text }
    var seen = {};                                     // дедупликация внутри вызова
    texts.forEach(function (t, i) {
      if (!t.trim()) return;
      var c = cached(t, lang);
      if (c !== null) { result[i] = c; if (onItem) onItem(i, c, true); return; }
      todo.push({ idx: i, text: t });
    });
    if (!todo.length) return result;

    // формируем пакеты
    var batches = [], cur = [], chars = 0;
    todo.forEach(function (it) {
      if (cur.length >= maxBatch || (chars + it.text.length > BATCH_CHARS && cur.length)) {
        batches.push(cur); cur = []; chars = 0;
      }
      cur.push(it); chars += it.text.length;
    });
    if (cur.length) batches.push(cur);

    for (var b = 0; b < batches.length; b++) {
      if (opts && opts.shouldStop && opts.shouldStop()) break;
      var batch = batches[b];
      // уникальные тексты пакета, которые ещё не переводятся в другом вызове
      var uniq = [], waits = [];
      batch.forEach(function (it) {
        var k = keyOf(it.text, lang);
        if (inflight[k]) { waits.push({ it: it, p: inflight[k] }); return; }
        if (seen[k]) { seen[k].push(it); return; }
        seen[k] = [it]; uniq.push(it);
      });
      if (uniq.length) {
        var p = requestBatch(uniq.map(function (u) { return u.text; }), lang).catch(function (e) {
          console.warn('Translator: batch failed:', e && e.message ? e.message : e);
          return null;
        });
        uniq.forEach(function (u, j) {
          inflight[keyOf(u.text, lang)] = p.then(function (arr) { return arr ? arr[j] : null; });
        });
        var arr = await p;
        uniq.forEach(function (u, j) {
          var k = keyOf(u.text, lang);
          delete inflight[k];
          var tr = arr ? arr[j] : null;
          if (tr) put(u.text, lang, tr);
          (seen[k] || [u]).forEach(function (it) {
            if (tr) { result[it.idx] = tr; if (onItem) onItem(it.idx, tr, false); }
          });
        });
      }
      for (var w = 0; w < waits.length; w++) {
        var tr2 = await waits[w].p;
        if (tr2) { result[waits[w].it.idx] = tr2; if (onItem) onItem(waits[w].it.idx, tr2, false); }
      }
    }
    return result;
  }

  async function translate(text, lang, opts) {
    return (await translateMany([text], lang, opts))[0];
  }


  // Ленивый перевод элементов [data-tr] внутри root: переводятся только те,
  // что попали (или скоро попадут) на экран — длинный список глав не порождает
  // десятки запросов сразу. Оригинал в data-tr не меняется.
  //   opts.shouldStop()      -> true, если перевод уже не нужен (сменилась страница/язык)
  //   opts.onItem(node, tr)  -> вызывается после подстановки перевода
  //   opts.onFail(node)      -> перевод не получен (остаётся оригинал)
  function fillLazy(root, lang, opts) {
    opts = opts || {};
    var nodes = Array.prototype.slice.call(root.querySelectorAll('[data-tr]'));
    if (!nodes.length || !lang || !SUPPORTED_TARGETS[lang]) return;
    var queue = [], timer = null, io = null;
    function run() {
      timer = null;
      if (opts.shouldStop && opts.shouldStop()) { if (io) io.disconnect(); return; }
      var batch = queue.splice(0, 40);
      if (!batch.length) return;
      var texts = batch.map(function (n) { return n.getAttribute('data-tr'); });
      translateMany(texts, lang, {
        batchSize: 40,
        shouldStop: opts.shouldStop,
        onItem: function (i, tr) {
          var n = batch[i];
          if (!n || !global.document.body.contains(n)) return;
          n.textContent = tr; n.classList.remove('hd-loading');
          if (opts.onItem) opts.onItem(n, tr);
        }
      }).then(function (res) {
        batch.forEach(function (n, i) {
          if (res[i] === texts[i] && cached(texts[i], lang) === null && global.document.body.contains(n) && opts.onFail) opts.onFail(n);
        });
      });
      if (queue.length) timer = setTimeout(run, 50);
    }
    function enqueue(n) { queue.push(n); if (!timer) timer = setTimeout(run, 150); }
    if (!('IntersectionObserver' in global)) { nodes.forEach(enqueue); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); enqueue(e.target); } });
    }, { rootMargin: '500px 0px' });
    nodes.forEach(function (n) { io.observe(n); });
  }

  global.Translator = {
    translate: translate,
    translateMany: translateMany,
    fillLazy: fillLazy,
    cached: cached,
    // Ручной перевод фиксированных строк интерфейса (без обращения к API)
    seed: function (map, lang) { Object.keys(map).forEach(function (k) { if (cached(k, lang) === null) put(k, lang, map[k]); }); },
    clearCache: function () { cache = {}; order = []; try { global.localStorage.removeItem(CACHE_KEY); } catch (e) {} }
  };
})(window);
