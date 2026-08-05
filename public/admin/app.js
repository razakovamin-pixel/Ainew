// ============================================================
// Ilm al-Rijal — Admin Panel
// Vanilla JS SPA, no build step (matches rest of the project).
// ============================================================

const API = '/api/admin';

let state = {
  user: null, // { id, username, role }
};

// ---------------- helpers ----------------

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className =
    'fixed top-4 right-4 z-50 max-w-xs px-4 py-3 rounded-xl shadow-2xl text-sm fade-in border ' +
    (type === 'ok'
      ? 'bg-emerald-900/80 border-emerald-700 text-emerald-200'
      : 'bg-blood-900/80 border-blood-700 text-blood-200');
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 3500);
}

async function api(path, { method = 'GET', body, isForm = false, raw = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  const csrf = getCookie('ilm_admin_csrf');
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(API + path, {
    method,
    credentials: 'include',
    headers,
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401) {
    state.user = null;
    showAuthScreen();
    throw new Error('Сессия истекла, войдите снова');
  }

  if (raw) return res;

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.error) || `Ошибка ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function fmtDate(s) {
  if (!s) return '—';
  try {
    return new Date(s.replace(' ', 'T') + 'Z').toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return s;
  }
}

// ---------------- auth screen ----------------

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  renderNav();
  document.getElementById('userName').textContent = state.user.username;
  document.getElementById('userRole').textContent = state.user.role;
  document.getElementById('userAvatar').textContent = state.user.username.slice(0, 1).toUpperCase();
  router();
}

let bootstrapMode = false;

async function initAuth() {
  // уже есть активная сессия?
  try {
    const res = await fetch(API + '/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      showApp();
      return;
    }
  } catch {}

  // ни одного пользователя ещё не создано — предложим создать первого администратора
  try {
    const statusRes = await fetch(API + '/status');
    const status = await statusRes.json();
    if (!status.hasUsers) {
      bootstrapMode = true;
      document.getElementById('bootstrapNotice').classList.remove('hidden');
      document.getElementById('authSubtitle').textContent = 'Создайте первый аккаунт администратора';
      document.getElementById('authSubmit').textContent = 'Создать аккаунт';
    }
  } catch {}

  showAuthScreen();
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value;
  const errBox = document.getElementById('authError');
  errBox.classList.add('hidden');
  const btn = document.getElementById('authSubmit');
  btn.disabled = true;
  btn.textContent = bootstrapMode ? 'Создание…' : 'Вход…';
  try {
    if (bootstrapMode) {
      await api('/bootstrap', { method: 'POST', body: { username, password } });
      toast('Аккаунт администратора создан. Теперь войдите.');
      bootstrapMode = false;
      document.getElementById('bootstrapNotice').classList.add('hidden');
      document.getElementById('authSubtitle').textContent = 'Войдите, чтобы продолжить';
      document.getElementById('authForm').reset();
      btn.textContent = 'Войти';
    } else {
      const data = await api('/login', { method: 'POST', body: { username, password } });
      state.user = data.user;
      showApp();
    }
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    if (bootstrapMode) btn.textContent = 'Создать аккаунт';
  }
});

async function logout() {
  try {
    await api('/logout', { method: 'POST' });
  } catch {}
  state.user = null;
  showAuthScreen();
}
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('mobileLogoutBtn').addEventListener('click', logout);

// ---------------- navigation ----------------

const NAV = [
  { hash: '#/dashboard', label: 'Dashboard', icon: '📊', minRole: 'editor' },
  { hash: '#/transmitters', label: 'Передатчики', icon: '🧕', minRole: 'editor' },
  { hash: '#/books', label: 'Книги', icon: '📚', minRole: 'editor' },
  { hash: '#/isnad', label: 'Иснады', icon: '🔗', minRole: 'editor' },
  { hash: '#/articles', label: 'Статьи', icon: '📝', minRole: 'editor' },
  { hash: '#/users', label: 'Пользователи', icon: '👥', minRole: 'moderator' },
  { hash: '#/settings', label: 'Настройки', icon: '⚙️', minRole: 'admin' },
  { hash: '#/import-export', label: 'Импорт / Экспорт', icon: '⇅', minRole: 'moderator' },
  { hash: '#/backups', label: 'Резервные копии', icon: '💾', minRole: 'admin' },
  { hash: '#/audit-log', label: 'Журнал действий', icon: '🕘', minRole: 'moderator' },
];
const ROLE_RANK = { editor: 1, moderator: 2, admin: 3 };
function canSee(minRole) {
  return (ROLE_RANK[state.user?.role] || 0) >= (ROLE_RANK[minRole] || 99);
}

function renderNav() {
  const items = NAV.filter((n) => canSee(n.minRole));
  const html = items
    .map(
      (n) => `<a href="${n.hash}" class="nav-link flex items-center gap-3 px-5 py-2.5 text-gray-400 hover:text-white hover:bg-ink-850 transition-colors" data-hash="${n.hash}">
        <span>${n.icon}</span><span>${n.label}</span></a>`
    )
    .join('');
  document.getElementById('navLinks').innerHTML = html;
  document.getElementById('mobileNavLinks').innerHTML = html;
  highlightNav();
}
function highlightNav() {
  document.querySelectorAll('.nav-link').forEach((el) => {
    el.classList.toggle('active', el.dataset.hash === (location.hash || '#/dashboard'));
  });
}

document.getElementById('mobileMenuBtn').addEventListener('click', () => document.getElementById('mobileNav').classList.remove('hidden'));
document.getElementById('mobileNavClose').addEventListener('click', () => document.getElementById('mobileNav').classList.add('hidden'));
document.getElementById('mobileNav').addEventListener('click', (e) => {
  if (e.target.id === 'mobileNav') document.getElementById('mobileNav').classList.add('hidden');
});
document.getElementById('mobileNavLinks').addEventListener('click', () => document.getElementById('mobileNav').classList.add('hidden'));

window.addEventListener('hashchange', router);

function view() {
  return document.getElementById('view');
}

async function router() {
  if (!state.user) return;
  highlightNav();
  const hash = location.hash || '#/dashboard';
  const [, root, param] = hash.split('/');
  view().innerHTML = `<div class="space-y-3">${skeleton()}</div>`;
  try {
    if (root === 'dashboard' || !root) return renderDashboard();
    if (root === 'transmitters') return param ? renderTransmitterDetail(param) : renderEntityList('transmitters');
    if (root === 'books') return renderEntityList('books');
    if (root === 'isnad') return param ? renderIsnadDetail(param) : renderEntityList('isnad');
    if (root === 'articles') return renderEntityList('articles');
    if (root === 'users') return renderUsers();
    if (root === 'settings') return renderSettings();
    if (root === 'import-export') return renderImportExport();
    if (root === 'backups') return renderBackups();
    if (root === 'audit-log') return renderAuditLog();
    view().innerHTML = `<p class="text-gray-500">Раздел не найден.</p>`;
  } catch (err) {
    view().innerHTML = `<div class="bg-blood-900/20 border border-blood-700/40 text-blood-300 rounded-xl p-4 text-sm">${esc(err.message)}</div>`;
  }
}

function skeleton() {
  return `<div class="skeleton h-8 w-48 rounded-lg mb-4"></div>${[1, 2, 3].map(() => `<div class="skeleton h-16 rounded-xl"></div>`).join('')}`;
}

function card(inner, extra = '') {
  return `<div class="bg-ink-900 border border-ink-700 rounded-2xl p-5 shadow-lg ${extra}">${inner}</div>`;
}
function pageHeader(title, subtitle, actionsHtml = '') {
  return `<div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <div><h1 class="text-xl font-semibold text-white">${title}</h1>${subtitle ? `<p class="text-sm text-gray-500 mt-0.5">${subtitle}</p>` : ''}</div>
    <div class="flex gap-2">${actionsHtml}</div>
  </div>`;
}
function btn(label, { variant = 'primary', extra = '' } = {}) {
  const styles = {
    primary: 'bg-blood-600 hover:bg-blood-500 text-white',
    ghost: 'border border-ink-700 hover:border-blood-700/50 text-gray-300 hover:text-white',
    danger: 'bg-transparent border border-blood-700/50 text-blood-400 hover:bg-blood-900/30',
  };
  return `<button class="${styles[variant]} text-xs font-medium px-3 py-2 rounded-lg transition-colors ${extra}">${label}</button>`;
}

// ---------------- DASHBOARD ----------------

async function renderDashboard() {
  const data = await api('/dashboard');
  view().innerHTML = `
    ${pageHeader('Dashboard', 'Общая статистика сайта')}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      ${statCard('Передатчики', data.counts.transmitters, '🧕')}
      ${statCard('Книги', data.counts.books, '📚')}
      ${statCard('Пользователи', data.counts.users, '👥')}
      ${statCard('Поисковых запросов', data.counts.searchQueries, '🔎')}
    </div>
    ${card(`
      <h2 class="text-sm font-semibold text-white mb-3">Статистика ИИ</h2>
      <p class="text-2xl font-bold text-blood-400">${data.aiStats.chatRequests}</p>
      <p class="text-xs text-gray-500 mt-1">запросов к /ai/chat с момента деплоя (счётчик в D1)</p>
    `, 'mb-6')}
    ${card(`
      <h2 class="text-sm font-semibold text-white mb-3">Последние изменения</h2>
      <div class="space-y-2">
        ${
          data.recentActivity.length
            ? data.recentActivity.map((a) => `
              <div class="flex items-center justify-between text-xs border-b border-ink-800 pb-2 last:border-0 last:pb-0">
                <span class="text-gray-300"><b class="text-white">${esc(a.username || 'система')}</b> — ${esc(a.action)}${a.entity ? ' · ' + esc(a.entity) : ''}</span>
                <span class="text-gray-600">${fmtDate(a.created_at)}</span>
              </div>`).join('')
            : '<p class="text-xs text-gray-600">Пока нет записей</p>'
        }
      </div>
    `)}
  `;
}
function statCard(label, value, icon) {
  return `<div class="bg-ink-900 border border-ink-700 rounded-2xl p-4">
    <div class="text-xl mb-2">${icon}</div>
    <div class="text-2xl font-bold text-white">${value ?? 0}</div>
    <div class="text-xs text-gray-500 mt-0.5">${label}</div>
  </div>`;
}

// ---------------- GENERIC ENTITY LIST (transmitters / books / isnad / articles) ----------------

const ENTITY_CONFIG = {
  transmitters: {
    title: 'Передатчики',
    columns: [
      { key: 'name_ru', label: 'Имя (рус)' },
      { key: 'name_ar', label: 'Имя (араб)' },
      { key: 'reliability_degree', label: 'Степень доверия' },
      { key: 'death_date', label: 'Дата смерти' },
    ],
    fields: [
      { key: 'name_ru', label: 'Имя (рус)', required: true },
      { key: 'name_ar', label: 'Имя (араб)' },
      { key: 'kunya', label: 'Кунья' },
      { key: 'nasab', label: 'Насаб' },
      { key: 'death_date', label: 'Дата смерти' },
      { key: 'reliability_degree', label: 'Степень доверия' },
      { key: 'shia_grade', label: 'Оценка шиитов' },
      { key: 'sunni_grade', label: 'Оценка суннитов' },
      { key: 'biography', label: 'Биография', type: 'textarea' },
      { key: 'sources', label: 'Источники (по одному на строку)', type: 'textarea' },
      { key: 'notes', label: 'Примечания', type: 'textarea' },
    ],
    detailLink: true,
  },
  books: {
    title: 'Книги',
    columns: [
      { key: 'title', label: 'Название' },
      { key: 'author', label: 'Автор' },
      { key: 'pdf_url', label: 'PDF' },
    ],
    fields: [
      { key: 'title', label: 'Название', required: true },
      { key: 'author', label: 'Автор' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'pdf_url', label: 'Ссылка на PDF' },
      { key: 'txt_url', label: 'Ссылка на TXT' },
      { key: 'archive_url', label: 'Ссылка на Archive.org' },
    ],
  },
  isnad: {
    title: 'Иснады',
    columns: [{ key: 'title', label: 'Название' }, { key: 'description', label: 'Описание' }],
    fields: [
      { key: 'title', label: 'Название цепочки', required: true },
      { key: 'description', label: 'Описание', type: 'textarea' },
    ],
    detailLink: true,
  },
  articles: {
    title: 'Статьи',
    columns: [
      { key: 'title', label: 'Заголовок' },
      { key: 'slug', label: 'Slug' },
      { key: 'published', label: 'Опубликовано' },
    ],
    fields: [
      { key: 'title', label: 'Заголовок', required: true },
      { key: 'slug', label: 'Slug (необязательно)' },
      { key: 'content_md', label: 'Содержимое (Markdown)', type: 'textarea', rows: 10 },
      { key: 'published', label: 'Опубликовано', type: 'checkbox' },
    ],
  },
};

let listStateCache = {};

async function renderEntityList(entity, opts = {}) {
  const cfg = ENTITY_CONFIG[entity];
  const st = (listStateCache[entity] = listStateCache[entity] || { page: 1, search: '' });
  const canWrite = canSee('editor');
  const canDelete = canSee('moderator');

  const data = await api(`/${entity}?page=${st.page}&pageSize=15&search=${encodeURIComponent(st.search)}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  view().innerHTML = `
    ${pageHeader(cfg.title, `${data.total} записей`, canWrite ? btn('+ Добавить', { extra: 'id-add' }) : '')}
    ${card(`
      <div class="flex flex-wrap gap-3 mb-4">
        <input id="searchInput" value="${esc(st.search)}" placeholder="Поиск…"
          class="flex-1 min-w-[180px] bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blood-600" />
      </div>
      <div class="overflow-x-auto -mx-5 px-5">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-gray-500 text-xs uppercase border-b border-ink-800">
            ${cfg.columns.map((c) => `<th class="pb-2 pr-4 font-medium">${c.label}</th>`).join('')}
            <th class="pb-2 text-right font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          ${
            data.items.length
              ? data.items
                  .map(
                    (row) => `<tr class="border-b border-ink-800/60 hover:bg-ink-850/60">
                    ${cfg.columns.map((c) => `<td class="py-2.5 pr-4 text-gray-300 max-w-[220px] truncate">${fmtCell(row[c.key])}</td>`).join('')}
                    <td class="py-2.5 text-right whitespace-nowrap">
                      ${cfg.detailLink ? `<button data-open="${row.id}" class="text-xs text-gray-400 hover:text-white mr-3">Открыть</button>` : ''}
                      ${canWrite ? `<button data-edit="${row.id}" class="text-xs text-gray-400 hover:text-white mr-3">Изменить</button>` : ''}
                      ${canDelete ? `<button data-del="${row.id}" class="text-xs text-blood-400 hover:text-blood-300">Удалить</button>` : ''}
                    </td>
                  </tr>`
                  )
                  .join('')
              : `<tr><td colspan="${cfg.columns.length + 1}" class="py-8 text-center text-gray-600">Нет записей</td></tr>`
          }
        </tbody>
      </table>
      </div>
      <div class="flex items-center justify-between mt-4 text-xs text-gray-500">
        <span>Страница ${st.page} из ${totalPages}</span>
        <div class="flex gap-2">
          <button id="prevPage" ${st.page <= 1 ? 'disabled' : ''} class="px-2 py-1 rounded border border-ink-700 disabled:opacity-30">←</button>
          <button id="nextPage" ${st.page >= totalPages ? 'disabled' : ''} class="px-2 py-1 rounded border border-ink-700 disabled:opacity-30">→</button>
        </div>
      </div>
    `)}
    <div id="modalRoot"></div>
  `;

  document.querySelector('.id-add')?.addEventListener('click', () => openEntityForm(entity, null));
  document.getElementById('searchInput').addEventListener(
    'input',
    debounce((e) => {
      st.search = e.target.value;
      st.page = 1;
      renderEntityList(entity);
    }, 350)
  );
  document.getElementById('prevPage')?.addEventListener('click', () => {
    st.page -= 1;
    renderEntityList(entity);
  });
  document.getElementById('nextPage')?.addEventListener('click', () => {
    st.page += 1;
    renderEntityList(entity);
  });
  view()
    .querySelectorAll('[data-edit]')
    .forEach((b) => b.addEventListener('click', () => openEntityForm(entity, b.dataset.edit)));
  view()
    .querySelectorAll('[data-open]')
    .forEach((b) => b.addEventListener('click', () => (location.hash = `#/${entity}/${b.dataset.open}`)));
  view()
    .querySelectorAll('[data-del]')
    .forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Удалить запись без возможности восстановления?')) return;
        try {
          await api(`/${entity}/${b.dataset.del}`, { method: 'DELETE' });
          toast('Удалено');
          renderEntityList(entity);
        } catch (err) {
          toast(err.message, 'err');
        }
      })
    );
}

function fmtCell(val) {
  if (val === 1 || val === true) return '✅';
  if (val === 0 || val === false) return '—';
  if (val == null || val === '') return '—';
  return esc(String(val)).slice(0, 60);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function openEntityForm(entity, id) {
  const cfg = ENTITY_CONFIG[entity];
  let record = {};
  if (id) record = await api(`/${entity}/${id}`);

  const fieldsHtml = cfg.fields
    .map((f) => {
      const val = record[f.key];
      if (f.type === 'textarea') {
        const displayVal = Array.isArray(val) ? val.join('\n') : val ?? '';
        return `<div><label class="block text-xs text-gray-500 mb-1">${f.label}</label>
          <textarea name="${f.key}" rows="${f.rows || 4}" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blood-600">${esc(displayVal)}</textarea></div>`;
      }
      if (f.type === 'checkbox') {
        return `<label class="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" name="${f.key}" ${val ? 'checked' : ''} class="accent-blood-600" /> ${f.label}</label>`;
      }
      return `<div><label class="block text-xs text-gray-500 mb-1">${f.label}${f.required ? ' *' : ''}</label>
        <input name="${f.key}" value="${esc(val ?? '')}" ${f.required ? 'required' : ''}
          class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blood-600" /></div>`;
    })
    .join('');

  const modal = document.getElementById('modalRoot');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/70 z-40 flex items-start md:items-center justify-center p-4 overflow-y-auto" id="formOverlay">
      <div class="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-lg my-8 fade-in">
        <div class="px-5 py-4 border-b border-ink-800 flex justify-between items-center">
          <h3 class="text-sm font-semibold text-white">${id ? 'Изменить' : 'Добавить'} — ${cfg.title}</h3>
          <button id="formClose" class="text-gray-500 hover:text-white">✕</button>
        </div>
        <form id="entityForm" class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          ${fieldsHtml}
        </form>
        <div class="px-5 py-4 border-t border-ink-800 flex justify-end gap-2">
          ${btn('Отмена', { variant: 'ghost', extra: 'id-cancel' })}
          ${btn(id ? 'Сохранить' : 'Создать', { extra: 'id-save' })}
        </div>
      </div>
    </div>
  `;

  const close = () => (modal.innerHTML = '');
  document.getElementById('formClose').addEventListener('click', close);
  document.querySelector('.id-cancel').addEventListener('click', close);
  document.getElementById('formOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'formOverlay') close();
  });

  document.querySelector('.id-save').addEventListener('click', async () => {
    const form = document.getElementById('entityForm');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const payload = {};
    cfg.fields.forEach((f) => {
      if (f.type === 'checkbox') {
        payload[f.key] = form.querySelector(`[name="${f.key}"]`).checked ? 1 : 0;
      } else if (f.type === 'textarea' && f.key === 'sources') {
        const lines = (fd.get(f.key) || '').split('\n').map((s) => s.trim()).filter(Boolean);
        payload[f.key] = JSON.stringify(lines);
      } else {
        payload[f.key] = fd.get(f.key) ?? '';
      }
    });
    try {
      if (id) await api(`/${entity}/${id}`, { method: 'PUT', body: payload });
      else await api(`/${entity}`, { method: 'POST', body: payload });
      toast('Сохранено');
      close();
      renderEntityList(entity);
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

// ---------------- TRANSMITTER DETAIL (teachers/students graph) ----------------

async function renderTransmitterDetail(id) {
  const t = await api(`/transmitters/${id}`);
  const canWrite = canSee('editor');
  view().innerHTML = `
    ${pageHeader(t.name_ru, 'Карточка передатчика', btn('← К списку', { variant: 'ghost', extra: 'id-back' }))}
    <div class="grid md:grid-cols-2 gap-4 mb-4">
      ${card(`
        <h3 class="text-sm font-semibold text-white mb-3">Данные</h3>
        <dl class="text-sm space-y-1.5">
          ${detailRow('Имя (араб)', t.name_ar)}
          ${detailRow('Кунья', t.kunya)}
          ${detailRow('Насаб', t.nasab)}
          ${detailRow('Дата смерти', t.death_date)}
          ${detailRow('Степень доверия', t.reliability_degree)}
          ${detailRow('Оценка шиитов', t.shia_grade)}
          ${detailRow('Оценка суннитов', t.sunni_grade)}
        </dl>
      `)}
      ${card(`
        <h3 class="text-sm font-semibold text-white mb-3">Биография</h3>
        <p class="text-sm text-gray-400 whitespace-pre-wrap">${esc(t.biography) || '—'}</p>
      `)}
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      ${card(`
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-semibold text-white">Учителя</h3>
          ${canWrite ? `<button class="text-xs text-blood-400 id-add-teacher">+ добавить</button>` : ''}
        </div>
        <ul class="text-sm space-y-1">
          ${t.teachers.map((x) => `<li class="flex justify-between items-center text-gray-300"><a href="#/transmitters/${x.id}" class="hover:text-blood-400">${esc(x.name_ru)}</a>${canWrite ? `<button data-unlink-teacher="${x.id}" class="text-xs text-gray-600 hover:text-blood-400">✕</button>` : ''}</li>`).join('') || '<li class="text-gray-600">Нет данных</li>'}
        </ul>
      `)}
      ${card(`
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-sm font-semibold text-white">Ученики</h3>
          ${canWrite ? `<button class="text-xs text-blood-400 id-add-student">+ добавить</button>` : ''}
        </div>
        <ul class="text-sm space-y-1">
          ${t.students.map((x) => `<li class="flex justify-between items-center text-gray-300"><a href="#/transmitters/${x.id}" class="hover:text-blood-400">${esc(x.name_ru)}</a>${canWrite ? `<button data-unlink-student="${x.id}" class="text-xs text-gray-600 hover:text-blood-400">✕</button>` : ''}</li>`).join('') || '<li class="text-gray-600">Нет данных</li>'}
        </ul>
      `)}
    </div>
  `;
  document.querySelector('.id-back').addEventListener('click', () => (location.hash = '#/transmitters'));
  document.querySelector('.id-add-teacher')?.addEventListener('click', () => linkPrompt(id, 'teacher'));
  document.querySelector('.id-add-student')?.addEventListener('click', () => linkPrompt(id, 'student'));
  view().querySelectorAll('[data-unlink-teacher]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/transmitters-links?teacherId=${b.dataset.unlinkTeacher}&studentId=${id}`, { method: 'DELETE' });
      renderTransmitterDetail(id);
    })
  );
  view().querySelectorAll('[data-unlink-student]').forEach((b) =>
    b.addEventListener('click', async () => {
      await api(`/transmitters-links?teacherId=${id}&studentId=${b.dataset.unlinkStudent}`, { method: 'DELETE' });
      renderTransmitterDetail(id);
    })
  );
}
function detailRow(label, val) {
  return `<div class="flex justify-between gap-4 border-b border-ink-800/60 py-1"><dt class="text-gray-500">${label}</dt><dd class="text-gray-200 text-right">${esc(val) || '—'}</dd></div>`;
}
async function linkPrompt(id, kind) {
  const query = prompt(`Введите имя передатчика (${kind === 'teacher' ? 'учитель' : 'ученик'}):`);
  if (!query) return;
  const results = await api(`/transmitters?search=${encodeURIComponent(query)}&pageSize=5`);
  if (!results.items.length) return toast('Не найдено', 'err');
  const match = results.items[0];
  const body = kind === 'teacher' ? { teacherId: match.id, studentId: id } : { teacherId: id, studentId: match.id };
  try {
    await api('/transmitters-links', { method: 'POST', body });
    toast(`Связано с «${match.name_ru}»`);
    renderTransmitterDetail(id);
  } catch (err) {
    toast(err.message, 'err');
  }
}

// ---------------- ISNAD DETAIL ----------------

async function renderIsnadDetail(id) {
  const chain = await api(`/isnad/${id}`);
  const canWrite = canSee('editor');
  view().innerHTML = `
    ${pageHeader(chain.title, 'Цепочка иснада', btn('← К списку', { variant: 'ghost', extra: 'id-back' }))}
    ${card(`
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-sm font-semibold text-white">Звенья цепочки</h3>
        ${canWrite ? btn('+ Добавить звено', { extra: 'id-add-link' }) : ''}
      </div>
      <ol class="space-y-2" id="linksList">
        ${chain.links
          .map(
            (l, i) => `<li class="flex items-center gap-3 bg-ink-850 rounded-lg px-3 py-2 text-sm">
          <span class="text-gray-600 w-5">${i + 1}.</span>
          <span class="flex-1 text-gray-200">${l.transmitter_id ? `<a class="hover:text-blood-400" href="#/transmitters/${l.transmitter_id}">✔ ${esc(l.raw_name || '')}</a>` : `<span class="text-amber-400">⚠ ${esc(l.raw_name || 'не найден')}</span>`}</span>
          ${l.note ? `<span class="text-xs text-gray-500">${esc(l.note)}</span>` : ''}
        </li>`
          )
          .join('') || '<li class="text-gray-600 text-sm">Пока пусто</li>'}
      </ol>
    `)}
  `;
  document.querySelector('.id-back').addEventListener('click', () => (location.hash = '#/isnad'));
  document.querySelector('.id-add-link')?.addEventListener('click', async () => {
    const name = prompt('Имя передатчика в цепочке (будет найден автоматически, либо помечен как отсутствующий):');
    if (!name) return;
    const note = prompt('Примечание (необязательно):') || '';
    const links = chain.links.map((l) => ({ transmitterId: l.transmitter_id, rawName: l.raw_name, note: l.note }));
    links.push({ rawName: name, note });
    const res = await api('/isnad-links', { method: 'POST', body: { chainId: id, links } });
    if (res.missingTransmitters?.length) toast(`Не найдены в базе: ${res.missingTransmitters.join(', ')}`, 'err');
    else toast('Звено добавлено');
    renderIsnadDetail(id);
  });
}

// ---------------- USERS ----------------

async function renderUsers() {
  const data = await api('/users');
  const isAdmin = canSee('admin');
  view().innerHTML = `
    ${pageHeader('Пользователи', `${data.items.length} аккаунтов`, isAdmin ? btn('+ Добавить', { extra: 'id-add-user' }) : '')}
    ${card(`
      <table class="w-full text-sm">
        <thead><tr class="text-left text-gray-500 text-xs uppercase border-b border-ink-800">
          <th class="pb-2">Логин</th><th class="pb-2">Роль</th><th class="pb-2">Статус</th><th class="pb-2">Создан</th><th class="pb-2 text-right">Действия</th>
        </tr></thead>
        <tbody>
          ${data.items
            .map(
              (u) => `<tr class="border-b border-ink-800/60">
            <td class="py-2.5">${esc(u.username)}</td>
            <td class="py-2.5"><span class="text-xs px-2 py-0.5 rounded-full bg-ink-800 border border-ink-700">${u.role}</span></td>
            <td class="py-2.5">${u.is_blocked ? '<span class="text-blood-400">заблокирован</span>' : '<span class="text-emerald-400">активен</span>'}</td>
            <td class="py-2.5 text-gray-500">${fmtDate(u.created_at)}</td>
            <td class="py-2.5 text-right">
              ${isAdmin ? `<button data-block="${u.id}" data-blocked="${u.is_blocked}" class="text-xs text-gray-400 hover:text-white mr-3">${u.is_blocked ? 'Разблокировать' : 'Заблокировать'}</button>
              <button data-role="${u.id}" class="text-xs text-gray-400 hover:text-white mr-3">Роль</button>
              <button data-deluser="${u.id}" class="text-xs text-blood-400 hover:text-blood-300">Удалить</button>` : ''}
            </td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `)}
    <div id="modalRoot"></div>
  `;
  document.querySelector('.id-add-user')?.addEventListener('click', openUserForm);
  view().querySelectorAll('[data-block]').forEach((b) =>
    b.addEventListener('click', async () => {
      const blocked = b.dataset.blocked === '1' || b.dataset.blocked === 'true';
      await api(`/users/${b.dataset.block}`, { method: 'PUT', body: { is_blocked: !blocked } });
      toast('Обновлено');
      renderUsers();
    })
  );
  view().querySelectorAll('[data-role]').forEach((b) =>
    b.addEventListener('click', async () => {
      const role = prompt('Новая роль (admin / moderator / editor):');
      if (!['admin', 'moderator', 'editor'].includes(role)) return;
      await api(`/users/${b.dataset.role}`, { method: 'PUT', body: { role } });
      toast('Роль обновлена');
      renderUsers();
    })
  );
  view().querySelectorAll('[data-deluser]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Удалить пользователя?')) return;
      try {
        await api(`/users/${b.dataset.deluser}`, { method: 'DELETE' });
        toast('Удалено');
        renderUsers();
      } catch (err) {
        toast(err.message, 'err');
      }
    })
  );
}

function openUserForm() {
  const modal = document.getElementById('modalRoot');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" id="formOverlay">
      <div class="bg-ink-900 border border-ink-700 rounded-2xl w-full max-w-sm fade-in">
        <div class="px-5 py-4 border-b border-ink-800 flex justify-between items-center">
          <h3 class="text-sm font-semibold text-white">Новый пользователь</h3>
          <button id="formClose" class="text-gray-500 hover:text-white">✕</button>
        </div>
        <form id="userForm" class="p-5 space-y-4">
          <div><label class="block text-xs text-gray-500 mb-1">Логин</label><input name="username" required class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label class="block text-xs text-gray-500 mb-1">Пароль (мин. 8 символов)</label><input name="password" type="password" required minlength="8" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm" /></div>
          <div><label class="block text-xs text-gray-500 mb-1">Роль</label>
            <select name="role" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm">
              <option value="editor">Editor</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
            </select>
          </div>
        </form>
        <div class="px-5 py-4 border-t border-ink-800 flex justify-end gap-2">
          ${btn('Отмена', { variant: 'ghost', extra: 'id-cancel' })}
          ${btn('Создать', { extra: 'id-save' })}
        </div>
      </div>
    </div>`;
  const close = () => (modal.innerHTML = '');
  document.getElementById('formClose').addEventListener('click', close);
  document.querySelector('.id-cancel').addEventListener('click', close);
  document.querySelector('.id-save').addEventListener('click', async () => {
    const form = document.getElementById('userForm');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    try {
      await api('/users', { method: 'POST', body: { username: fd.get('username'), password: fd.get('password'), role: fd.get('role') } });
      toast('Пользователь создан');
      close();
      renderUsers();
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

// ---------------- SETTINGS ----------------

async function renderSettings() {
  const s = await api('/settings');
  const fields = [
    ['site_name', 'Название сайта'],
    ['site_description', 'Описание'],
    ['favicon_url', 'Favicon (URL)'],
    ['logo_url', 'Логотип (URL)'],
    ['seo_title', 'SEO заголовок'],
    ['seo_description', 'SEO описание'],
  ];
  view().innerHTML = `
    ${pageHeader('Настройки сайта', '')}
    ${card(`
      <form id="settingsForm" class="space-y-4">
        ${fields.map(([k, label]) => `<div><label class="block text-xs text-gray-500 mb-1">${label}</label>
          <input name="${k}" value="${esc(s[k] || '')}" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm" /></div>`).join('')}
        <div class="pt-2 border-t border-ink-800">
          <h3 class="text-sm font-semibold text-white my-3">API-ключи и ИИ</h3>
          <p class="text-xs text-gray-500 mb-3">Секреты (AI_API_KEY и т.д.) задаются через <code>wrangler secret put</code> и здесь не хранятся ради безопасности. Ниже — произвольные заметки/настройки ИИ, которые не являются секретами.</p>
          <label class="block text-xs text-gray-500 mb-1">Заметки о настройках ИИ</label>
          <textarea name="ai_settings" rows="3" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm">${esc(s.ai_settings || '')}</textarea>
        </div>
        ${btn('Сохранить', { extra: 'mt-2' })}
      </form>
    `)}
  `;
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      await api('/settings', { method: 'PUT', body });
      toast('Настройки сохранены');
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

// ---------------- IMPORT / EXPORT ----------------

function renderImportExport() {
  const entities = ['transmitters', 'books', 'isnad', 'articles'];
  view().innerHTML = `
    ${pageHeader('Импорт / Экспорт', 'JSON и CSV')}
    <div class="grid md:grid-cols-2 gap-4">
      ${card(`
        <h3 class="text-sm font-semibold text-white mb-3">Экспорт</h3>
        <div class="space-y-3">
          ${entities
            .map(
              (e) => `<div class="flex items-center justify-between text-sm">
            <span class="text-gray-300">${ENTITY_CONFIG[e].title}</span>
            <div class="flex gap-2">
              <a href="${API}/export?entity=${e}&format=json" class="text-xs text-blood-400 hover:text-blood-300">JSON</a>
              <a href="${API}/export?entity=${e}&format=csv" class="text-xs text-blood-400 hover:text-blood-300">CSV</a>
            </div>
          </div>`
            )
            .join('')}
        </div>
      `)}
      ${card(`
        <h3 class="text-sm font-semibold text-white mb-3">Импорт</h3>
        <form id="importForm" class="space-y-3">
          <select name="entity" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm">
            ${entities.map((e) => `<option value="${e}">${ENTITY_CONFIG[e].title}</option>`).join('')}
          </select>
          <select name="format" class="w-full bg-ink-850 border border-ink-700 rounded-lg px-3 py-2 text-sm">
            <option value="json">JSON</option><option value="csv">CSV</option>
          </select>
          <input type="file" name="file" accept=".json,.csv" required class="w-full text-xs text-gray-400" />
          ${btn('Импортировать')}
        </form>
        <p class="text-xs text-gray-600 mt-3">Максимум 5000 строк за раз. Формат JSON — массив объектов с полями сущности.</p>
      `)}
    </div>
  `;
  document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get('file');
    const entity = fd.get('entity');
    const format = fd.get('format');
    if (!file) return;
    const text = await file.text();
    try {
      const res = await api(`/import?entity=${entity}&format=${format}`, {
        method: 'POST',
        isForm: true,
        body: text,
      });
      toast(`Импортировано: ${res.created}, ошибок: ${res.failed}`);
    } catch (err) {
      toast(err.message, 'err');
    }
  });
}

// ---------------- BACKUPS ----------------

function renderBackups() {
  view().innerHTML = `
    ${pageHeader('Резервные копии', '')}
    ${card(`
      <p class="text-sm text-gray-400 mb-4">Создаёт JSON-снимок всех таблиц (пользователи, передатчики, книги, иснады, статьи, настройки) и скачивает его на устройство. Пароли в бэкап не включаются.</p>
      ${btn('Создать резервную копию', { extra: 'id-backup' })}
    `)}
  `;
  document.querySelector('.id-backup').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Создание…';
    try {
      const res = await api('/backup', { method: 'POST', raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ilm-al-rijal-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Резервная копия создана');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      e.target.disabled = false;
      e.target.textContent = 'Создать резервную копию';
    }
  });
}

// ---------------- AUDIT LOG ----------------

async function renderAuditLog() {
  const data = await api('/audit-log?pageSize=50');
  view().innerHTML = `
    ${pageHeader('Журнал действий', `${data.total} записей`)}
    ${card(`
      <table class="w-full text-sm">
        <thead><tr class="text-left text-gray-500 text-xs uppercase border-b border-ink-800">
          <th class="pb-2">Пользователь</th><th class="pb-2">Действие</th><th class="pb-2">Объект</th><th class="pb-2">IP</th><th class="pb-2">Когда</th>
        </tr></thead>
        <tbody>
          ${data.items
            .map(
              (a) => `<tr class="border-b border-ink-800/60">
            <td class="py-2 text-gray-200">${esc(a.username || 'система')}</td>
            <td class="py-2 text-gray-300">${esc(a.action)}</td>
            <td class="py-2 text-gray-500">${esc(a.entity || '—')}${a.entity_id ? ' #' + esc(a.entity_id) : ''}</td>
            <td class="py-2 text-gray-600">${esc(a.ip || '—')}</td>
            <td class="py-2 text-gray-600">${fmtDate(a.created_at)}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `)}
  `;
}

// ---------------- boot ----------------

initAuth();
