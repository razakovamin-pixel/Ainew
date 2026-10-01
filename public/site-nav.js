/*
 * site-nav.js — общая нижняя навигация для вторичных страниц.
 *
 * Главная страница и /hadis/ уже имеют собственные контекстные панели.
 * Для /statya/ и отдельных статей этот файл монтирует единый минимальный
 * навбар из трёх основных разделов сайта: Передатчики, Хадисы, Статьи.
 * Состояние языка берётся только из SiteLang.
 */
(function (global) {
  'use strict';
  if (global.SiteNav && global.SiteNav.__single) return;

  var NAV_ID = 'siteBottomNav';
  var SPACER_ID = 'siteBottomNavSpacer';
  var STYLE_ID = 'siteBottomNavStyles';
  var HEIGHT = '72px';

  var LABELS = {
    ru: { rijal: 'Передатчики', hadis: 'Хадисы', statya: 'Статьи' },
    ar: { rijal: 'الرواة', hadis: 'الأحاديث', statya: 'المقالات' },
    fa: { rijal: 'راویان', hadis: 'احادیث', statya: 'مقالات' }
  };

  function currentLang() {
    return global.SiteLang ? global.SiteLang.current() : 'ru';
  }

  function icon(kind) {
    if (kind === 'rijal') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c.6-3.5 2.6-5.5 6-5.5s5.4 2 6 5.5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M15.5 14.8c2.9.4 4.6 2 5.5 5.2"/></svg>';
    if (kind === 'hadis') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5v13"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h13a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 4v14a2 2 0 0 0 2 2M8 8h8M8 12h8M8 16h5"/></svg>';
  }

  function style() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .site-bottom-nav-spacer {
        height: calc(var(--bottom-nav-height, ${HEIGHT}) + env(safe-area-inset-bottom, 0px));
        width: 100%;
      }
      .site-bottom-nav {
        position: fixed;
        left: 0; right: 0; bottom: 0;
        z-index: 4000;
        height: calc(var(--bottom-nav-height, ${HEIGHT}) + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: rgba(9, 10, 10, .97);
        border-top: 1px solid rgba(255,255,255,.09);
        box-shadow: 0 -8px 28px rgba(0,0,0,.28);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }
      .site-bottom-nav-inner {
        width: min(100%, 720px);
        height: var(--bottom-nav-height, ${HEIGHT});
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .site-bottom-nav a {
        min-width: 0;
        height: var(--bottom-nav-height, ${HEIGHT});
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 6px 4px 5px;
        color: #858585;
        text-decoration: none;
        font: 500 12px/1.15 Inter, Arial, sans-serif;
        white-space: nowrap;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
      }
      .site-bottom-nav a:hover,
      .site-bottom-nav a:focus-visible { color: #b1b1b1; }
      .site-bottom-nav a[aria-current="page"] { color: #e21b30; }
      .site-bottom-nav svg {
        width: 29px; height: 29px; flex: 0 0 29px;
        fill: none; stroke: currentColor; stroke-width: 1.8;
        stroke-linecap: round; stroke-linejoin: round;
      }
      .site-bottom-nav a[aria-current="page"] svg { filter: drop-shadow(0 0 5px rgba(226,27,48,.16)); }
      .site-bottom-nav span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
      html[lang="ar"] .site-bottom-nav a,
      html[lang="fa"] .site-bottom-nav a { font-family: 'Noto Naskh Arabic', Inter, Arial, sans-serif; }
      @media (max-width: 380px) {
        .site-bottom-nav a { font-size: 11px; gap: 4px; }
        .site-bottom-nav svg { width: 27px; height: 27px; flex-basis: 27px; }
      }
    `;
    document.head.appendChild(s);
  }

  function activeKind() {
    var p = global.location && global.location.pathname || '/';
    if (p.indexOf('/hadis/') === 0) return 'hadis';
    if (p.indexOf('/statya/') === 0) return 'statya';
    return 'rijal';
  }

  function mount() {
    if (!document.body || document.getElementById(NAV_ID)) return;
    var root = document.createElement('nav');
    root.className = 'site-bottom-nav';
    root.id = NAV_ID;
    root.setAttribute('aria-label', 'Основные разделы сайта');

    var inner = document.createElement('div');
    inner.className = 'site-bottom-nav-inner';
    root.appendChild(inner);

    var active = activeKind();
    var defs = [
      ['rijal', '/', 'Передатчики'],
      ['hadis', '/hadis/', 'Хадисы'],
      ['statya', '/statya/', 'Статьи']
    ];

    defs.forEach(function (def) {
      var a = document.createElement('a');
      a.href = def[1];
      a.dataset.navKey = def[0];
      if (def[0] === active) a.setAttribute('aria-current', 'page');
      a.innerHTML = icon(def[0]) + '<span></span>';
      inner.appendChild(a);
    });

    var spacer = document.createElement('div');
    spacer.id = SPACER_ID;
    spacer.className = 'site-bottom-nav-spacer';
    document.body.appendChild(spacer);
    document.body.appendChild(root);
    document.body.classList.add('has-site-bottom-nav');
    document.documentElement.style.setProperty('--site-bottom-nav-total', 'calc(var(--bottom-nav-height, ' + HEIGHT + ') + env(safe-area-inset-bottom, 0px))');
    update();
  }

  function update() {
    var nav = document.getElementById(NAV_ID);
    if (!nav) return;
    var lang = currentLang();
    var labels = LABELS[lang] || LABELS.ru;
    nav.setAttribute('aria-label', labels.rijal + ' · ' + labels.hadis + ' · ' + labels.statya);
    nav.querySelectorAll('a[data-nav-key]').forEach(function (a) {
      var key = a.dataset.navKey;
      var span = a.querySelector('span');
      if (span) span.textContent = labels[key] || LABELS.ru[key];
    });
  }

  global.SiteNav = {
    __single: true,
    mount: mount,
    update: update
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  global.addEventListener('sitelangchange', update);
})(window);
