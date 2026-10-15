// ═══════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════
function applyLang() {
  document.documentElement.lang = 'ru';
  document.documentElement.dir = 'ltr';

  // Header
  $('appTitle').innerHTML = 'Ильм <span style="color:var(--teal)">ар-Риджаль</span>';
  $('appSubtitle').textContent = t('appSubtitle');

  // Lang buttons

  // Menu / sort / lang buttons
  if ($('btnMenu')) $('btnMenu').setAttribute('aria-label', t('menuAria'));
  if ($('btnSort')) $('btnSort').setAttribute('title', t('sortTitle'));

  // Loading screen
  const loadingTitleEl = document.querySelector('.loading-title');
  const loadingSubtitleEl = document.querySelector('.loading-subtitle');
  if (loadingTitleEl) loadingTitleEl.textContent = t('loadingTitle');
  if (loadingSubtitleEl) loadingSubtitleEl.textContent = t('loadingSubtitle');

  // Tab bar (Карточка / Хадисы / Статьи)
  if ($('tabСписокLabel')) $('tabСписокLabel').textContent = t('tabСписокLabel');
  if ($('tabСписок')) $('tabСписок').setAttribute('aria-label', t('tabСписокLabel'));
  if ($('tabDetail')) $('tabDetail').setAttribute('aria-label', t('tabDetailLabel'));
  if ($('btnHadis')) $('btnHadis').setAttribute('title', t('hadisLabel'));
  if ($('btnHadisLabel')) $('btnHadisLabel').textContent = t('hadisLabel');
  if ($('btnStatya')) $('btnStatya').setAttribute('title', t('statyaLabel'));
  if ($('btnStatyaLabel')) $('btnStatyaLabel').textContent = t('statyaLabel');

  // Search
  $('searchInput').placeholder = t('searchPlaceholder');
  if ($('searchClear')) $('searchClear').setAttribute('aria-label', t('clearAria'));

  // Filters collapse toggle
  if ($('btnCollapseFilters')) $('btnCollapseFilters').setAttribute('title', t('collapseTitle'));
  applyFiltersCollapsed();

  // Filter chips
  $('filterВсе').textContent = t('filterВсе');
  $('filterTrust').textContent = t('filterTrust');
  $('filterСпорный').textContent = t('filterСпорный');
  $('filterСлабый').textContent = t('filterСлабый');
  $('filterUnknown').textContent = t('filterUnknown');

  // Quick actions
  $('allLabel').textContent = t('allLabel');

  // Назад btn
  $('backLabel').textContent = t('backLabel');

  // Detail labels
  $('scShiaLabel').textContent = t('scShiaLabel');
  $('scSunniLabel').textContent = t('scSunniLabel');
  $('secBioLabel').textContent = t('secBioLabel');
  $('secOriginalBioLabel').textContent = t('secOriginalBioLabel');
  $('secAnalysisLabel').textContent = t('secAnalysisLabel');
  $('secSourcesLabel').textContent = t('secSourcesLabel');

  updateFavUi(state.activeId);

  // Добро пожаловать
  $('welcomeTitle').textContent = t('welcomeTitle');
  $('welcomeDesc').textContent = t('welcomeDesc');
  $('wsTotalLabel').textContent = t('wsTotalLabel');
  $('wsTrustLabel').textContent = t('wsTrustLabel');

  // Tab labels
  if ($('tabDetailLabel')) $('tabDetailLabel').textContent = t('tabDetailLabel');

  // Подписи секций, чипы эпох/течений, сортировка и прочие статические тексты
  const eCur = { all:'Все', sahaba:'Сахабы', tabiin:'Табиины', '2':'II в.х.', '3':'III в.х.', '4':'IV в.х.', '5+':'V+ в.х.' };
  document.querySelectorAll('.epoch-chip').forEach(btn => {
    const key = btn.dataset.epoch; if (eCur[key]) btn.textContent = eCur[key];
  });
  const sCur = { all:'Все', imamit:'Имамиты', nasibi:'Насибиты', ghulat:'Гулаты', wakifi:'Вакифиты', zaydi:'Зейдиты' };
  document.querySelectorAll('.sect-chip').forEach(btn => {
    const key = btn.dataset.sect; if (sCur[key]) btn.textContent = sCur[key];
  });
  const epochLbl = $('epochLabel'); if (epochLbl) epochLbl.textContent = t('epochLabel');
  const sectLbl  = $('sectLabel');  if (sectLbl)  sectLbl.textContent  = t('sectLabel');
  const copyCardLabel = $('copyCardLabel'); if (copyCardLabel) copyCardLabel.textContent = t('copyCard');
  const sortKeys = { 'default':'sortDefault', 'name-az':'sortNameAz', 'name-za':'sortNameZa', 'score-desc':'sortScoreDesc', 'score-asc':'sortScoreAsc', 'sources-desc':'sortSourcesDesc' };
  document.querySelectorAll('.sort-opt').forEach(btn => {
    const k = sortKeys[btn.dataset.sort]; if (k) btn.textContent = t(k);
  });
  // Универсальные хуки data-i18n / data-i18n-ph / data-i18n-title / data-i18n-aria
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });

  // Update stats
  updateStats();
  renderСписок();

  // Re-render active detail if any
  if (state.activeId !== null) renderDetail(state.activeId);
}

// ═══════════════════════════════════════
