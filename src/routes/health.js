const express = require('express');
const { eventQueue } = require('./webhook');
const { logger } = require('../utils/logger');

const healthRouter = express.Router();

healthRouter.get('/', async (req, res) => {
  try {
    const [waiting, active, failed] = await Promise.all([
      eventQueue.getWaitingCount(),
      eventQueue.getActiveCount(),
      eventQueue.getFailedCount(),
    ]);
    const status = failed > 50 ? 'degraded' : 'ok';
    res.status(status === 'ok' ? 200 : 207).json({
      status,
      timestamp: new Date().toISOString(),
      queue: { waiting, active, failed },
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(503).json({ status: 'error', error: err.message });
  }
});

module.exports = { healthRouter };
