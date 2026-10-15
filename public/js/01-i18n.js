
  (function(){
    var btn = document.getElementById('btnHadis');
    if (btn) {
      btn.addEventListener('click', function(){
        window.location.href = '/hadis/';
      });
    }
    var btnStatya = document.getElementById('btnStatya');
    if (btnStatya) {
      btnStatya.addEventListener('click', function(){
        window.location.href = 'statya/';
      });
    }
  })();

// ═══════════════════════════════════════
// I18N
// ═══════════════════════════════════════
const i18n = {
  ru: {
    appTitle: 'Ильм ар-Риджаль',
    appSubtitle: 'Сравнительный критический анализ передатчиков',
    searchPlaceholder: 'Поиск передатчика...',
    filterВсе: 'Все',
    filterTrust: 'Надёжный',
    filterСпорный: 'Спорный',
    filterСлабый: 'Слабый',
    filterUnknown: 'Не установлено',
    chunkLoadFailed: '⚠ Не удалось загрузить подробности записи. Повторите попытку.',
    deepPending: (n) => `Для фильтров по эпохе/течению догружаются подробные записи (${n} блоков осталось)`,
    deepDone: 'Подробные записи загружены: доступны фильтры по эпохе и течению',
    deepPartial: (ok, total) => `Подробные записи доступны для ${ok} из ${total} — результаты могут быть неполными`,
    deepRetry: '⟳ Догрузить подробные записи',
    favLabel: 'Избранное',
    favAdd: 'Добавить в избранное',
    favRemove: 'Убрать из избранного',
    favCount: (n) => `Избранное (${n})`,
    allLabel: 'Все записи',
    backLabel: 'Назад',
    tabСписокLabel: 'Передатчики',
    tabDetailLabel: 'Карточка',
    statsOf: (n, t) => `<strong>${n}</strong> из ${t} передатчиков`,
    welcomeTitle: 'Аналитическая База Данных Науки ар-Риджаль',
    welcomeDesc: 'Критический анализ передатчиков хадисов в шиитской и суннитской традициях. Выберите передатчика из списка для просмотра полного анализа.',
    wsTotalLabel: 'ПЕРЕДАТЧИКОВ',
    wsTrustLabel: 'НАДЁЖНЫХ',
    wsFavLabel: 'ИЗБРАННЫХ',
    scShiaLabel: 'Шиитская школа (Джафаритский мазхаб)',
    scSunniLabel: 'Суннитская школа (Улум аль-Хадис)',
    secBioLabel: 'Биографическая справка',
    secOriginalBioLabel: 'Оригинальная арабская биография',
    secAnalysisLabel: 'Анализ двойных стандартов и полемика',
    secSourcesLabel: 'Задокументированные первоисточники',
    noSources: 'Первоисточники не задокументированы',
    noAnalysis: 'Анализ не приводится',
    addedFav: '★ Добавлено в избранное',
    removedFav: '✦ Удалено из избранного',
    noFav: 'Нет избранных передатчиков',
    notFound: 'Передатчик не найден в базе риджаля',
    detId: (n) => `Запись #${n + 1}`,
    randomHint: 'Случайный передатчик',
    trust: 'Надёжный (Тика)',
    weak: 'Слабый (Даиф)',
    disputed: 'Спорный',
    unknownStatus: 'Не установлено',
    loadingTitle: 'Загружаю базу риджаля',
    loadingSubtitle: 'Подготавливаю список передатчиков и интерфейс',
    menuAria: 'Меню',
    sortTitle: 'Сортировка списка',
    hadisLabel: 'Хадисы',
    statyaLabel: 'Статьи',
    clearAria: 'Очистить',
    filtersLabel: 'Фильтры',
    filtersShowLabel: 'Показать',
    collapseTitle: 'Скрыть/показать фильтры',
    chunksFailed: (n) => `Не удалось загрузить часть базы передатчиков (блоков: ${n})`,
    chunksRetry: (n) => `⟳ Повторить загрузку (не загружено блоков: ${n})`,
    loadFailed: '⚠ Не удалось загрузить базу передатчиков',
    retryLabel: 'Повторить',
    indexLabel: 'Индекс',
    sortPanelTitle: '↕ Сортировка списка',
    scrollTopLabel: 'Наверх',
    epochLabel: 'Эпоха',
    sectLabel: 'Течение',
    copyCard: 'Копировать карточку',
    sortDefault: '📋 По умолчанию (порядок в базе)',
    sortNameAz: 'А→Я По имени',
    sortNameZa: 'Я→А По имени',
    sortScoreDesc: '⬆ Самые надёжные первыми',
    sortScoreAsc: '⬇ Самые слабые первыми',
    sortSourcesDesc: '📚 Больше источников первыми',
    sortApplied: '↕ Сортировка применена',
    cardCopied: '✓ Карточка скопирована',
    copied: '✓ Скопировано',
    cardRecord: (n) => `Запись #${n}`,
    cardShia: 'Шиитский риджаль',
    cardSunni: 'Суннитский риджаль',
    cardBio: 'Биография',
    cardSources: 'Источники',
  },
};

// ── Mobile tab switching ────────────────────────────────────────
function switchTab(tab) {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;

  const sidebar = $('sidebar');
  const content = $('content');
  const btnСписок = $('tabСписок');
  const btnDetail = $('tabDetail');
  if (!sidebar || !content) return;

  // На мобильном принудительно синхронизируем class и display.
  if (tab === 'list') {
    sidebar.classList.add('tab-active');
    content.classList.remove('tab-active');
    sidebar.style.setProperty('display', 'flex', 'important');
    content.style.setProperty('display', 'none', 'important');
    if (btnСписок) { btnСписок.classList.add('active'); btnСписок.setAttribute('aria-selected', 'true'); }
    if (btnDetail) { btnDetail.classList.remove('active'); btnDetail.setAttribute('aria-selected', 'false'); }
  } else {
    content.classList.add('tab-active');
    sidebar.classList.remove('tab-active');
    sidebar.style.setProperty('display', 'none', 'important');
    content.style.setProperty('display', 'block', 'important');
    if (btnDetail) { btnDetail.classList.add('active'); btnDetail.setAttribute('aria-selected', 'true'); }
    if (btnСписок) { btnСписок.classList.remove('active'); btnСписок.setAttribute('aria-selected', 'false'); }
    content.scrollTop = 0;
  }
  state.activeTab = tab;
}

