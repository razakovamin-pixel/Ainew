// ═══════════════════════════════════════
// ЗАГРУЗКА ДАННЫХ (передатчики — приоритет, хадисы — лениво)
// ═══════════════════════════════════════
const CHUNK_CONCURRENCY = 2;     // одновременных запросов чанков передатчиков
const CHUNK_RETRIES = 3;         // попыток на один чанк
const _chunkPromises = {};       // i -> Promise<boolean>

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
let _dataManifestPromise = null;

async function loadDataManifest() {
  if (state.dataManifest) return state.dataManifest;
  if (_dataManifestPromise) return _dataManifestPromise;
  _dataManifestPromise = (async () => {
    const manifest = await fetchJsonRetry('data/index.json', 3, false);
    if (!manifest || !manifest.dataVersion || !manifest.transmittersMeta || !manifest.transmitterSearchIndexes) {
      throw new Error('data/index.json is invalid or outdated');
    }
    state.dataManifest = manifest;
    state.dataVersion = String(manifest.dataVersion);
    remapLegacyTransmitterIds();
    return manifest;
  })().finally(() => { _dataManifestPromise = null; });
  return _dataManifestPromise;
}

// Paths in the manifest are relative to public/data/index.json, so deployment
// under a project subdirectory keeps working. `id` expands a chunk pattern.
function manifestResourceUrl(key, fallback, id) {
  const manifest = state.dataManifest || {};
  let relative = manifest[key] || fallback;
  if (id !== undefined) relative = String(relative).replace(/\{id\}/g, String(id));
  return new URL(relative, new URL('data/index.json', document.baseURI)).href;
}

function withDataVersion(url) {
  const target = new URL(url, document.baseURI);
  if (state.dataVersion && target.origin === location.origin && /\.json$/i.test(target.pathname)) {
    target.searchParams.set('v', state.dataVersion);
  }
  return target.href;
}

async function fetchJsonRetry(url, tries, useVersion = true) {
  let lastErr;
  const requestUrl = useVersion ? withDataVersion(url) : new URL(url, document.baseURI).href;
  for (let a = 0; a < tries; a++) {
    try {
      const res = await fetch(requestUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (a < tries - 1) await _sleep(400 * Math.pow(2, a));
    }
  }
  throw lastErr;
}

// Загружает один чанк передатчиков (с повторами). Повторный вызов для того же
// чанка не плодит запросы; для упавшего чанка — запускает новую попытку (retry).
function loadTransmitterChunk(i) {
  if (state.chunkStatus[i] === 'ok') return Promise.resolve(true);
  if (_chunkPromises[i]) return _chunkPromises[i];
  state.chunkStatus[i] = 'loading';
  _chunkPromises[i] = (async () => {
    try {
      const part = await fetchJsonRetry(manifestResourceUrl('transmitterChunks', 'transmitters/{id}.json', i), CHUNK_RETRIES);
      addTransmitters(part);
      state.chunkStatus[i] = 'ok';
      scheduleAfterChunk();
      return true;
    } catch (e) {
      state.chunkStatus[i] = 'failed';
      console.warn('Failed to load transmitters chunk', i, e);
      return false;
    } finally {
      delete _chunkPromises[i];
    }
  })();
  return _chunkPromises[i];
}

function transmitterChunkForId(id) {
  id = normalizeId(id);
  const ranges = state.chunkMeta && state.chunkMeta.ranges;
  if (Array.isArray(ranges)) return ranges.findIndex(r => id >= r.firstId && id <= r.lastId);
  const size = (state.chunkMeta && state.chunkMeta.chunkSize) || 1000;
  return Math.floor(id / size);
}

function allTransmittersLoaded() {
  const total = (state.chunkMeta && Number(state.chunkMeta.total)) || 0;
  return total > 0 && state.data.length >= total;
}

async function ensureAllTransmittersLoaded() {
  const meta = state.chunkMeta;
  if (!meta || meta.chunks <= 1 || allTransmittersLoaded()) return;
  const queue = [];
  // Chunk 0 is no longer preloaded at startup; include every missing chunk.
  for (let i = 0; i < meta.chunks; i++) if (state.chunkStatus[i] !== 'ok') queue.push(i);
  const worker = async () => { while (queue.length) { const i = queue.shift(); await loadTransmitterChunk(i); } };
  const workers = [];
  for (let k = 0; k < Math.min(CHUNK_CONCURRENCY, queue.length); k++) workers.push(worker());
  await Promise.all(workers);
  if (failedChunks().length) { showChunkRetryBar(); throw new Error('FAILED_CHUNKS'); }
}

function failedChunks() {
  const out = [];
  Object.keys(state.chunkStatus).forEach(k => { if (state.chunkStatus[k] === 'failed') out.push(+k); });
  return out;
}

// Кнопка «повторить» для упавших чанков (не перезагружает страницу и не сбрасывает список).
function showChunkRetryBar() {
  let bar = $('chunkRetryBar');
  if (!bar) {
    bar = document.createElement('button');
    bar.id = 'chunkRetryBar';
    bar.type = 'button';
    bar.style.cssText = 'margin:8px 12px;padding:8px 12px;border-radius:10px;border:1px solid var(--border,#333);background:transparent;color:inherit;cursor:pointer;font:inherit;';
    const vp = $('txListViewport');
    if (vp && vp.parentNode) vp.parentNode.insertBefore(bar, vp);
    bar.addEventListener('click', async () => {
      bar.disabled = true;
      const todo = failedChunks();
      todo.forEach(i => { state.chunkStatus[i] = 'pending'; });
      await Promise.all(todo.map(loadTransmitterChunk));
      bar.disabled = false;
      if (failedChunks().length) updateChunkRetryBar(); else bar.remove();
    });
  }
  updateChunkRetryBar();
}
function updateChunkRetryBar() {
  const bar = $('chunkRetryBar');
  if (bar) bar.textContent = t('chunksRetry', failedChunks().length);
}

// Гарантирует, что чанк с нужным id загружен (для восстановления последней карточки).
async function ensureTransmitterLoaded(id) {
  if (getTx(id)) return getTx(id);
  const i = transmitterChunkForId(id);
  if (i < 0) return undefined;
  await loadTransmitterChunk(i);
  return getTx(id);
}

// После прихода чанка обновляем список ОДИН раз за короткое окно (дебаунс),
// без сброса прокрутки и без перерисовки уже показанных строк.
let _afterChunkTimer = null;
function scheduleAfterChunk() {
  if (_afterChunkTimer) return;
  _afterChunkTimer = setTimeout(() => {
    _afterChunkTimer = null;
    renderСписок({ keepPos: true });
    updateStats();
    if (document.getElementById('chunkRetryBar')) updateChunkRetryBar();
  }, 150);
}

