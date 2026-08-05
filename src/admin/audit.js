export async function logAction(db, { userId, username, action, entity, entityId, details, ip }) {
  try {
    await db
      .prepare(
        `INSERT INTO audit_log (user_id, username, action, entity, entity_id, details, ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId ?? null,
        username ?? null,
        action,
        entity ?? null,
        entityId != null ? String(entityId) : null,
        details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
        ip ?? null
      )
      .run();
  } catch (e) {
    // журналирование не должно ломать основной запрос
    console.error('audit log failed', e);
  }
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
