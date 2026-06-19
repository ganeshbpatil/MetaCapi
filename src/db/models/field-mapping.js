const db = require('../index');

// Facebook CAPI fields and their labels
const FB_FIELDS = [
  { key: 'email',      label: 'Email',        required: true  },
  { key: 'phone',      label: 'Phone',        required: false },
  { key: 'firstName',  label: 'First Name',   required: false },
  { key: 'lastName',   label: 'Last Name',    required: false },
  { key: 'city',       label: 'City',         required: false },
  { key: 'state',      label: 'State',        required: false },
  { key: 'zip',        label: 'Zip Code',     required: false },
  { key: 'country',    label: 'Country',      required: false },
  { key: 'value',      label: 'Deal Value (for Purchase event)', required: false },
  { key: 'currency',   label: 'Currency (for Purchase event)',   required: false },
];

module.exports = {
  FB_FIELDS,

  // Save all mappings for an account (replaces existing)
  save(accountId, mappings) {
    const del = db.prepare('DELETE FROM field_mappings WHERE account_id = ?');
    const ins = db.prepare('INSERT INTO field_mappings (account_id, fb_field, zoho_field) VALUES (?, ?, ?)');
    const tx = db.transaction(() => {
      del.run(accountId);
      for (const [fbField, zohoField] of Object.entries(mappings)) {
        if (zohoField && zohoField.trim()) {
          ins.run(accountId, fbField, zohoField.trim());
        }
      }
    });
    tx();
  },

  // Returns { email: 'Email', phone: 'Mobile', ... } keyed by fb_field
  findByAccount(accountId) {
    const rows = db.prepare('SELECT fb_field, zoho_field FROM field_mappings WHERE account_id = ?').all(accountId);
    return Object.fromEntries(rows.map(r => [r.fb_field, r.zoho_field]));
  },

  // Apply mappings to a flat Zoho record_data object → returns data object for hasher.buildUserData
  applyMappings(mappings, recordData) {
    const result = {};
    for (const [fbField, zohoField] of Object.entries(mappings)) {
      if (recordData[zohoField] !== undefined && recordData[zohoField] !== null) {
        result[fbField] = recordData[zohoField];
      }
    }
    return result;
  },
};
