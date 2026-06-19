const db = require('../index');

module.exports = {
  upsert(accountId, { pixelId, accessToken, appSecret, testEventCode }) {
    db.prepare(`
      INSERT INTO facebook_configs (account_id, pixel_id, access_token, app_secret, test_event_code, status, connected_at)
      VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT(account_id) DO UPDATE SET
        pixel_id = excluded.pixel_id,
        access_token = excluded.access_token,
        app_secret = COALESCE(excluded.app_secret, app_secret),
        test_event_code = excluded.test_event_code,
        status = 'active',
        connected_at = CURRENT_TIMESTAMP
    `).run(accountId, pixelId, accessToken, appSecret || null, testEventCode || null);
  },

  findByAccountId(accountId) {
    return db.prepare('SELECT * FROM facebook_configs WHERE account_id = ?').get(accountId);
  },

  setStatus(accountId, status) {
    db.prepare('UPDATE facebook_configs SET status = ? WHERE account_id = ?').run(status, accountId);
  },

  delete(accountId) {
    db.prepare('DELETE FROM facebook_configs WHERE account_id = ?').run(accountId);
  },
};
