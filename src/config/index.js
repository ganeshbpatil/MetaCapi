require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  facebook: {
    pixelId: process.env.FB_PIXEL_ID,
    accessToken: process.env.FB_ACCESS_TOKEN,
    appSecret: process.env.FB_APP_SECRET,
    testEventCode: process.env.NODE_ENV !== 'production' ? process.env.FB_TEST_EVENT_CODE : null,
    graphApiVersion: 'v19.0',
    graphApiBase: 'https://graph.facebook.com',
  },

  zoho: {
    clientId: process.env.ZOHO_CLIENT_ID,
    clientSecret: process.env.ZOHO_CLIENT_SECRET,
    refreshToken: process.env.ZOHO_REFRESH_TOKEN,
    webhookSecret: process.env.ZOHO_WEBHOOK_SECRET,
  },

  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  queue: {
    attempts: 3,
    backoffDelay: 5000,
    removeOnComplete: 100,
    removeOnFail: 50,
  },
};

function validate() {
  const required = ['FB_PIXEL_ID', 'FB_ACCESS_TOKEN', 'ZOHO_WEBHOOK_SECRET'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { config, validate };
