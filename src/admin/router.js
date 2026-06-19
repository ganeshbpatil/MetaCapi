const express = require('express');
const axios = require('axios');
const adminUser = require('../db/models/admin-user');
const accountModel = require('../db/models/account');
const zohoConfigModel = require('../db/models/zoho-config');
const accountsRouter = require('./routes/accounts');
const facebookRouter = require('./routes/facebook');
const zohoRouter = require('./routes/zoho');
const logsRouter = require('./routes/logs');

const adminRouter = express.Router();

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect('/admin/login');
}

// --- Login ---
adminRouter.get('/login', (req, res) => {
  const flash = req.session.flash_error;
  delete req.session.flash_error;
  res.render('login', { error: flash || null });
});

adminRouter.post('/login', express.urlencoded({ extended: false }), (req, res) => {
  const { username, password } = req.body;
  if (adminUser.verify(username, password)) {
    req.session.admin = { username };
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid username or password' });
});

adminRouter.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// --- Dashboard ---
adminRouter.get('/', requireAuth, (req, res) => {
  const accounts = accountModel.findAll();
  const flash = req.session.flash;
  delete req.session.flash;
  res.renderPage('dashboard', { accounts, flash });
});

// --- Settings ---
adminRouter.get('/settings', requireAuth, (req, res) => {
  const flash = req.session.flash;
  const error = req.session.flash_error;
  delete req.session.flash;
  delete req.session.flash_error;
  res.renderPage('settings', { flash, error });
});

adminRouter.post('/settings/change-password', requireAuth, express.urlencoded({ extended: false }), (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  if (!adminUser.verify(req.session.admin.username, current_password)) {
    req.session.flash_error = 'Current password is incorrect';
    return res.redirect('/admin/settings');
  }
  if (new_password.length < 8) {
    req.session.flash_error = 'New password must be at least 8 characters';
    return res.redirect('/admin/settings');
  }
  if (new_password !== confirm_password) {
    req.session.flash_error = 'Passwords do not match';
    return res.redirect('/admin/settings');
  }
  adminUser.changePassword(req.session.admin.username, new_password);
  req.session.flash = 'Password changed successfully';
  res.redirect('/admin/settings');
});

// Zoho OAuth callback — fixed URL so the redirect_uri matches what was registered
adminRouter.get('/zoho/callback', requireAuth, async (req, res) => {
  const { code, error } = req.query;
  const accountId = req.session.zoho_oauth_account;

  if (error || !code) {
    req.session.flash_error = `Zoho authorization denied: ${error || 'no code received'}`;
    return res.redirect(accountId ? `/admin/accounts/${accountId}` : '/admin');
  }
  if (!accountId) {
    req.session.flash_error = 'Session expired — please start the connection again';
    return res.redirect('/admin');
  }

  const cfg = zohoConfigModel.findByAccountId(accountId);
  if (!cfg) {
    req.session.flash_error = 'Zoho credentials not found — please save them first';
    return res.redirect(`/admin/accounts/${accountId}`);
  }

  try {
    const redirectUri = `${process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`}/admin/zoho/callback`;
    const tokenRes = await axios.post(`${cfg.accounts_url}/oauth/v2/token`, null, {
      params: {
        grant_type: 'authorization_code',
        client_id: cfg.client_id,
        client_secret: cfg.client_secret,
        redirect_uri: redirectUri,
        code,
      },
      timeout: 10000,
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    if (!refresh_token) throw new Error('No refresh_token in response — ensure offline access was requested');

    const expiry = Date.now() + (expires_in - 60) * 1000;
    zohoConfigModel.saveTokens(accountId, {
      refreshToken: refresh_token,
      accessToken: access_token,
      tokenExpiry: expiry,
    });

    delete req.session.zoho_oauth_account;
    req.session.flash = 'Zoho CRM connected successfully';
    res.redirect(`/admin/accounts/${accountId}`);

  } catch (err) {
    const msg = err.response?.data?.error || err.message;
    req.session.flash_error = `Zoho token exchange failed: ${msg}`;
    res.redirect(`/admin/accounts/${accountId}`);
  }
});

// Sub-routers (all protected)
adminRouter.use('/accounts', requireAuth, accountsRouter);
adminRouter.use('/accounts/:id/facebook', requireAuth, facebookRouter);
adminRouter.use('/accounts/:id/zoho', requireAuth, zohoRouter);
adminRouter.use('/accounts/:id/logs', requireAuth, logsRouter);

module.exports = { adminRouter };
