require('dotenv').config();
const Queue = require('bull');
const { config } = require('../config');
const { processEvent } = require('./processor');
const { logger } = require('../utils/logger');

const eventQueue = new Queue('capi-events', {
  redis: { host: config.redis.host, port: config.redis.port },
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffDelay },
    removeOnComplete: config.queue.removeOnComplete,
    removeOnFail: config.queue.removeOnFail,
  },
});

eventQueue.process(5, processEvent); // 5 concurrent workers

eventQueue.on('completed', (job, result) => {
  logger.info('Job completed', { jobId: job.id, event_type: job.data.event_type });
});

eventQueue.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job.id,
    event_type: job.data.event_type,
    attempts: job.attemptsMade,
    error: err.message,
  });
});

eventQueue.on('stalled', (job) => {
  logger.warn('Job stalled', { jobId: job.id });
});

logger.info('CAPI event worker started');

module.exports = { eventQueue };
