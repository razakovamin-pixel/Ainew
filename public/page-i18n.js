/*!
 * page-i18n.js — перевод статичных страниц (список статей и сами статьи)
 * на язык сайта через общий Translator (кэш «оригинал+язык → перевод»).
 *
 *  - Работает для ar/fa. Для ru ничего не делает.
 *  - Переводятся текстовые узлы с кириллицей; арабский текст (цитаты, иснады) не трогается.
 *  - Ленивый перевод: только то, что попало (или скоро попадёт) в экран.
 *  - Разметка (ссылки, жирный, картинки) сохраняется — меняется только текст узлов.
 *  - Оригинал хранится в памяти; кнопка внизу переключает «оригинал / перевод».
 */
(function (global) {
  'use strict';
  var doc = global.document;
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, PRE: 1, SVG: 1 };
  var UI = {
    ar: { orig: 'عرض النص الأصلي', tr: 'عرض الترجمة', busy: 'جارٍ الترجمة…', fail: 'الترجمة غير متاحة — يُعرض النص الأصلي' },
    fa: { orig: 'نمایش متن اصلی', tr: 'نمایش ترجمه', busy: 'در حال ترجمه…', fail: 'ترجمه در دسترس نیست — متن اصلی نمایش داده می‌شود' }
  };
  var CYR = /[\u0400-\u04FF]/;
  var ARB = /[\u0600-\u06FF]/;

  var originals = new WeakMap();     // Text node -> исходная строка
  var translated = new WeakMap();    // Text node -> перевод для текущего языка
  var nodes = [];                    // все переводимые узлы (для переключателя)
  var pending = [];                  // видимые, ждущие перевода
  var timer = null, io = null, showing = 'tr', target = null, btn = null, failed = 0, generation = 0;

  function eligible(n) {
    var v = n.nodeValue;
    if (!v || v.trim().length < 2 || !CYR.test(v) || ARB.test(v)) return false;
    for (var p = n.parentNode; p && p !== doc.body; p = p.parentNode) {
      if (p.nodeType !== 1) continue;
      if (SKIP[p.nodeName.toUpperCase()] || p.hasAttribute('data-no-tr') || (p.getAttribute('lang') === 'ar' || p.getAttribute('lang') === 'fa') || p.isContentEditable) return false;
    }
    return true;
  }

  function collect(root) {
    var w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, out = [];
    while ((n = w.nextNode())) if (eligible(n)) out.push(n);
    return out;
  }

  function flush() {
    timer = null;
    if (!target || !pending.length) return;
    var requestTarget = target;
    var requestGeneration = generation;
    var batch = pending.splice(0, 60);
    var texts = batch.map(function (n) { return originals.get(n); });
    global.Translator.translateMany(texts, requestTarget, {
      shouldStop: function () { return global.SiteLang.current() !== requestTarget; },
      onItem: function (i, tr) {
        if (requestGeneration !== generation || target !== requestTarget) return;
        var n = batch[i];
        translated.set(n, tr);
        if (showing === 'tr') n.nodeValue = tr;
      }
    }).then(function () {
      if (requestGeneration !== generation || target !== requestTarget) return;
      batch.forEach(function (n) { if (!translated.has(n)) failed++; });
      if (failed && btn && !nodes.some(function (n) { return !translated.has(n) && pending.indexOf(n) === -1; }) ) btn.title = (UI[target] || UI.ar).fail;
      if (pending.length) schedule();
    });
  }
  function schedule() { if (!timer) timer = setTimeout(flush, 250); }

  function queue(n) {
    if (translated.has(n) || pending.indexOf(n) !== -1) return;
    // сначала из кэша — мгновенно и без сети
    var c = global.Translator.cached(originals.get(n), target);
    if (c !== null) { translated.set(n, c); if (showing === 'tr') n.nodeValue = c; return; }
    pending.push(n); schedule();
  }

  function observe(list) {
    list.forEach(function (n) {
      if (originals.has(n)) return;
      originals.set(n, n.nodeValue);
      nodes.push(n);
      var el = n.parentNode;
      if (!('IntersectionObserver' in global)) { queue(n); return; }
      if (!el._trNodes) { el._trNodes = []; io.observe(el); }
      el._trNodes.push(n);
    });
  }

  function makeButton() {
    if (btn) return;
    btn = doc.createElement('button');
    btn.type = 'button';
    btn.setAttribute('data-no-tr', '');
    btn.style.cssText = 'position:fixed;bottom:calc(var(--site-bottom-nav-total, 0px) + 16px);inset-inline-start:16px;z-index:9999;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(20,20,22,.92);color:#f4f2ef;font:600 12px Inter,Arial,sans-serif;cursor:pointer;backdrop-filter:blur(8px);';
    btn.addEventListener('click', function () {
      showing = showing === 'tr' ? 'orig' : 'tr';
      nodes.forEach(function (n) {
        if (showing === 'orig') n.nodeValue = originals.get(n);
        else if (translated.has(n)) n.nodeValue = translated.get(n);
      });
      label();
    });
    doc.body.appendChild(btn);
    label();
  }
  function label() { if (btn) btn.textContent = showing === 'tr' ? (UI[target] || UI.ar).orig : (UI[target] || UI.ar).tr; }

  var origTitle = null;

  function resetTranslationState() {
    generation++;
    nodes.forEach(function (n) { if (originals.has(n)) n.nodeValue = originals.get(n); });
    originals = new WeakMap();
    translated = new WeakMap();
    nodes = [];
    pending = [];
    failed = 0;
  }

  function stop() {
    // возврат к языку без перевода (ru): восстановить оригиналы, убрать кнопку
    resetTranslationState();
    if (btn) { btn.remove(); btn = null; }
    target = null;
    if (origTitle !== null) { doc.title = origTitle; }
  }

  function start() {
    var l = global.SiteLang.current();
    if (l !== 'ar' && l !== 'fa') { if (target) stop(); return; }
    if (target && target !== l) resetTranslationState();
    target = l; showing = 'tr';
    if (!io && 'IntersectionObserver' in global) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          (e.target._trNodes || []).forEach(queue);
          e.target._trNodes = null;
        });
      }, { rootMargin: '600px 0px' });
    }
    observe(collect(doc.body));
    // Заголовок вкладки тоже переводим (и восстанавливаем при возврате на ru)
    if (origTitle === null) origTitle = doc.title;
    if (origTitle) {
      var titleTarget = target;
      var titleGeneration = generation;
      global.Translator.translate(origTitle, titleTarget).then(function (t) {
        if (target === titleTarget && generation === titleGeneration && t) doc.title = t;
      }).catch(function () {});
    }
    makeButton();
    // узлы, которые уже были наблюдаемы до смены языка, но не переведены
    nodes.forEach(function (n) { if (!translated.has(n) && n.parentNode && n.parentNode._trNodes === undefined) queue(n); });
    label();
  }

  global.PageI18n = {
    // seed: { 'Статьи': 'المقالات', ... } — фиксированный перевод без API
    init: function (seed) {
      if (seed && seed.ar) global.Translator.seed(seed.ar, 'ar');
      if (seed && seed.fa) global.Translator.seed(seed.fa, 'fa');
      var go = function () { start(); };
      if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', go); else go();
      global.addEventListener('sitelangchange', function () {
        var lang = global.SiteLang.current();
        if (lang === 'ru') { stop(); return; }
        start();
      });
    }
  };
})(window);
