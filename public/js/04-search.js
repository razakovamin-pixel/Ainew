// FILTER & SEARCH
// ═══════════════════════════════════════
// Regex для epoch-фильтра скомпилированы один раз (не на каждый вызов computeFiltered)
const EPOCH_REGEX = {
  sahaba: /сахаб|сподвижник пророка|صحابي/,
  tabiin: /табиин|табии[^н]|تابعي/,
  '2': /ii в|2[- ]в|умер в (1[0-9]{2})|г\.х\. 1[0-9]{2}/,
  '3': /iii в|3[- ]в|умер в (2[0-9]{2})|г\.х\. 2[0-9]{2}/,
  '4': /iv в|4[- ]в|умер в (3[0-9]{2})|г\.х\. 3[0-9]{2}/,
  '5+': /[vx]+ в|[5-9][- ]в|умер в ([4-9][0-9]{2})|г\.х\. [4-9][0-9]{2}/
};

// Нормализация текста для поиска: убирает различия ё/е и вариации
// арабских букв (хамза алифа, та-марбута, я/алиф-максура), из-за которых
// раньше не находились передатчики, если написание в запросе чуть отличалось
// от написания в базе (баг с поиском передатчиков).
function normalizeSearchText(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '') // арабские огласовки/ташкиль
    .replace(/\u0640/g, '')          // тативиль (удлинение)
    .replace(/[آأإٱ]/g, 'ا')          // все формы алифа с хамзой → алиф
    .replace(/ة/g, 'ه')               // та-марбута → ха
    .replace(/[ىی]/g, 'ي')            // алиф-максура/персидская я → я
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ء/g, '')
    // Арабские варианты имён: «ابن»/«بن» и «عبد الله»/«عبدالله» — одна и та же запись
    .replace(/(^|\s)ابن(?=\s|$)/g, '$1بن')
    .replace(/(^|\s)عبد\s+(?=\S)/g, '$1عبد')
    // Русская транслитерация: ‘айн/хамза/ъ/ь, ё/е/э, ы/и/й, удвоенные буквы,
    // ибн/бин/бен, Мохаммед/Мухаммад — всё сводится к одному виду
    .replace(/[‘’ʻʼʿʾ`'’ъь]/g, '')
    .replace(/э/g, 'е').replace(/ы/g, 'и').replace(/й/g, 'и')
    .replace(/(?:^|\s)(?:бин|бен)(?=\s|$)/g, ' ибн')
    .replace(/мох/g, 'мух')
    .replace(/мухамед/g, 'мухамад')
    .replace(/([а-яa-z])\1+/g, '$1');
}

// Приводит tx.sources к массиву независимо от того, что реально лежит в
// данных (массив, строка через запятую, пусто) — защита от бага, когда
// повреждённый экспорт JSON записывал sources строкой и .join()/.some()
// на ней ронял всё приложение (поиск, карточку, копирование).
function getSourcesArray(tx) {
  if (Array.isArray(tx.sources)) return tx.sources;
  if (typeof tx.sources === 'string' && tx.sources.trim()) {
    return tx.sources.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Число первоисточников: для полной записи — длина массива, для лёгкой
// записи индекса — уже посчитанное значение.
function sourcesCount(tx) {
  if (tx._light) return tx._sourcesCount || 0;
  return getSourcesArray(tx).length;
}

// Требуется ли для текущих условий подробная запись (биография/анализ):
// поиск по тексту биографии, фильтры по эпохе и по течению.
function needsDeepData() {
  // Full-text queries are served by search-*.json; only these filters need full records.
  return state.epoch !== 'all' || state.sect !== 'all';
}

// Фильтрация и поиск идут по state.rows — это полная база из
// компактного индекса, а не только уже скачанные чанки. Условия, которым
// нужна биография (эпоха, течение, поиск по тексту биографии), помечаются
// как «ожидающие подробных данных»: такие записи попадают в выдачу, когда
// их чанк догрузится, а пользователь видит честный статус покрытия.
function computeFiltered() {
  const requiresFullIndex = !!state.query.trim() || state.filter !== 'all' || state.sortMode !== 'default' || state.epoch !== 'all' || state.sect !== 'all' || state.showFav;
  const queryText = state.query.trim();
  if (requiresFullIndex && state.indexMeta && state.index.length < state.indexMeta.total) {
    state.filtered = [];
    state.indexSearchPending = true;
    ensureAllIndexChunks().then(async () => {
      if (queryText) await ensureAllSearchIndexChunks();
      state.indexSearchPending = false;
      state.searchIndexPending = false;
      renderСписок({keepPos:true});
    }).catch(e => {
      state.indexSearchPending = false;
      if (queryText && state.searchIndexStatus !== 'ok') state.searchIndexStatus = 'failed';
      else state.indexStatus = 'failed';
      console.warn('Could not load complete transmitter/search index',e); updateDeepStatus();
    });
    updateDeepStatus(); return;
  }
  state.indexSearchPending = false;
  const q = normalizeSearchText(queryText);
  if (q && state.searchIndexStatus === 'failed') {
    state.filtered = [];
    state.searchIndexPending = false;
    updateDeepStatus();
    return;
  }
  if (q && state.searchIndexStatus !== 'ok') {
    state.filtered = [];
    state.searchIndexPending = true;
    ensureAllSearchIndexChunks().then(() => {
      state.searchIndexPending = false;
      renderСписок({keepPos:true});
    }).catch(e => {
      state.searchIndexPending = false;
      state.searchIndexStatus = 'failed';
      console.warn('Could not load complete full-text search index', e);
      updateDeepStatus();
      renderСписок({keepPos:true});
    });
    updateDeepStatus(); return;
  }
  state.searchIndexPending = false;
  const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const fav = state.showFav;
  const filter = state.filter;
  const epoch = state.epoch;
  const sect = state.sect;
  const epochRe = epoch !== 'all' ? EPOCH_REGEX[epoch] : null;
  state.deepPending = false;

  const rows = state.rows.length ? state.rows : state.data;
  const arr = rows.filter(tx => {
    if (fav && !state.favorites.has(tx.id)) return false;

    if (filter !== 'all') {
      // Фильтр и классификация используют ОДНУ систему: classifyStatusStyle.
      const cat = classifyStatusStyle(tx.shiaStatusStyle);
      if (cat !== filter) return false;
    }

    if (epochRe) {
      // Эпоха определяется по биографии/анализу — их нет в лёгкой записи.
      if (tx._light) { state.deepPending = true; return false; }
      const all = (tx.bio || '') + (tx.name || '') + (tx.analysis || '');
      if (!epochRe.test(all.toLowerCase())) return false;
    }

    if (sect !== 'all') {
      const shia = (tx.shiaStatus || '').toLowerCase();
      const sunni = (tx.sunniStatus || '').toLowerCase();
      const bio = (tx.bio || '').toLowerCase();
      const all = shia + sunni + bio;
      if (sect === 'imamit') {
        const ok = (shia.includes('тика') || shia.includes('садук') || shia.includes('сахаби')) &&
          !shia.includes('слабый') && !shia.includes('отвергнут') && !shia.includes('не принимается');
        if (!ok) return false;
      } else if (sect === 'nasibi' && !(all.includes('насибит') || all.includes('насиби'))) return false;
      else if (sect === 'ghulat' && !(all.includes('гулат') || all.includes('хаттабит'))) return false;
      else if (sect === 'wakifi' && !(all.includes('вакифит') || all.includes('вакифи'))) return false;
      else if (sect === 'zaydi' && !(all.includes('зейдит') || all.includes('зейдизм'))) return false;
      // Биография тоже влияет на классификацию: любая лёгкая запись требует
      // догрузки подробностей, даже когда статусные поля уже заполнены.
      if (tx._light) state.deepPending = true;
    }

    if (q) {
      // Полный поиск по имени, био, анализу, статусам и источникам выполняется
      // по отдельному компактному индексу всех передатчиков. Подробные записи
      // не приходится скачивать, а совпадения не зависят от открытых карточек.
      const longText = state.searchIndexById.get(tx.id);
      if (typeof longText !== 'string') return false; // индекс обязан быть полным до фильтрации
      const blob = normalizeSearchText([
        tx.name, tx.shiaStatus, tx.sunniStatus, '#' + tx.id, String(tx.id + 1), longText
      ].join(' \u0000 '));
      for (let i = 0; i < qTokens.length; i++) if (!blob.includes(qTokens[i])) return false;
    }

    return true;
  });

  // Ранжирование: сначала записи, где запрос найден в отображаемом имени, затем остальные поля
  if (qTokens.length && (!state.sortMode || state.sortMode === 'default')) {
    const nameHit = tx => {
      const nm = normalizeSearchText(tx.name || '');
      return qTokens.every(w => nm.includes(w));
    };
    // (лёгкие записи ранжируются так же — имена есть и в индексе)
    const hits = [], rest = [];
    for (const tx of arr) (nameHit(tx) ? hits : rest).push(tx);
    state.filtered = hits.concat(rest);
  } else {
    state.filtered = arr;
  }

  // Sort
  if (state.sortMode && state.sortMode !== 'default') {
    state.filtered = [...state.filtered];
    if (state.sortMode === 'name-az') {
      state.filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    } else if (state.sortMode === 'name-za') {
      state.filtered.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ru'));
    } else if (state.sortMode === 'score-desc') {
      state.filtered.sort((a, b) => calcScore(b) - calcScore(a));
    } else if (state.sortMode === 'score-asc') {
      state.filtered.sort((a, b) => calcScore(a) - calcScore(b));
    } else if (state.sortMode === 'sources-desc') {
      state.filtered.sort((a, b) => sourcesCount(b) - sourcesCount(a));
    }
  }

  // Фильтры по эпохе/течению зависят от био: их недоступные записи догружаются
  // отдельно. Полнотекстовый поиск обслуживает search-*.json и не грузит все тела.
  if (state.deepPending) ensureDeepData();
  updateDeepStatus();
}

