const axios = require('axios');
const { config } = require('../config');
const { buildUserData } = require('./hasher');
const { logger } = require('../utils/logger');

const { graphApiBase, graphApiVersion, pixelId, accessToken, testEventCode } = config.facebook;
const CAPI_ENDPOINT = `${graphApiBase}/${graphApiVersion}/${pixelId}/events`;

function buildEventId(prefix, zohoId) {
  return `${prefix}_${zohoId}_${Math.floor(Date.now() / 1000)}`;
}

async function sendEvents(events) {
  const payload = {
    data: events,
    access_token: accessToken,
  };
  if (testEventCode) payload.test_event_code = testEventCode;

  const response = await axios.post(CAPI_ENDPOINT, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return response.data;
}

async function sendWithRetry(events, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendEvents(events);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function sendLeadEvent(lead) {
  const userData = buildUserData(lead);
  const eventId = buildEventId('lead', lead.zohoId);
  const event = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      lead_source: lead.sourcePlatform || 'website',
      zoho_lead_id: lead.zohoId,
      ...(lead.campaignId && { campaign_id: lead.campaignId }),
      ...(lead.adSetId && { adset_id: lead.adSetId }),
      ...(lead.adId && { ad_id: lead.adId }),
      ...(lead.formId && { form_id: lead.formId }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('Lead event sent', { eventId, zohoId: lead.zohoId, eventsReceived: result.events_received });
  return { success: true, eventId, result };
}

async function sendQualifiedLeadEvent(lead) {
  const userData = buildUserData(lead);
  const eventId = buildEventId('qualified', lead.zohoId);
  const event = {
    event_name: 'QualifiedLead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      zoho_lead_id: lead.zohoId,
      ...(lead.campaignId && { campaign_id: lead.campaignId }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('QualifiedLead event sent', { eventId, zohoId: lead.zohoId });
  return { success: true, eventId, result };
}

async function sendScheduleEvent(deal) {
  const userData = buildUserData(deal);
  const eventId = buildEventId('schedule', deal.zohoId);
  const event = {
    event_name: 'Schedule',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      zoho_deal_id: deal.zohoId,
      ...(deal.campaignId && { campaign_id: deal.campaignId }),
      ...(deal.adId && { ad_id: deal.adId }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('Schedule event sent', { eventId, zohoId: deal.zohoId });
  return { success: true, eventId, result };
}

async function sendPurchaseEvent(deal) {
  const userData = buildUserData(deal);
  const eventId = buildEventId('purchase', deal.zohoId);
  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      value: deal.value,
      currency: deal.currency || 'USD',
      order_id: `DEAL-${deal.zohoId}`,
      zoho_deal_id: deal.zohoId,
      ...(deal.campaignId && { campaign_id: deal.campaignId }),
      ...(deal.adSetId && { adset_id: deal.adSetId }),
      ...(deal.adId && { ad_id: deal.adId }),
      ...(deal.originalLeadId && { original_lead_id: deal.originalLeadId }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('Purchase event sent', { eventId, zohoId: deal.zohoId, value: deal.value });
  return { success: true, eventId, result };
}

async function sendDealLostEvent(deal) {
  const userData = buildUserData(deal);
  const eventId = buildEventId('deallost', deal.zohoId);
  const event = {
    event_name: 'DealLost',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      zoho_deal_id: deal.zohoId,
      ...(deal.campaignId && { campaign_id: deal.campaignId }),
      ...(deal.lossReason && { loss_reason: deal.lossReason }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('DealLost event sent', { eventId, zohoId: deal.zohoId });
  return { success: true, eventId, result };
}

async function sendDisqualifiedEvent(lead) {
  const userData = buildUserData(lead);
  const eventId = buildEventId('disqualified', lead.zohoId);
  const event = {
    event_name: 'Disqualified',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: eventId,
    user_data: userData,
    custom_data: {
      zoho_lead_id: lead.zohoId,
      ...(lead.disqualificationReason && { disqualification_reason: lead.disqualificationReason }),
    },
  };
  const result = await sendWithRetry([event]);
  logger.info('Disqualified event sent', { eventId, zohoId: lead.zohoId });
  return { success: true, eventId, result };
}

// Batch up to 50 events per request
async function sendBatch(events) {
  const BATCH_SIZE = 50;
  const results = [];
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const result = await sendWithRetry(batch);
    results.push(result);
  }
  return results;
}

module.exports = {
  sendLeadEvent,
  sendQualifiedLeadEvent,
  sendScheduleEvent,
  sendPurchaseEvent,
  sendDealLostEvent,
  sendDisqualifiedEvent,
  sendBatch,
  buildUserData,
};
