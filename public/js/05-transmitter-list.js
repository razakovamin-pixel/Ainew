// ═══════════════════════════════════════
// RENDER LIST
// ═══════════════════════════════════════
// Подсветка совпадений поиска (вынесена из цикла рендера — компилируем regex один раз)
let _hlRegex = null;
let _hlQuery = '';
function buildHlRegex() {
  if (state.query === _hlQuery) return _hlRegex;
  _hlQuery = state.query;
  if (!state.query) { _hlRegex = null; return null; }
  let q = state.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Совпадающие по нормализации буквы подсвечиваем во всех их написаниях,
  // чтобы подсветка не «ломалась», когда найдено по ё/е или форме алифа/хамзы
  q = q
    .replace(/[её]/gi, '[её]')
    .replace(/[اأإآٱ]/g, '[اأإآٱ]')
    .replace(/[هة]/g, '[هة]')
    .replace(/[يىی]/g, '[يىی]');
  _hlRegex = new RegExp(q, 'gi');
  return _hlRegex;
}
function appendHighlightedText(parent, value) {
  const text = String(value || '');
  const re = buildHlRegex();
  if (!re || !text) { parent.textContent = text; return; }
  re.lastIndex = 0;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    parent.appendChild(mark);
    last = match.index + match[0].length;
    if (!match[0].length) re.lastIndex++;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
}

function buildTxItem(tx) {
  const li = document.createElement('li');
  li.className = 'tx-item' + (tx.id === state.activeId ? ' active' : '');
  li.setAttribute('role', 'option');
  li.setAttribute('aria-selected', tx.id === state.activeId);
  li.dataset.id = tx.id;

  const cat = classifyStatusStyle(tx.shiaStatusStyle);
  const badgeClass = cat === 'trust' ? 'sb-trust' : cat === 'disputed' ? 'sb-disputed' : cat === 'weak' ? 'sb-weak' : 'sb-unknown';
  const badgeText = cat === 'trust' ? t('trust') : cat === 'disputed' ? t('disputed') : cat === 'weak' ? t('weak') : t('unknownStatus');

  const isFav = state.favorites.has(tx.id);
  let displayName, displaySub;
  displayName = tx.name;
  displaySub = '';

  const nameEl = document.createElement('div');
  nameEl.className = 'tx-name';
  appendHighlightedText(nameEl, displayName);
  const subEl = document.createElement('div');
  subEl.className = 'tx-arabic';
  appendHighlightedText(subEl, displaySub);
  const metaEl = document.createElement('div');
  metaEl.className = 'tx-meta';
  const idEl = document.createElement('span');
  idEl.className = 'tx-id';
  idEl.textContent = `#${tx.id + 1}`;
  const badgeEl = document.createElement('span');
  badgeEl.className = `tx-badge ${badgeClass}`;
  badgeEl.textContent = badgeText;
  metaEl.append(idEl, badgeEl);
  li.append(nameEl, subEl, metaEl);
  if (isFav) {
    const favEl = document.createElement('span');
    favEl.className = 'tx-fav';
    favEl.textContent = '★';
    li.appendChild(favEl);
  }

  li.addEventListener('click', () => {
    selectTransmitter(tx.id);
    if (window.innerWidth <= 768) {
      switchTab('detail');
    }
  });

  return li;
}

function refreshTxItemInList(id) {
  // Берём строку списка (полную или лёгкую), иначе отметка избранного не
  // обновилась бы для записи, чей чанк ещё не загружен.
  const tx = getRow(id);
  if (!tx) return;
  const list = $('txСписок');
  if (!list) return;
  const oldItem = list.querySelector(`.tx-item[data-id="${id}"]`);
  if (!oldItem) return;
  const fresh = buildTxItem(tx);
  fresh.classList.toggle('active', tx.id === state.activeId);
  fresh.setAttribute('aria-selected', tx.id === state.activeId);
  oldItem.replaceWith(fresh);
}

// ═══════════════════════════════════════
// ПРОСТАЯ ПАГИНАЦИЯ (вместо виртуального скроллинга)
// — рендерим по 40 элементов, подгружаем при достижении конца
// ═══════════════════════════════════════
const PAGE_SIZE = 40;

function renderСписок(opts) {
  const keepPos = !!(opts && opts.keepPos);
  computeFiltered();
  updateStats();

  const viewport = $('txListViewport');
  const list = $('txСписок');
  const topSpacer = $('txListTopSpacer');
  const bottomSpacer = $('txListBottomSpacer');

  // Сбрасываем спейсеры (они больше не нужны)
  topSpacer.style.height = '0px';
  bottomSpacer.style.height = '0px';

  if (state.filtered.length === 0) {
    if (!keepPos) viewport.scrollTop = 0;
    list.innerHTML = `<li class="empty-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>${state.showFav ? t('noFav') : (!state.rows.length && !state.query && state.filter === 'all' ? t('loadingTitle') : t('notFound'))}</p>
    </li>`;
    if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }
    if (_sentinel) { _sentinel = null; }
    return;
  }

  if (keepPos) {
    // Догрузка чанка: сохраняем позицию и число уже показанных страниц.
    const shown = Math.min(state.filtered.length, Math.max(1, state.vScroll.pageLoaded) * PAGE_SIZE);
    const rendered = list.querySelectorAll('.tx-item');
    let same = rendered.length === shown;
    if (same) {
      for (let i = 0; i < shown; i++) {
        if (+rendered[i].dataset.id !== state.filtered[i].id) { same = false; break; }
      }
    }
    if (!same) {
      const prevTop = viewport.scrollTop;
      list.innerHTML = '';
      const frag = document.createDocumentFragment();
      for (let i = 0; i < shown; i++) frag.appendChild(buildTxItem(state.filtered[i]));
      list.appendChild(frag);
      viewport.scrollTop = prevTop;
    }
    // Уже показанные строки не трогаем — только (пере)создаём sentinel дозагрузки.
    _sentinel = null;
    setupInfiniteScroll();
    return;
  }

  viewport.scrollTop = 0;
  state.vScroll.pageLoaded = 1;

  list.innerHTML = '';
  const frag = document.createDocumentFragment();
  const end = Math.min(PAGE_SIZE, state.filtered.length);
  for (let i = 0; i < end; i++) {
    frag.appendChild(buildTxItem(state.filtered[i]));
  }
  list.appendChild(frag);

  // Подключаем infinite scroll если элементов больше PAGE_SIZE
  setupInfiniteScroll();
}

// Sentinel для IntersectionObserver
let _scrollObserver = null;
let _sentinel = null;
// true, когда IntersectionObserver недоступен и дозагрузка идёт по скроллу.
// Объявлено здесь (до setupInfiniteScroll), чтобы исключить TDZ-ошибку.
let _scrollFallback = false;

function setupInfiniteScroll() {
  // Убираем старый observer
  if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }
  if (_sentinel) { _sentinel.remove(); _sentinel = null; }
  document.querySelectorAll('#txСписок > li[data-sentinel]').forEach(n => n.remove());

  const renderedCount = $('txСписок').querySelectorAll('.tx-item').length;
  if (state.filtered.length <= renderedCount) return;

  const list = $('txСписок');
  const viewport = $('txListViewport');

  _sentinel = document.createElement('li');
  _sentinel.setAttribute('data-sentinel', '1');
  _sentinel.style.cssText = 'height:1px;pointer-events:none;list-style:none;';
  list.appendChild(_sentinel);

  // IntersectionObserver есть не во всех WebView; без запасного пути список
  // не догружался бы вовсе (или отрисовка падала с ошибкой).
  if (typeof IntersectionObserver !== 'function') {
    _sentinel.remove();
    _sentinel = null;
    _scrollFallback = true;
    loadNextPage().catch(() => {});
    return;
  }
  _scrollFallback = false;

  _scrollObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    loadNextPage();
  }, { root: viewport, rootMargin: '200px' });

  _scrollObserver.observe(_sentinel);
}

let _loadingNextTxChunk = false;

async function loadNextPage() {
  const list = $('txСписок');
  const vs = state.vScroll;
  const start = vs.pageLoaded * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, state.filtered.length);

  if (start >= state.filtered.length) {
    if (state.indexMeta && state.index.length < state.indexMeta.total && !state.query && state.filter === 'all' && !state.showFav && state.sortMode === 'default') {
      const i = Math.floor(state.index.length / state.indexMeta.chunkSize);
      try { await loadTransmitterIndexChunk(i); renderСписок({keepPos:true}); } catch(e) { console.warn('Failed to load index page',e); }
      return;
    }
    // Пошаговая докачка чанков при прокрутке нужна только как запасной режим,
    // когда компактный индекс недоступен: с индексом список уже содержит всю
    // базу, а подробные записи догружаются отдельным механизмом (ensureDeepData).
    if (state.indexStatus !== 'ok' && !allTransmittersLoaded() && !state.query && state.filter === 'all' && !state.showFav && !_loadingNextTxChunk) {
      const meta = state.chunkMeta;
      let next = null;
      for (let i = 1; meta && i < meta.chunks; i++) { if (state.chunkStatus[i] !== 'ok') { next = i; break; } }
      if (next !== null) {
        _loadingNextTxChunk = true;
        try {
          const ok = await loadTransmitterChunk(next);
          if (ok) renderСписок({ keepPos: true });
          else {
            showChunkRetryBar();
            if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }
            if (_sentinel) { _sentinel.remove(); _sentinel = null; }
          }
        } finally { _loadingNextTxChunk = false; }
        return;
      }
    }
    if (_scrollObserver) { _scrollObserver.disconnect(); _scrollObserver = null; }
    if (_sentinel) { _sentinel.remove(); _sentinel = null; }
    return;
  }

  vs.pageLoaded++;
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) frag.appendChild(buildTxItem(state.filtered[i]));
  if (_sentinel && _sentinel.parentNode === list) list.insertBefore(frag, _sentinel); else list.appendChild(frag);
}

// Заглушка — renderVisibleSlice больше не нужен, но оставляем чтобы не ломать вызовы
function renderVisibleSlice(forceReset) {
  // no-op: replaced by pagination
}

// Дозагрузка при прокрутке — запасной путь для окружений без
// IntersectionObserver. Когда observer доступен, функция ничего не делает.
function onTxListScroll() {
  if (!_scrollFallback) return;
  const viewport = $('txListViewport');
  const list = $('txСписок');
  if (!viewport || !list) return;
  const rendered = list.querySelectorAll('.tx-item').length;
  if (rendered >= state.filtered.length) return;
  const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
  if (remaining < 400) loadNextPage().catch(() => {});
}

// ── Избранное ─────────────────────────────────────────────────────
// Отмеченные передатчики хранятся в localStorage (rijal_favorites) и
// переживают перезагрузку. Фильтр «Избранное» показывает только их.
function isFavorite(id) {
  return state.favorites.has(typeof id === 'number' ? id : parseInt(id, 10));
}

function persistFavorites() {
  try { localStorage.setItem('rijal_favorites', JSON.stringify([...state.favorites])); } catch (e) {}
}

function toggleFavorite(id) {
  const n = typeof id === 'number' ? id : parseInt(id, 10);
  if (Number.isNaN(n)) return false;
  const nowFav = !state.favorites.has(n);
  if (nowFav) state.favorites.add(n); else state.favorites.delete(n);
  persistFavorites();
  // Обновляем конкретную строку списка и карточку, не перерисовывая весь список
  // (позиция прокрутки сохраняется).
  refreshTxItemInList(n);
  updateFavUi(n);
  toast(nowFav ? t('addedFav') : t('removedFav'));
  // В режиме «Избранное» снятая запись сразу уходит из выборки;
  // иначе достаточно обновить счётчики без перерисовки списка.
  if (state.showFav) renderСписок({ keepPos: true });
  else updateStats();
  return nowFav;
}

// Загружает ТОЛЬКО те чанки, в которых лежат избранные записи. Без этого
// фильтр «Избранное» выглядел бы пустым, пока остальные чанки не докачаны,
// а полная загрузка всей базы для избранного не нужна.
async function ensureFavoritesLoaded() {
  if (!state.favorites.size) return;
  const meta = state.chunkMeta;
  if (!meta || !meta.chunkSize) return;
  const needed = new Set();
  state.favorites.forEach(id => needed.add(Math.floor(id / meta.chunkSize)));
  await Promise.all([...needed]
    .filter(i => state.chunkStatus[i] !== 'ok')
    .map(i => loadTransmitterChunk(i)));
  if (failedChunks().length) showChunkRetryBar();
}

// Синхронизирует состояние звезды в карточке и подписи фильтра.
function updateFavUi(id) {
  const btn = $('detFavBtn');
  if (btn) {
    const on = id !== undefined && id !== null && isFavorite(id);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('title', on ? t('favRemove') : t('favAdd'));
    btn.setAttribute('aria-label', on ? t('favRemove') : t('favAdd'));
  }
  const favBtn = $('btnShowFav');
  if (favBtn) favBtn.setAttribute('aria-pressed', state.showFav ? 'true' : 'false');
  const favCount = $('favCountLabel');
  if (favCount) {
    favCount.textContent = state.favorites.size ? t('favCount', state.favorites.size) : t('favLabel');
  }
}

function updateStats() {
  const n = state.filtered.length;
  // total — реальное число записей в базе: из метаданных или из индекса.
  const total = (state.chunkMeta && Number(state.chunkMeta.total)) || state.index.length || state.rows.length;
  $('statsCount').innerHTML = t('statsOf', n, total);

  $('wsTotalNum').textContent = total;
  // Считаем «надёжных» по всей базе, если она доступна (индекс или чанки),
  // иначе честно показываем прочерк.
  const base = state.rows.length >= total ? state.rows : null;
  $('wsTrustNum').textContent = base
    ? base.filter(d => classifyStatusStyle(d.shiaStatusStyle) === 'trust').length
    : '—';
}

