const express = require('express');
const router = express.Router();
const accountModel = require('../../db/models/account');
const eventLog = require('../../db/models/event-log');

router.use(express.urlencoded({ extended: false }));

router.get('/new', (req, res) => {
  res.renderPage('account-new', { error: null });
});

router.post('/new', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.renderPage('account-new', { error: 'Account name is required' });
  }
  const account = accountModel.create(name.trim());
  req.session.flash = 'Account created successfully';
  res.redirect(`/admin/accounts/${account.id}`);
});

router.get('/:id', (req, res) => {
  const account = accountModel.findById(req.params.id);
  if (!account) return res.status(404).renderPage('error', { message: 'Account not found' });

  const stats = eventLog.stats(req.params.id);
  const flash = req.session.flash;
  const flashError = req.session.flash_error;
  delete req.session.flash;
  delete req.session.flash_error;

  res.renderPage('account', {
    account,
    stats,
    flash,
    flashError,
    webhookUrl: buildWebhookUrl(req, account.id),
  });
});

router.post('/:id/update-name', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    req.session.flash_error = 'Name cannot be empty';
  } else {
    accountModel.update(req.params.id, name.trim());
    req.session.flash = 'Account name updated';
  }
  res.redirect(`/admin/accounts/${req.params.id}`);
});

router.post('/:id/regenerate-secret', (req, res) => {
  accountModel.regenerateSecret(req.params.id);
  req.session.flash = 'Webhook secret regenerated — update your Zoho webhook configuration';
  res.redirect(`/admin/accounts/${req.params.id}`);
});

router.post('/:id/delete', (req, res) => {
  accountModel.delete(req.params.id);
  req.session.flash = 'Account deleted';
  res.redirect('/admin');
});

function buildWebhookUrl(req, accountId) {
  const host = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  return `${host}/webhooks/${accountId}/zoho`;
}

module.exports = router;
