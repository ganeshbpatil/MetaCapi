const express = require('express');
const accountModel = require('../../db/models/account');
const eventLog = require('../../db/models/event-log');
const router = express.Router({ mergeParams: true });

router.get('/', (req, res) => {
  const { id: accountId } = req.params;
  const account = accountModel.findById(accountId);
  if (!account) return res.status(404).renderPage('error', { message: 'Account not found' });

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const status = req.query.status || '';
  const limit = 50;
  const offset = (page - 1) * limit;

  const logs = eventLog.findByAccount(accountId, { limit, offset, status: status || undefined });
  const total = eventLog.countByAccount(accountId, status || undefined);
  const stats = eventLog.stats(accountId);
  const pages = Math.ceil(total / limit);

  res.renderPage('logs', { account, logs, stats, page, pages, total, status });
});

module.exports = router;
