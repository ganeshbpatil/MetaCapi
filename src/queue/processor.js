const facebook = require('../services/facebook');
const fbConfigModel = require('../db/models/facebook-config');
const eventLog = require('../db/models/event-log');
const { logger } = require('../utils/logger');

async function processEvent(job) {
  const { accountId, event_type, record_id, record_data } = job.data;

  logger.info('Processing event', { accountId, event_type, record_id, attempt: job.attemptsMade + 1 });

  const fbConfig = fbConfigModel.findByAccountId(accountId);
  if (!fbConfig) {
    logger.error('No Facebook config for account', { accountId });
    return { skipped: true, reason: 'No Facebook config' };
  }

  let result;
  try {
    const data = { zohoId: record_id, ...record_data };

    switch (event_type) {
      case 'lead_created':
        result = await facebook.sendLeadEvent(fbConfig, data); break;
      case 'lead_qualified':
        result = await facebook.sendQualifiedLeadEvent(fbConfig, data); break;
      case 'lead_disqualified':
        result = await facebook.sendDisqualifiedEvent(fbConfig, data); break;
      case 'deal_created':
        result = await facebook.sendScheduleEvent(fbConfig, data); break;
      case 'deal_won':
        result = await facebook.sendPurchaseEvent(fbConfig, data); break;
      case 'deal_lost':
        result = await facebook.sendDealLostEvent(fbConfig, data); break;
      default:
        logger.warn('Unknown event type, skipping', { event_type });
        return { skipped: true, event_type };
    }

    eventLog.insert(accountId, {
      eventType: event_type,
      zohoRecordId: record_id,
      capiEventId: result.event_id,
      status: 'success',
    });

    return result;

  } catch (err) {
    eventLog.insert(accountId, {
      eventType: event_type,
      zohoRecordId: record_id,
      status: 'failed',
      errorMessage: err.message,
    });
    throw err;
  }
}

module.exports = { processEvent };
