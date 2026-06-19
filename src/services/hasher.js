const crypto = require('crypto');

function hashValue(value) {
  if (!value) return null;
  return crypto.createHash('sha256')
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^0-9]/g, '');
  return cleaned.length === 10 ? '1' + cleaned : cleaned;
}

function buildUserData(data) {
  const ud = {};
  if (data.email) ud.em = [hashValue(data.email)];
  if (data.phone) ud.ph = [hashValue(normalizePhone(data.phone))];
  if (data.firstName) ud.fn = [hashValue(data.firstName)];
  if (data.lastName) ud.ln = [hashValue(data.lastName)];
  if (data.city) ud.ct = [hashValue(data.city)];
  if (data.state) ud.st = [hashValue(data.state)];
  if (data.zip) ud.zp = [hashValue(data.zip)];
  if (data.country) ud.country = [hashValue(data.country)];
  // Not hashed — passed as-is
  if (data.clientIp) ud.client_ip_address = data.clientIp;
  if (data.userAgent) ud.client_user_agent = data.userAgent;
  if (data.fbc) ud.fbc = data.fbc;
  if (data.fbp) ud.fbp = data.fbp;
  if (data.facebookLeadId) ud.lead_id = data.facebookLeadId;
  return ud;
}

module.exports = { hashValue, normalizePhone, buildUserData };
