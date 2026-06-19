const db = require('../index');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  create(name) {
    const id = uuidv4();
    const secret = generateWebhookSecret();
    db.prepare('INSERT INTO accounts (id, name, webhook_secret) VALUES (?, ?, ?)').run(id, name, secret);
    return this.findById(id);
  },

  findAll() {
    return db.prepare(`
      SELECT a.*,
        f.pixel_id, f.status AS fb_status,
        z.status AS zoho_status, z.accounts_url
      FROM accounts a
      LEFT JOIN facebook_configs f ON f.account_id = a.id
      LEFT JOIN zoho_configs z ON z.account_id = a.id
      ORDER BY a.created_at DESC
    `).all();
  },

  findById(id) {
    return db.prepare(`
      SELECT a.*,
        f.pixel_id, f.access_token AS fb_token, f.app_secret, f.test_event_code, f.status AS fb_status,
        z.client_id, z.client_secret, z.refresh_token, z.access_token AS zoho_access_token,
        z.token_expiry, z.accounts_url, z.status AS zoho_status, z.connected_at AS zoho_connected_at
      FROM accounts a
      LEFT JOIN facebook_configs f ON f.account_id = a.id
      LEFT JOIN zoho_configs z ON z.account_id = a.id
      WHERE a.id = ?
    `).get(id);
  },

  update(id, name) {
    db.prepare('UPDATE accounts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id);
    return this.findById(id);
  },

  delete(id) {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  },

  regenerateSecret(id) {
    const secret = generateWebhookSecret();
    db.prepare('UPDATE accounts SET webhook_secret = ? WHERE id = ?').run(secret, id);
    return secret;
  },
};
