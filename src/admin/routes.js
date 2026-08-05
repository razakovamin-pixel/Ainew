import {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
  parseCookies,
  buildCookie,
  clearCookie,
  generateCsrfToken,
  isHttpsRequest,
  SESSION_COOKIE,
  CSRF_COOKIE,
  TOKEN_TTL,
} from './auth.js';
import { jsonResponse, readJson, slugify, incrementCounter } from './db.js';
import { logAction, clientIp } from './audit.js';
import { makeCrud } from './crud.js';
import { toCsv, parseCsv } from './csv.js';

const ROLE_RANK = { editor: 1, moderator: 2, admin: 3 };
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

const transmittersCrud = makeCrud({
  table: 'transmitters',
  columns: [
    'name_ru', 'name_ar', 'kunya', 'nasab', 'death_date',
    'reliability_degree', 'shia_grade', 'sunni_grade', 'biography', 'sources', 'notes', 'legacy_id',
  ],
  searchColumns: ['name_ru', 'name_ar', 'kunya', 'nasab'],
  defaultSort: 'id DESC',
});

const booksCrud = makeCrud({
  table: 'books',
  columns: ['title', 'author', 'description', 'pdf_url', 'txt_url', 'archive_url'],
  searchColumns: ['title', 'author'],
});

const isnadCrud = makeCrud({
  table: 'isnad_chains',
  columns: ['title', 'description'],
  searchColumns: ['title'],
});

const articlesCrud = makeCrud({
  table: 'articles',
  columns: ['title', 'slug', 'content_md', 'published', 'author_id'],
  searchColumns: ['title'],
});

function withCors(headers = {}) {
  return { 'Access-Control-Allow-Origin': 'null', ...headers };
}

async function getAuthContext(request, env) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;
  // проверяем, что пользователь всё ещё существует и не заблокирован
  const user = await env.DB.prepare('SELECT id, username, role, is_blocked FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();
  if (!user || user.is_blocked) return null;
  return { id: user.id, username: user.username, role: user.role, csrf: cookies[CSRF_COOKIE] };
}

function requireRole(auth, minRole) {
  if (!auth) return false;
  return (ROLE_RANK[auth.role] || 0) >= (ROLE_RANK[minRole] || 99);
}

function checkCsrf(request, auth) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const headerToken = request.headers.get('X-CSRF-Token');
  return Boolean(headerToken) && Boolean(auth?.csrf) && headerToken === auth.csrf;
}

/**
 * Основной обработчик /api/admin/* и /admin/api/*.
 * Возвращает Response, либо null если путь не относится к админке.
 */
export async function handleAdminApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.startsWith('/api/admin/')) return null;
  const sub = path.slice('/api/admin/'.length); // e.g. "login", "transmitters", "transmitters/5"

  if (!env.DB) {
    return jsonResponse({ error: 'D1 database is not configured. Add a [[d1_databases]] binding named DB in wrangler.toml.' }, 500);
  }
  if (!env.JWT_SECRET) {
    return jsonResponse({ error: 'JWT_SECRET is not configured. Run: wrangler secret put JWT_SECRET' }, 500);
  }

  const db = env.DB;
  const ip = clientIp(request);

  // ---------- публичные (без авторизации) ----------
  if (sub === 'status' && request.method === 'GET') {
    const countRow = await db.prepare('SELECT COUNT(*) as n FROM users').first();
    return jsonResponse({ hasUsers: Boolean(countRow && Number(countRow.n) > 0) });
  }
  if (sub === 'login' && request.method === 'POST') return handleLogin(request, db, env, ip);
  if (sub === 'bootstrap' && request.method === 'POST') return handleBootstrap(request, db, env, ip);

  // ---------- всё остальное требует авторизации ----------
  const auth = await getAuthContext(request, env);
  if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401);

  if (sub === 'logout' && request.method === 'POST') return handleLogout(auth, db, ip, request);
  if (sub === 'me' && request.method === 'GET') return jsonResponse({ user: { id: auth.id, username: auth.username, role: auth.role } });

  if (!checkCsrf(request, auth)) {
    return jsonResponse({ error: 'CSRF token missing or invalid' }, 403);
  }

  if (sub === 'dashboard' && request.method === 'GET') return handleDashboard(db);

  // entity routers
  for (const [prefix, crud, entityName, minWrite] of [
    ['transmitters', transmittersCrud, 'transmitter', 'editor'],
    ['books', booksCrud, 'book', 'editor'],
    ['isnad', isnadCrud, 'isnad_chain', 'editor'],
    ['articles', articlesCrud, 'article', 'editor'],
  ]) {
    if (sub === prefix || sub.startsWith(prefix + '/')) {
      return handleEntity({ request, db, auth, sub, prefix, crud, entityName, minWrite, ip, env });
    }
  }

  if (sub === 'users' || sub.startsWith('users/')) return handleUsers({ request, db, auth, sub, ip });
  if (sub === 'settings') return handleSettings({ request, db, auth, ip });
  if (sub === 'audit-log' && request.method === 'GET') return handleAuditLog({ request, db, auth });
  if (sub === 'backup' && request.method === 'POST') return handleBackup({ db, auth, ip });
  if (sub === 'export' && request.method === 'GET') return handleExport({ request, db, auth });
  if (sub === 'import' && request.method === 'POST') return handleImport({ request, db, auth, ip });
  if (sub === 'transmitters-links' ) return handleTransmitterLinks({ request, db, auth, ip });
  if (sub === 'isnad-links') return handleIsnadLinks({ request, db, auth, ip });

  return jsonResponse({ error: 'Not found' }, 404);
}

// ==================== AUTH ====================

async function handleLogin(request, db, env, ip) {
  const body = await readJson(request);
  const username = (body?.username || '').trim();
  const password = body?.password || '';
  if (!username || !password) return jsonResponse({ error: 'username and password required' }, 400);

  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000).toISOString().replace('T', ' ').slice(0, 19);
  const attempts = await db
    .prepare(`SELECT COUNT(*) as n FROM login_attempts WHERE username = ? AND ip = ? AND success = 0 AND created_at > ?`)
    .bind(username, ip, since)
    .first();
  if (attempts && Number(attempts.n) >= LOGIN_MAX_ATTEMPTS) {
    return jsonResponse({ error: `Too many failed attempts. Try again in ${LOGIN_WINDOW_MINUTES} minutes.` }, 429);
  }

  const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  const ok = user && !user.is_blocked && (await verifyPassword(password, user.password_hash));

  await db.prepare('INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)').bind(username, ip, ok ? 1 : 0).run();

  if (!ok) {
    await logAction(db, { username, action: 'login_failed', ip });
    return jsonResponse({ error: 'Invalid credentials' }, 401);
  }

  const token = await signJWT({ sub: user.id, role: user.role }, env.JWT_SECRET, TOKEN_TTL);
  const csrf = generateCsrfToken();
  await logAction(db, { userId: user.id, username: user.username, action: 'login', ip });
  const secure = isHttpsRequest(request);

  return new Response(
    JSON.stringify({ user: { id: user.id, username: user.username, role: user.role }, csrfToken: csrf }),
    {
      status: 200,
      headers: [
        ['Content-Type', 'application/json; charset=utf-8'],
        ['Set-Cookie', buildCookie(SESSION_COOKIE, token, { maxAge: TOKEN_TTL, secure })],
        ['Set-Cookie', buildCookie(CSRF_COOKIE, csrf, { maxAge: TOKEN_TTL, httpOnly: false, secure })],
      ],
    }
  );
}

async function handleLogout(auth, db, ip, request) {
  await logAction(db, { userId: auth.id, username: auth.username, action: 'logout', ip });
  const secure = isHttpsRequest(request);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: [
      ['Content-Type', 'application/json; charset=utf-8'],
      ['Set-Cookie', clearCookie(SESSION_COOKIE, { secure })],
      ['Set-Cookie', clearCookie(CSRF_COOKIE, { secure })],
    ],
  });
}

/** Первичная настройка: создать первого admin-пользователя, только если users пуста. */
async function handleBootstrap(request, db, env, ip) {
  const countRow = await db.prepare('SELECT COUNT(*) as n FROM users').first();
  if (countRow && Number(countRow.n) > 0) {
    return jsonResponse({ error: 'Bootstrap already completed. Ask an admin to create your account.' }, 403);
  }
  const body = await readJson(request);
  const username = (body?.username || '').trim();
  const password = body?.password || '';
  if (!username || password.length < 8) {
    return jsonResponse({ error: 'username required, password must be at least 8 characters' }, 400);
  }
  const hash = await hashPassword(password);
  await db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').bind(username, hash, 'admin').run();
  await logAction(db, { username, action: 'bootstrap_admin_created', ip });
  return jsonResponse({ ok: true, message: 'Admin account created. You can now log in.' });
}

// ==================== DASHBOARD ====================

async function handleDashboard(db) {
  const [transmitters, books, users, searchCount, aiChatCount, recent] = await Promise.all([
    db.prepare('SELECT COUNT(*) as n FROM transmitters').first(),
    db.prepare('SELECT COUNT(*) as n FROM books').first(),
    db.prepare('SELECT COUNT(*) as n FROM users').first(),
    db.prepare("SELECT value FROM stats_counters WHERE name = 'search_count'").first(),
    db.prepare("SELECT value FROM stats_counters WHERE name = 'ai_chat_count'").first(),
    db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10').all(),
  ]);
  return jsonResponse({
    counts: {
      transmitters: transmitters?.n || 0,
      books: books?.n || 0,
      users: users?.n || 0,
      searchQueries: searchCount?.value || 0,
    },
    aiStats: {
      chatRequests: aiChatCount?.value || 0,
    },
    recentActivity: recent.results || [],
  });
}

// ==================== GENERIC ENTITY (transmitters/books/isnad/articles) ====================

async function handleEntity({ request, db, auth, sub, prefix, crud, entityName, minWrite, ip, env }) {
  const rest = sub.slice(prefix.length).replace(/^\//, '');
  const id = rest && /^\d+$/.test(rest) ? Number(rest) : null;

  if (request.method === 'GET' && !id) {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const data = await crud.list(db, params);
    return jsonResponse(data);
  }

  if (request.method === 'GET' && id) {
    const item = await crud.get(db, id);
    if (!item) return jsonResponse({ error: 'Not found' }, 404);
    if (entityName === 'transmitter') {
      const teachers = await db
        .prepare(`SELECT t.id, t.name_ru FROM transmitter_links l JOIN transmitters t ON t.id = l.teacher_id WHERE l.student_id = ?`)
        .bind(id)
        .all();
      const students = await db
        .prepare(`SELECT t.id, t.name_ru FROM transmitter_links l JOIN transmitters t ON t.id = l.student_id WHERE l.teacher_id = ?`)
        .bind(id)
        .all();
      item.teachers = teachers.results || [];
      item.students = students.results || [];
    }
    if (entityName === 'isnad_chain') {
      const links = await db
        .prepare(`SELECT * FROM isnad_links WHERE chain_id = ? ORDER BY position ASC`)
        .bind(id)
        .all();
      item.links = links.results || [];
    }
    return jsonResponse(item);
  }

  if (!requireRole(auth, minWrite)) return jsonResponse({ error: 'Forbidden' }, 403);

  if (request.method === 'POST' && !id) {
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: 'Invalid JSON' }, 400);
    if (entityName === 'article') {
      body.slug = body.slug ? slugify(body.slug) : slugify(body.title);
      body.author_id = auth.id;
    }
    const created = await crud.create(db, body);
    await logAction(db, { userId: auth.id, username: auth.username, action: 'create', entity: entityName, entityId: created?.id, ip });
    return jsonResponse(created, 201);
  }

  if (request.method === 'PUT' && id) {
    const body = await readJson(request);
    if (!body) return jsonResponse({ error: 'Invalid JSON' }, 400);
    if (entityName === 'article' && body.slug) body.slug = slugify(body.slug);
    const updated = await crud.update(db, id, body);
    await logAction(db, { userId: auth.id, username: auth.username, action: 'update', entity: entityName, entityId: id, ip });
    return jsonResponse(updated);
  }

  if (request.method === 'DELETE' && id) {
    if (!requireRole(auth, 'moderator')) return jsonResponse({ error: 'Forbidden — moderator role required to delete' }, 403);
    await crud.remove(db, id);
    await logAction(db, { userId: auth.id, username: auth.username, action: 'delete', entity: entityName, entityId: id, ip });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ==================== TRANSMITTER TEACHER/STUDENT LINKS ====================

async function handleTransmitterLinks({ request, db, auth, ip }) {
  if (!requireRole(auth, 'editor')) return jsonResponse({ error: 'Forbidden' }, 403);
  if (request.method === 'POST') {
    const body = await readJson(request);
    const teacherId = Number(body?.teacherId);
    const studentId = Number(body?.studentId);
    if (!teacherId || !studentId || teacherId === studentId) return jsonResponse({ error: 'teacherId and studentId (different) required' }, 400);
    const [t, s] = await Promise.all([
      db.prepare('SELECT id FROM transmitters WHERE id = ?').bind(teacherId).first(),
      db.prepare('SELECT id FROM transmitters WHERE id = ?').bind(studentId).first(),
    ]);
    if (!t || !s) return jsonResponse({ error: 'One or both transmitters not found' }, 404);
    await db.prepare('INSERT OR IGNORE INTO transmitter_links (teacher_id, student_id) VALUES (?, ?)').bind(teacherId, studentId).run();
    await logAction(db, { userId: auth.id, username: auth.username, action: 'link_transmitters', entity: 'transmitter_link', entityId: `${teacherId}->${studentId}`, ip });
    return jsonResponse({ ok: true });
  }
  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const teacherId = Number(url.searchParams.get('teacherId'));
    const studentId = Number(url.searchParams.get('studentId'));
    await db.prepare('DELETE FROM transmitter_links WHERE teacher_id = ? AND student_id = ?').bind(teacherId, studentId).run();
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ==================== ISNAD CHAIN LINKS ====================

async function handleIsnadLinks({ request, db, auth, ip }) {
  if (!requireRole(auth, 'editor')) return jsonResponse({ error: 'Forbidden' }, 403);
  const body = await readJson(request);

  if (request.method === 'POST') {
    const chainId = Number(body?.chainId);
    const items = Array.isArray(body?.links) ? body.links : [];
    if (!chainId) return jsonResponse({ error: 'chainId required' }, 400);

    await db.prepare('DELETE FROM isnad_links WHERE chain_id = ?').bind(chainId).run();

    const missing = [];
    let position = 1;
    for (const link of items) {
      let transmitterId = null;
      if (link.transmitterId) {
        transmitterId = Number(link.transmitterId);
      } else if (link.rawName) {
        const found = await db.prepare('SELECT id FROM transmitters WHERE name_ru = ? OR name_ar = ? LIMIT 1').bind(link.rawName, link.rawName).first();
        if (found) transmitterId = found.id;
        else missing.push(link.rawName);
      }
      await db
        .prepare('INSERT INTO isnad_links (chain_id, position, transmitter_id, raw_name, note) VALUES (?, ?, ?, ?, ?)')
        .bind(chainId, position, transmitterId, link.rawName || null, link.note || null)
        .run();
      position += 1;
    }
    await logAction(db, { userId: auth.id, username: auth.username, action: 'update', entity: 'isnad_links', entityId: chainId, ip });
    return jsonResponse({ ok: true, missingTransmitters: missing });
  }
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ==================== USERS ====================

async function handleUsers({ request, db, auth, sub, ip }) {
  const rest = sub.slice('users'.length).replace(/^\//, '');
  const id = rest && /^\d+$/.test(rest) ? Number(rest) : null;

  if (request.method === 'GET' && !id) {
    if (!requireRole(auth, 'moderator')) return jsonResponse({ error: 'Forbidden' }, 403);
    const { results } = await db.prepare('SELECT id, username, role, is_blocked, created_at FROM users ORDER BY id DESC').all();
    return jsonResponse({ items: results || [] });
  }

  if (!requireRole(auth, 'admin')) return jsonResponse({ error: 'Forbidden — admin role required' }, 403);

  if (request.method === 'POST' && !id) {
    const body = await readJson(request);
    const username = (body?.username || '').trim();
    const password = body?.password || '';
    const role = ['admin', 'moderator', 'editor'].includes(body?.role) ? body.role : 'editor';
    if (!username || password.length < 8) return jsonResponse({ error: 'username required, password must be at least 8 characters' }, 400);
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    if (existing) return jsonResponse({ error: 'Username already exists' }, 409);
    const hash = await hashPassword(password);
    const res = await db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').bind(username, hash, role).run();
    await logAction(db, { userId: auth.id, username: auth.username, action: 'create', entity: 'user', entityId: res.meta.last_row_id, ip });
    return jsonResponse({ ok: true, id: res.meta.last_row_id }, 201);
  }

  if (request.method === 'PUT' && id) {
    const body = await readJson(request);
    const updates = [];
    const bindings = [];
    if (typeof body?.is_blocked === 'boolean') {
      updates.push('is_blocked = ?');
      bindings.push(body.is_blocked ? 1 : 0);
    }
    if (['admin', 'moderator', 'editor'].includes(body?.role)) {
      updates.push('role = ?');
      bindings.push(body.role);
    }
    if (body?.password) {
      if (body.password.length < 8) return jsonResponse({ error: 'password must be at least 8 characters' }, 400);
      updates.push('password_hash = ?');
      bindings.push(await hashPassword(body.password));
    }
    if (!updates.length) return jsonResponse({ error: 'Nothing to update' }, 400);
    bindings.push(id);
    await db.prepare(`UPDATE users SET ${updates.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...bindings).run();
    await logAction(db, { userId: auth.id, username: auth.username, action: 'update', entity: 'user', entityId: id, ip });
    return jsonResponse({ ok: true });
  }

  if (request.method === 'DELETE' && id) {
    if (id === auth.id) return jsonResponse({ error: 'Cannot delete your own account' }, 400);
    await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    await logAction(db, { userId: auth.id, username: auth.username, action: 'delete', entity: 'user', entityId: id, ip });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

// ==================== SETTINGS ====================

async function handleSettings({ request, db, auth, ip }) {
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    (results || []).forEach((r) => (obj[r.key] = r.value));
    return jsonResponse(obj);
  }
  if (request.method === 'PUT') {
    if (!requireRole(auth, 'admin')) return jsonResponse({ error: 'Forbidden — admin role required' }, 403);
    const body = await readJson(request);
    if (!body || typeof body !== 'object') return jsonResponse({ error: 'Invalid JSON' }, 400);
    const allowedKeys = ['site_name', 'site_description', 'favicon_url', 'logo_url', 'seo_title', 'seo_description', 'api_key_ai', 'ai_settings'];
    for (const key of Object.keys(body)) {
      if (!allowedKeys.includes(key)) continue;
      await db
        .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .bind(key, String(body[key] ?? ''))
        .run();
    }
    await logAction(db, { userId: auth.id, username: auth.username, action: 'update', entity: 'settings', ip });
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ==================== AUDIT LOG ====================

async function handleAuditLog({ request, db, auth }) {
  if (!requireRole(auth, 'moderator')) return jsonResponse({ error: 'Forbidden' }, 403);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(100, Number(url.searchParams.get('pageSize') || 50));
  const offset = (page - 1) * pageSize;
  const { results } = await db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(pageSize, offset).all();
  const total = await db.prepare('SELECT COUNT(*) as n FROM audit_log').first();
  return jsonResponse({ items: results || [], total: total?.n || 0, page, pageSize });
}

// ==================== BACKUP ====================

async function handleBackup({ db, auth, ip }) {
  if (!requireRole(auth, 'admin')) return jsonResponse({ error: 'Forbidden — admin role required' }, 403);
  const tables = ['users', 'transmitters', 'transmitter_links', 'books', 'isnad_chains', 'isnad_links', 'articles', 'settings'];
  const dump = {};
  for (const t of tables) {
    const { results } = await db.prepare(`SELECT * FROM ${t}`).all();
    dump[t] = results || [];
  }
  // не включаем пароли в открытый бэкап
  dump.users = dump.users.map(({ password_hash, ...rest }) => rest);
  await logAction(db, { userId: auth.id, username: auth.username, action: 'backup', ip });
  const filename = `ilm-al-rijal-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  return jsonResponse(dump, 200, { 'Content-Disposition': `attachment; filename="${filename}"` });
}

// ==================== EXPORT ====================

async function handleExport({ request, db, auth }) {
  const url = new URL(request.url);
  const entity = url.searchParams.get('entity') || 'transmitters';
  const format = url.searchParams.get('format') || 'json';
  const cruds = { transmitters: transmittersCrud, books: booksCrud, isnad: isnadCrud, articles: articlesCrud };
  const crud = cruds[entity];
  if (!crud) return jsonResponse({ error: 'Unknown entity' }, 400);

  const items = await crud.all(db);

  if (format === 'csv') {
    const csv = toCsv(items);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${entity}.csv"`,
      },
    });
  }
  return jsonResponse(items, 200, { 'Content-Disposition': `attachment; filename="${entity}.json"` });
}

// ==================== IMPORT ====================

async function handleImport({ request, db, auth, ip }) {
  if (!requireRole(auth, 'moderator')) return jsonResponse({ error: 'Forbidden — moderator role required' }, 403);
  const url = new URL(request.url);
  const entity = url.searchParams.get('entity') || 'transmitters';
  const format = url.searchParams.get('format') || 'json';
  const cruds = { transmitters: transmittersCrud, books: booksCrud, isnad: isnadCrud, articles: articlesCrud };
  const crud = cruds[entity];
  if (!crud) return jsonResponse({ error: 'Unknown entity' }, 400);

  const text = await request.text();
  let rows;
  try {
    rows = format === 'csv' ? parseCsv(text) : JSON.parse(text);
  } catch (e) {
    return jsonResponse({ error: 'Failed to parse import file: ' + e.message }, 400);
  }
  if (!Array.isArray(rows)) return jsonResponse({ error: 'Import data must be an array' }, 400);
  if (rows.length > 5000) return jsonResponse({ error: 'Max 5000 rows per import. Split the file.' }, 400);

  let created = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await crud.create(db, row);
      created += 1;
    } catch {
      failed += 1;
    }
  }
  await logAction(db, { userId: auth.id, username: auth.username, action: 'import', entity, details: { created, failed, total: rows.length }, ip });
  return jsonResponse({ ok: true, created, failed, total: rows.length });
}
