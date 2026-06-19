const db = require('../index');

module.exports = {
  insert(accountId, { eventType, zohoRecordId, capiEventId, status, errorMessage }) {
    db.prepare(`
      INSERT INTO event_logs (account_id, event_type, zoho_record_id, capi_event_id, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(accountId, eventType, zohoRecordId || null, capiEventId || null, status, errorMessage || null);
  },

  findByAccount(accountId, { limit = 100, offset = 0, status } = {}) {
    if (status) {
      return db.prepare(`
        SELECT * FROM event_logs WHERE account_id = ? AND status = ?
        ORDER BY created_at DESC LIMIT ? OFFSET ?
      `).all(accountId, status, limit, offset);
    }
    return db.prepare(`
      SELECT * FROM event_logs WHERE account_id = ?
      ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(accountId, limit, offset);
  },

  countByAccount(accountId, status) {
    if (status) {
      return db.prepare('SELECT COUNT(*) AS n FROM event_logs WHERE account_id = ? AND status = ?')
        .get(accountId, status).n;
    }
    return db.prepare('SELECT COUNT(*) AS n FROM event_logs WHERE account_id = ?').get(accountId).n;
  },

  stats(accountId) {
    return db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
      FROM event_logs WHERE account_id = ?
    `).get(accountId);
  },

  // Keep only last 2000 logs per account to avoid unbounded growth
  prune(accountId) {
    db.prepare(`
      DELETE FROM event_logs WHERE account_id = ? AND id NOT IN (
        SELECT id FROM event_logs WHERE account_id = ? ORDER BY created_at DESC LIMIT 2000
      )
    `).run(accountId, accountId);
  },
};
