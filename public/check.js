
document.addEventListener("DOMContentLoaded",()=>{
 try{
   let visits=parseInt(localStorage.getItem("archive_visits")||"0")+1;
   localStorage.setItem("archive_visits",visits);

   if(visits % 3 === 0){
      setTimeout(()=>{
        const modal=document.querySelector(".donate-box,.support-modal,.donation-modal,[id*=donat],[class*=donat]");
        if(modal){
          modal.style.display="block";
          modal.classList.add("open","active","show");
        }
      },1200);
   }
 }catch(e){}
});

;

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
    favLabel: 'Избранное',
    allLabel: 'Все записи',
    backLabel: 'Назад',
    tabСписокLabel: 'Список',
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
  },
  ar: {
    appTitle: 'علم الرجال',
    appSubtitle: 'تحليل نقدي مقارن للرواة',
    searchPlaceholder: 'ابحث عن راوٍ...',
    filterВсе: 'الكل',
    filterTrust: 'ثقة',
    filterСпорный: 'مختلف فيه',
    filterСлабый: 'ضعيف',
    favLabel: 'المفضلة',
    allLabel: 'جميع السجلات',
    backLabel: 'رجوع',
    tabСписокLabel: 'القائمة',
    tabDetailLabel: 'البطاقة',
    statsOf: (n, t) => `<strong>${n}</strong> من ${t} راوٍ`,
    welcomeTitle: 'قاعدة بيانات تحليلية لعلم الرجال',
    welcomeDesc: 'تحليل نقدي لرواة الحديث في التراثين الشيعي والسني. اختر راوياً من القائمة لعرض التحليل الكامل.',
    wsTotalLabel: 'رواةٍ',
    wsTrustLabel: 'ثقة',
    wsFavLabel: 'مفضّل',
    scShiaLabel: 'المذهب الشيعي (الجعفري)',
    scSunniLabel: 'المذهب السني (علوم الحديث)',
    secBioLabel: 'السيرة الذاتية',
    secAnalysisLabel: 'تحليل الازدواجية والجدل العلمي',
    secSourcesLabel: 'المصادر الموثّقة',
    noSources: 'لا توجد مصادر موثقة',
    noAnalysis: 'لا يوجد تحليل',
    addedFav: '★ تمت الإضافة للمفضلة',
    removedFav: '✦ تمت الإزالة من المفضلة',
    noFav: 'لا يوجد رواة في المفضلة',
    notFound: 'لم يُعثر على الراوي في قاعدة الرجال',
    detId: (n) => `السجل #${n + 1}`,
    randomHint: 'راوٍ عشوائي',
    trust: 'ثقة',
    weak: 'ضعيف',
    disputed: 'مختلف فيه',
  },
  en: {
    appTitle: 'Ilm al-Rijal',
    appSubtitle: 'Comparative critical analysis of hadith transmitters',
    searchPlaceholder: 'Поиск передатчика...',
    filterВсе: 'Все',
    filterTrust: 'Надёжный',
    filterСпорный: 'Спорный',
    filterСлабый: 'Слабый',
    favLabel: 'Избранное',
    allLabel: 'Все records',
    backLabel: 'Назад',
    tabСписокLabel: 'Список',
    tabDetailLabel: 'Карточка',
    statsOf: (n, t) => `<strong>${n}</strong> of ${t} transmitters`,
    welcomeTitle: 'Analytical Database of Ilm al-Rijal',
    welcomeDesc: 'Critical analysis of hadith transmitters in the Shia and Sunni traditions. Select a transmitter from the list to view the full analysis.',
    wsTotalLabel: 'TRANSMITTERS',
    wsTrustLabel: 'RELIABLE',
    wsFavLabel: 'FAVORITES',
    scShiaLabel: 'Shia School (Jafari Madhab)',
    scSunniLabel: 'Sunni School (Ulum al-Hadith)',
    secBioLabel: 'Biographical Note',
    secAnalysisLabel: 'Double Standards Analysis & Polemic',
    secSourcesLabel: 'Documented Primary Sources',
    noSources: 'No documented sources',
    noAnalysis: 'No analysis provided',
    addedFav: '★ Added to favorites',
    removedFav: '✦ Removed from favorites',
    noFav: 'No favorite transmitters',
    notFound: 'Transmitter not found in the Rijal database',
    detId: (n) => `Record #${n + 1}`,
    randomHint: 'Random transmitter',
    trust: 'Надёжный (Thiqa)',
    weak: "Слабый (Da'if)",
    disputed: 'Спорный',
  },
  fa: {
    appTitle: 'علم الرجال',
    appSubtitle: 'تحلیل انتقادی تطبیقی راویان حدیث',
    searchPlaceholder: 'جستجوی راوی...',
    filterВсе: 'همه',
    filterTrust: 'ثقه',
    filterСпорный: 'مختلف فیه',
    filterСлабый: 'ضعیف',
    favLabel: 'علاقه‌مندی‌ها',
    allLabel: 'همه رکوردها',
    backLabel: 'بازگشت',
    tabСписокLabel: 'فهرست',
    tabDetailLabel: 'کارت',
    statsOf: (n, t) => `<strong>${n}</strong> از ${t} راوی`,
    welcomeTitle: 'پایگاه داده تحلیلی علم الرجال',
    welcomeDesc: 'تحلیل انتقادی راویان حدیث در سنت شیعه و سنی. یک راوی را از فهرست انتخاب کنید تا تحلیل کامل را مشاهده کنید.',
    wsTotalLabel: 'راویان',
    wsTrustLabel: 'ثقه',
    wsFavLabel: 'علاقه‌مند',
    scShiaLabel: 'مذهب شیعه (جعفری)',
    scSunniLabel: 'مذهب سنی (علوم الحدیث)',
    secBioLabel: 'شرح حال',
    secAnalysisLabel: 'تحلیل معیارهای دوگانه و جدل علمی',
    secSourcesLabel: 'منابع مستند اولیه',
    noSources: 'منابع مستند وجود ندارد',
    noAnalysis: 'تحلیلی ارائه نشده',
    addedFav: '★ به علاقه‌مندی‌ها افزوده شد',
    removedFav: '✦ از علاقه‌مندی‌ها حذف شد',
    noFav: 'راوی مورد علاقه‌ای وجود ندارد',
    notFound: 'راوی در پایگاه داده رجال یافت نشد',
    detId: (n) => `رکورد #${n + 1}`,
    randomHint: 'راوی تصادفی',
    trust: 'ثقه',
    weak: 'ضعیف',
    disputed: 'مختلف فیه',
  },
  az: {
    appTitle: 'Elm ər-Rical',
    appSubtitle: 'Hədis ravilərinin müqayisəli tənqidi təhlili',
    searchPlaceholder: 'Ravi axtar...',
    filterВсе: 'Hamısı',
    filterTrust: 'Etibarlı',
    filterСпорный: 'Mübahisəli',
    filterСлабый: 'Zəif',
    favLabel: 'Seçilmişlər',
    allLabel: 'Bütün qeydlər',
    backLabel: 'Geri',
    tabСписокLabel: 'Siyahı',
    tabDetailLabel: 'Kart',
    statsOf: (n, t) => `<strong>${n}</strong> / ${t} ravi`,
    welcomeTitle: 'Elm ər-Rical Analitik Verilənlər Bazası',
    welcomeDesc: 'Şiə və Sünni ənənələrində hədis ravilərinin tənqidi təhlili. Tam təhlili görmək üçün siyahıdan ravi seçin.',
    wsTotalLabel: 'RAVİLƏR',
    wsTrustLabel: 'ETİBARLI',
    wsFavLabel: 'SEÇİLMİŞ',
    scShiaLabel: 'Şiə məktəbi (Cəfəri məzhəbi)',
    scSunniLabel: 'Sünni məktəbi (Hədis elmləri)',
    secBioLabel: 'Bioqrafik məlumat',
    secAnalysisLabel: 'Qoşa standartların təhlili və polemika',
    secSourcesLabel: 'Sənədləşdirilmiş mənbələr',
    noSources: 'Sənədləşdirilmiş mənbə yoxdur',
    noAnalysis: 'Təhlil verilməyib',
    addedFav: '★ Seçilmişlərə əlavə edildi',
    removedFav: '✦ Seçilmişlərdən silindi',
    noFav: 'Seçilmiş ravi yoxdur',
    notFound: 'Ravi rical bazasında tapılmadı',
    detId: (n) => `Qeyd #${n + 1}`,
    randomHint: 'Təsadüfi ravi',
    trust: 'Etibarlı (Siqa)',
    weak: 'Zəif (Daif)',
    disputed: 'Mübahisəli',
  }
};

// ── Mobile tab switching ────────────────────────────────────────
function switchTab(tab) {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;
  const sidebar = $('sidebar');
  const content = $('content');
  const btnСписок = $('tabСписок');
  const btnDetail = $('tabDetail');
  if (tab === 'list') {
    sidebar.classList.add('tab-active');
    content.classList.remove('tab-active');
    if (btnСписок) btnСписок.classList.add('active');
    if (btnDetail) btnDetail.classList.remove('active');
  } else {
    content.classList.add('tab-active');
    sidebar.classList.remove('tab-active');
    if (btnDetail) btnDetail.classList.add('active');
    if (btnСписок) btnСписок.classList.remove('active');
  }
  state.activeTab = tab;
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let state = {
  data: [],
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
  sortMode: 'default'
};

// ═══════════════════════════════════════
// NOTES STORE (early init)
// ═══════════════════════════════════════
const NOTES_KEY = 'rijal_notes_v1';
let notesStore = {};
try { notesStore = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch(e) {}
function saveЗаметкиStore() {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notesStore)); } catch(e) {}
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
const $ = (id) => document.getElementById(id);
const t = (key, ...args) => {
  const fn = i18n[state.lang][key];
  return typeof fn === 'function' ? fn(...args) : fn;
};

function saveНастройки() {
  try {
    localStorage.setItem('rijal_lang', state.lang);
    localStorage.setItem('rijal_favorites', JSON.stringify([...state.favorites]));
    localStorage.setItem('rijal_lastId', state.activeId ?? '');
  } catch(e) {}
}

function loadНастройки() {
  try {
    const lang = localStorage.getItem('rijal_lang');
    state.lang = 'ru';
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

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let renderListTimer = 0;
let renderListToken = 0;

function scheduleRenderList(delay = 0) {
  if (renderListTimer) clearTimeout(renderListTimer);
  renderListTimer = setTimeout(() => {
    renderListTimer = 0;
    renderСписок();
  }, delay);
}

// ═══════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════
function applyLang() {
  const isAr = state.lang === 'ar';
  const isFa = state.lang === 'fa';
  const isRTL = isAr || isFa;
  document.documentElement.lang = state.lang;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

  // Header
  const titleMap = {
    ru: 'Ильм <span style="color:var(--teal)">ар-Риджаль</span>',
    ar: 'علم <span style="color:var(--teal)">الرجال</span>',
    en: 'Ilm <span style="color:var(--teal)">al-Rijal</span>',
    fa: 'علم <span style="color:var(--teal)">الرجال</span>',
    az: 'Elm <span style="color:var(--teal)">ər-Rical</span>'
  };
  $('appTitle').innerHTML = titleMap[state.lang] || titleMap.ru;
  $('appSubtitle').textContent = t('appSubtitle');

  // Lang buttons
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === state.lang);
  });

  // Search
  $('searchInput').placeholder = t('searchPlaceholder');

  // Filter chips
  $('filterВсе').textContent = t('filterВсе');
  $('filterTrust').textContent = t('filterTrust');
  $('filterСпорный').textContent = t('filterСпорный');
  $('filterСлабый').textContent = t('filterСлабый');

  // Quick actions
  $('favLabel').textContent = t('favLabel');
  $('allLabel').textContent = t('allLabel');

  // Назад btn
  $('backLabel').textContent = t('backLabel');

  // Detail labels
  $('scShiaLabel').textContent = t('scShiaLabel');
  $('scSunniLabel').textContent = t('scSunniLabel');
  $('secBioLabel').textContent = t('secBioLabel');
  $('secAnalysisLabel').textContent = t('secAnalysisLabel');
  $('secSourcesLabel').textContent = t('secSourcesLabel');

  // Добро пожаловать
  $('welcomeTitle').textContent = t('welcomeTitle');
  $('welcomeDesc').textContent = t('welcomeDesc');
  $('wsTotalLabel').textContent = t('wsTotalLabel');
  $('wsTrustLabel').textContent = t('wsTrustLabel');
  $('wsFavLabel').textContent = t('wsFavLabel');

  // Tab labels
  if ($('tabСписокLabel')) $('tabСписокLabel').textContent = t('tabСписокLabel');
  if ($('tabDetailLabel')) $('tabDetailLabel').textContent = t('tabDetailLabel');

  // Action bar labels
  const actionLabels = {
    ru: { fav:'Избранное', rand:'Случайный', stats:'Статистика', cmp:'Сравнение',
          tl:'Хронология', gloss:'Глоссарий', isnad:'Иснад', rel:'Рейтинг',
          quiz:'Викторина', conf:'Конфликты', meth:'Методология', bar:'Инструменты анализа риджаля',
          epoch:'Эпоха', sect:'Течение' },
    ar:  { fav:'المفضلة', rand:'عشوائي', stats:'إحصاء', cmp:'مقارنة',
          tl:'التسلسل', gloss:'المصطلحات', isnad:'الإسناد', rel:'التقييم',
          quiz:'مسابقة', conf:'التناقضات', meth:'المنهج', bar:'أدوات تحليل الرجال',
          epoch:'العصر', sect:'المذهب' },
    en:  { fav:'Избранное', rand:'Random', stats:'Statistics', cmp:'Сравнение',
          tl:'Хронология', gloss:'Глоссарий', isnad:'Isnad', rel:'Rating',
          quiz:'Тест', conf:'Conflicts', meth:'Methodology', bar:'Rijal Analysis Tools',
          epoch:'Epoch', sect:'School' },
    fa:  { fav:'علاقه‌مندی‌ها', rand:'تصادفی', stats:'آمار', cmp:'مقایسه',
          tl:'تسلسل زمانی', gloss:'واژه‌نامه', isnad:'اسناد', rel:'رتبه‌بندی',
          quiz:'آزمون', conf:'تناقضات', meth:'روش‌شناسی', bar:'ابزارهای تحلیل رجال',
          epoch:'دوره', sect:'مکتب' },
    az:  { fav:'Seçilmişlər', rand:'Təsadüfi', stats:'Statistika', cmp:'Müqayisə',
          tl:'Xronologiya', gloss:'Lüğət', isnad:'İsnad', rel:'Reytinq',
          quiz:'Viktorina', conf:'Ziddiyyətlər', meth:'Metodologiya', bar:'Rical Təhlil Alətləri',
          epoch:'Dövr', sect:'Cərəyan' },
  };
  const al = actionLabels[state.lang] || actionLabels.ru;
  // Action bar buttons
  const btnFavView = $('btnFavView'); if(btnFavView) btnFavView.querySelector('.action-label').textContent = al.fav;
  const btnRandom  = $('btnRandom');  if(btnRandom)  btnRandom.querySelector('.action-label').textContent  = al.rand;
  const btnStats   = $('btnStats');   if(btnStats)   btnStats.querySelector('.action-label').textContent   = al.stats;
  const btnСравнение = $('btnСравнение'); if(btnСравнение) btnСравнение.querySelector('.action-label').textContent = al.cmp;
  const btnХронология= $('btnХронология');if(btnХронология)btnХронология.querySelector('.action-label').textContent= al.tl;
  const btnГлоссарий= $('btnГлоссарий');if(btnГлоссарий)btnГлоссарий.querySelector('.action-label').textContent= al.gloss;
  const btnIsnad   = $('btnIsnad');   if(btnIsnad)   btnIsnad.querySelector('.action-label').textContent   = al.isnad;
  const btnRel     = $('btnReliability');if(btnRel)  btnRel.querySelector('.action-label').textContent    = al.rel;
  const btnТест    = $('btnТест');    if(btnТест)    btnТест.querySelector('.action-label').textContent    = al.quiz;
  const btnConflict= $('btnConflict');if(btnConflict)btnConflict.querySelector('.action-label').textContent= al.conf;
  const btnHilali  = $('btnHilali');  if(btnHilali)  btnHilali.querySelector('.action-label').textContent  = al.meth;
  // Action bar title
  const abt = document.querySelector('.action-bar-title'); if(abt) abt.textContent = al.bar;
  // Epoch/sect labels
  const epochLbl = $('epochLabel'); if(epochLbl) epochLbl.textContent = al.epoch;
  const sectLbl  = $('sectLabel');  if(sectLbl)  sectLbl.textContent  = al.sect;
  // Epoch chips
  const epochChips = { all:'Hamısı', sahaba:'Səhabə', tabiin:'Tabiin', '2':'II əsr h.', '3':'III əsr h.', '4':'IV əsr h.', '5+':'V+ əsr h.' };
  const epochChipsRu = { all:'Все', sahaba:'Сахабы', tabiin:'Табиины', '2':'II в.х.', '3':'III в.х.', '4':'IV в.х.', '5+':'V+ в.х.' };
  const epochChipsAr = { all:'الكل', sahaba:'الصحابة', tabiin:'التابعون', '2':'القرن الثاني', '3':'القرن الثالث', '4':'القرن الرابع', '5+':'القرن الخامس+' };
  const epochChipsEn = { all:'Все', sahaba:'Companions', tabiin:'Tabiun', '2':'II cent. AH', '3':'III cent. AH', '4':'IV cent. AH', '5+':'V+ cent. AH' };
  const epochChipsFa = { all:'همه', sahaba:'صحابه', tabiin:'تابعین', '2':'قرن دوم', '3':'قرن سوم', '4':'قرن چهارم', '5+':'قرن پنجم+' };
  const eMap = { ru: epochChipsRu, ar: epochChipsAr, en: epochChipsEn, fa: epochChipsFa, az: epochChips };
  const eCur = eMap[state.lang] || epochChipsRu;
  document.querySelectorAll('.epoch-chip').forEach(btn => {
    const key = btn.dataset.epoch; if(eCur[key]) btn.textContent = eCur[key];
  });
  // Sect chips
  const sectMap = {
    ru: { all:'Все', imamit:'Имамиты', nasibi:'Насибиты', ghulat:'Гулаты', wakifi:'Вакифиты', zaydi:'Зейдиты' },
    ar: { all:'الكل', imamit:'الإمامية', nasibi:'الناصبة', ghulat:'الغلاة', wakifi:'الواقفة', zaydi:'الزيدية' },
    en: { all:'Все', imamit:'Imamis', nasibi:'Nasibis', ghulat:'Ghulat', wakifi:'Waqifis', zaydi:'Zaydis' },
    fa: { all:'همه', imamit:'امامیه', nasibi:'ناصبیه', ghulat:'غلات', wakifi:'واقفیه', zaydi:'زیدیه' },
    az: { all:'Hamısı', imamit:'İmamilər', nasibi:'Nasibilər', ghulat:'Qulat', wakifi:'Vakifilər', zaydi:'Zeydilər' },
  };
  const sCur = sectMap[state.lang] || sectMap.ru;
  document.querySelectorAll('.sect-chip').forEach(btn => {
    const key = btn.dataset.sect; if(sCur[key]) btn.textContent = sCur[key];
  });

  // Panel & misc static texts
  const panelTexts = {
    ru: {
      statsTitle: '📊 Статистика базы данных',
      compareTitle: '⚖ Сравнение передатчиков',
      timelineTitle: '🕐 Хронология передатчиков',
      glossaryTitle: '📖 Глоссарий терминов ар-Риджаль',
      isnadTitle: '⛓ Анализатор Иснада',
      isnadDesc: 'Введите цепочку передатчиков через запятую — система оценит каждое звено и даст итоговое заключение.',
      isnadPlaceholder: 'Например: Мухаммад аль-Кулайни, Аль-Хусейн ибн Убайдуллах...',
      isnadBtn: 'Анализировать',
      topSourcesTitle: 'Топ источников',
      copyCard: 'Копировать карточку',
      filtersPanelTitle: 'Инструменты анализа риджаля',
    },
    ar: {
      statsTitle: '📊 إحصاءات قاعدة البيانات',
      compareTitle: '⚖ مقارنة الرواة',
      timelineTitle: '🕐 التسلسل الزمني للرواة',
      glossaryTitle: '📖 مصطلحات علم الرجال',
      isnadTitle: '⛓ محلل الإسناد',
      isnadDesc: 'أدخل سلسلة الرواة مفصولة بفاصلة — سيقيّم النظام كل حلقة ويعطي حكماً.',
      isnadPlaceholder: 'مثال: محمد الكليني، الحسين بن عبيدالله...',
      isnadBtn: 'تحليل',
      topSourcesTitle: 'أبرز المصادر',
      copyCard: 'نسخ البطاقة',
      filtersPanelTitle: 'أدوات تحليل الرجال',
    },
    en: {
      statsTitle: '📊 Database Statistics',
      compareTitle: '⚖ Сравнение Transmitters',
      timelineTitle: '🕐 Transmitter Хронология',
      glossaryTitle: '📖 Rijal Terminology Глоссарий',
      isnadTitle: '⛓ Isnad Analyzer',
      isnadDesc: 'Enter a chain of transmitters separated by commas — the system will evaluate each link.',
      isnadPlaceholder: 'E.g.: Muhammad al-Kulayni, al-Husayn ibn Ubaydullah...',
      isnadBtn: 'Analyze',
      topSourcesTitle: 'Top Sources',
      copyCard: 'Copy Card',
      filtersPanelTitle: 'Rijal Analysis Tools',
    },
    fa: {
      statsTitle: '📊 آمار پایگاه داده',
      compareTitle: '⚖ مقایسه راویان',
      timelineTitle: '🕐 تسلسل زمانی راویان',
      glossaryTitle: '📖 واژه‌نامه اصطلاحات رجال',
      isnadTitle: '⛓ تحلیلگر اسناد',
      isnadDesc: 'زنجیره راویان را با کاما وارد کنید — سیستم هر حلقه را ارزیابی خواهد کرد.',
      isnadPlaceholder: 'مثال: محمد کلینی، حسین بن عبیدالله...',
      isnadBtn: 'تحلیل',
      topSourcesTitle: 'منابع برتر',
      copyCard: 'کپی کارت',
      filtersPanelTitle: 'ابزارهای تحلیل رجال',
    },
    az: {
      statsTitle: '📊 Verilənlər bazasının statistikası',
      compareTitle: '⚖ Raviləri müqayisə et',
      timelineTitle: '🕐 Ravilərin xronologiyası',
      glossaryTitle: '📖 Elm ər-Rical terminləri lüğəti',
      isnadTitle: '⛓ İsnad Analizatoru',
      isnadDesc: 'Ravilər zəncirini vergüllə daxil edin — sistem hər həlqəni qiymətləndirərək nəticə verəcək.',
      isnadPlaceholder: 'Məsələn: Məhəmməd əl-Kuleyni, əl-Hüseyn ibn Übeydullah...',
      isnadBtn: 'Analiz et',
      topSourcesTitle: 'Əsas mənbələr',
      copyCard: 'Kartı kopyala',
      filtersPanelTitle: 'Rical Təhlil Alətləri',
    },
  };
  const pt = panelTexts[state.lang] || panelTexts.ru;
  // Apply to panel elements that have stable structure
  const statsPanelTitle = document.querySelector('#statsPanel .panel-title');
  if (statsPanelTitle) statsPanelTitle.textContent = pt.statsTitle;
  const comparePanelTitle = document.querySelector('#comparePanel .panel-title');
  if (comparePanelTitle) comparePanelTitle.textContent = pt.compareTitle;
  const timelinePanelTitle = document.querySelector('#timelinePanel .panel-title');
  if (timelinePanelTitle) timelinePanelTitle.textContent = pt.timelineTitle;
  const glossaryPanelTitle = document.querySelector('#glossaryPanel .panel-title');
  if (glossaryPanelTitle) glossaryPanelTitle.textContent = pt.glossaryTitle;
  const isnadPanelTitle = document.querySelector('#isnadPanel .panel-title');
  if (isnadPanelTitle) isnadPanelTitle.textContent = pt.isnadTitle;
  const isnadInput = $('isnadInput'); if(isnadInput) isnadInput.placeholder = pt.isnadPlaceholder;
  const isnadAnalyze = $('isnadAnalyze'); if(isnadAnalyze) isnadAnalyze.textContent = pt.isnadBtn;
  const barSectionTitle = document.querySelector('.bar-section-title'); if(barSectionTitle) barSectionTitle.textContent = pt.topSourcesTitle;
  const copyCardLabel = $('copyCardLabel'); if(copyCardLabel) copyCardLabel.textContent = pt.copyCard;

  // Update stats
  updateStats();
  renderСписок();

  // Re-render active detail if any
  if (state.activeId !== null) renderDetail(state.activeId);
}

// ═══════════════════════════════════════
// FILTER & SEARCH
// ═══════════════════════════════════════
function computeFiltered() {
  const q = state.query.toLowerCase().trim();
  let arr = state.data;

  // Избранное mode
  if (state.showFav) {
    arr = arr.filter(t => state.favorites.has(t.id));
  }

  // Status filter
  if (state.filter !== 'all') {
    arr = arr.filter(t => {
      const style = t.shiaStatusStyle || '';
      if (state.filter === 'trust') return style.includes('trust');
      if (state.filter === 'weak') return style.includes('weak');
      if (state.filter === 'disputed') return style.includes('disputed');
      return true;
    });
  }

  // Epoch filter
  if (state.epoch !== 'all') {
    arr = arr.filter(tx => {
      const bio = (tx.bio || '').toLowerCase();
      const name = (tx.name || '').toLowerCase();
      const analysis = (tx.analysis || '').toLowerCase();
      const all = bio + name + analysis;
      if (state.epoch === 'sahaba') return /сахаб|сподвижник пророка|صحابي/.test(all);
      if (state.epoch === 'tabiin') return /табиин|табии[^н]|تابعي/.test(all);
      if (state.epoch === '2') return /ii в|2[- ]в|умер в (1[0-9]{2})|г\.х\. 1[0-9]{2}/.test(all);
      if (state.epoch === '3') return /iii в|3[- ]в|умер в (2[0-9]{2})|г\.х\. 2[0-9]{2}/.test(all);
      if (state.epoch === '4') return /iv в|4[- ]в|умер в (3[0-9]{2})|г\.х\. 3[0-9]{2}/.test(all);
      if (state.epoch === '5+') return /[vx]+ в|[5-9][- ]в|умер в ([4-9][0-9]{2})|г\.х\. [4-9][0-9]{2}/.test(all);
      return true;
    });
  }

  // Sect filter
  if (state.sect !== 'all') {
    arr = arr.filter(tx => {
      const shia = (tx.shiaStatus || '').toLowerCase();
      const sunni = (tx.sunniStatus || '').toLowerCase();
      const bio = (tx.bio || '').toLowerCase();
      const all = shia + sunni + bio;
      if (state.sect === 'imamit') {
        return (shia.includes('тика') || shia.includes('садук') || shia.includes('сахаби')) &&
          !shia.includes('слабый') && !shia.includes('отвергнут') && !shia.includes('не принимается');
      }
      if (state.sect === 'nasibi') return all.includes('насибит') || all.includes('насиби');
      if (state.sect === 'ghulat') return all.includes('гулат') || all.includes('хаттабит');
      if (state.sect === 'wakifi') return all.includes('вакифит') || all.includes('вакифи');
      if (state.sect === 'zaydi') return all.includes('зейдит') || all.includes('зейдизм');
      return true;
    });
  }

  // Search
  if (q) {
    arr = arr.filter(tx => {
      const blob = tx.__search || '';
      return blob.includes(q) || (tx.arabicName && tx.arabicName.includes(state.query.trim()));
    });
  }

  state.filtered = arr;

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
      state.filtered.sort((a, b) => (b.sources || []).length - (a.sources || []).length);
    }
  }
}

// ═══════════════════════════════════════
// RРУDER LIST
// ═══════════════════════════════════════
function renderСписок() {
  const token = ++renderListToken;
  computeFiltered();
  const list = $('txСписок');
  if (!list) return;

  list.innerHTML = '';
  updateStats();

  if (state.filtered.length === 0) {
    list.innerHTML = `<li class="empty-state">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>${state.showFav ? t('noFav') : t('notFound')}</p>
    </li>`;
    return;
  }

  const total = state.filtered.length;
  const batchSize = total > 2500 ? 120 : total > 1200 ? 160 : 220;
  let idx = 0;

  const makeItem = (tx, idx) => {
    const li = document.createElement('li');
    li.className = 'tx-item' + (tx.id === state.activeId ? ' active' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', tx.id === state.activeId);
    li.dataset.id = tx.id;

    const style = tx.shiaStatusStyle || 'status-weak';
    const badgeClass = style.includes('trust') ? 'sb-trust' : style.includes('disputed') ? 'sb-disputed' : 'sb-weak';
    const badgeText = style.includes('trust') ? t('trust') : style.includes('disputed') ? t('disputed') : t('weak');
    const isFav = state.favorites.has(tx.id);

    const isRTLLang = state.lang === 'ar' || state.lang === 'fa';
    const isAzLang = state.lang === 'az';
    let displayName, displaySub;
    if (isRTLLang) {
      displayName = tx.arabicName || tx.name;
      displaySub = tx.name;
    } else if (isAzLang) {
      const azCached = arCache[`az_${tx.id}`];
      displayName = (azCached && azCached.name) ? azCached.name : tx.name;
      displaySub = tx.arabicName || '';
    } else {
      displayName = tx.name;
      displaySub = tx.arabicName || '';
    }

    const qRaw = state.query.trim();
    const qEsc = qRaw ? escapeRegExp(qRaw) : '';
    const hl = (str) => {
      if (!qEsc || !str) return str;
      return str.replace(new RegExp(qEsc, 'gi'), m => `<mark>${m}</mark>`);
    };

    li.innerHTML = `
      <div class="tx-name">${hl(displayName)}</div>
      <div class="tx-arabic">${hl(displaySub)}</div>
      <div class="tx-meta">
        <span class="tx-id">#${tx.id + 1}</span>
        <span class="tx-badge ${badgeClass}">${badgeText}</span>
      </div>
      ${isFav ? '<span class="tx-fav">★</span>' : ''}
    `;

    li.addEventListener('click', () => {
      selectTransmitter(tx.id);
      if (window.innerWidth <= 768) {
        switchTab('detail');
      }
    });

    return li;
  };

  const renderBatch = () => {
    if (token !== renderListToken) return;
    const frag = document.createDocumentFragment();
    const end = Math.min(idx + batchSize, total);
    for (; idx < end; idx++) {
      frag.appendChild(makeItem(state.filtered[idx], idx));
    }
    list.appendChild(frag);

    if (idx < total) {
      const next = () => renderBatch();
      if ('requestIdleCallback' in window) {
        requestIdleCallback(next, { timeout: 60 });
      } else {
        requestAnimationFrame(next);
      }
    }
  };

  renderBatch();
}

function updateStats() {
  const n = state.filtered.length;
  const total = state.data.length;
  $('statsCount').innerHTML = t('statsOf', n, total);

  // Добро пожаловать stats
  $('wsTotalNum').textContent = total;
  const trustCount = state.data.filter(d => (d.shiaStatusStyle || '').includes('trust')).length;
  $('wsTrustNum').textContent = trustCount;
  $('wsFavNum').textContent = state.favorites.size;
}

// ═══════════════════════════════════════
// SELECT TRANSMITTER
// ═══════════════════════════════════════
function selectTransmitter(id) {
  state.activeId = id;

  // Highlight active in list
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

// ── Translation cache (persisted) ──────────────────────────────
const TX_CACHE_KEY = 'rijal_trans_cache_v3';
let arCache = {};
try { arCache = JSON.parse(localStorage.getItem(TX_CACHE_KEY) || '{}'); } catch(e) {}
function saveArCache() {
  try { localStorage.setItem(TX_CACHE_KEY, JSON.stringify(arCache)); } catch(e) {}
}

// ── Status translations (instant, no API needed) ────────────────
const STATUS_AR = {
  'Тика': 'ثقة',
  'Тика, Джалиль': 'ثقة جليل',
  'Тика, Джалиль, Асхаб аль-Иджма': 'ثقة جليل من أصحاب الإجماع',
  'Тика, Асхаб аль-Иджма': 'ثقة من أصحاب الإجماع',
  'Тика, Факих': 'ثقة فقيه',
  'Тика (Высшая степень)': 'ثقة ثقة',
  'Тика (Врата Имама)': 'ثقة (باب الإمام)',
  'Тика (Первые Врата)': 'ثقة (الباب الأول)',
  'Тика (Третьи Врата)': 'ثقة (الباب الثالث)',
  'Тика (Последние Врата)': 'ثقة (الباب الأخير)',
  'Тика (Шейх ас-Садук)': 'ثقة (الشيخ الصدوق)',
  'Тика (Шейх Общины)': 'ثقة (شيخ الطائفة)',
  'Тика (Первый Учитель)': 'ثقة (المفيد)',
  'Тика (Первый Мученик)': 'ثقة (الشهيد الأول)',
  'Тика (Второй Мученик)': 'ثقة (الشهيد الثاني)',
  'Тика (Аллама)': 'ثقة (العلامة)',
  'Тика (аль-Мухаккик ас-Сани)': 'ثقة (المحقق الثاني)',
  'Тика (Главный риджалист шиизма)': 'ثقة (إمام الرجاليين)',
  'Тика (с богословскими замечаниями)': 'ثقة (مع تحفظات عقدية)',
  'Садук (Правдив, не мутакаллим)': 'صدوق',
  'Садук': 'صدوق',
  'Муваттак': 'موثّق',
  'Спорный': 'مختلف فيه',
  'Слабый': 'ضعيف',
  'Слабый (Насибит)': 'ضعيف (ناصبي)',
  'Слабый (насибит)': 'ضعيف (ناصبي)',
  'Слабый (мудаллис)': 'ضعيف (مدلّس)',
  'Слабый (Маджхуль)': 'ضعيف (مجهول)',
  'Слабый (Даиф)': 'ضعيف',
  'Слабый (Каззаб)': 'كذّاب',
  'Слабый (Каззаб, лжец)': 'كذّاб',
  'Слабый (даиф)': 'ضعيف',
  'Не принимается': 'مردود',
  'Не принимается (насибит)': 'مردود (ناصبي)',
  'Не принят': 'غير مقبول',
  'Отвергнут': 'مردود',
  'Игнорируется': 'متروك',
  'Неизвестен': 'مجهول',
  'Малоизвестен': 'قليل المعرفة',
  'Рафидит': 'رافضي',
  'Сектант': 'صاحب بدعة',
  'Матрук': 'متروك',
  'Матрук / Лжец': 'متروك / كذّاب',
  'Хафиз': 'حافظ',
  'Тика / Садук': 'ثقة / صدوق',
  'Тика / Хафиз': 'ثقة / حافظ',
  'Садук / Мудаллис': 'صدوق / مدلّس',
  'Шиит': 'شيعي',
  'Шиит, правдивый': 'شيعي صدوق',
  'Шиитский передатчик': 'راوٍ شيعي',
  'Шиитский богослов': 'متكلم شيعي',
  'Шиитский полемист': 'متجادل شيعي',
  'Шиитский поэт': 'شاعر شيعي',
  'Шиитский мутакаллим': 'متكلم شيعي',
  'Спорный / Садук': 'مختلف فيه / صدوق',
  'Слабый / Садук': 'ضعيف / صدوق',
  'Слабый / Матрук': 'ضعيف / متروك',
  'Слабый / Неизвестен': 'ضعيف / مجهول',
  'Слабый / Мудтариб': 'ضعيف / مضطرب',
  'Худжат аль-ислам / Имам': 'حجة الإسلام / الإمام',
};

function translateStatus(s) {
  if (!s) return s;
  return STATUS_AR[s.trim()] || s;
}

// ── Status translations for РУ ────────────────────────────────
const STATUS_РУ = {
  'Тика': 'Надёжный (Thiqa)',
  'Тика, Джалиль': 'Надёжный, Eminent',
  'Тика, Асхаб аль-Иджма': 'Надёжный, Ashab al-Ijma',
  'Тика, Факих': 'Надёжный, Jurist',
  'Спорный': 'Спорный',
  'Слабый': 'Слабый (Daif)',
  'Слабый (Каззаб)': 'Liar (Kazzab)',
  'Слабый (Маджхуль)': 'Unknown (Majhul)',
  'Не принят': 'Not Accepted',
  'Отвергнут': 'Rejected',
  'Неизвестен': 'Unknown',
  'Рафидит': 'Rafidite',
  'Сектант': 'Sectarian',
  'Матрук': 'Abandoned (Matruk)',
  'Садук': 'Truthful (Saduq)',
  'Муваттак': 'Confirmed (Muwath-thaq)',
  'Сахаби / Тика': 'Companion / Надёжный',
  'Хафиз': 'Hafidh',
  'Шиит': 'Shia',
  'Шиитский поэт': 'Shia Poet',
  'Малоизвестен': 'Little Known',
  'Крайне слабый': 'Extremely Слабый',
};

// ── Status translations for FA ────────────────────────────────
const STATUS_FA = {
  'Тика': 'ثقه',
  'Тика, Джалиль': 'ثقه جلیل',
  'Тика, Асхаб аль-Иджма': 'ثقه از اصحاب اجماع',
  'Тика, Факих': 'ثقه فقیه',
  'Спорный': 'مختلف فیه',
  'Слабый': 'ضعیف',
  'Слабый (Каззаб)': 'کذّاب',
  'Слабый (Маджхуль)': 'ضعیف (مجهول)',
  'Не принят': 'مردود',
  'Отвергнут': 'مردود',
  'Неизвестен': 'مجهول',
  'Рафидит': 'رافضی',
  'Сектант': 'صاحب بدعت',
  'Матрук': 'متروک',
  'Садук': 'صدوق',
  'Муваттак': 'موثّق',
  'Сахаби / Тика': 'صحابی / ثقه',
  'Хафиз': 'حافظ',
  'Шиит': 'شیعه',
  'Шиитский поэт': 'شاعر شیعی',
  'Малоизвестен': 'کم‌شناخته',
  'Крайне слабый': 'بسیار ضعیف',
};


// ── Status translations for AZ ────────────────────────────────
const STATUS_AZ = {
  'Тика': 'Siqa (Etibarlı)',
  'Тика, Джалиль': 'Siqa, Cəlil',
  'Тика, Асхаб аль-Иджма': 'Siqa, Əshabul-İcma',
  'Тика, Факих': 'Siqa, Fəqih',
  'Тика (Высшая степень)': 'Siqa siqa',
  'Тика (Шейх Общины)': 'Siqa (Şeyxut-Taifə)',
  'Тика (Первый Учитель)': 'Siqa (Şeyxul-Müfid)',
  'Тика (Первый Мученик)': 'Siqa (Birinci Şəhid)',
  'Тика (Второй Мученик)': 'Siqa (İkinci Şəhid)',
  'Тика (Аллама)': 'Siqa (Əllamə)',
  'Тика (Шейх ас-Садук)': 'Siqa (Şeyx Saduq)',
  'Тика (Главный риджалист шиизма)': 'Siqa (Əsas Ricalşünas)',
  'Садук': 'Saduq (Doğruçu)',
  'Садук (Правдив, не мутакаллим)': 'Saduq',
  'Муваттак': 'Müvəssəq',
  'Спорный': 'Mübahisəli',
  'Спорный (Муваттак)': 'Mübahisəli (Müvəssəq)',
  'Слабый': 'Zəif (Daif)',
  'Слабый (Насибит)': 'Zəif (Nasibiyyə)',
  'Слабый (насибит)': 'Zəif (Nasibiyyə)',
  'Слабый (мудаллис)': 'Zəif (Müdəllis)',
  'Слабый (Маджхуль)': 'Zəif (Məchul)',
  'Слабый (Даиф)': 'Zəif (Daif)',
  'Слабый (Каззаб)': 'Kəzzab (Yalançı)',
  'Слабый (Каззаб, лжец)': 'Kəzzab (Yalançı)',
  'Слабый (даиф)': 'Zəif',
  'Крайне слабый': 'Çox zəif',
  'Не принимается': 'Qəbul edilmir',
  'Не принимается (насибит)': 'Qəbul edilmir (Nasibiyyə)',
  'Не принят': 'Qəbul olunmayıb',
  'Не признаётся': 'Tanınmır',
  'Не известен': 'Naməlum',
  'Неизвестен': 'Naməlum',
  'Малоизвестен': 'Az tanınan',
  'Отвергнут': 'Rədd edilib',
  'Игнорируется': 'Nəzərə alınmır',
  'Рафидит': 'Rafizi',
  'Сектант': 'Bidətçi',
  'Матрук': 'Mətruk',
  'Матрук / Лжец': 'Mətruk / Kəzzab',
  'Хафиз': 'Hafiz',
  'Шиит': 'Şiə',
  'Шиит, правдивый': 'Şiə, doğruçu',
  'Шиитский передатчик': 'Şiə ravisi',
  'Шиитский богослов': 'Şiə alimi',
  'Шиитский поэт': 'Şiə şairi',
  'Шиитский мутакаллим': 'Şiə mütəkəllimi',
  'Сахаби / Тика': 'Səhabə / Siqa',
  'Тика / Садук': 'Siqa / Saduq',
  'Тика / Хафиз': 'Siqa / Hafiz',
  'Имам / Тика': 'İmam / Siqa',
  'Садук / Мудаллис': 'Saduq / Müdəllis',
  'Худжат аль-ислам / Имам': 'Hüccətül-İslam / İmam',
  'Спорный / Садук': 'Mübahisəli / Saduq',
  'Слабый / Садук': 'Zəif / Saduq',
  'Слабый / Матрук': 'Zəif / Mətruk',
  'Слабый / Неизвестен': 'Zəif / Naməlum',
  'Слабый / Мудтариб': 'Zəif / Müztərib',
};

function translateStatusForLang(s, lang) {
  if (!s) return s;
  const key = s.trim();
  if (lang === 'ar') return STATUS_AR[key] || s;
  if (lang === 'en') return STATUS_РУ[key] || s;
  if (lang === 'fa') return STATUS_FA[key] || s;
  if (lang === 'az') return STATUS_AZ[key] || s;
  return s;
}

// ── Fetch translation from Claude API ────────────────────────
async function fetchArabicData(tx) {
  const lang = state.lang;
  const cacheKey = `${lang}_${tx.id}`;
  if (arCache[cacheKey]) return arCache[cacheKey];

  // If bio is empty, no need for API call — just translate statuses
  if (!tx.bio && !tx.analysis) {
    const result = {
      bio: '',
      shiaStatus: translateStatusForLang(tx.shiaStatus, lang),
      sunniStatus: translateStatusForLang(tx.sunniStatus, lang),
      analysis: '',
      sources: tx.sources || []
    };
    arCache[cacheKey] = result;
    saveArCache();
    return result;
  }

  let prompt = '';
  if (lang === 'ar') {
    prompt = `أنت عالم متخصص في علم الرجال والحديث. ترجم النص التالي من الروسية إلى العربية الفصحى الدقيقة المناسبة لعلم الرجال.

السيرة الذاتية للراوي «${tx.arabicName || tx.name}»:
${tx.bio || '—'}

التحليل:
${(tx.analysis || '').replace(/<[^>]+>/g, '')}

المصادر:
${(tx.sources || []).join('\n')}

أجب بـ JSON صالح فقط، بدون أي نص خارجه، بهذا الشكل الدقيق:
{"bio":"النص المترجم","analysis":"التحليل المترجم","sources":["المصدر1","المصدر2"]}`;
  } else if (lang === 'en') {
    prompt = `You are a specialist scholar in Ilm al-Rijal (hadith narrator criticism). Translate the following Russian text into precise academic Русский appropriate for Islamic hadith sciences.

Biographical note for narrator «${tx.arabicName || tx.name}»:
${tx.bio || '—'}

Analysis:
${(tx.analysis || '').replace(/<[^>]+>/g, '')}

Sources:
${(tx.sources || []).join('\n')}

Reply with valid JSON only, no text outside it, in exactly this format:
{"bio":"translated bio","analysis":"translated analysis","sources":["Source 1","Source 2"]}`;
  } else if (lang === 'fa') {
    prompt = `شما یک محقق متخصص در علم الرجال هستید. متن زیر را از روسی به فارسی روان و دقیق مناسب برای علم حدیث ترجمه کنید.

شرح حال راوی «${tx.arabicName || tx.name}»:
${tx.bio || '—'}

تحلیل:
${(tx.analysis || '').replace(/<[^>]+>/g, '')}

منابع:
${(tx.sources || []).join('\n')}

فقط با JSON معتبر پاسخ دهید، بدون هیچ متنی در خارج از آن، دقیقاً به این شکل:
{"bio":"متن ترجمه‌شده","analysis":"تحلیل ترجمه‌شده","sources":["منبع۱","منبع۲"]}`;
  } else if (lang === 'az') {
    prompt = `Siz hədis ravilərinin tənqidi elmi olan "Elm ər-Rical" sahəsində mütəxəssis alimsiniz. Aşağıdakı mətni Rusca dilindən Azərbaycan dilinə — İslam hədis elminə uyğun dəqiq akademik üslubda — tərcümə edin.

Ravinin Rusca adı: «${tx.name}»
Ravinin ərəbcə adı: «${tx.arabicName || ''}»

Bu ravinin adını Azərbaycan dilinin fonetik qaydalarına uyğun transkripsiya edin (məs: Мухаммад аль-Кулайни → Muhəmməd əl-Kuleyni).

Ravi «${tx.arabicName || tx.name}» haqqında bioqrafik məlumat:
${tx.bio || '—'}

Təhlil:
${(tx.analysis || '').replace(/<[^>]+>/g, '')}

Mənbələr:
${(tx.sources || []).join('\n')}

Yalnız etibarlı JSON ilə cavab verin, xaricdə heç bir mətn olmadan, dəqiq bu formatda:
{"name":"Azərbaycan dilində ravi adı","bio":"tərcümə olunmuş mətn","analysis":"tərcümə olunmuş təhlil","sources":["Mənbə 1","Mənbə 2"]}`;
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) throw new Error('API ' + res.status);
  const data = await res.json();
  const raw = data.content.map(c => c.text || '').join('');
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  parsed.shiaStatus = translateStatusForLang(tx.shiaStatus, lang);
  parsed.sunniStatus = translateStatusForLang(tx.sunniStatus, lang);

  arCache[cacheKey] = parsed;
  saveArCache();
  return parsed;
}

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
function fillDetail(tx, arData) {
  const shiaStyle = tx.shiaStatusStyle || 'status-weak';
  const sunniStyle = tx.sunniStatusStyle || 'status-weak';

  function dotClass(s) {
    if (s.includes('trust')) return 'dot-trust';
    if (s.includes('disputed')) return 'dot-disputed';
    return 'dot-weak';
  }
  function valClass(s) {
    if (s.includes('trust')) return 'trust';
    if (s.includes('disputed')) return 'disputed';
    return 'weak';
  }

  $('scShiaDot').className = `sc-dot ${dotClass(shiaStyle)}`;
  $('scSunniDot').className = `sc-dot ${dotClass(sunniStyle)}`;
  $('scShiaVal').className = `sc-value ${valClass(shiaStyle)}`;
  $('scSunniVal').className = `sc-value ${valClass(sunniStyle)}`;

  const isAr = state.lang === 'ar';
  const isFa = state.lang === 'fa';
  const isEn = state.lang === 'en';
  const isRTL2 = isAr || isFa;
  const isAz = state.lang === 'az';
  const needsTrans = isAr || isFa || isEn || isAz;

  // Status: use instant translation dict first, then API result
  const shiaStatus = needsTrans
    ? (arData?.shiaStatus || translateStatusForLang(tx.shiaStatus, state.lang) || tx.shiaStatus || '')
    : (tx.shiaStatus || '');
  const sunniStatus = needsTrans
    ? (arData?.sunniStatus || translateStatusForLang(tx.sunniStatus, state.lang) || tx.sunniStatus || '')
    : (tx.sunniStatus || '');
  const bio = (needsTrans && arData?.bio) ? arData.bio : (tx.bio || '');
  const analysis = (needsTrans && arData?.analysis) ? arData.analysis : (tx.analysis || '');
  const sources = (needsTrans && arData?.sources?.length) ? arData.sources : (tx.sources || []);

  $('scShiaText').textContent = shiaStatus;
  $('scSunniText').textContent = sunniStatus;

  // If AZ and translated name available — update the name display
  if (isAz && arData?.name) {
    $('detName').textContent = arData.name;
  }

  // Bio
  const bioEl = $('detBio');
  bioEl.textContent = bio;
  bioEl.style.direction = isRTL2 ? 'rtl' : 'ltr';
  bioEl.style.textAlign = isRTL2 ? 'right' : 'left';
  bioEl.style.fontFamily = isRTL2 ? 'var(--font-arabic)' : '';
  bioEl.style.lineHeight = isRTL2 ? '2' : '';

  // Analysis
  if (analysis && analysis.trim()) {
    const analysisEl = $('detAnalysis');
    analysisEl.innerHTML = needsTrans ? analysis : (tx.analysis || analysis);
    analysisEl.style.direction = isRTL2 ? 'rtl' : 'ltr';
    analysisEl.style.textAlign = isRTL2 ? 'right' : 'left';
    analysisEl.style.fontFamily = isRTL2 ? 'var(--font-arabic)' : '';
    analysisEl.style.lineHeight = isRTL2 ? '2' : '';
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
      if (isRTL2) {
        li.style.direction = 'rtl';
        li.style.textAlign = 'right';
        li.style.fontFamily = 'var(--font-arabic)';
      }
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
async function renderDetail(id) {
  const tx = state.data[id];
  if (!tx) return;

  $('welcome').style.display = 'none';
  $('detailView').style.display = 'block';

  const isAr = state.lang === 'ar';

  // Name display
  const isRTLdet = isAr || state.lang === 'fa';
  const isAzDet  = state.lang === 'az';
  const azNameCached = isAzDet && arCache[`az_${tx.id}`];
  const detDisplayName = isRTLdet
    ? (tx.arabicName || tx.name)
    : isAzDet
      ? ((azNameCached && azNameCached.name) ? azNameCached.name : tx.name)
      : tx.name;
  $('detName').textContent = detDisplayName;
  $('detArabic').textContent = isRTLdet ? tx.name : (tx.arabicName || '');
  $('detId').textContent = t('detId', tx.id);

  // Name direction
  $('detName').style.direction = isRTLdet ? 'rtl' : 'ltr';
  $('detName').style.fontFamily = isRTLdet ? 'var(--font-arabic)' : '';
  $('detArabic').style.direction = isRTLdet ? 'ltr' : 'rtl';

  updateFavBtn();
  updateDetailScore(tx);
  $('content').scrollTo({ top: 0, behavior: 'smooth' });

  const needsTranslation = (state.lang === 'ar' || state.lang === 'en' || state.lang === 'fa' || state.lang === 'az');

  if (needsTranslation) {
    // Загрузка messages by language
    const loadingMsg = { ar: 'جارٍ تحميل الترجمة...', en: 'Загрузка translation...', fa: 'در حال بارگذاری ترجمه...', az: 'Tərcümə yüklənir...' };
    const failMsg = { ar: '⚠ تعذّرت الترجمة — النص بالروسية', en: '⚠ Translation failed — showing Russian text', fa: '⚠ ترجمه ناموفق بود — متن روسی نمایش داده می‌شود', az: '⚠ Tərcümə uğursuz oldu — Rus mətn göstərilir' };

    // Step 1: instantly show statuses from dict
    fillDetail(tx, {
      shiaStatus: translateStatusForLang(tx.shiaStatus, state.lang),
      sunniStatus: translateStatusForLang(tx.sunniStatus, state.lang),
      bio: null,
      analysis: null,
      sources: null
    });

    // Step 2: check cache
    const cacheKey = `${state.lang}_${tx.id}`;
    const cached = arCache[cacheKey];
    if (cached) {
      fillDetail(tx, cached);
      return;
    }

    // Step 3: show skeleton, fetch translation
    showSkeleton();
    $('detBio').innerHTML = `<span class="ar-loading">${loadingMsg[state.lang] || 'Загрузка...'}</span>`;

    try {
      const transData = await fetchArabicData(tx);
      fillDetail(tx, transData);
    } catch(err) {
      console.warn('Translation failed:', err);
      fillDetail(tx, {
        shiaStatus: translateStatusForLang(tx.shiaStatus, state.lang),
        sunniStatus: translateStatusForLang(tx.sunniStatus, state.lang),
        bio: tx.bio,
        analysis: tx.analysis,
        sources: tx.sources
      });
      toast(failMsg[state.lang] || '⚠ Translation failed');
    }
  } else {
    fillDetail(tx, null);
  }
}

function updateFavBtn() {
  const isFav = state.activeId !== null && state.favorites.has(state.activeId);
  const btn = $('btnFav');
  if (isFav) {
    btn.style.color = '#fbbf24';
    btn.querySelector('svg').setAttribute('fill', '#fbbf24');
  } else {
    btn.style.color = '';
    btn.querySelector('svg').setAttribute('fill', 'none');
  }
  // Update note indicator
  const noteInd = $('noteIndicator');
  if (noteInd && state.activeId !== null) {
    const hasNote = notesStore[`tx_${state.activeId}`] && notesStore[`tx_${state.activeId}`].text;
    noteInd.style.display = hasNote ? 'block' : 'none';
  }
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
// EVРУTS
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

  // Language
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      saveНастройки();
      applyLang();
    });
  });

  // Search
  $('searchInput').addEventListener('input', (e) => {
    state.query = e.target.value;
    $('searchClear').style.display = state.query ? 'block' : 'none';
    scheduleRenderList(120);
  });

  $('searchClear').addEventListener('click', () => {
    $('searchInput').value = '';
    state.query = '';
    $('searchClear').style.display = 'none';
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

  // Show favorites
  $('btnShowFav').addEventListener('click', () => {
    state.showFav = !state.showFav;
    $('btnShowFav').classList.toggle('fav-active', state.showFav);
    renderСписок();
  });

  // Show all
  $('btnShowВсе').addEventListener('click', () => {
    state.showFav = false;
    state.filter = 'all';
    state.query = '';
    $('searchInput').value = '';
    $('searchClear').style.display = 'none';
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    $('filterВсе').classList.add('active');
    renderСписок();
  });

  // Random
  $('btnRandom').addEventListener('click', () => {
    if (!state.data.length) return;
    const idx = Math.floor(Math.random() * state.data.length);
    const tx = state.data[idx];
    selectTransmitter(tx.id);
    // Scroll to item in list
    setTimeout(() => {
      const el = $('txСписок').querySelector(`[data-id="${tx.id}"]`);
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
    if (window.innerWidth <= 768) {
      switchTab('detail');
    }
  });

  // Fav header button (toggle showFav + view)
  $('btnFavView').addEventListener('click', () => {
    state.showFav = !state.showFav;
    $('btnFavView').classList.toggle('active', state.showFav);
    $('btnShowFav').classList.toggle('fav-active', state.showFav);
    renderСписок();
    if (window.innerWidth <= 768) switchTab('list');
  });

  // Fav button on detail
  $('btnFav').addEventListener('click', () => {
    if (state.activeId === null) return;
    if (state.favorites.has(state.activeId)) {
      state.favorites.delete(state.activeId);
      toast(t('removedFav'));
    } else {
      state.favorites.add(state.activeId);
      toast(t('addedFav'));
    }
    updateFavBtn();
    updateStats();
    renderСписок();
    saveНастройки();
  });

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

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
async function init() {
  loadНастройки();
  applyLang();
  const loadingEl = $('loading');
  if (loadingEl) loadingEl.classList.add('open');

  // Load data from transmitters.json + transmitters2/3/4.json (если есть)
  let raw = [];
  try {
    const loadJsonIfExists = async (filename) => {
      try {
        const res = await fetch(filename);
        if (!res.ok) return [];
        return await res.json();
      } catch (err) {
        console.info(`${filename} не найден или не удалось загрузить`);
        return [];
      }
    };

    const [data1, data2, data3, data4] = await Promise.all([
      loadJsonIfExists('transmitters.json'),
      loadJsonIfExists('transmitters2.json'),
      loadJsonIfExists('transmitters3.json'),
      loadJsonIfExists('transmitters4.json')
    ]);

    // Объединяем все базы
    raw = [...data1, ...data2, ...data3, ...data4];
  } catch(e) {
    console.error('Failed to load transmitters.json:', e);
    const loadingErrorEl = $('loading');
    if (loadingErrorEl) {
      loadingErrorEl.innerHTML = '<div style="color:#fb7185;font-size:14px;text-align:center;padding:20px">⚠ Не удалось загрузить transmitters.json<br><small style="color:#475569">Убедитесь что transmitters.json (и, если нужны, transmitters2/3/4.json) находятся рядом с index.html</small></div>';
    }
    return;
  }
  // Назначаем ID по индексу — гарантирует уникальность
  raw.forEach((item, i) => {
    item.id = i;
    item.__search = [
      item.name || '',
      item.arabicName || '',
      item.bio || '',
      item.analysis || '',
      item.shiaStatus || '',
      item.sunniStatus || '',
      ...(Array.isArray(item.sources) ? item.sources : [])
    ].join(' ').toLowerCase();
  });
  state.data = raw;

  renderСписок();
  updateStats();

  // Hide loading
  const loadingHideEl = $('loading');
  if (loadingHideEl) {
    loadingHideEl.classList.add('hidden');
    setTimeout(() => {
      loadingHideEl.classList.remove('open');
      loadingHideEl.style.display = 'none';
      document.body.classList.remove('app-intro');
    }, 280);
  }

  // Restore last selection
  try {
    const lastId = parseInt(localStorage.getItem('rijal_lastId'));
    if (!isNaN(lastId) && state.data[lastId]) {
      selectTransmitter(lastId);
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
}

// ═══════════════════════════════════════
// EXTRA FEATURES
// ═══════════════════════════════════════
function initExtras() {
  // ── Collapse filters button ──────────────────────────────────
  let filtersCollapsed = false;
  try { filtersCollapsed = localStorage.getItem('rijal_filters_collapsed') === '1'; } catch(e) {}
  const sidebarTop = document.querySelector('.sidebar-top');
  function applyCollapsed() {
    sidebarTop.classList.toggle('collapsed', filtersCollapsed);
    $('sidebar').classList.toggle('filters-collapsed', filtersCollapsed);
    $('collapseLabel').textContent = filtersCollapsed ? 'Показать' : 'Фильтры';
  }
  applyCollapsed();
  $('btnCollapseFilters').addEventListener('click', () => {
    filtersCollapsed = !filtersCollapsed;
    applyCollapsed();
    try { localStorage.setItem('rijal_filters_collapsed', filtersCollapsed ? '1' : '0'); } catch(e) {}
  });

  // ── Theme toggle ──────────────────────────────────────────────
  try { if (localStorage.getItem('rijal_light') === '1') { state.lightTheme = true; document.body.classList.add('light-theme'); } } catch(e) {}
  $('btnTheme').addEventListener('click', () => {
    state.lightTheme = !state.lightTheme;
    document.body.classList.toggle('light-theme', state.lightTheme);
    try { localStorage.setItem('rijal_light', state.lightTheme ? '1' : '0'); } catch(e) {}
    $('btnTheme').classList.toggle('active', state.lightTheme);
  });

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
    const tx = state.data[state.activeId];
    if (!tx) return;
    const text = [
      `${tx.name} (${tx.arabicName || ''})`,
      `Запись #${tx.id + 1}`,
      ``,
      `Шиитский риджаль: ${tx.shiaStatus}`,
      `Суннитский риджаль: ${tx.sunniStatus}`,
      ``,
      tx.bio ? `Биография: ${tx.bio}` : '',
      tx.analysis ? `Анализ: ${tx.analysis.replace(/<[^>]+>/g, '')}` : '',
      (tx.sources && tx.sources.length) ? `Источники: ${tx.sources.join(', ')}` : ''
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => toast('✓ Карточка скопирована')).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove(); toast('✓ Скопировано');
    });
  });

  // ── Stats panel ──────────────────────────────────────────────
  $('btnStats').addEventListener('click', openStats);
  $('statsClose').addEventListener('click', () => closePanel('statsPanel'));
  $('statsPanel').addEventListener('click', e => { if (e.target === $('statsPanel')) closePanel('statsPanel'); });

  // ── Сравнение panel ────────────────────────────────────────────
  $('btnСравнение').addEventListener('click', openСравнение);
  $('compareClose').addEventListener('click', () => closePanel('comparePanel'));
  $('comparePanel').addEventListener('click', e => { if (e.target === $('comparePanel')) closePanel('comparePanel'); });
  $('cmpGo').addEventListener('click', doСравнение);

  // ── Хронология panel ───────────────────────────────────────────
  $('btnХронология').addEventListener('click', openХронология);
  $('timelineClose').addEventListener('click', () => closePanel('timelinePanel'));
  $('timelinePanel').addEventListener('click', e => { if (e.target === $('timelinePanel')) closePanel('timelinePanel'); });

  // ── Глоссарий panel ───────────────────────────────────────────
  $('btnГлоссарий').addEventListener('click', openГлоссарий);
  $('glossaryClose').addEventListener('click', () => closePanel('glossaryPanel'));
  $('glossaryPanel').addEventListener('click', e => { if (e.target === $('glossaryPanel')) closePanel('glossaryPanel'); });

  // Escape closes any panel
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['statsPanel','comparePanel','timelinePanel','glossaryPanel'].forEach(id => closePanel(id));
    }
  });
}

function closePanel(id) { $(id).classList.remove('open'); }
function openPanelEl(id) { $(id).classList.add('open'); }

// ── STATS ────────────────────────────────────────────────────────
function openStats() {
  const data = state.data;
  const cats = [
    { label: 'Имамиты (Тика)', color: '#0d9488', test: tx => (tx.shiaStatusStyle||'').includes('trust') },
    { label: 'Спорные',        color: '#d97706', test: tx => (tx.shiaStatusStyle||'').includes('disputed') },
    { label: 'Слабые',         color: '#e11d48', test: tx => {
        const s = (tx.shiaStatus||'').toLowerCase();
        return (tx.shiaStatusStyle||'').includes('weak') && !s.includes('насибит') && !s.includes('насиби') && !s.includes('гулат') && !s.includes('вакифит') && !s.includes('зейдит');
    }},
    { label: 'Насибиты',       color: '#7c3aed', test: tx => { const s=(tx.shiaStatus||'').toLowerCase()+(tx.sunniStatus||'').toLowerCase(); return s.includes('насибит')||s.includes('насиби'); }},
    { label: 'Гулаты',         color: '#db2777', test: tx => { const s=(tx.shiaStatus||'').toLowerCase(); return s.includes('гулат')||s.includes('хаттабит'); }},
    { label: 'Вакифиты',       color: '#f59e0b', test: tx => (tx.shiaStatus||'').toLowerCase().includes('вакифит') },
    { label: 'Зейдиты',        color: '#06b6d4', test: tx => (tx.shiaStatus||'').toLowerCase().includes('зейдит') },
    { label: 'Неизвестны',     color: '#475569', test: tx => { const s=(tx.shiaStatus||'').toLowerCase(); return s.includes('неизвестен')||s.includes('не известен')||s.includes('маджхул'); }},
  ];

  const total = data.length;
  const counts = cats.map(c => ({ ...c, n: data.filter(c.test).length }));

  // Donut SVG
  const cx=80, cy=80, r=60, sw=28;
  let offset = 0;
  const circ = 2 * Math.PI * r;
  let paths = '';
  counts.forEach(c => {
    if (!c.n) return;
    const pct = c.n / total;
    const dash = pct * circ;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.color}" stroke-width="${sw}"
      stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset * circ}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += pct;
  });
  const donut = $('donutSvg');
  donut.innerHTML = paths + `<text x="${cx}" y="${cy+6}" text-anchor="middle" font-size="22" font-weight="700" fill="#e2e8f0">${total}</text>`;

  // Legend
  $('donutLegend').innerHTML = counts.map(c => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${c.color}"></div>
      <span>${c.label}</span>
      <span class="legend-count">${c.n}</span>
    </div>`).join('');

  // Sources chart
  const srcMap = {};
  data.forEach(tx => (tx.sources||[]).forEach(s => {
    const key = s.replace(/,.*|стр\..*|\(.*/, '').trim();
    srcMap[key] = (srcMap[key]||0) + 1;
  }));
  const topSrc = Object.entries(srcMap).sort((a,b) => b[1]-a[1]).slice(0, 10);
  const maxS = topSrc[0]?.[1] || 1;
  $('sourcesChart').innerHTML = topSrc.map(([name, n]) => `
    <div class="bar-row">
      <div class="bar-label" title="${name}">${name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/maxS*100).toFixed(1)}%;background:var(--teal)"></div></div>
      <div class="bar-num">${n}</div>
    </div>`).join('');

  openPanelEl('statsPanel');
}

// ── COMPARE ───────────────────────────────────────────────────────
function openСравнение() {
  const opts = state.data.map(tx => `<option value="${tx.id}">${tx.name}</option>`).join('');
  $('cmpA').innerHTML = '<option value="">— Первый —</option>' + opts;
  $('cmpB').innerHTML = '<option value="">— Второй —</option>' + opts;
  $('cmpResult').innerHTML = '';
  openPanelEl('comparePanel');
}

function doСравнение() {
  const idA = parseInt($('cmpA').value);
  const idB = parseInt($('cmpB').value);
  if (isNaN(idA) || isNaN(idB) || idA === idB) {
    $('cmpResult').innerHTML = '<p style="color:var(--text-3);font-size:13px">Выберите двух разных передатчиков</p>';
    return;
  }
  const a = state.data[idA], b = state.data[idB];

  function statusMatch(x, y) {
    const xs = (x||'').includes('Тика') || (x||'').includes('trust');
    const ys = (y||'').includes('Тика') || (y||'').includes('trust');
    return xs === ys;
  }

  const rows = [
    { label: 'Имя', va: a.name, vb: b.name, check: false },
    { label: 'Арабское', va: `<span class="cmp-arabic">${a.arabicName||'—'}</span>`, vb: `<span class="cmp-arabic">${b.arabicName||'—'}</span>`, check: false, html: true },
    { label: 'Шиитский риджаль', va: a.shiaStatus, vb: b.shiaStatus, check: true, styleA: a.shiaStatusStyle, styleB: b.shiaStatusStyle },
    { label: 'Суннитский риджаль', va: a.sunniStatus, vb: b.sunniStatus, check: true, styleA: a.sunniStatusStyle, styleB: b.sunniStatusStyle },
    { label: 'Источники', va: (a.sources||[]).join(', ')||'—', vb: (b.sources||[]).join(', ')||'—', check: false },
  ];

  const shiaMatch = statusMatch(a.shiaStatus, b.shiaStatus);
  const sunniMatch = statusMatch(a.sunniStatus, b.sunniStatus);

  $('cmpResult').innerHTML = `
    <table class="cmp-table">
      <thead><tr><th>Поле</th><th class="cmp-name-cell">${a.name}</th><th class="cmp-name-cell">${b.name}</th></tr></thead>
      <tbody>
        ${rows.map(r => {
          let ca = '', cb = '';
          if (r.check) {
            const match = statusMatch(r.va, r.vb);
            ca = cb = match ? 'cmp-match' : 'cmp-differ';
          }
          const vA = r.html ? r.va : (r.va||'—');
          const vB = r.html ? r.vb : (r.vb||'—');
          return `<tr><td>${r.label}</td><td class="${ca}">${vA}</td><td class="${cb}">${vB}</td></tr>`;
        }).join('')}
      </tbody>
    </table>
    <p style="margin-top:14px;font-size:12px;color:var(--text-3)">
      Шиитский риджаль: ${shiaMatch ? '🟢 оба похожи' : '🟠 расходятся'} &nbsp;|&nbsp;
      Суннитский риджаль: ${sunniMatch ? '🟢 оба похожи' : '🟠 расходятся'}
    </p>`;
}

// ── TIMELINE ──────────────────────────────────────────────────────
function openХронология() {
  const centuries = {
    'Сахабы (I до I в.х.)': tx => /(сахаб|сподвижник пророка)/i.test(tx.bio||''),
    'Табиины (I–II в.х.)': tx => /табиин|табии[^н]/i.test((tx.bio||'')+(tx.name||'')),
    'II–III в.х. (Имамы ас-Садик, аль-Казим)': tx => {
      const t = (tx.bio||'').toLowerCase();
      return /имам(а|у|е)? (ас-садик|аль-казим|садика|казима|бакир)/i.test(tx.bio||'') && !/(сахаб|табии)/i.test(t);
    },
    'III–IV в.х. (Имамы ар-Рида — аль-Аскари)': tx => {
      return /имам(а|у|е)? (ар-рида|аль-хади|аль-аскари|риды|хади|аскари)/i.test(tx.bio||'');
    },
    'IV–V в.х. (Малое сокрытие, аль-Кулайни, ас-Садук)': tx => {
      return /(кулайни|садук|туси|муфид|малого сокрытия|муртада|наджаши)/i.test((tx.name||'')+(tx.bio||''));
    },
    'VI–X в.х. (Поздний период)': tx => {
      return /(хилли|шахид|маджлиси|бахрани|джазаири|нури|аббас аль-кумми|хурр аль-амили)/i.test((tx.name||'')+(tx.bio||''));
    },
  };

  let html = '';
  Object.entries(centuries).forEach(([label, test]) => {
    const members = state.data.filter(test);
    if (!members.length) return;
    const chips = members.map(tx => {
      const cls = (tx.shiaStatusStyle||'').includes('trust') ? 'tl-trust' : (tx.shiaStatusStyle||'').includes('disputed') ? 'tl-disputed' : 'tl-weak';
      return `<span class="tl-chip ${cls}" data-id="${tx.id}">${tx.name}</span>`;
    }).join('');
    html += `<div class="tl-century"><div class="tl-century-label">${label} (${members.length})</div><div class="tl-names">${chips}</div></div>`;
  });

  $('timelineContent').innerHTML = html || '<p style="color:var(--text-3);font-size:13px">Данные не найдены</p>';

  // Click to open card
  $('timelineContent').querySelectorAll('.tl-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      closePanel('timelinePanel');
      selectTransmitter(parseInt(chip.dataset.id));
    });
  });

  openPanelEl('timelinePanel');
}

// ── GLOSSARY ──────────────────────────────────────────────────────
function openГлоссарий() {
  const terms = [
    { term: 'Тика (Сика)', arabic: 'ثقة', type: 'trust', def: 'Надёжный передатчик. Высшая положительная оценка в обеих традициях. Означает, что передатчик обладал точной памятью (дабт) и был честен (адала).' },
    { term: 'Джалиль', arabic: 'جليل', type: 'trust', def: 'Великий, выдающийся. Дополнительная характеристика к «тика», указывающая на особый научный авторитет передатчика.' },
    { term: 'Садук', arabic: 'صدوق', type: 'trust', def: 'Правдивый. Оценка ниже «тика» — передатчик честен, но может допускать ошибки. Промежуточный статус между тика и слабым.' },
    { term: 'Муваттак', arabic: 'موثَّق', type: 'disputed', def: 'Подтверждённый. Шиитский термин для передатчиков, надёжность которых признана, даже если их убеждения расходились с имамитской доктриной.' },
    { term: 'Маджхуль', arabic: 'مجهول', type: 'weak', def: 'Неизвестный. Передатчик, о котором ничего не известно риджальским учёным. Его предания не принимаются без дополнительных свидетельств.' },
    { term: 'Даиф', arabic: 'ضعيف', type: 'weak', def: 'Слабый. Передатчик с плохой памятью, нарушением адалы или другими недостатками. Его хадисы не принимаются самостоятельно.' },
    { term: 'Каззаб', arabic: 'كذّاب', type: 'weak', def: 'Лжец. Самая строгая отрицательная оценка. Передатчик, уличённый в намеренном искажении или выдумке хадисов.' },
    { term: 'Матрук', arabic: 'متروك', type: 'weak', def: 'Отброшенный. Передатчик, настолько слабый, что учёные полностью отказались от его преданий.' },
    { term: 'Гулат (Гулувв)', arabic: 'الغلاة', type: 'weak', def: 'Крайние преувеличители. Те, кто приписывал Имамам или сподвижникам божественные атрибуты или другие недопустимые качества. Их предания отвергаются шиитским риджалем.' },
    { term: 'Насиби', arabic: 'الناصبي', type: 'weak', def: 'Враждебный Ахль аль-Байт. Тот, кто открыто демонстрировал ненависть к Имаму Али (а) или его потомкам. Полностью отвергается шиитским риджалем.' },
    { term: 'Вакифит', arabic: 'الواقفية', type: 'disputed', def: 'Остановившийся на Имаме аль-Казиме. Секта, отказавшаяся признать восьмого Имама ар-Риду. Их предания принимаются с осторожностью.' },
    { term: 'Асхаб аль-Иджма', arabic: 'أصحاب الإجماع', type: 'trust', def: '18 передатчиков, относительно которых шиитские учёные достигли консенсуса (иджма) об их исключительной надёжности. Принимаются без дополнительной проверки.' },
    { term: 'Мудаллис', arabic: 'المدلّس', type: 'disputed', def: 'Допускающий тадлис — скрытие разрыва в цепи передачи. Умолчание о промежуточном передатчике. Требует особого внимания при проверке иснада.' },
    { term: 'Адала', arabic: 'العدالة', type: 'trust', def: 'Праведность. Одно из двух главных условий надёжности передатчика наряду с точностью памяти (дабт). Включает искреннюю веру и нравственную чистоту.' },
    { term: 'Дабт', arabic: 'الضبط', type: 'trust', def: 'Точность памяти. Способность передатчика точно запомнить и воспроизвести хадис без ошибок и искажений. Второе главное условие надёжности.' },
    { term: 'Иснад', arabic: 'الإسناد', type: 'trust', def: 'Цепочка передатчиков хадиса. Наука изучения иснадов — основа ильм ар-риджаль. Непрерывный иснад от надёжных передатчиков — критерий достоверности.' },
    { term: 'Марфу\'', arabic: 'المرفوع', type: 'disputed', def: 'Поднятый хадис — тот, цепь которого восходит к Пророку (с) или Имаму. Используется для описания хадисов, прошедших через несколько поколений.' },
    { term: 'Мурсаль', arabic: 'المرسل', type: 'disputed', def: 'Хадис с разрывом в цепи — пропущен один или несколько передатчиков между сподвижником и Пророком. В шиитском риджале некоторые мурсали Ibn Abi Umayr принимаются.' },
  ];

  $('glossaryСписок').innerHTML = terms.map(t => `
    <div class="gloss-item ${t.type === 'weak' ? 'gloss-weak' : t.type === 'disputed' ? 'gloss-disputed' : ''}">
      <div class="gloss-term">${t.term}</div>
      <div class="gloss-arabic">${t.arabic}</div>
      <div class="gloss-def">${t.def}</div>
    </div>`).join('');

  openPanelEl('glossaryPanel');
}

// ═══════════════════════════════════════════════════════════════
// ══ NEW FEATURES ════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ── Reliability score calculation ─────────────────────────────
function calcScore(tx) {
  if (tx.score !== undefined) return tx.score;
  let score = 50;
  const shia = (tx.shiaStatusStyle || '');
  const sunni = (tx.sunniStatusStyle || '');
  if (shia.includes('trust')) score += 20;
  else if (shia.includes('disputed')) score += 5;
  else score -= 15;
  if (sunni.includes('trust')) score += 20;
  else if (sunni.includes('disputed')) score += 5;
  else score -= 15;
  const srcCount = (tx.sources || []).length;
  score += Math.min(srcCount * 3, 15);
  // Agree bonus
  if (shia.includes('trust') && sunni.includes('trust')) score += 10;
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

// ── RELIABILITY INDEX PANEL ────────────────────────────────────
function openReliability() {
  const ranked = [...state.data]
    .map(tx => ({ tx, score: calcScore(tx) }))
    .sort((a, b) => b.score - a.score);

  const topВсе = ranked.slice(0, 30);
  let html = `<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px">Топ-30 передатчиков по индексу надёжности</div>`;

  topВсе.forEach(({ tx, score }, i) => {
    const col = scoreColor(score);
    html += `<div class="rel-item">
      <span class="rel-rank">${i + 1}</span>
      <span class="rel-name" data-id="${tx.id}">${tx.name}</span>
      <div class="rel-score-wrap">
        <div class="rel-bar-track"><div class="rel-bar-fill" style="width:${score}%;background:${col}"></div></div>
        <span class="rel-score-num" style="color:${col}">${score}</span>
      </div>
    </div>`;
  });

  $('reliabilityContent').innerHTML = html;
  $('reliabilityContent').querySelectorAll('.rel-name[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      closePanel('reliabilityPanel');
      selectTransmitter(parseInt(el.dataset.id));
    });
  });

  openPanelEl('reliabilityPanel');
}

// ── ISNАД ANALYSER ─────────────────────────────────────────────
function openIsnad() {
  $('isnadInput').value = '';
  $('isnadResult').innerHTML = '';
  openPanelEl('isnadPanel');
}

function analyseIsnad() {
  const raw = $('isnadInput').value.trim();
  if (!raw) { toast('Введите хотя бы одно имя'); return; }

  const names = raw.split(/[,،\n]+/).map(s => s.trim()).filter(Boolean);
  if (names.length === 0) return;

  // Match against database
  function findTx(name) {
    const q = name.toLowerCase();
    return state.data.find(tx =>
      tx.name.toLowerCase().includes(q) ||
      (tx.arabicName && tx.arabicName.includes(q)) ||
      q.includes(tx.name.toLowerCase().substring(0, 6))
    );
  }

  const links = names.map(name => {
    const tx = findTx(name);
    if (!tx) return { name, status: 'unknown', label: 'Не найден', score: 30 };
    const style = tx.shiaStatusStyle || '';
    if (style.includes('trust')) return { name: tx.name, status: 'trust', label: tx.shiaStatus || 'Надёжный', score: calcScore(tx) };
    if (style.includes('disputed')) return { name: tx.name, status: 'disputed', label: tx.shiaStatus || 'Спорный', score: calcScore(tx) };
    return { name: tx.name, status: 'weak', label: tx.shiaStatus || 'Слабый', score: calcScore(tx) };
  });

  // Verdict
  const weakCount = links.filter(l => l.status === 'weak').length;
  const unknownCount = links.filter(l => l.status === 'unknown').length;
  const disputedCount = links.filter(l => l.status === 'disputed').length;
  const trustCount = links.filter(l => l.status === 'trust').length;

  let verdictIcon, verdictTitle, verdictDesc, verdictColor;
  if (weakCount > 0 || unknownCount > 1) {
    verdictIcon = '⛔';
    verdictTitle = 'Иснад слабый (Даиф)';
    verdictDesc = `Цепочка содержит ${weakCount + unknownCount} ненадёжных звена. Хадис не может быть принят самостоятельно.`;
    verdictColor = '#fb7185';
  } else if (unknownCount === 1 || disputedCount > 0) {
    verdictIcon = '⚠️';
    verdictTitle = 'Иснад сомнительный (Муталасин)';
    verdictDesc = `Присутствуют спорные или неизвестные звенья. Требует дополнительной проверки.`;
    verdictColor = '#fbbf24';
  } else if (trustCount === links.length) {
    verdictIcon = '✅';
    verdictTitle = 'Иснад достоверный (Сахих)';
    verdictDesc = `Все ${links.length} звена цепочки — надёжные передатчики. Хадис может быть принят как достоверный.`;
    verdictColor = '#34d399';
  } else {
    verdictIcon = '🔶';
    verdictTitle = 'Иснад хороший (Хасан)';
    verdictDesc = `Большинство передатчиков надёжны. Хадис принимается с оговорками.`;
    verdictColor = '#fbbf24';
  }

  let chainHtml = '<div class="isnad-chain">';
  links.forEach((link, i) => {
    if (i > 0) chainHtml += `<div class="isnad-connector">↓</div>`;
    chainHtml += `<div class="isnad-link ${link.status}">
      <span class="isnad-link-name">${link.name}</span>
      <span class="isnad-link-status ${link.status}">${link.label}</span>
    </div>`;
  });
  chainHtml += '</div>';

  chainHtml += `<div class="isnad-verdict">
    <div class="isnad-verdict-icon">${verdictIcon}</div>
    <div class="isnad-verdict-text">
      <div class="isnad-verdict-title" style="color:${verdictColor}">${verdictTitle}</div>
      <div class="isnad-verdict-desc">${verdictDesc}</div>
    </div>
  </div>`;

  $('isnadResult').innerHTML = chainHtml;
}

// ── CONFLICT MAP ───────────────────────────────────────────────
function openConflict() {
  // Find transmitters where shia and sunni assessments conflict significantly
  const conflicts = state.data.filter(tx => {
    const shia = tx.shiaStatusStyle || '';
    const sunni = tx.sunniStatusStyle || '';
    if (shia.includes('trust') && sunni.includes('weak')) return true;
    if (shia.includes('trust') && !sunni.includes('trust')) return true;
    if (sunni.includes('trust') && shia.includes('weak')) return true;
    return false;
  });

  function conflictReason(tx) {
    const shia = tx.shiaStatusStyle || '';
    const sunni = tx.sunniStatusStyle || '';
    const bio = (tx.bio || '').toLowerCase();
    const analysis = (tx.analysis || '').toLowerCase();
    if (bio.includes('шиит') || bio.includes('тшайяу') || analysis.includes('шиит')) {
      return 'Шиитские убеждения — причина снижения суннитской оценки';
    }
    if (shia.includes('trust') && sunni.includes('weak')) {
      return 'Шиитские источники принимают, суннитские — отвергают';
    }
    if (sunni.includes('trust') && !shia.includes('trust')) {
      return 'Суннитская традиция признаёт, шиитская — относится критически';
    }
    return 'Расхождение критериев между двумя традициями';
  }

  if (!conflicts.length) {
    $('conflictContent').innerHTML = '<p style="color:var(--text-3);font-size:14px">Явных противоречий не обнаружено</p>';
    openPanelEl('conflictPanel');
    return;
  }

  $('conflictContent').innerHTML = conflicts.slice(0, 40).map(tx => {
    const shiaStyle = (tx.shiaStatusStyle || '').includes('trust') ? 'trust' : (tx.shiaStatusStyle || '').includes('disputed') ? 'disputed' : 'weak';
    const sunniStyle = (tx.sunniStatusStyle || '').includes('trust') ? 'trust' : (tx.sunniStatusStyle || '').includes('disputed') ? 'disputed' : 'weak';
    const colors = { trust: '#34d399', disputed: '#fbbf24', weak: '#fb7185' };
    return `<div class="conflict-item" data-id="${tx.id}">
      <div class="conflict-name">${tx.name}</div>
      <div class="conflict-arabic">${tx.arabicName || ''}</div>
      <div class="conflict-row">
        <span class="conflict-tag" style="background:${colors[shiaStyle]}22;color:${colors[shiaStyle]};border:1px solid ${colors[shiaStyle]}44">
          ☽ Шиа: ${tx.shiaStatus || '—'}
        </span>
        <span class="conflict-tag" style="background:${colors[sunniStyle]}22;color:${colors[sunniStyle]};border:1px solid ${colors[sunniStyle]}44">
          ☀ Сунна: ${tx.sunniStatus || '—'}
        </span>
      </div>
      <div class="conflict-reason">${conflictReason(tx)}</div>
    </div>`;
  }).join('');

  $('conflictContent').querySelectorAll('.conflict-item[data-id]').forEach(el => {
    el.addEventListener('click', () => {
      closePanel('conflictPanel');
      selectTransmitter(parseInt(el.dataset.id));
    });
  });

  openPanelEl('conflictPanel');
}

// ── HILALI METHOD ──────────────────────────────────────────────
function openHilali() {
  $('hilaliContent').innerHTML = `
    <p style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:20px">
      <strong style="color:var(--teal-light)">Аллама аль-Хилли (аль-Хасан ибн Юсуф аль-Хилли, 648–726 г.х.)</strong> — величайший риджалист шиитской традиции. Его труд 
      <em>«Хуляса аль-Акваль»</em> (<span style="font-family:var(--font-arabic);font-size:15px">خلاصة الأقوال</span>) стал основой шиитской методологии оценки передатчиков.
    </p>

    <div class="method-card-grid">
      <div class="method-card">
        <div class="method-card-title">Главный труд</div>
        <div class="method-card-val">خلاصة الأقوال</div>
        <div class="method-card-desc">«Хуляса аль-Акваль фи Ма'рифат ар-Риджаль» — энциклопедия передатчиков шиитской традиции</div>
      </div>
      <div class="method-card">
        <div class="method-card-title">Два раздела</div>
        <div class="method-card-val" style="font-size:14px">المعتمدون / غير المعتمدين</div>
        <div class="method-card-desc">«Принятые» и «непринятые» — двойная система классификации передатчиков</div>
      </div>
    </div>

    <div style="font-size:11px;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;font-weight:600">Пять критериев оценки передатчика</div>

    <div class="hilali-step">
      <div class="hilali-num">1</div>
      <div class="hilali-body">
        <div class="hilali-title">Адала — Праведность</div>
        <div class="hilali-title-ar">العدالة</div>
        <div class="hilali-desc">Передатчик должен быть мусульманином, зрелым, разумным и честным. Любое нарушение нравственных норм или явное отступление от веры делает его «адалу» недействительной.</div>
        <div class="hilali-example">Пример: Аль-Хилли отвергал передатчиков-гулатов, даже если другие учёные их принимали — из-за нарушения адалы в вопросах акиды.</div>
      </div>
    </div>

    <div class="hilali-step">
      <div class="hilali-num">2</div>
      <div class="hilali-body">
        <div class="hilali-title">Дабт — Точность памяти</div>
        <div class="hilali-title-ar">الضبط</div>
        <div class="hilali-desc">Способность точно запомнить услышанный хадис и воспроизвести его без ошибок. Различают «дабт ас-садр» (точность памяти) и «дабт аль-китаб» (точность записей).</div>
        <div class="hilali-example">Пример: Передатчики с хорошей записью, но плохой памятью могли получать оценку «садук» вместо «тика».</div>
      </div>
    </div>

    <div class="hilali-step">
      <div class="hilali-num">3</div>
      <div class="hilali-body">
        <div class="hilali-title">Имамия — Принятие Имамата</div>
        <div class="hilali-title-ar">الإمامية</div>
        <div class="hilali-desc">В шиитской методологии аль-Хилли вера в имамат двенадцати является частью адалы. Передатчики-вакифиты, исмаилиты и другие сектанты классифицируются особо — как «муваттак» (подтверждённые), но не «тика».</div>
        <div class="hilali-example">Пример: Али ибн Фаддаль — вакифит, но его предания принимаются из-за его исключительного дабта.</div>
      </div>
    </div>

    <div class="hilali-step">
      <div class="hilali-num">4</div>
      <div class="hilali-body">
        <div class="hilali-title">Иттисаль — Непрерывность цепи</div>
        <div class="hilali-title-ar">الاتصال</div>
        <div class="hilali-desc">Каждое звено иснада должно непосредственно слышать хадис от предыдущего передатчика. Прерывистые (мурсаль) или поднятые без подтверждения (мар‐фу') иснады требуют отдельного исследования.</div>
        <div class="hilali-example">Исключение: Мурсали Ибн Аби Умайра принимаются шиитскими учёными без дополнительной проверки — из-за его исключительного положения.</div>
      </div>
    </div>

    <div class="hilali-step">
      <div class="hilali-num">5</div>
      <div class="hilali-body">
        <div class="hilali-title">Асхаб аль-Иджма</div>
        <div class="hilali-title-ar">أصحاب الإجماع</div>
        <div class="hilali-desc">18 передатчиков, по которым среди шиитских учёных достигнут консенсус об исключительной надёжности. Их предания принимаются без дополнительной проверки слабых промежуточных звеньев.</div>
        <div class="hilali-example">Список: Зурара, Мухаммад ибн Муслим, Абу Басир, Буррайд аль-Иджли, Фудайль ибн Ясар, Ибн Аби Умайр, Юнус ибн Абдуррахман и другие.</div>
      </div>
    </div>

    <div style="background:var(--ink-2);border-radius:var(--radius);padding:16px;margin-top:8px;border:1px solid var(--border-bright)">
      <div style="font-size:11px;color:var(--teal);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;font-weight:600">Классификация хадисов по иснаду (аль-Хилли)</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
        <div><span style="color:#34d399;font-weight:600">Сахих صحيح</span> — все передатчики: шиитские имамиты с тика</div>
        <div><span style="color:#34d399;font-weight:500">Хасан حسن</span> — все имамиты, но без явного тавсика (хвалы)</div>
        <div><span style="color:#fbbf24;font-weight:600">Муваттак موثّق</span> — есть ненимамиты, но подтверждённые</div>
        <div><span style="color:#fbbf24;font-weight:500">Кавий قوي</span> — промежуточный статус, не попадает в выше</div>
        <div><span style="color:#fb7185;font-weight:600">Даиф ضعيف</span> — есть слабые или неизвестные передатчики</div>
      </div>
    </div>
  `;
  openPanelEl('hilaliPanel');
}

// ── QUIZ ───────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    q: 'Что означает термин «Тика» (ثقة)?',
    arabic: 'ثقة',
    options: ['Слабый передатчик', 'Надёжный, заслуживающий доверия', 'Неизвестный передатчик', 'Лжец'],
    correct: 1,
    explanation: 'Тика (ثقة) — высшая положительная оценка: передатчик честен (адала) и обладает точной памятью (дабт). Принимается в обеих традициях.'
  },
  {
    q: 'Кого называют «Каззаб» (كذّاب)?',
    arabic: 'كذّاب',
    options: ['Великого передатчика', 'Забывчивого передатчика', 'Намеренного лжеца, выдумщика хадисов', 'Неопытного передатчика'],
    correct: 2,
    explanation: 'Каззаб (كذّاب) — самая тяжёлая отрицательная оценка. Передатчик, уличённый в намеренном изобретении или искажении хадисов. Его предания полностью отвергаются.'
  },
  {
    q: 'Что такое «Асхаб аль-Иджма»?',
    arabic: 'أصحاب الإجماع',
    options: [
      '5 ближайших сподвижников Пророка',
      '18 передатчиков, чья надёжность подтверждена консенсусом шиитских учёных',
      'Авторы книг риджаля',
      'Судьи халифата, проверявшие хадисы'
    ],
    correct: 1,
    explanation: 'Асхаб аль-Иджма — 18 передатчиков, относительно которых шиитские учёные достигли консенсуса об их исключительной надёжности. Их хадисы принимаются без дополнительной проверки промежуточных звеньев.'
  },
  {
    q: 'Что такое «Маджхуль» в науке риджаля?',
    arabic: 'مجهول',
    options: ['Передатчик с плохой памятью', 'Передатчик, о котором нет сведений в книгах риджаля', 'Передатчик, изменивший мазхаб', 'Тот, кто передавал только от одного шейха'],
    correct: 1,
    explanation: 'Маджхуль (مجهول) — «неизвестный». Передатчик, о биографии и надёжности которого у учёных нет достаточных сведений. Его хадисы не принимаются самостоятельно.'
  },
  {
    q: 'Кто написал главный шиитский труд по риджалю — «Риджаль ан-Наджаши»?',
    arabic: 'رجال النجاشي',
    options: ['Аллама аль-Хилли', 'Ахмад ибн Али ан-Наджаши (450 г.х.)', 'Аль-Кулайни', 'Шейх ат-Туси'],
    correct: 1,
    explanation: 'Ахмад ибн Али ан-Наджаши (385–450 г.х.) написал «Риджаль ан-Наджаши» — биобиблиографическую энциклопедию шиитских передатчиков. Считается наиболее авторитетным первоисточником шиитского риджаля.'
  },
  {
    q: 'Что означает «Муваттак» в шиитской традиции?',
    arabic: 'موثَّق',
    options: [
      'То же, что «тика»',
      'Надёжный ненимамит — его хадисы принимаются, несмотря на убеждения',
      'Слабый, но допустимый',
      'Передатчик с разрывом в иснаде'
    ],
    correct: 1,
    explanation: 'Муваттак (موثَّق) — специфически шиитский термин: передатчик, надёжность которого подтверждена, но он не был имамитом. Его хадисы принимаются, несмотря на отклонения в убеждениях.'
  },
  {
    q: 'Что такое «Гулат» в контексте риджаля?',
    arabic: 'الغلاة',
    options: [
      'Великие учёные Имамов',
      'Те, кто приписывал Имамам или сподвижникам чрезмерные (недопустимые) качества',
      'Передатчики-сподвижники',
      'Критики хадисов'
    ],
    correct: 1,
    explanation: 'Гулат (الغلاة) — «крайние преувеличители». Те, кто приписывал Имамам божественные атрибуты или иные недозволенные качества. Шиитские учёные отвергают их предания.'
  },
  {
    q: 'Какова разница между «Сахих» и «Хасан» по классификации аль-Хилли?',
    arabic: 'صحيح ≠ حسن',
    options: [
      'Нет разницы — синонимы',
      'Сахих: все передатчики — имамиты с явным тика. Хасан: имамиты, но без явной похвалы',
      'Хасан выше Сахих',
      'Сахих — суннитский термин, Хасан — шиитский'
    ],
    correct: 1,
    explanation: 'По методологии аль-Хилли: Сахих (صحيح) — все передатчики являются шиитскими имамитами с явным тика (تعديل صريح). Хасан (حسن) — все имамиты, но без явного тавсика — только похвала без чёткого «тика».'
  },
  {
    q: 'Что такое «Иснад» в хадисных науках?',
    arabic: 'الإسناد',
    options: [
      'Текст хадиса (матн)',
      'Цепочка передатчиков, по которой хадис дошёл до нас',
      'Книга хадисов',
      'Метод запоминания хадисов'
    ],
    correct: 1,
    explanation: 'Иснад (الإسناد) — «опора, цепь». Последовательность имён передатчиков, по которой хадис передавался от Пророка (с) или Имама до записи. Изучение иснадов — основа науки ар-риджаль.'
  },
  {
    q: 'Кем был Абу Зарр аль-Гифари в шиитской традиции?',
    arabic: 'أبو ذر الغفاري',
    options: [
      'Критиком Имама Али (а)',
      'Образцом непримиримости к несправедливости, близким соратником Имама Али (а)',
      'Суннитским учёным',
      'Вакифитом'
    ],
    correct: 1,
    explanation: 'Абу Зарр аль-Гифари — один из первых сподвижников Пророка (с), известный аскетичностью и борьбой за справедливость. Был изгнан Усманом за критику. В шиитской традиции почитается как образец верности Имаму Али (а).'
  },
];

let quizState = { q: 0, score: 0, answered: false, total: QUIZ_QUESTIONS.length };

function openТест() {
  quizState = { q: 0, score: 0, answered: false, total: QUIZ_QUESTIONS.length };
  renderТестQuestion();
  openPanelEl('quizPanel');
}

function renderТестQuestion() {
  const { q, score, total } = quizState;
  const qEl = $('quizContent');

  if (q >= total) {
    // Final score
    const pct = Math.round((score / total) * 100);
    let msg = score <= 3 ? '📖 Продолжайте изучать!' : score <= 6 ? '🌙 Хороший результат!' : score <= 8 ? '⭐ Отлично!' : '🏆 Мастер риджаля!';
    qEl.innerHTML = `<div class="quiz-score-wrap">
      <div class="quiz-score-num">${score}/${total}</div>
      <div class="quiz-score-label">${pct}% правильных ответов</div>
      <div class="quiz-score-message">${msg}</div>
      <button class="cmp-btn" style="margin-top:20px" onclick="openТест()">🔄 Начать заново</button>
    </div>`;
    return;
  }

  const question = QUIZ_QUESTIONS[q];
  quizState.answered = false;
  const pct = (q / total) * 100;

  qEl.innerHTML = `
    <div class="quiz-progress">
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
      <span class="quiz-progress-text">${q + 1} / ${total}</span>
    </div>
    <div class="quiz-question">${question.q}</div>
    <div class="quiz-arabic">${question.arabic}</div>
    <div class="quiz-options" id="quizOptions">
      ${question.options.map((opt, i) => `
        <button class="quiz-option" data-idx="${i}">${opt}</button>
      `).join('')}
    </div>
    <div id="quizExplanation" style="display:none" class="quiz-explanation"></div>
    <button class="cmp-btn" id="quizNext" style="display:none">Следующий вопрос →</button>
  `;

  qEl.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (quizState.answered) return;
      quizState.answered = true;
      const chosen = parseInt(btn.dataset.idx);
      const correct = question.correct;

      qEl.querySelectorAll('.quiz-option').forEach((b, i) => {
        if (i === correct) b.classList.add('correct');
        else if (i === chosen && chosen !== correct) b.classList.add('wrong');
        else b.classList.add('reveal');
        b.disabled = true;
      });

      if (chosen === correct) quizState.score++;

      const expEl = $('quizExplanation');
      expEl.textContent = question.explanation;
      expEl.style.display = 'block';

      const nextBtn = $('quizNext');
      nextBtn.style.display = 'block';
      nextBtn.addEventListener('click', () => {
        quizState.q++;
        renderТестQuestion();
      });
    });
  });
}

// ── Attach new panel events ────────────────────────────────────
function initNewPanelEvents() {
  // Isnад
  $('btnIsnad').addEventListener('click', openIsnad);
  $('isnadClose').addEventListener('click', () => closePanel('isnadPanel'));
  $('isnadGo').addEventListener('click', analyseIsnad);
  $('isnadPanel').addEventListener('click', e => { if (e.target === $('isnadPanel')) closePanel('isnadPanel'); });

  // Reliability
  $('btnReliability').addEventListener('click', openReliability);
  $('reliabilityClose').addEventListener('click', () => closePanel('reliabilityPanel'));
  $('reliabilityPanel').addEventListener('click', e => { if (e.target === $('reliabilityPanel')) closePanel('reliabilityPanel'); });

  // Тест
  $('btnТест').addEventListener('click', openТест);
  $('quizClose').addEventListener('click', () => closePanel('quizPanel'));
  $('quizPanel').addEventListener('click', e => { if (e.target === $('quizPanel')) closePanel('quizPanel'); });

  // Hilali
  $('btnHilali').addEventListener('click', openHilali);
  $('hilaliClose').addEventListener('click', () => closePanel('hilaliPanel'));
  $('hilaliPanel').addEventListener('click', e => { if (e.target === $('hilaliPanel')) closePanel('hilaliPanel'); });

  // Заметки panel
  $('btnЗаметки').addEventListener('click', openЗаметки);
  $('notesClose').addEventListener('click', () => closePanel('notesPanel'));
  $('notesPanel').addEventListener('click', e => { if (e.target === $('notesPanel')) closePanel('notesPanel'); });
  $('notesSave').addEventListener('click', saveNote);
  $('notesClear').addEventListener('click', () => { $('notesTextarea').value = ''; });

  // Заметки button in detail view
  $('btnNoteDetail').addEventListener('click', () => {
    if (state.activeId === null) return;
    openЗаметки(state.activeId);
  });

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
      toast('↕ Сортировка применена');
    });
  });

  // Conflict
  $('btnConflict').addEventListener('click', openConflict);
  $('conflictClose').addEventListener('click', () => closePanel('conflictPanel'));
  $('conflictPanel').addEventListener('click', e => { if (e.target === $('conflictPanel')) closePanel('conflictPanel'); });

  // Geography
  $('btnGeography').addEventListener('click', openGeography);
  $('geographyClose').addEventListener('click', () => closePanel('geographyPanel'));
  $('geographyPanel').addEventListener('click', e => { if (e.target === $('geographyPanel')) closePanel('geographyPanel'); });

  // Genealogy
  $('btnGenealogy').addEventListener('click', openGenealogy);
  $('genealogyClose').addEventListener('click', () => closePanel('genealogyPanel'));
  $('genealogyPanel').addEventListener('click', e => { if (e.target === $('genealogyPanel')) closePanel('genealogyPanel'); });

  // Scroll-to-top
  let contentScrollRAF = 0;
  $('content').addEventListener('scroll', () => {
    if (contentScrollRAF) return;
    contentScrollRAF = requestAnimationFrame(() => {
      const scrollY = $('content').scrollTop;
      $('btnScrollTop').classList.toggle('visible', scrollY > 300);
      const total = $('content').scrollHeight - $('content').clientHeight;
      const pct = total > 0 ? (scrollY / total * 100).toFixed(1) : 0;
      $('readingProgress').style.width = pct + '%';
      contentScrollRAF = 0;
    });
  }, { passive: true });
  $('btnScrollTop').addEventListener('click', () => {
    $('content').scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ═══════════════════════════════════════
// NOTES SYSTEM
// ═══════════════════════════════════════
function openЗаметки(txId) {
  const isDetail = typeof txId === 'number';
  const key = isDetail ? `tx_${txId}` : 'global';
  const tx = isDetail ? state.data[txId] : null;

  $('notesCurrentTitle').textContent = tx
    ? `Заметка для: ${tx.name} (${tx.arabicName || ''})`
    : 'Общие заметки';
  $('notesTextarea').value = (notesStore[key] && notesStore[key].text) || '';

  // Render saved notes list
  const notesСписок = $('notesСписок');
  const allЗаметки = Object.entries(notesStore).filter(([k, v]) => v.text && v.text.trim());
  if (allЗаметки.length === 0) {
    notesСписок.innerHTML = '<p style="font-size:13px;color:var(--text-3)">Заметок пока нет</p>';
  } else {
    notesСписок.innerHTML = '<div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Сохранённые заметки</div>' +
      allЗаметки.map(([k, v]) => {
        const label = k === 'global' ? '🌐 Общие' : `📌 ${v.title || k}`;
        return `<div class="note-card">
          <div class="note-card-title">${label}</div>
          <div class="note-card-body">${v.text.slice(0, 200)}${v.text.length > 200 ? '…' : ''}</div>
          <div class="note-card-meta">${v.date || ''}</div>
          <button class="note-card-del" data-key="${k}" title="Удалить">✕</button>
        </div>`;
      }).join('');
    notesСписок.querySelectorAll('.note-card-del').forEach(btn => {
      btn.addEventListener('click', () => {
        delete notesStore[btn.dataset.key];
        saveЗаметкиStore();
        openЗаметки(isDetail ? txId : undefined);
        toast('🗑 Заметка удалена');
      });
    });
    // Click on card to load
    notesСписок.querySelectorAll('.note-card').forEach((card, i) => {
      const [k] = allЗаметки[i];
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('note-card-del')) return;
        $('notesTextarea').value = notesStore[k].text;
        $('notesCurrentTitle').textContent = notesStore[k].title || k;
      });
    });
  }

  openPanelEl('notesPanel');
}

function saveNote() {
  const text = $('notesTextarea').value.trim();
  if (!text) { toast('⚠ Заметка пуста'); return; }
  const key = state.activeId !== null
    ? `tx_${state.activeId}`
    : 'global';
  const tx = state.activeId !== null ? state.data[state.activeId] : null;
  notesStore[key] = {
    text,
    title: tx ? tx.name : 'Общие заметки',
    date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };
  saveЗаметкиStore();
  toast('💾 Заметка сохранена');
  openЗаметки(state.activeId !== null ? state.activeId : undefined);
}

// ═══════════════════════════════════════
// SORT
// ═══════════════════════════════════════
function openSort() {
  openPanelEl('sortPanel');
}

// ═══════════════════════════════════════
// GEOGRAPHY
// ═══════════════════════════════════════
let geoData = null;
let geoЗагрузка = false;

async function loadGeoData() {
  if (geoData || geoЗагрузка) return geoData;
  geoЗагрузка = true;
  try {
    const res = await fetch('geography.json');
    if (res.ok) geoData = await res.json();
  } catch(e) {
    console.warn('geography.json not found:', e);
  }
  geoЗагрузка = false;
  return geoData;
}

async function openGeography() {
  openPanelEl('geographyPanel');
  const mapEl = $('geographyMap');
  const listEl = $('geographyCityСписок');

  mapEl.innerHTML = '<div class="ar-loading" style="margin:20px auto;display:flex;justify-content:center">Загрузка данных...</div>';
  listEl.innerHTML = '';

  const data = await loadGeoData();
  if (!data) {
    mapEl.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px;font-size:13px">⚠ Файл geography.json не найден рядом с index.html</div>';
    return;
  }

  renderGeoMap(data);
  renderGeoCityСписок(data);
}

function renderGeoMap(data) {
  const mapEl = $('geographyMap');
  // Bounding box for the Middle East/Iran region we cover (approx)
  const LAT_MIN = 15, LAT_MAX = 38;
  const LNG_MIN = 30, LNG_MAX = 62;
  const W = 680, H = 320;

  function project(lat, lng) {
    const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
    const y = H - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * H;
    return [x, y];
  }

  const cities = Object.entries(data.cities);
  const maxCount = Math.max(...cities.map(([,c]) => c.count));

  let svg = `<svg class="geo-svg-wrap" viewBox="0 0 ${W} ${H}" width="100%" height="${Math.min(H, 360)}" xmlns="http://www.w3.org/2000/svg" style="display:block">`;
  // Simple grid background
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * W;
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="var(--border)" stroke-width="1"/>`;
  }
  for (let i = 0; i <= 4; i++) {
    const y = (i / 4) * H;
    svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
  }

  cities.forEach(([key, city]) => {
    const [x, y] = project(city.lat, city.lng);
    const r = 4 + (city.count / maxCount) * 14;
    svg += `<g class="geo-pin" data-city="${key}" transform="translate(${x},${y})">
      <circle r="${r}" fill="var(--teal)" fill-opacity="0.35" stroke="var(--teal)" stroke-width="1.5"/>
      <circle r="2.5" fill="var(--teal-light)"/>
      <text class="geo-pin-label" x="0" y="${-r - 6}" text-anchor="middle">${city.label}</text>
    </g>`;
  });

  svg += `</svg>`;
  mapEl.innerHTML = svg;

  mapEl.querySelectorAll('.geo-pin').forEach(pin => {
    pin.addEventListener('click', () => {
      const key = pin.dataset.city;
      mapEl.querySelectorAll('.geo-pin').forEach(p => p.classList.toggle('active', p === pin));
      const card = $('geographyCityСписок').querySelector(`[data-city-card="${key}"]`);
      if (card) {
        $('geographyCityСписок').querySelectorAll('.geo-city-card').forEach(c => c.classList.toggle('active', c === card));
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

function renderGeoCityСписок(data) {
  const listEl = $('geographyCityСписок');
  const cities = Object.entries(data.cities).sort((a,b) => b[1].count - a[1].count);

  listEl.innerHTML = cities.map(([key, city]) => `
    <div class="geo-city-card" data-city-card="${key}">
      <div class="geo-city-head">
        <span>${city.label} <span class="geo-city-arabic">${city.arabic}</span></span>
        <span class="geo-city-count">${city.count}</span>
      </div>
      <div class="geo-city-tx-list">
        ${city.transmitters.map(tx => `
          <div class="geo-tx-link" data-id="${tx.id}">
            <span class="geo-tx-dot ${tx.shiaStatusStyle || 'status-weak'}"></span>
            <span>${tx.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.geo-city-card').forEach(card => {
    const head = card.querySelector('.geo-city-head');
    head.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      listEl.querySelectorAll('.geo-city-card').forEach(c => c.classList.remove('active'));
      $('geographyMap').querySelectorAll('.geo-pin').forEach(p => p.classList.remove('active'));
      if (!isActive) {
        card.classList.add('active');
        const key = card.dataset.cityCard;
        const pin = $('geographyMap').querySelector(`[data-city="${key}"]`);
        if (pin) pin.classList.add('active');
      }
    });
  });

  listEl.querySelectorAll('.geo-tx-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(link.dataset.id);
      closePanel('geographyPanel');
      selectTransmitter(id);
    });
  });
}

// ═══════════════════════════════════════
// GРУEALOGY TREE
// ═══════════════════════════════════════
let genData = null;
let genЗагрузка = false;

async function loadGenData() {
  if (genData || genЗагрузка) return genData;
  genЗагрузка = true;
  try {
    const res = await fetch('genealogy.json');
    if (res.ok) genData = await res.json();
  } catch(e) {
    console.warn('genealogy.json not found:', e);
  }
  genЗагрузка = false;
  return genData;
}

async function openGenealogy() {
  openPanelEl('genealogyPanel');
  const treeEl = $('genealogyTree');
  treeEl.innerHTML = '<div class="ar-loading" style="margin:20px auto;display:flex;justify-content:center">Загрузка данных...</div>';

  const data = await loadGenData();
  if (!data) {
    treeEl.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px;font-size:13px">⚠ Файл genealogy.json не найден рядом с index.html</div>';
    return;
  }

  renderGenTree(data);
}

function renderGenNode(nodeId, data, depth) {
  const node = data.nodes[String(nodeId)];
  if (!node) return '';

  const isImam = !!node.isImam;
  const hasDataEntry = !isImam && state.data.find(tx => tx.id === node.id);

  const badge = isImam
    ? '<span class="gen-node-badge">إمام</span>'
    : (hasDataEntry ? `<span class="gen-node-badge">#${node.id + 1}</span>` : '');

  let html = `<div class="gen-node-wrap">
    <div class="gen-node ${isImam ? 'gen-imam' : ''}" ${!isImam ? `data-id="${node.id}"` : ''}>
      <span>${node.name}</span>
      ${badge}
    </div>`;

  if (node.students && node.students.length) {
    html += `<div class="gen-children">`;
    node.students.forEach(sid => {
      html += renderGenNode(sid, data, depth + 1);
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function renderGenTree(data) {
  const treeEl = $('genealogyTree');
  let html = '';
  data.roots.forEach(rootId => {
    html += `<div class="gen-root">${renderGenNode(rootId, data, 0)}</div>`;
  });
  treeEl.innerHTML = html;

  treeEl.querySelectorAll('.gen-node[data-id]').forEach(node => {
    node.addEventListener('click', () => {
      const id = parseInt(node.dataset.id);
      if (state.data.find(tx => tx.id === id)) {
        closePanel('genealogyPanel');
        selectTransmitter(id);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// Service Worker inline via blob

if ('serviceWorker' in navigator) {
  const swCode = `const CACHE_NAME = 'rijal-v1';
const ASSETS = [
  './',
  './index.html',
  './transmitters.json',
  './transmitters2.json',
  './transmitters3.json',
  './transmitters4.json',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
`;
  const blob = new Blob([swCode], {type: 'application/javascript'});
  const swUrl = URL.createObjectURL(blob);
  navigator.serviceWorker.register(swUrl).catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('Init failed:', err);
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  });
});


// ═══════════════════════════════════════
// DONATION MODAL
// ═══════════════════════════════════════

function openDonateModal() {
  const ov = document.getElementById('donateOverlay');
  if (!ov) return;
  ov.style.display = 'flex';
  ov.classList.remove('hiding');
  ov.classList.add('open');
  requestAnimationFrame(() => {
    const box = document.getElementById('donateBox');
    if (box) box.focus();
  });
}

function closeDonateModal() {
  const ov = document.getElementById('donateOverlay');
  if (!ov) return;
  ov.classList.remove('open');
  ov.classList.add('hiding');
  setTimeout(() => { ov.style.display = 'none'; ov.classList.remove('hiding'); }, 260);
}

function copyWallet(rowEl, addr) {

  const cleanAddr = addr.replace(/\s/g, '');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cleanAddr).catch(() => fallbackCopy(cleanAddr));
  } else {
    fallbackCopy(cleanAddr);
  }
  // Visual feedback on the row
  const orig = rowEl.style.borderColor;
  rowEl.style.borderColor = 'rgba(13,148,136,.7)';
  rowEl.style.background = 'rgba(13,148,136,.08)';
  const copyBtn = rowEl.querySelector('.wallet-copy');
  if (copyBtn) { const t = copyBtn.textContent; copyBtn.textContent = '✓ Скопировано'; setTimeout(() => { copyBtn.textContent = t; }, 2000); }
  setTimeout(() => { rowEl.style.borderColor = orig; rowEl.style.background = ''; }, 1800);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;top:-9999px';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  ta.remove();
}


(function initDonateModal() {
  const openBtn = document.getElementById('btnDonate');
  if (openBtn) openBtn.addEventListener('click', openDonateModal);

  const closeIds = ['donateDismissTop', 'donateDismissBottom'];
  closeIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', closeDonateModal);
  });

  const ov = document.getElementById('donateOverlay');
  if (ov) ov.addEventListener('click', function(e) {
    if (e.target === ov) closeDonateModal();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeDonateModal();
  });
})();



// ═══════════════════════════════════════
// EXTRA ANIMATIONS + RUSSIAN-ONLY ENFORCEMENT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Force Russian UI visually and in storage
    state.lang = 'ru';
    try { localStorage.setItem('rijal_lang', 'ru'); } catch(e) {}

    // Subtle pointer-driven glow on desktop only
    const finePointer = window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (finePointer) {
      let raf = 0;
      let lastX = 50;
      let lastY = 50;
      const setPointer = (e) => {
        lastX = (e.clientX / window.innerWidth) * 100;
        lastY = (e.clientY / window.innerHeight) * 100;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          document.body.style.setProperty('--mx', lastX + '%');
          document.body.style.setProperty('--my', lastY + '%');
          raf = 0;
        });
      };
      window.addEventListener('pointermove', setPointer, { passive: true });
    }

    // Floating particles only on desktop
    let fx = document.getElementById('fxLayer');
    if (!fx) {
      fx = document.createElement('div');
      fx.id = 'fxLayer';
      document.body.appendChild(fx);
    }
    fx.innerHTML = '';
    const count = finePointer ? 10 : 0;
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
    if (header && window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let raf = 0;
      let latestX = 0;
      window.addEventListener('pointermove', (e) => {
        latestX = e.clientX;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const dx = ((latestX / window.innerWidth) - 0.5) * 4;
          header.style.transform = `translate3d(${dx * 0.05}px,0,0)`;
          raf = 0;
        });
      }, { passive: true });
    }
  } catch (e) {
    console.warn('Animation init failed', e);
  }
});

