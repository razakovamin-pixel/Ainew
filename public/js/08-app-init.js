// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
async function init() {
  loadНастройки();
  applyLang();
  const loadingEl = $('loading');
  if (loadingEl) loadingEl.style.display = 'flex';

  // Порядок: оболочка → корневой манифест → метаданные → первый компактный
  // индексный сегмент. Подробные записи загружаются только при открытии карточки,
  // поиске по полным текстам, либо явном запросе всех подробностей.
  try {
    const manifest = await loadDataManifest();
    state.chunkMeta = await fetchJsonRetry(manifestResourceUrl('transmittersMeta', 'transmitters/meta.json'), 3);
    const indexLoaded = await loadTransmitterIndex();
    // Совместимый резервный режим, если компактный индекс недоступен.
    if (!indexLoaded && !await loadTransmitterChunk(0)) {
      throw new Error('both compact index and first detail chunk are unavailable');
    }
  } catch (e) {
    console.error('Failed to load transmitters:', e);
    const el = $('loading');
    if (el) {
      el.innerHTML = '<div style="color:#fb7185;font-size:14px;text-align:center;padding:20px"></div>';
      const box = el.firstChild;
      box.textContent = t('loadFailed');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = t('retryLabel');
      btn.style.cssText = 'display:block;margin:14px auto 0;padding:8px 16px;border-radius:10px;border:1px solid #475569;background:transparent;color:inherit;cursor:pointer;font:inherit;';
      btn.addEventListener('click', () => location.reload());
      box.appendChild(btn);
    }
    return;
  }

  renderСписок();
  updateStats();

  // Остальные чанки НЕ качаем на первом экране. Они подгружаются по мере прокрутки
  // или целиком только для действий, которым нужна вся база.
  state.transmittersReadyPromise = Promise.resolve();

  // Hide loading
  const loadingHideEl = $('loading');
  if (loadingHideEl) {
    loadingHideEl.classList.add('hidden');
    setTimeout(() => {
      loadingHideEl.style.display = 'none';
      document.body.classList.remove('app-intro');
    }, 280);
  }

  // Ensure welcome is visible before restoring a selection
  setDetailOpen(false);

  // Восстановление последней карточки — по реальному id. Если её чанк ещё не
  // загружен, грузим именно этот чанк (приоритетно), а не ждём всю базу.
  try {
    const storedLastId = parseInt(localStorage.getItem('rijal_lastId'));
    const lastId = normalizeId(storedLastId);
    if (!isNaN(lastId)) {
      ensureTransmitterLoaded(lastId).then(tx => {
        if (tx && state.activeId === null) selectTransmitter(lastId);
      }).catch(() => {});
    }
  } catch(e) {}

  // Init mobile tabs
  if (window.innerWidth <= 768) {
    $('sidebar').classList.add('tab-active');
    $('content').classList.remove('tab-active');
  }

  initEvents();
  initNewPanelEvents();
  initExtras();

  // Виртуальный скроллинг: перерисовываем видимое окно при скролле и resize
  const txViewport = $('txListViewport');
  if (txViewport) {
    txViewport.addEventListener('scroll', onTxListScroll, { passive: true });
  }
  let _resizeDebounce = null;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeDebounce);
    _resizeDebounce = setTimeout(() => renderVisibleSlice(true), 150);
  });
}

// ═══════════════════════════════════════
// EXTRA FEATURES
// ═══════════════════════════════════════
function initExtras() {
  // ── Collapse filters button ──────────────────────────────────
  // Состояние свёрнутости — общее (state.filtersCollapsed), а не локальная
  // переменная: подпись кнопки обновляется и из applyLang() при смене языка.
  applyFiltersCollapsed();
  $('btnCollapseFilters').addEventListener('click', () => {
    state.filtersCollapsed = !state.filtersCollapsed;
    applyFiltersCollapsed();
    try { localStorage.setItem('rijal_filters_collapsed', state.filtersCollapsed ? '1' : '0'); } catch(e) {}
  });

  // ── Theme toggle ──────────────────────────────────────────────

  // ── Epoch filter ─────────────────────────────────────────────
  document.querySelectorAll('.epoch-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.epoch = chip.dataset.epoch;
      document.querySelectorAll('.epoch-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderСписок();
    });
  });

  // ── Sect filter ──────────────────────────────────────────────
  document.querySelectorAll('.sect-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.sect = chip.dataset.sect;
      document.querySelectorAll('.sect-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderСписок();
    });
  });

  // ── Copy card ────────────────────────────────────────────────
  $('btnCopyCard').addEventListener('click', () => {
    if (state.activeId === null) return;
    const tx = getTx(state.activeId);
    if (!tx) return;
    const text = [
      `${tx.name} (${tx.arabicName || ''})`,
      t('cardRecord', tx.id + 1),
      ``,
      `${t('cardShia')}: ${tx.shiaStatus}`,
      `${t('cardSunni')}: ${tx.sunniStatus}`,
      ``,
      tx.bio ? `${t('cardBio')}: ${tx.bio}` : '',
      tx.analysis ? `Анализ: ${tx.analysis.replace(/<[^>]+>/g, '')}` : '',
      (getSourcesArray(tx).length) ? `${t('cardSources')}: ${getSourcesArray(tx).join(', ')}` : ''
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => toast(t('cardCopied'))).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); toast(t('copied'));
    });
  });


  // Escape closes any panel
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closePanel('sortPanel');
    }
  });
}

function closePanel(id) { $(id).classList.remove('open'); }
function openPanelEl(id) { $(id).classList.add('open'); }

// ═══════════════════════════════════════════════════════════════
// ══ NEW FEATURES ════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ── Reliability score calculation ─────────────────────────────
function calcScore(tx) {
  if (tx.score !== undefined) return tx.score;
  let score = 50;
  const shia = classifyStatusStyle(tx.shiaStatusStyle);
  const sunni = classifyStatusStyle(tx.sunniStatusStyle);
  if (shia === 'trust') score += 20;
  else if (shia === 'disputed') score += 5;
  else if (shia === 'weak') score -= 15;
  // unknown: не занижаем и не завышаем — данных нет.
  if (sunni === 'trust') score += 20;
  else if (sunni === 'disputed') score += 5;
  else if (sunni === 'weak') score -= 15;
  // unknown: без изменений — оценка неизвестна, программа её не придумывает.
  const srcCount = sourcesCount(tx);
  score += Math.min(srcCount * 3, 15);
  // Agree bonus
  if (shia === 'trust' && sunni === 'trust') score += 10;
  return Math.max(0, Math.min(100, score));
}

function scoreColor(s) {
  if (s >= 80) return '#34d399';
  if (s >= 55) return '#fbbf24';
  return '#fb7185';
}

// ── Show score in detail view ──────────────────────────────────
function updateDetailScore(tx) {
  const score = calcScore(tx);
  const badge = $('detScoreBadge');
  const fill = $('detScoreFill');
  const val = $('detScoreVal');
  badge.style.display = '';
  fill.style.width = score + '%';
  fill.style.background = scoreColor(score);
  val.textContent = score;
  val.style.color = scoreColor(score);
}


// ── Attach panel events ────────────────────────────────────
function initNewPanelEvents() {
  // Sort panel
  $('btnSort').addEventListener('click', openSort);
  $('sortClose').addEventListener('click', () => closePanel('sortPanel'));
  $('sortPanel').addEventListener('click', e => { if (e.target === $('sortPanel')) closePanel('sortPanel'); });
  document.querySelectorAll('.sort-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sortMode = btn.dataset.sort;
      document.querySelectorAll('.sort-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderСписок();
      closePanel('sortPanel');
      toast(t('sortApplied'));
    });
  });

  // Scroll-to-top
  $('content').addEventListener('scroll', () => {
    const scrollY = $('content').scrollTop;
    $('btnScrollTop').classList.toggle('visible', scrollY > 300);
    // Reading progress
    const total = $('content').scrollHeight - $('content').clientHeight;
    const pct = total > 0 ? (scrollY / total * 100).toFixed(1) : 0;
    $('readingProgress').style.width = pct + '%';
  });
  $('btnScrollTop').addEventListener('click', () => {
    $('content').scrollTo({ top: 0, behavior: 'smooth' });
  });
}


// ═══════════════════════════════════════
// SORT
// ═══════════════════════════════════════
function openSort() {
  openPanelEl('sortPanel');
}


// ─────────────────────────────────────────────────────────────────
// Service Worker: обычный статический файл /service-worker.js (без Blob URL).
function registerRijalServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('service-worker.js').catch((e) => {
    console.warn('Service worker registration failed:', e && e.message ? e.message : e);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', registerRijalServiceWorker, { once: true });
} else {
  registerRijalServiceWorker();
}

// Доступ к внутренней логике для автоматизированных тестов (tests/dom.test.mjs).
// На поведение сайта не влияет: браузерные пользователи этот объект не видят.
window.__rijalTest = {
  state,
  getTx,
  getRow,
  toViewModel,
  normalizeSearchText,
  computeFiltered,
  ensureDeepData,
  deepChunksLeft,
  loadTransmitterIndex,
  loadTransmitterChunk,
  ensureTransmitterLoaded,
  ensureFullTx,
  selectTransmitter,
  toggleFavorite,
  rebuildRows,
  calcScore,
  sourcesCount,
  renderСписок,
  updateStats
};

document.addEventListener('DOMContentLoaded', () => {
  // Русский интерфейс используется по умолчанию. Не показываем отдельный
  // экран подтверждения языка: сразу запускаем приложение при первом входе.
  document.body.classList.remove('app-intro');
  init().catch(err => {
    console.error('Init failed:', err);
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    // Ошибка загрузки данных не должна оставлять интерфейс скрытым.
    document.body.classList.remove('app-intro');
  });
});

// ═══════════════════════════════════════
// EXTRA ANIMATIONS + LANGUAGE / EXTRA ENHANCEMENTS
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try {
    // lang управляется через loadНастройки

    // Subtle pointer-driven glow
    const setPointer = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.body.style.setProperty('--mx', x + '%');
      document.body.style.setProperty('--my', y + '%');
    };
    window.addEventListener('pointermove', setPointer, { passive: true });

    // Floating particles
    let fx = document.getElementById('fxLayer');
    if (!fx) {
      fx = document.createElement('div');
      fx.id = 'fxLayer';
      document.body.appendChild(fx);
    }
    fx.innerHTML = '';
    const count = window.innerWidth < 768 ? 10 : 22;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'fx-particle';
      const size = 2 + Math.random() * 6;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.top = (Math.random() * 100) + 'vh';
      p.style.animationDuration = (10 + Math.random() * 14) + 's';
      p.style.animationDelay = (-Math.random() * 14) + 's';
      p.style.setProperty('--drift', ((Math.random() * 2 - 1) * 120) + 'px');
      p.style.opacity = (0.15 + Math.random() * 0.45).toFixed(2);
      fx.appendChild(p);
    }

    // Animate main sections sequentially
    const animateSeq = [
      '.sidebar-top', '.stats-bar', '.transmitter-list', '.detail', '.welcome', '.panel-box'
    ];
    animateSeq.forEach((sel, idx) => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.animationDelay = (idx * 0.05) + 's';
      });
    });

    // Slight parallax on header, throttled for smoother scrolling
    const header = document.querySelector('.app-header');
    if (header && window.matchMedia('(pointer:fine)').matches) {
      let raf = 0;
      let latestX = 0;
      window.addEventListener('pointermove', (e) => {
        latestX = e.clientX;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const dx = ((latestX / window.innerWidth) - 0.5) * 8;
          header.style.transform = `translate3d(${dx * 0.08}px,0,0)`;
          raf = 0;
        });
      }, { passive: true });
    }
  } catch (e) {
    console.warn('Animation init failed', e);
  }
});

