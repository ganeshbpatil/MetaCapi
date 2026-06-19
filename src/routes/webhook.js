const express = require('express');
const crypto = require('crypto');
const Queue = require('bull');
const { config } = require('../config');
const accountModel = require('../db/models/account');
const { logger } = require('../utils/logger');

const webhookRouter = express.Router();

const eventQueue = new Queue('capi-events', {
  redis: { host: config.redis.host, port: config.redis.port },
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffDelay },
    removeOnComplete: config.queue.removeOnComplete,
    removeOnFail: config.queue.removeOnFail,
  },
});

function verifySignature(body, signature, secret) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// Multi-tenant Zoho webhook: POST /webhooks/:accountId/zoho
webhookRouter.post('/:accountId/zoho', express.raw({ type: 'application/json' }), async (req, res) => {
  const { accountId } = req.params;

  const account = accountModel.findById(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Respond to Zoho immediately (must reply within 5s)
  res.status(200).json({ status: 'received' });

  const rawBody = req.body.toString();
  const signature = req.headers['x-zoho-signature'];

  if (!verifySignature(rawBody, signature, account.webhook_secret)) {
    logger.warn('Invalid Zoho signature', { accountId });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    logger.error('Invalid JSON from Zoho webhook', { accountId });
    return;
  }

  const { event_type, record_id, record_data } = payload;
  if (!event_type || !record_id) {
    logger.warn('Missing event_type or record_id', { accountId });
    return;
  }

  logger.info('Zoho webhook received', { accountId, event_type, record_id });

  try {
    await eventQueue.add({ accountId, event_type, record_id, record_data, received_at: Date.now() });
  } catch (err) {
    logger.error('Failed to enqueue event', { accountId, event_type, error: err.message });
  }
});

// Meta lead ads webhook — GET for challenge, POST for lead events
webhookRouter.get('/meta', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  const expected = process.env.META_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === expected) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Verification failed' });
});

webhookRouter.post('/meta', express.json(), async (req, res) => {
  res.status(200).json({ status: 'received' });
  const { object, entry } = req.body;
  if (object !== 'page') return;
  for (const pageEntry of entry || []) {
    for (const change of pageEntry.changes || []) {
      if (change.field === 'leadgen') {
        const { leadgen_id, page_id, form_id, ad_id, adgroup_id } = change.value;
        logger.info('Meta leadgen event', { leadgen_id, page_id });
        // Route to correct account by page_id — extend here for per-account page mapping
        await eventQueue.add({
          event_type: 'meta_leadgen',
          record_id: leadgen_id,
          record_data: { leadgen_id, page_id, form_id, ad_id: ad_id || adgroup_id },
          received_at: Date.now(),
        });
      }
    }
  }
});

eventQueue.on('failed', (job, err) => {
  logger.error('Queue job failed', {
    jobId: job.id,
    accountId: job.data.accountId,
    event_type: job.data.event_type,
    attempts: job.attemptsMade,
    error: err.message,
  });
});

module.exports = { webhookRouter, eventQueue };
