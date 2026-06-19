const axios = require('axios');
const { buildUserData } = require('./hasher');
const { logger } = require('../utils/logger');

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

function endpoint(pixelId) {
  return `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pixelId}/events`;
}

function buildEventId(prefix, zohoId) {
  return `${prefix}_${zohoId}_${Math.floor(Date.now() / 1000)}`;
}

async function sendEvents(fbConfig, events) {
  const payload = { data: events, access_token: fbConfig.access_token };
  if (fbConfig.test_event_code) payload.test_event_code = fbConfig.test_event_code;

  const response = await axios.post(endpoint(fbConfig.pixel_id), payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return response.data;
}

async function sendWithRetry(fbConfig, events, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendEvents(fbConfig, events);
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
}

function makeEvent(name, zohoId, userData, customData) {
  return {
    event_name: name,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'crm',
    event_id: buildEventId(name.toLowerCase(), zohoId),
    user_data: userData,
    custom_data: customData,
  };
}

async function sendLeadEvent(fbConfig, lead) {
  const event = makeEvent('Lead', lead.zohoId, buildUserData(lead), {
    lead_source: lead.sourcePlatform || 'website',
    zoho_lead_id: lead.zohoId,
    ...(lead.campaignId && { campaign_id: lead.campaignId }),
    ...(lead.adSetId && { adset_id: lead.adSetId }),
    ...(lead.adId && { ad_id: lead.adId }),
    ...(lead.formId && { form_id: lead.formId }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  logger.info('Lead event sent', { event_id: event.event_id, pixel: fbConfig.pixel_id });
  return { success: true, event_id: event.event_id, result };
}

async function sendQualifiedLeadEvent(fbConfig, lead) {
  const event = makeEvent('QualifiedLead', lead.zohoId, buildUserData(lead), {
    zoho_lead_id: lead.zohoId,
    ...(lead.campaignId && { campaign_id: lead.campaignId }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  return { success: true, event_id: event.event_id, result };
}

async function sendScheduleEvent(fbConfig, deal) {
  const event = makeEvent('Schedule', deal.zohoId, buildUserData(deal), {
    zoho_deal_id: deal.zohoId,
    ...(deal.campaignId && { campaign_id: deal.campaignId }),
    ...(deal.adId && { ad_id: deal.adId }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  return { success: true, event_id: event.event_id, result };
}

async function sendPurchaseEvent(fbConfig, deal) {
  const event = makeEvent('Purchase', deal.zohoId, buildUserData(deal), {
    value: deal.value,
    currency: deal.currency || 'USD',
    order_id: `DEAL-${deal.zohoId}`,
    zoho_deal_id: deal.zohoId,
    ...(deal.campaignId && { campaign_id: deal.campaignId }),
    ...(deal.adSetId && { adset_id: deal.adSetId }),
    ...(deal.adId && { ad_id: deal.adId }),
    ...(deal.originalLeadId && { original_lead_id: deal.originalLeadId }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  logger.info('Purchase event sent', { event_id: event.event_id, value: deal.value });
  return { success: true, event_id: event.event_id, result };
}

async function sendDealLostEvent(fbConfig, deal) {
  const event = makeEvent('DealLost', deal.zohoId, buildUserData(deal), {
    zoho_deal_id: deal.zohoId,
    ...(deal.campaignId && { campaign_id: deal.campaignId }),
    ...(deal.lossReason && { loss_reason: deal.lossReason }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  return { success: true, event_id: event.event_id, result };
}

async function sendDisqualifiedEvent(fbConfig, lead) {
  const event = makeEvent('Disqualified', lead.zohoId, buildUserData(lead), {
    zoho_lead_id: lead.zohoId,
    ...(lead.disqualificationReason && { disqualification_reason: lead.disqualificationReason }),
  });
  const result = await sendWithRetry(fbConfig, [event]);
  return { success: true, event_id: event.event_id, result };
}

// Verify a pixel+token combination by calling the debug_token endpoint
async function verifyToken(pixelId, accessToken, appSecret) {
  try {
    // Quick test: try to read pixel info
    const response = await axios.get(`${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${pixelId}`, {
      params: { access_token: accessToken, fields: 'id,name' },
      timeout: 8000,
    });
    return { valid: true, name: response.data.name || pixelId };
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return { valid: false, error: msg };
  }
}

module.exports = {
  sendLeadEvent,
  sendQualifiedLeadEvent,
  sendScheduleEvent,
  sendPurchaseEvent,
  sendDealLostEvent,
  sendDisqualifiedEvent,
  verifyToken,
  buildUserData,
};
