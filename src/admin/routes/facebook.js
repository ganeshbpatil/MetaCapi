const express = require('express');
const accountModel = require('../../db/models/account');
const fbConfigModel = require('../../db/models/facebook-config');
const facebook = require('../../services/facebook');
const router = express.Router({ mergeParams: true });

// Save Facebook credentials
router.post('/save', async (req, res) => {
  const { id: accountId } = req.params;
  const { pixel_id, access_token, app_secret, test_event_code } = req.body;

  if (!pixel_id || !access_token) {
    req.session.flash_error = 'Pixel ID and Access Token are required';
    return res.redirect(`/admin/accounts/${accountId}`);
  }

  // Verify the token before saving
  const verify = await facebook.verifyToken(pixel_id.trim(), access_token.trim());
  if (!verify.valid) {
    req.session.flash_error = `Facebook connection failed: ${verify.error}`;
    return res.redirect(`/admin/accounts/${accountId}`);
  }

  fbConfigModel.upsert(accountId, {
    pixelId: pixel_id.trim(),
    accessToken: access_token.trim(),
    appSecret: app_secret ? app_secret.trim() : null,
    testEventCode: test_event_code ? test_event_code.trim() : null,
  });

  req.session.flash = `Facebook connected — Pixel "${verify.name}" (${pixel_id}) verified ✓`;
  res.redirect(`/admin/accounts/${accountId}`);
});

// Test connection
router.post('/test', async (req, res) => {
  const { id: accountId } = req.params;
  const cfg = fbConfigModel.findByAccountId(accountId);
  if (!cfg) {
    return res.json({ ok: false, message: 'No Facebook config saved yet' });
  }
  const result = await facebook.verifyToken(cfg.pixel_id, cfg.access_token);
  res.json(result.valid
    ? { ok: true, message: `Connected — Pixel "${result.name}" is active` }
    : { ok: false, message: result.error }
  );
});

// Disconnect
router.post('/disconnect', (req, res) => {
  fbConfigModel.delete(req.params.id);
  req.session.flash = 'Facebook disconnected';
  res.redirect(`/admin/accounts/${req.params.id}`);
});

module.exports = router;
