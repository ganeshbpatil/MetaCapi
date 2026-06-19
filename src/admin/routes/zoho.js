const express = require('express');
const axios = require('axios');
const zohoConfigModel = require('../../db/models/zoho-config');
const router = express.Router({ mergeParams: true });

router.use(express.urlencoded({ extended: false }));

const ZOHO_SCOPES = 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.functions.execute';

// Step 1 — Save credentials only (no OAuth redirect)
router.post('/save-credentials', (req, res) => {
  const { id: accountId } = req.params;
  const { client_id, client_secret, accounts_url } = req.body;

  if (!client_id || !client_secret) {
    req.session.flash_error = 'Client ID and Client Secret are required';
    return req.session.save(() => res.redirect(`/admin/accounts/${accountId}`));
  }

  const baseUrl = (accounts_url || 'https://accounts.zoho.com').replace(/\/$/, '');
  zohoConfigModel.upsertCredentials(accountId, {
    clientId: client_id.trim(),
    clientSecret: client_secret.trim(),
    accountsUrl: baseUrl,
  });

  req.session.flash = 'Credentials saved — now click "Authorize with Zoho" to connect';
  req.session.save(() => res.redirect(`/admin/accounts/${accountId}`));
});

// Step 2 — Start OAuth flow (credentials must already be saved)
router.post('/authorize', (req, res) => {
  const { id: accountId } = req.params;
  const cfg = zohoConfigModel.findByAccountId(accountId);

  if (!cfg || !cfg.client_id) {
    req.session.flash_error = 'Please save your Client ID and Secret first';
    return req.session.save(() => res.redirect(`/admin/accounts/${accountId}`));
  }

  req.session.zoho_oauth_account = accountId;
  const redirectUri = buildRedirectUri(req);

  const authUrl = `${cfg.accounts_url}/oauth/v2/auth?` + new URLSearchParams({
    scope: ZOHO_SCOPES,
    client_id: cfg.client_id,
    response_type: 'code',
    access_type: 'offline',
    redirect_uri: redirectUri,
    prompt: 'consent',
  });

  req.session.save(() => res.redirect(authUrl));
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
    const apiBase = cfg.accounts_url.replace('accounts.zoho', 'www.zohoapis');
    const org = await axios.get(`${apiBase}/crm/v2/org`, {
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
  req.session.save(() => res.redirect(`/admin/accounts/${req.params.id}`));
});

function buildRedirectUri(req) {
  const host = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${host}/admin/zoho/callback`;
}

module.exports = router;
