const db = require('../index');

module.exports = {
  upsertCredentials(accountId, { clientId, clientSecret, accountsUrl }) {
    db.prepare(`
      INSERT INTO zoho_configs (account_id, client_id, client_secret, accounts_url, status)
      VALUES (?, ?, ?, ?, 'pending')
      ON CONFLICT(account_id) DO UPDATE SET
        client_id = excluded.client_id,
        client_secret = excluded.client_secret,
        accounts_url = excluded.accounts_url,
        status = 'pending'
    `).run(accountId, clientId, clientSecret, accountsUrl || 'https://accounts.zoho.com');
  },

  saveTokens(accountId, { refreshToken, accessToken, tokenExpiry }) {
    db.prepare(`
      UPDATE zoho_configs
      SET refresh_token = ?, access_token = ?, token_expiry = ?,
          status = 'active', connected_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `).run(refreshToken, accessToken, tokenExpiry, accountId);
  },

  updateAccessToken(accountId, accessToken, tokenExpiry) {
    db.prepare(`
      UPDATE zoho_configs SET access_token = ?, token_expiry = ? WHERE account_id = ?
    `).run(accessToken, tokenExpiry, accountId);
  },

  findByAccountId(accountId) {
    return db.prepare('SELECT * FROM zoho_configs WHERE account_id = ?').get(accountId);
  },

  setStatus(accountId, status) {
    db.prepare('UPDATE zoho_configs SET status = ? WHERE account_id = ?').run(status, accountId);
  },

  delete(accountId) {
    db.prepare('DELETE FROM zoho_configs WHERE account_id = ?').run(accountId);
  },
};
