const crypto = require('crypto');
const { config } = require('../config');
const { logger } = require('../utils/logger');

function verifyZohoSignature(req, res, next) {
  const signature = req.headers['x-zoho-signature'];
  if (!signature) {
    logger.warn('Webhook received without signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const expectedSig = crypto
    .createHmac('sha256', config.zoho.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  let valid = false;
  try {
    valid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    valid = false;
  }

  if (!valid) {
    logger.warn('Invalid webhook signature rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Verify Meta's webhook challenge for subscription setup
function verifyMetaWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.zoho.webhookSecret) {
    logger.info('Meta webhook verified');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Verification failed' });
}

module.exports = { verifyZohoSignature, verifyMetaWebhook };
