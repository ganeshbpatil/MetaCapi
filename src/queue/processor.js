const facebook = require('../services/facebook');
const { logger } = require('../utils/logger');

async function processEvent(job) {
  const { event_type, record_id, record_data } = job.data;
  logger.info('Processing event', { event_type, record_id, attempt: job.attemptsMade + 1 });

  switch (event_type) {
    case 'lead_created':
      return facebook.sendLeadEvent({ zohoId: record_id, ...record_data });
    case 'lead_qualified':
      return facebook.sendQualifiedLeadEvent({ zohoId: record_id, ...record_data });
    case 'lead_disqualified':
      return facebook.sendDisqualifiedEvent({ zohoId: record_id, ...record_data });
    case 'deal_created':
      return facebook.sendScheduleEvent({ zohoId: record_id, ...record_data });
    case 'deal_won':
      return facebook.sendPurchaseEvent({ zohoId: record_id, ...record_data });
    case 'deal_lost':
      return facebook.sendDealLostEvent({ zohoId: record_id, ...record_data });
    default:
      logger.warn('Unknown event type, skipping', { event_type });
      return { skipped: true, event_type };
  }
}

module.exports = { processEvent };
