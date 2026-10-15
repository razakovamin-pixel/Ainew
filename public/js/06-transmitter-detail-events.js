// ═══════════════════════════════════════
// SELECT TRANSMITTER
// ═══════════════════════════════════════
function selectTransmitter(id) {
  id = normalizeId(id);
  state.activeId = id;

  // Highlight active in currently-rendered (visible) items
  $('txСписок').querySelectorAll('.tx-item').forEach(el => {
    const selected = parseInt(el.dataset.id) === id;
    el.classList.toggle('active', selected);
    el.setAttribute('aria-selected', selected);
  });

  // On mobile, switch to detail tab
  if (window.innerWidth <= 768 && typeof switchTab === 'function') {
    switchTab('detail');
  }

  renderDetail(id);
  saveНастройки();
}

// Одноразовая чистка устаревших ключей от предыдущих версий сайта.
// Удаляются ТОЛЬКО конкретные ключи (история удалённого ИИ-чата и старый кэш
// перевода интерфейса); избранное, настройки, язык и последняя карточка не трогаются.
(function cleanupObsoleteKeys() {
  var OBSOLETE_KEYS = ['rijal_ai_chat_v1', 'rijal_trans_cache_v3'];
  try {
    OBSOLETE_KEYS.forEach(function (key) {
      if (localStorage.getItem(key) !== null) localStorage.removeItem(key);
    });
  } catch (e) {}
})();

// ── Skeleton loader ─────────────────────────────────────────────
function showSkeleton() {
  const skEl = (n) => `<span style="display:inline-block;background:var(--ink-3);border-radius:4px;height:1em;width:${n}px;animation:skPulse 1.2s ease-in-out infinite;"></span>`;
  if (!document.getElementById('skStyle')) {
    const st = document.createElement('style');
    st.id = 'skStyle';
    st.textContent = '@keyframes skPulse{0%,100%{opacity:.4}50%{opacity:.9}}';
    document.head.appendChild(st);
  }
  $('detBio').innerHTML = [200,160,180].map(w=>skEl(w)).join(' ');
  $('detAnalysis').innerHTML = [240,200,220,180,200].map(w=>skEl(w)).join(' ');
  $('scShiaText').innerHTML = skEl(120);
  $('scSunniText').innerHTML = skEl(120);
  const srcСписок = $('detSources');
  srcСписок.innerHTML = '';
  [160,140].forEach(w => {
    const li = document.createElement('li');
    li.className = 'src-item';
    li.innerHTML = skEl(w);
    srcСписок.appendChild(li);
  });
}

// ── Fill detail DOM ─────────────────────────────────────────────
function fillDetail(tx) {
  // Лёгкая запись без биографии: подробные секции не заполняем — их
  // покажет скелетон, а данные придут после догрузки чанка.
  if (tx._light) return;
  const shiaCat = classifyStatusStyle(tx.shiaStatusStyle);
  const sunniCat = classifyStatusStyle(tx.sunniStatusStyle);

  function dotClass(cat) {
    if (cat === 'trust') return 'dot-trust';
    if (cat === 'disputed') return 'dot-disputed';
    if (cat === 'weak') return 'dot-weak';
    return 'dot-unknown';
  }
  function valClass(cat) {
    if (cat === 'trust') return 'trust';
    if (cat === 'disputed') return 'disputed';
    if (cat === 'weak') return 'weak';
    return 'unknown';
  }

  $('scShiaDot').className = `sc-dot ${dotClass(shiaCat)}`;
  $('scSunniDot').className = `sc-dot ${dotClass(sunniCat)}`;
  $('scShiaVal').className = `sc-value ${valClass(shiaCat)}`;
  $('scSunniVal').className = `sc-value ${valClass(sunniCat)}`;

  const shiaStatus = tx.shiaStatus || '';
  const sunniStatus = tx.sunniStatus || '';
  const bio = tx.bio || '';
  const analysis = tx.analysis || '';
  const sources = getSourcesArray(tx);

  $('scShiaText').textContent = shiaStatus;
  $('scSunniText').textContent = sunniStatus;

  // Bio
  const bioEl = $('detBio');
  bioEl.textContent = bio;

  // Оригинальная арабская биография (дословный текст источника), если есть.
  const ob = String(tx.originalBio || '').trim();
  const obSection = $('originalBioSection');
  const obEl = $('detOriginalBio');
  if (obSection && obEl) {
    if (ob) {
      obEl.textContent = ob;
      obSection.style.display = '';
    } else {
      obSection.style.display = 'none';
    }
  }

  // Analysis. В текстах встречается разметка <strong>…</strong>: экранируем всё,
  // кроме этого разрешённого тега, чтобы акценты отображались, а не выводились
  // литерально как «<strong>» (дефект показа старых данных).
  if (analysis && analysis.trim()) {
    const analysisEl = $('detAnalysis');
    analysisEl.innerHTML = String(analysis)
      .replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
      .replace(/&lt;(\/?)strong&gt;/gi, (m, close) => `<${close}b>`);
    $('analysisSection').style.display = '';
  } else {
    $('analysisSection').style.display = 'none';
  }

  // Sources
  const srcСписок = $('detSources');
  srcСписок.innerHTML = '';
  if (sources.length) {
    sources.forEach(s => {
      const li = document.createElement('li');
      li.className = 'src-item';
      li.textContent = s;
      srcСписок.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.className = 'src-item';
    li.textContent = t('noSources');
    srcСписок.appendChild(li);
  }
}

// ── Main render ─────────────────────────────────────────────────
function renderDetail(id) {
  const n = normalizeId(id);
  let tx = getTx(n);

  // Запись известна из индекса, но её чанк ещё не скачан: показываем
  // известные поля сразу, а биографию/анализ/источники — скелетоном,
  // и догружаем только НУЖНЫЙ чанк (не всю базу).
  if (!tx) {
    const light = state.index.find(e => e.id === n);
    if (light) {
      tx = toViewModel(light);
      setDetailOpen(true);
      fillDetailHeader(tx);
      showSkeleton();
      ensureFullTx(n)
        .then(full => {
          if (full && state.activeId === n) {
            renderDetail(n);
          } else if (!full && state.activeId === n) {
            const el = $('detBio');
            if (el) el.textContent = t('chunkLoadFailed');
          }
        })
        .catch(() => {
          if (state.activeId !== n) return;
          const el = $('detBio');
          if (el) el.textContent = t('chunkLoadFailed');
        });
      return;
    }
    return;
  }

  setDetailOpen(true);
  fillDetailHeader(tx);
  fillDetail(tx);
  $('content').scrollTo({ top: 0, behavior: 'smooth' });
}

// Шапка карточки (имя, арабское написание, номер, индекс, избранное).
function fillDetailHeader(tx) {
  $('detName').textContent = tx.name;
  $('detArabic').textContent = '';
  $('detId').textContent = t('detId', tx.id);
  $('detName').style.direction = 'ltr';
  $('detArabic').style.direction = 'rtl';
  updateDetailScore(tx);
  updateFavUi(tx.id);
}


// ═══════════════════════════════════════
// DRAWER
// ═══════════════════════════════════════
function openSidebar() {
  $('sidebar').classList.add('open');
  $('drawerOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('drawerOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ═══════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════
function initEvents() {
  // Tab bar switching handled by global switchTab
  $('tabСписок') && $('tabСписок').addEventListener('click', () => switchTab('list'));
  $('tabDetail') && $('tabDetail').addEventListener('click', () => switchTab('detail'));

  // Hamburger (desktop only now, hidden on mobile)
  $('btnMenu').addEventListener('click', openSidebar);

  $('drawerOverlay').addEventListener('click', closeSidebar);

  // Назад button (disabled but keep in case)
  $('btnНазад') && $('btnНазад').addEventListener('click', () => {
    switchTab('list');
  });


  // Search (с debounce — на 8000+ записях не пересчитываем фильтр на каждый символ)
  let _searchDebounceTimer = null;
  $('searchInput').addEventListener('input', (e) => {
    state.query = e.target.value;
    $('searchClear').style.display = state.query ? 'block' : 'none';
    // Прячем подсказку "Ctrl+K", когда в поле уже есть текст — иначе она
    // наезжает на кнопку очистки после потери фокуса (баг с дизайном)
    $('searchWrap').classList.toggle('has-value', !!state.query);
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(() => {
      // Полная загрузка не нужна: поиск по имени/ID/арабскому написанию идёт
      // по компактному индексу всей базы. Если запросу нужна биография,
      // computeFiltered() сам запустит фоновую догрузку и покажет статус.
      renderСписок();
    }, 120);
  });

  $('searchClear').addEventListener('click', () => {
    $('searchInput').value = '';
    state.query = '';
    $('searchClear').style.display = 'none';
    $('searchWrap').classList.remove('has-value');
    clearTimeout(_searchDebounceTimer);
    renderСписок();
    $('searchInput').focus();
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderСписок();
    });
  });


  // Show all
  $('btnShowВсе').addEventListener('click', () => {
    state.showFav = false;
    state.filter = 'all';
    state.query = '';
    $('searchInput').value = '';
    $('searchClear').style.display = 'none';
    $('searchWrap').classList.remove('has-value');
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    $('filterВсе').classList.add('active');
    updateFavUi(state.activeId);
    renderСписок();
  });

  // Избранное: показать только отмеченные записи (догружая нужные чанки).
  const favBtn = $('btnShowFav');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      state.showFav = !state.showFav;
      if (state.showFav) {
        state.query = '';
        state.filter = 'all';
        const si = $('searchInput');
        if (si) si.value = '';
        const sc = $('searchClear');
        if (sc) sc.style.display = 'none';
        const sw = $('searchWrap');
        if (sw) sw.classList.remove('has-value');
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const fAll = $('filterВсе');
        if (fAll) fAll.classList.add('active');
      }
      updateFavUi(state.activeId);
      renderСписок();
      if (state.showFav && state.favorites.size) {
        ensureFavoritesLoaded()
          .catch(() => {})
          .finally(() => { renderСписок({ keepPos: true }); updateFavUi(state.activeId); });
      }
    });
  }

  // Звезда в карточке передатчика
  const detFav = $('detFavBtn');
  if (detFav) {
    detFav.addEventListener('click', () => {
      if (state.activeId === null || state.activeId === undefined) return;
      toggleFavorite(state.activeId);
    });
  }



  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      $('searchInput').focus();
      if (window.innerWidth <= 768) switchTab('list');
    }
  });
}

