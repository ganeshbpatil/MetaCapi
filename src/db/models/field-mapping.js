const db = require('../index');

// All mappable Facebook CAPI fields grouped by category
const FB_FIELDS = [
  // ── User Identity (hashed before sending) ──────────────────────────────
  { key: 'email',           label: 'Email',         group: 'User Identity',   required: true,  hash: true  },
  { key: 'phone',           label: 'Phone',          group: 'User Identity',   required: false, hash: true  },
  { key: 'firstName',       label: 'First Name',     group: 'User Identity',   required: false, hash: true  },
  { key: 'lastName',        label: 'Last Name',      group: 'User Identity',   required: false, hash: true  },
  { key: 'city',            label: 'City',           group: 'User Identity',   required: false, hash: true  },
  { key: 'state',           label: 'State',          group: 'User Identity',   required: false, hash: true  },
  { key: 'zip',             label: 'Zip Code',       group: 'User Identity',   required: false, hash: true  },
  { key: 'country',         label: 'Country',        group: 'User Identity',   required: false, hash: true  },

  // ── Facebook Attribution (not hashed — raw identifiers) ────────────────
  { key: 'fbclid',          label: 'fbclid',                   group: 'Facebook Attribution', required: false, hash: false },
  { key: 'fbc',             label: 'fbc (click cookie)',        group: 'Facebook Attribution', required: false, hash: false },
  { key: 'fbp',             label: 'fbp (browser cookie)',      group: 'Facebook Attribution', required: false, hash: false },
  { key: 'facebookLeadId',  label: 'Facebook Lead ID',          group: 'Facebook Attribution', required: false, hash: false },

  // ── Campaign / Ad Attribution ───────────────────────────────────────────
  { key: 'campaignId',      label: 'Campaign ID',              group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'campaignName',    label: 'Campaign Name',            group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'adSetId',         label: 'Ad Set ID',                group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'adSetName',       label: 'Ad Set Name',              group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'adId',            label: 'Ad ID',                    group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'adName',          label: 'Ad Name',                  group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'formId',          label: 'Form ID',                  group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'formName',        label: 'Form Name',                group: 'Campaign & Ad',        required: false, hash: false },
  { key: 'sourcePlatform',  label: 'Source Platform',          group: 'Campaign & Ad',        required: false, hash: false },

  // ── Deal / Revenue ──────────────────────────────────────────────────────
  { key: 'value',           label: 'Deal Value (Purchase event)', group: 'Deal / Revenue',    required: false, hash: false },
  { key: 'currency',        label: 'Currency (Purchase event)',   group: 'Deal / Revenue',    required: false, hash: false },
  { key: 'originalLeadId',  label: 'Original Lead ID',            group: 'Deal / Revenue',    required: false, hash: false },
  { key: 'lossReason',      label: 'Loss Reason',                 group: 'Deal / Revenue',    required: false, hash: false },
];

// Default Zoho API field names for each fb_field
const DEFAULT_ZOHO_NAMES = {
  email:          'Email',
  phone:          'Mobile',
  firstName:      'First_Name',
  lastName:       'Last_Name',
  city:           'City',
  state:          'State',
  zip:            'Zip_Code',
  country:        'Country',
  fbclid:         'fbclid',
  fbc:            'fbc',
  fbp:            'fbp',
  facebookLeadId: 'Lead_Facebook_ID',
  campaignId:     'Facebook_Campaign_ID',
  campaignName:   'Facebook_Campaign_Name',
  adSetId:        'Facebook_Ad_Set_ID',
  adSetName:      'Facebook_Ad_Set_Name',
  adId:           'Facebook_Ad_ID',
  adName:         'Facebook_Ad_Name',
  formId:         'Facebook_Form_ID',
  formName:       'Facebook_Form_Name',
  sourcePlatform: 'Source_Platform',
  value:          'Amount',
  currency:       'Currency',
  originalLeadId: 'Facebook_Lead_ID',
  lossReason:     '',
};

module.exports = {
  FB_FIELDS,
  DEFAULT_ZOHO_NAMES,

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
      if (recordData[zohoField] !== undefined && recordData[zohoField] !== null && recordData[zohoField] !== '') {
        result[fbField] = recordData[zohoField];
      }
    }
    return result;
  },
};
