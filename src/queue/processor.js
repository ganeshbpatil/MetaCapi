const facebook = require('../services/facebook');
const fbConfigModel = require('../db/models/facebook-config');
const fieldMappingModel = require('../db/models/field-mapping');
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

  // Apply field mappings if configured, otherwise pass record_data as-is
  let mappedData = { zohoId: record_id, ...record_data };
  if (accountId) {
    const mappings = fieldMappingModel.findByAccount(accountId);
    if (Object.keys(mappings).length > 0) {
      const applied = fieldMappingModel.applyMappings(mappings, record_data);
      mappedData = { zohoId: record_id, ...applied };
    }
  }

  let result;
  try {
    switch (event_type) {
      case 'lead_created':
        result = await facebook.sendLeadEvent(fbConfig, mappedData); break;
      case 'lead_qualified':
        result = await facebook.sendQualifiedLeadEvent(fbConfig, mappedData); break;
      case 'lead_disqualified':
        result = await facebook.sendDisqualifiedEvent(fbConfig, mappedData); break;
      case 'deal_created':
        result = await facebook.sendScheduleEvent(fbConfig, mappedData); break;
      case 'deal_won':
        result = await facebook.sendPurchaseEvent(fbConfig, mappedData); break;
      case 'deal_lost':
        result = await facebook.sendDealLostEvent(fbConfig, mappedData); break;
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
