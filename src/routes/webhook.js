const express = require('express');
const Queue = require('bull');
const { config } = require('../config');
const { verifyZohoSignature, verifyMetaWebhook } = require('../middleware/auth');
const { validateZohoWebhook } = require('../middleware/validate');
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

webhookRouter.post('/zoho', verifyZohoSignature, validateZohoWebhook, async (req, res) => {
  res.status(200).json({ status: 'received' });

  const { event_type, record_id, record_data } = req.body;
  logger.info('Zoho webhook received', { event_type, record_id });

  try {
    await eventQueue.add({ event_type, record_id, record_data, received_at: Date.now() });
  } catch (err) {
    logger.error('Failed to enqueue event', { event_type, record_id, error: err.message });
  }
});

webhookRouter.get('/meta', verifyMetaWebhook);

webhookRouter.post('/meta', async (req, res) => {
  res.status(200).json({ status: 'received' });

  const { object, entry } = req.body;
  if (object !== 'page') return;

  for (const pageEntry of entry || []) {
    for (const change of pageEntry.changes || []) {
      if (change.field === 'leadgen') {
        const { leadgen_id, page_id, form_id, ad_id, adgroup_id } = change.value;
        logger.info('Meta leadgen event received', { leadgen_id, page_id });
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
    event_type: job.data.event_type,
    attempts: job.attemptsMade,
    error: err.message,
  });
});

module.exports = { webhookRouter, eventQueue };
