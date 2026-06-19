const axios = require('axios');
const zohoConfig = require('../db/models/zoho-config');

async function refreshAccessToken(accountId) {
  const cfg = zohoConfig.findByAccountId(accountId);
  if (!cfg || !cfg.refresh_token) throw new Error('No Zoho refresh token for account ' + accountId);

  const response = await axios.post(`${cfg.accounts_url}/oauth/v2/token`, null, {
    params: {
      grant_type: 'refresh_token',
      client_id: cfg.client_id,
      client_secret: cfg.client_secret,
      refresh_token: cfg.refresh_token,
    },
    timeout: 10000,
  });

  const { access_token, expires_in } = response.data;
  const expiry = Date.now() + (expires_in - 60) * 1000;
  zohoConfig.updateAccessToken(accountId, access_token, expiry);
  return access_token;
}

async function getValidAccessToken(accountId) {
  const cfg = zohoConfig.findByAccountId(accountId);
  if (!cfg) throw new Error('No Zoho config for account ' + accountId);

  if (cfg.access_token && cfg.token_expiry && Date.now() < cfg.token_expiry) {
    return cfg.access_token;
  }

  return refreshAccessToken(accountId);
}

module.exports = { getValidAccessToken, refreshAccessToken };
