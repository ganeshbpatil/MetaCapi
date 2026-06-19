const db = require('../index');
const bcrypt = require('bcrypt');

module.exports = {
  create(username, password) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT OR REPLACE INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  },

  verify(username, password) {
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) return false;
    return bcrypt.compareSync(password, user.password_hash);
  },

  exists() {
    return db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n > 0;
  },

  changePassword(username, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, username);
  },
};
