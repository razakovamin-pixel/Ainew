// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let state = {
  data: [],            // ПОЛНЫЕ загруженные записи (чанки), отсортированы по id
  byId: new Map(),     // id -> полная запись (карточка открывается только по ней)
  rows: [],            // вся база для списка/фильтров: полные записи или лёгкие из индекса
  index: [],           // компактный индекс всех передатчиков (data/transmitters/index-*.json)
  indexStatus: 'idle', // 'idle' | 'loading' | 'ok' | 'failed'
  dataManifest: null,  // корневой манифест путей и версии набора данных
  dataVersion: null,   // версия для инвалидирования кеша JSON
  searchIndexById: new Map(), // полный нормализованный текст записи, сегментами и только для поиска
  searchIndexStatus: 'idle', // 'idle' | 'loading' | 'ok' | 'failed'
  searchIndexChunkStatus: {},
  searchIndexPending: false,
  deepPending: false,  // есть фильтры, которым нужна полная запись
  deepResolved: false, // все подробные записи загружены
  filtersCollapsed: false,
  chunkMeta: null,     // { total, chunkSize, chunks }
  chunkStatus: {},     // i -> 'pending' | 'loading' | 'ok' | 'failed'
  filtered: [],
  activeId: null,
  lang: 'ru',
  filter: 'all',
  showFav: false,
  favorites: new Set(),
  query: '',
  epoch: 'all',
  sect: 'all',
  lightTheme: false,
  sortMode: 'default',
  // Виртуальный скроллинг списка передатчиков
  vScroll: {
    itemHeight: 64,
    overscan: 8,
    startIndex: 0,
    endIndex: 0,
    rafScheduled: false,
    pageLoaded: 1
  }
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
const $ = (id) => document.getElementById(id);

// Карточка передатчика по РЕАЛЬНОМУ id (а не по позиции в массиве):
// если какой-то чанк не загрузился, индексы массива смещаются, а id — нет.
// Возвращает ПОЛНУЮ запись или undefined, если её чанк ещё не загружен.
function getTx(id) {
  const n = normalizeId(id);
  return state.byId.get(n);
}

// ── Компактный индекс всей базы ──────────────────────────────────
// index-*.json содержат лёгкие записи передатчиков сегментами
// (ID, отображаемое имя, статусы, число источников, рейтинг). Они нужны для
// списка и быстрого предварительного поиска; подробные записи и тексты
// не входят в индекс и загружаются по запросу.

function normalizeId(id) {
  let n = typeof id === 'number' ? id : parseInt(id, 10);
  if (!Number.isInteger(n)) return n;
  const aliases = state.dataManifest && state.dataManifest.transmitterIdAliases;
  if (!aliases || typeof aliases !== 'object') return n;
  const seen = new Set();
  while (Object.prototype.hasOwnProperty.call(aliases, String(n)) && !seen.has(n)) {
    seen.add(n);
    n = parseInt(aliases[String(n)], 10);
    if (!Number.isInteger(n)) break;
  }
  return n;
}

function remapLegacyTransmitterIds() {
  // Keep existing favorites and last-opened-card references working after exact
  // duplicate IDs are redirected to their canonical records in the manifest.
  try {
    state.favorites = new Set([...state.favorites].map(normalizeId).filter(Number.isInteger));
    localStorage.setItem('rijal_favorites', JSON.stringify([...state.favorites]));
    const stored = parseInt(localStorage.getItem('rijal_lastId'), 10);
    if (Number.isInteger(stored)) {
      const resolved = normalizeId(stored);
      if (resolved !== stored) localStorage.setItem('rijal_lastId', String(resolved));
    }
  } catch (e) {}
}

// ── Единая классификация статуса передатчика ─────────────────────
// Статусы в базе (shiaStatusStyle / sunniStatusStyle) — набор классов вида
// 'status-trust', 'status-daif status-ghali' и т.п. Один и тот же человек
// может относиться сразу к нескольким категориям ('status-waqifi status-daif').
// Раньше любая запись без 'trust'/'disputed' в строке помечалась «слабым»,
// из-за чего тысячи неизвестных (status-unknown, status-majhul, status-waqifi,
// status-zaydi, пустые значения…) показывались как СЛАБЫЕ. Это неверная
// научная классификация. Теперь:
//   weak     — есть явное основание (даиф, гали, малюн, каддаб, зиндик…);
//   disputed — есть спор (mukhtalaf, mudtarib, disputed);
//   trust    — есть явная похвала (сика/тrust/thiqa/reliable/strong/sahabi…);
//   unknown  — всё остальное: «Не установлено», НЕ слабый и НЕ надёжный.
// Порядок проверки: слабый > спорный > надёжный (комбинация 'даиф+вакифи'
// остаётся слабым), иначе — unknown.
const STATUS_TOKENS = {
  weak:     ['weak','daif','ghali','malun','kadhdhab','zindiq','madhmum','mashkuk','maghmuz','wadda','kafir'],
  disputed: ['disputed','mukhtalaf','mudtarib','thiqa-but-weak-sources'],
  trust:    ['trust','thiqa','reliable','strong','sahabi','good','great','praiseworthy','mamdouh']
};
function classifyStatusStyle(style) {
  const raw = String(style || '').trim();
  if (!raw) return 'unknown';
  const toks = new Set(raw.split(/\s+/).map(t => t.replace(/^status-/, '')));
  for (const cat of ['weak', 'disputed', 'trust']) {
    for (const tok of STATUS_TOKENS[cat]) if (toks.has(tok)) return cat;
  }
  return 'unknown';
}

// Приводит запись индекса к той же форме полей, что и полная запись,
// чтобы список/фильтры/сортировка не зависели от уровня детализации.
function toViewModel(entry) {
  const full = state.byId.get(entry.id);
  if (full) return full;
  return {
    id: entry.id,
    name: entry.n || '',
    arabicName: '',
    shiaStatus: entry.sh || '',
    sunniStatus: entry.su || '',
    shiaStatusStyle: entry.ss || '',
    sunniStatusStyle: entry.us || '',
    score: typeof entry.score === 'number' ? entry.score : undefined,
    _light: true,
    _sourcesCount: entry.sc || 0
  };
}

// Пересобирает state.rows: вся база по индексу, с подменой на полные записи
// там, где их чанк уже загружен. Порядок — по возрастанию id (как в данных).
function rebuildRows() {
  if (state.index.length) {
    state.rows = state.index.map(toViewModel);
  } else {
    // Индекс недоступен: работаем только по реально загруженным чанкам.
    state.rows = state.data.slice();
  }
}

async function loadTransmitterIndex() {
  state.indexStatus = 'loading';
  try {
    const manifest = await loadDataManifest();
    const meta = state.chunkMeta || await fetchJsonRetry(manifestResourceUrl('transmittersMeta', 'transmitters/meta.json'), 3);
    if (!meta || !Number.isInteger(meta.chunks) || !Number.isInteger(meta.total) || !Number.isInteger(meta.chunkSize)) {
      throw new Error('transmitter index metadata is invalid');
    }
    state.indexMeta = meta;
    state.chunkMeta = meta;
    const firstUrl = manifestResourceUrl('transmitterIndexes', 'transmitters/index-{id}.json', 0);
    const first = await fetchJsonRetry(firstUrl, 3);
    if (!Array.isArray(first)) throw new Error('first transmitter index chunk is not an array');
    if (first.length > meta.chunkSize || first.length > meta.total) throw new Error('first transmitter index chunk exceeds metadata');
    state.index = first;
    state.indexStatus = 'ok';
    rebuildRows();
    // Остальные компактные сегменты догружаются только при прокрутке или поиске.
  } catch (e) {
    state.index = [];
    state.indexStatus = 'failed';
    console.warn('Transmitter index unavailable, falling back to chunked data:', e && e.message);
  }
  rebuildRows();
  return state.indexStatus === 'ok';
}

// Вся база доступна для списка/фильтров (по индексу ИЛИ по чанкам).
const _indexChunkPromises = new Map();
async function loadTransmitterIndexChunk(i) {
  if (_indexChunkPromises.has(i)) return _indexChunkPromises.get(i);
  const p = (async () => {
    const part = await fetchJsonRetry(manifestResourceUrl('transmitterIndexes', 'transmitters/index-{id}.json', i), 3);
    if (!Array.isArray(part)) throw new Error('invalid transmitter index chunk '+i);
    const start = i * state.indexMeta.chunkSize;
    state.index.splice(start, part.length, ...part);
    rebuildRows(); updateStats();
    return part;
  })().finally(() => _indexChunkPromises.delete(i));
  _indexChunkPromises.set(i,p); return p;
}
let _indexPromise = null;
async function ensureAllIndexChunks() {
  if (_indexPromise) return _indexPromise;
  const meta = state.indexMeta;
  if (!meta || state.index.length >= meta.total) return;
  _indexPromise = (async () => {
    for (let i = Math.ceil(state.index.length / meta.chunkSize); i < meta.chunks; i++) {
      await loadTransmitterIndexChunk(i);
    }
  })().finally(() => { _indexPromise = null; });
  return _indexPromise;
}

const _searchIndexChunkPromises = new Map();
async function loadTransmitterSearchIndexChunk(i) {
  if (state.searchIndexChunkStatus[i] === 'ok') return true;
  if (_searchIndexChunkPromises.has(i)) return _searchIndexChunkPromises.get(i);
  state.searchIndexChunkStatus[i] = 'loading';
  const promise = (async () => {
    const part = await fetchJsonRetry(
      manifestResourceUrl('transmitterSearchIndexes', 'transmitters/search-{id}.json', i), 3
    );
    if (!Array.isArray(part)) throw new Error('invalid full-text search index chunk ' + i);
    for (const entry of part) {
      if (!entry || !Number.isInteger(entry.id) || typeof entry.t !== 'string') {
        throw new Error('malformed full-text search index entry in chunk ' + i);
      }
    }
    const expectedIds = state.index.slice(i * state.indexMeta.chunkSize, i * state.indexMeta.chunkSize + part.length).map(x => x.id);
    if (expectedIds.length !== part.length || expectedIds.some((id, pos) => id !== part[pos].id)) {
      throw new Error('search index IDs/order differ from compact index in chunk ' + i);
    }
    for (const entry of part) state.searchIndexById.set(entry.id, entry.t);
    state.searchIndexChunkStatus[i] = 'ok';
    return true;
  })().catch(error => {
    state.searchIndexChunkStatus[i] = 'failed';
    throw error;
  }).finally(() => _searchIndexChunkPromises.delete(i));
  _searchIndexChunkPromises.set(i, promise);
  return promise;
}

let _allSearchIndexPromise = null;
async function ensureAllSearchIndexChunks() {
  if (state.searchIndexStatus === 'ok' && state.searchIndexById.size === state.indexMeta.total) return;
  if (_allSearchIndexPromise) return _allSearchIndexPromise;
  const meta = state.indexMeta;
  if (!meta || state.index.length < meta.total) throw new Error('compact transmitter index is incomplete');
  state.searchIndexStatus = 'loading';
  _allSearchIndexPromise = (async () => {
    const queue = [];
    for (let i = 0; i < meta.chunks; i++) if (state.searchIndexChunkStatus[i] !== 'ok') queue.push(i);
    const worker = async () => {
      while (queue.length) {
        const i = queue.shift();
        await loadTransmitterSearchIndexChunk(i);
      }
    };
    const workers = [];
    for (let i = 0; i < Math.min(CHUNK_CONCURRENCY, queue.length); i++) workers.push(worker());
    await Promise.all(workers);
    if (state.searchIndexById.size !== meta.total) {
      throw new Error('full-text search index size does not match transmitter total');
    }
    state.searchIndexStatus = 'ok';
  })().catch(error => {
    state.searchIndexStatus = 'failed';
    throw error;
  }).finally(() => { _allSearchIndexPromise = null; });
  return _allSearchIndexPromise;
}

function wholeBaseAvailable() {
  return state.indexStatus === 'ok' || allTransmittersLoaded();
}

// ── Полнотекстовый индекс и подробные записи ─────────────────────
// Компактные списковые индексы и полнотекстовые search-*.json сегментированы
// отдельно. Поиск по био/анализу/источникам не требует загрузки полных объектов;
// подробные чанки нужны для карточки и фильтров, которым необходимы исходные поля.
let _deepPromise = null;

function deepChunksLeft() {
  const meta = state.chunkMeta;
  if (!meta) return 0;
  let n = 0;
  for (let i = 0; i < meta.chunks; i++) if (state.chunkStatus[i] !== 'ok') n++;
  return n;
}

function updateDeepStatus() {
  const el = $('deepStatus');
  if (!el) return;
  // Статус показываем только когда он действительно о чём-то говорит:
  // либо идёт догрузка, либо есть условия, которым нужны подробные записи.
  const relevant = state.deepPending || state.indexStatus === 'failed' || state.indexSearchPending ||
    state.searchIndexPending || (state.searchIndexStatus === 'failed' && !!state.query.trim());
  const left = deepChunksLeft();
  if (state.indexSearchPending) { el.hidden=false; el.dataset.state='pending'; el.textContent='Загружается индекс списка для полного охвата поиска…'; return; }
  if (state.searchIndexPending) { el.hidden=false; el.dataset.state='pending'; el.textContent='Загружается полнотекстовый индекс передатчиков…'; return; }
  if (state.searchIndexStatus === 'failed' && state.query.trim()) {
    el.hidden = false; el.dataset.state = 'error';
    el.textContent = 'Полнотекстовый индекс не загрузился. Результаты не показаны, чтобы не выдавать частичный поиск за полный. ';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Повторить поиск';
    btn.addEventListener('click', () => { state.searchIndexStatus = 'idle'; state.searchIndexPending = false; computeFiltered(); renderСписок({ keepPos: true }); });
    el.appendChild(btn);
    return;
  }
  if (!relevant || left === 0) {
    if (state.indexStatus === 'ok' && needsDeepData() && state.deepResolved) {
      el.hidden = false;
      el.dataset.state = 'done';
      el.textContent = t('deepDone');
    } else {
      el.hidden = true;
      el.textContent = '';
      delete el.dataset.state;
    }
    return;
  }
  el.hidden = false;
  if (state.indexStatus === 'failed') {
    // Индекса нет — работаем по чанкам, как раньше.
    el.dataset.state = left ? 'pending' : 'done';
    el.textContent = left ? t('deepPending', left) : t('deepDone');
    return;
  }
  el.dataset.state = 'pending';
  el.textContent = t('deepPending', left);
}

// Запускает (или возвращает уже идущую) догрузку подробных записей.
// Один общий промис: повторные вызовы не плодят параллельные очереди.
function ensureDeepData() {
  if (allTransmittersLoaded()) { state.deepResolved = true; updateDeepStatus(); return Promise.resolve(); }
  if (_deepPromise) return _deepPromise;
  updateDeepStatus();
  _deepPromise = (async () => {
    try {
      await ensureAllTransmittersLoaded();
      state.deepResolved = true;
    } catch (e) {
      // Часть чанков не загрузилась: статус остаётся честным, показываем retry.
      state.deepResolved = false;
    } finally {
      _deepPromise = null;
      updateDeepStatus();
      renderDeepRetryIfNeeded();
    }
  })();
  return _deepPromise;
}

function renderDeepRetryIfNeeded() {
  const el = $('deepStatus');
  if (!el || el.hidden) return;
  const failed = failedChunks();
  if (!failed.length) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = t('deepRetry');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    failed.forEach(i => { state.chunkStatus[i] = 'pending'; });
    Promise.all(failed.map(loadTransmitterChunk))
      .catch(() => {})
      .finally(() => {
        if (!failedChunks().length) state.deepResolved = true;
        updateDeepStatus();
        renderDeepRetryIfNeeded();
        renderСписок({ keepPos: true });
      });
  });
  el.appendChild(document.createTextNode(' '));
  el.appendChild(btn);
}

// Запись для СТРОКИ СПИСКА: полная, если её чанк загружен, иначе лёгкая из
// индекса. Список должен обновляться (например, звезда избранного) и для
// записей, чьи подробности ещё не скачаны.
function getRow(id) {
  const n = normalizeId(id);
  const full = state.byId.get(n);
  if (full) return full;
  if (state.index.length) {
    const light = state.index.find(e => e.id === n);
    if (light) return toViewModel(light);
  }
  return undefined;
}

// Полная запись для карточки: из кэша или догрузкой нужного чанка.
async function ensureFullTx(id) {
  const n = normalizeId(id);
  const cached = state.byId.get(n);
  if (cached) return cached;
  const i = transmitterChunkForId(n);
  if (i < 0) return undefined;
  await loadTransmitterChunk(i);
  return state.byId.get(n);
}

// Применяет состояние панели фильтров и подпись кнопки на текущем языке.
function applyFiltersCollapsed() {
  const sidebarTop = document.querySelector('.sidebar-top');
  const sidebar = $('sidebar');
  const c = !!state.filtersCollapsed;
  if (sidebarTop) sidebarTop.classList.toggle('collapsed', c);
  if (sidebar) sidebar.classList.toggle('filters-collapsed', c);
  const label = $('collapseLabel');
  if (label) label.textContent = c ? t('filtersShowLabel') : t('filtersLabel');
}

// Добавляет записи чанка в state (без дублей) и держит state.data упорядоченным по id.
function addTransmitters(list) {
  if (!Array.isArray(list) || !list.length) return 0;
  let added = 0;
  let needSort = false;
  const lastId = state.data.length ? state.data[state.data.length - 1].id : -1;
  for (const tx of list) {
    if (!tx || typeof tx.id !== 'number' || state.byId.has(tx.id)) continue;
    state.byId.set(tx.id, tx);
    state.data.push(tx);
    if (tx.id < lastId) needSort = true;
    added++;
  }
  if (needSort) state.data.sort((a, b) => a.id - b.id);
  if (added) rebuildRows();
  return added;
}
const t = (key, ...args) => {
  // Запасной язык — ru только для действительно отсутствующих ключей.
  const dict = i18n.ru;
  let fn = dict[key];
  if (fn === undefined) fn = i18n.ru[key];
  return typeof fn === 'function' ? fn(...args) : fn;
};

function saveНастройки() {
  try {
    localStorage.setItem('rijal_favorites', JSON.stringify([...state.favorites]));
    localStorage.setItem('rijal_lastId', state.activeId ?? '');
  } catch(e) {}
}

function setDetailOpen(isOpen) {
  const welcome = $('welcome');
  const detailView = $('detailView');
  document.body.classList.toggle('detail-open', !!isOpen);

  // Welcome полностью убирается из layout, чтобы не создавать невидимую стену.
  if (welcome) welcome.style.setProperty('display', isOpen ? 'none' : 'flex', 'important');
  if (detailView) detailView.style.setProperty('display', isOpen ? 'block' : 'none', 'important');

  if (isOpen && window.innerWidth <= 768) {
    const sidebar = $('sidebar');
    const content = $('content');
    if (sidebar) {
      sidebar.classList.remove('tab-active');
      sidebar.style.setProperty('display', 'none', 'important');
    }
    if (content) {
      content.classList.add('tab-active');
      content.style.setProperty('display', 'block', 'important');
      content.scrollTop = 0;
    }
    const bList = $('tabСписок');
    const bDetail = $('tabDetail');
    if (bList) { bList.classList.remove('active'); bList.setAttribute('aria-selected', 'false'); }
    if (bDetail) { bDetail.classList.add('active'); bDetail.setAttribute('aria-selected', 'true'); }
    state.activeTab = 'detail';
  }
}

function loadНастройки() {
  try {
    state.lang = 'ru';
    state.filtersCollapsed = localStorage.getItem('rijal_filters_collapsed') === '1';
    const favs = JSON.parse(localStorage.getItem('rijal_favorites') || '[]');
    state.favorites = new Set(favs);
  } catch(e) {}
}

function toast(msg) {
  const w = $('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  w.appendChild(el);
  setTimeout(() => el.remove(), 2900);
}

