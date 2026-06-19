require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validate } = require('./config');
const { webhookRouter } = require('./routes/webhook');
const { healthRouter } = require('./routes/health');
const { logger } = require('./utils/logger');

// Fail fast if required env vars are missing
try {
  validate();
} catch (err) {
  logger.error('Configuration error', { error: err.message });
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});

app.use('/webhooks', webhookLimiter, webhookRouter);
app.use('/health', healthRouter);

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`CAPI Middleware listening on port ${PORT}`, { env: process.env.NODE_ENV });
});

module.exports = app;
