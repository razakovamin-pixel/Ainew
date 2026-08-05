/**
 * Generic CRUD helper for simple D1 tables.
 * Все запросы — параметризованные (prepare().bind()), что исключает SQL-инъекции.
 */
export function makeCrud({ table, columns, searchColumns = [], defaultSort = 'id DESC' }) {
  function pickAllowed(body) {
    const out = {};
    for (const col of columns) {
      if (Object.prototype.hasOwnProperty.call(body, col)) out[col] = body[col];
    }
    return out;
  }

  async function list(db, { page = 1, pageSize = 20, search = '', sort } = {}) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let where = '';
    let bindings = [];
    if (search && searchColumns.length) {
      where = 'WHERE ' + searchColumns.map((c) => `${c} LIKE ?`).join(' OR ');
      bindings = searchColumns.map(() => `%${search}%`);
    }

    const orderBy = sort && /^[a-zA-Z_]+ (ASC|DESC)$/i.test(sort) ? sort : defaultSort;

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM ${table} ${where}`).bind(...bindings);
    const countRes = await countStmt.first();
    const total = countRes ? Number(countRes.total) : 0;

    const rowsStmt = db
      .prepare(`SELECT * FROM ${table} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .bind(...bindings, pageSize, offset);
    const { results } = await rowsStmt.all();

    return { items: results || [], total, page, pageSize };
  }

  async function get(db, id) {
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  }

  async function create(db, body) {
    const data = pickAllowed(body);
    const keys = Object.keys(data);
    if (!keys.length) throw new Error('empty payload');
    const placeholders = keys.map(() => '?').join(',');
    const stmt = db
      .prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`)
      .bind(...keys.map((k) => data[k]));
    const res = await stmt.run();
    const id = res.meta && res.meta.last_row_id;
    return get(db, id);
  }

  async function update(db, id, body) {
    const data = pickAllowed(body);
    const keys = Object.keys(data);
    if (!keys.length) return get(db, id);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const hasUpdatedAt = columns.includes('updated_at') === false; // updated_at not user-settable normally
    const sql = `UPDATE ${table} SET ${setClause}${
      hasUpdatedAt ? '' : ''
    }, updated_at = COALESCE(updated_at, datetime('now')) WHERE id = ?`;
    // Note: some tables (users, settings) may not have updated_at; guard below via try/catch fallback
    try {
      await db.prepare(sql).bind(...keys.map((k) => data[k]), id).run();
    } catch {
      await db
        .prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
        .bind(...keys.map((k) => data[k]), id)
        .run();
    }
    return get(db, id);
  }

  async function remove(db, id) {
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return { id };
  }

  async function all(db) {
    const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY ${defaultSort}`).all();
    return results || [];
  }

  return { list, get, create, update, remove, all, pickAllowed };
}
