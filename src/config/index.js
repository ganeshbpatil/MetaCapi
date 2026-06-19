require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  publicUrl: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,
  sessionSecret: process.env.SESSION_SECRET || 'changeme-set-SESSION_SECRET-in-env',

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
  // No required env vars in multi-tenant mode — all credentials are stored in DB.
  // SESSION_SECRET should be set in production.
  if (config.env === 'production' && config.sessionSecret === 'changeme-set-SESSION_SECRET-in-env') {
    throw new Error('SESSION_SECRET must be set in production');
  }
}

module.exports = { config, validate };
