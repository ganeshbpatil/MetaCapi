const express = require('express');
const axios = require('axios');
const zohoConfigModel = require('../../db/models/zoho-config');
const router = express.Router({ mergeParams: true });

const ZOHO_SCOPES = 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.functions.execute';

// Step 1 — Save client credentials and redirect to Zoho OAuth
router.post('/connect', (req, res) => {
  const { id: accountId } = req.params;
  const { client_id, client_secret, accounts_url } = req.body;

  if (!client_id || !client_secret) {
    req.session.flash_error = 'Client ID and Client Secret are required';
    return res.redirect(`/admin/accounts/${accountId}`);
  }

  const baseUrl = (accounts_url || 'https://accounts.zoho.com').replace(/\/$/, '');

  zohoConfigModel.upsertCredentials(accountId, {
    clientId: client_id.trim(),
    clientSecret: client_secret.trim(),
    accountsUrl: baseUrl,
  });

  // Store accountId in session so we know where to save tokens after callback
  req.session.zoho_oauth_account = accountId;

  const redirectUri = buildRedirectUri(req);
  const authUrl = `${baseUrl}/oauth/v2/auth?` + new URLSearchParams({
    scope: ZOHO_SCOPES,
    client_id: client_id.trim(),
    response_type: 'code',
    access_type: 'offline',
    redirect_uri: redirectUri,
    prompt: 'consent',
  });

  res.redirect(authUrl);
});

// Test Zoho connection
router.post('/test', async (req, res) => {
  const { id: accountId } = req.params;
  const cfg = zohoConfigModel.findByAccountId(accountId);
  if (!cfg || !cfg.refresh_token) {
    return res.json({ ok: false, message: 'Not connected — complete OAuth first' });
  }
  try {
    const { getValidAccessToken } = require('../../services/zoho-token');
    const token = await getValidAccessToken(accountId);
    const org = await axios.get('https://www.zohoapis.com/crm/v2/org', {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
      timeout: 8000,
    });
    const orgName = org.data.org?.[0]?.company_name || 'Connected';
    res.json({ ok: true, message: `Connected to Zoho CRM — "${orgName}" ✓` });
  } catch (err) {
    res.json({ ok: false, message: err.response?.data?.message || err.message });
  }
});

// Disconnect
router.post('/disconnect', (req, res) => {
  zohoConfigModel.delete(req.params.id);
  req.session.flash = 'Zoho CRM disconnected';
  res.redirect(`/admin/accounts/${req.params.id}`);
});

function buildRedirectUri(req) {
  const host = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${host}/admin/zoho/callback`;
}

module.exports = router;
