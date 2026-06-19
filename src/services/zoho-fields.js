const axios = require('axios');
const zohoConfigModel = require('../db/models/zoho-config');
const { getValidAccessToken } = require('./zoho-token');

// Zoho CRM API base (uses api.zoho.com for most regions)
const API_BASES = {
  'https://accounts.zoho.com':    'https://www.zohoapis.com',
  'https://accounts.zoho.eu':     'https://www.zohoapis.eu',
  'https://accounts.zoho.in':     'https://www.zohoapis.in',
  'https://accounts.zoho.com.au': 'https://www.zohoapis.com.au',
  'https://accounts.zoho.jp':     'https://www.zohoapis.jp',
};

function apiBase(accountsUrl) {
  return API_BASES[accountsUrl] || 'https://www.zohoapis.com';
}

// Fetch field list for a module (Leads or Deals)
async function fetchModuleFields(accountId, module) {
  const cfg = zohoConfigModel.findByAccountId(accountId);
  if (!cfg || cfg.status !== 'active') return [];

  const token = await getValidAccessToken(accountId);
  const base = apiBase(cfg.accounts_url);

  const res = await axios.get(`${base}/crm/v2/settings/fields`, {
    params: { module },
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    timeout: 10000,
  });

  return (res.data.fields || []).map(f => ({
    api_name: f.api_name,
    label: f.field_label,
    type: f.data_type,
  }));
}

// Fetch fields for both Leads and Deals, return combined sorted list
async function fetchAllFields(accountId) {
  const [leadFields, dealFields] = await Promise.all([
    fetchModuleFields(accountId, 'Leads').catch(() => []),
    fetchModuleFields(accountId, 'Deals').catch(() => []),
  ]);

  // Merge and deduplicate by api_name, tag each with its module
  const seen = new Set();
  const all = [];

  for (const f of leadFields) {
    if (!seen.has(f.api_name)) {
      seen.add(f.api_name);
      all.push({ ...f, module: 'Leads' });
    }
  }
  for (const f of dealFields) {
    if (!seen.has(f.api_name)) {
      seen.add(f.api_name);
      all.push({ ...f, module: 'Deals' });
    } else {
      // Mark as shared
      const existing = all.find(x => x.api_name === f.api_name);
      if (existing) existing.module = 'Leads & Deals';
    }
  }

  return all.sort((a, b) => a.api_name.localeCompare(b.api_name));
}

module.exports = { fetchAllFields };
