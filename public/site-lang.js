/*!
 * site-lang.js — ЕДИНЫЙ источник истины для языка сайта.
 *
 * Подключается ПЕРВЫМ скриптом (синхронно, в <head>) на каждой странице:
 * главная, /hadis, /statya. Других реализаций SiteLang (inline-копий)
 * в проекте быть не должно.
 *
 * Поддерживаются три языка: ru, ar и fa.
 * Ключ localStorage: 'rijal_lang'. Если там лежит устаревшее значение
 * (az / en или любой мусор) — оно автоматически заменяется на 'ru'.
 *
 *   SiteLang.get()          -> 'ru' | 'ar' | 'fa' | null (null = язык ещё не выбирали)
 *   SiteLang.current()      -> то же, но с запасным значением 'ru'
 *   SiteLang.set('ar' | 'fa')      -> сохраняет, ставит <html lang dir>, шлёт событие
 *   SiteLang.isRTL(l)       -> true для ar и fa
 *   SiteLang.t(dict, key)   -> строка из словаря {ru:{}, ar:{}} с запасным ru
 *   window 'sitelangchange' -> CustomEvent, detail = { lang }
 */
(function (global) {
  'use strict';
  if (global.SiteLang && global.SiteLang.__single) return;

  var KEY = 'rijal_lang';
  var SUPPORTED = ['ru', 'ar', 'fa'];
  var RTL = { ar: true, fa: true };

  function isSupported(v) { return SUPPORTED.indexOf(v) !== -1; }

  // Читает сохранённый язык. Неизвестное значение заменяется на 'ru'
  // прямо в localStorage, чтобы оно больше нигде не всплывало.
  function read() {
    try {
      var v = global.localStorage.getItem(KEY);
      if (v === null || v === undefined || v === '') return null;
      if (isSupported(v)) return v;
      global.localStorage.setItem(KEY, 'ru');
      return 'ru';
    } catch (e) { return null; }
  }

  function isRTL(l) { return !!RTL[l]; }

  function applyToDocument(l) {
    var de = global.document && global.document.documentElement;
    if (!de) return;
    de.lang = l;
    de.dir = isRTL(l) ? 'rtl' : 'ltr';
  }

  function emit(l) {
    try { global.dispatchEvent(new CustomEvent('sitelangchange', { detail: { lang: l } })); } catch (e) {}
  }

  var api = {
    __single: true,
    SUPPORTED: SUPPORTED,
    KEY: KEY,
    get: read,
    current: function () { return read() || 'ru'; },
    isRTL: isRTL,
    apply: applyToDocument,
    set: function (l) {
      if (!isSupported(l)) return false;
      try { global.localStorage.setItem(KEY, l); } catch (e) {}
      applyToDocument(l);
      emit(l);
      return true;
    },
    t: function (dict, key) {
      var l = api.current();
      var d = dict && (dict[l] || dict.ru);
      if (d && d[key] !== undefined) return d[key];
      return dict && dict.ru && dict.ru[key] !== undefined ? dict.ru[key] : key;
    }
  };
  global.SiteLang = api;

  // Общая кнопка языка для страниц, где своей кнопки нет (статьи, /statya).
  // На главной (#btnLang / #langGate) и в /hadis (#langBtn) свои кнопки — там не монтируется.
  function mountToggle() {
    var d = global.document;
    if (!d || !d.body) return;
    if (d.getElementById('btnLang') || d.getElementById('langBtn') || d.getElementById('langGate') || d.getElementById('siteLangToggle')) return;
    var b = d.createElement('button');
    b.id = 'siteLangToggle';
    b.type = 'button';
    b.setAttribute('aria-label', 'Language / اللغة');
    b.style.cssText = 'position:fixed;top:12px;inset-inline-end:12px;z-index:9999;min-width:44px;height:36px;padding:0 12px;' +
      'border-radius:10px;border:1px solid rgba(128,128,128,.5);background:rgba(20,20,24,.92);color:#f2f2f2;' +
      'font:600 13px system-ui,sans-serif;cursor:pointer;';
    function label() {
      var l = api.current();
      b.textContent = l === 'ru' ? 'RU → AR' : (l === 'ar' ? 'AR → FA' : 'FA → RU');
    }
    b.addEventListener('click', function () {
      var l = api.current();
      api.set(l === 'ru' ? 'ar' : (l === 'ar' ? 'fa' : 'ru'));
    });
    global.addEventListener('sitelangchange', label);
    label();
    d.body.appendChild(b);
  }
  if (global.document) {
    if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', mountToggle);
    else mountToggle();
  }

  // Синхронно, до отрисовки: применяем сохранённый язык (без «вспышки»).
  applyToDocument(read() || 'ru');

  // Другая вкладка сменила язык — подхватываем.
  global.addEventListener('storage', function (e) {
    if (e.key === KEY) {
      var l = read();
      if (l) { applyToDocument(l); emit(l); }
    }
  });
})(window);
