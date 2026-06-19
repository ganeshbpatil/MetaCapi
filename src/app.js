require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');

const { config, validate } = require('./config');
const { webhookRouter } = require('./routes/webhook');
const { healthRouter } = require('./routes/health');
const { adminRouter } = require('./admin/router');
const { ejsRenderer } = require('./admin/ejs-renderer');
const { logger } = require('./utils/logger');
const db = require('./db');
const adminUserModel = require('./db/models/admin-user');

try {
  validate();
} catch (err) {
  logger.error('Configuration error', { error: err.message });
  process.exit(1);
}

// Initialize DB (creates tables if needed)
db;

// First-run: create default admin if none exists
try {
  if (!adminUserModel.exists()) {
    const defaultPassword = require('crypto').randomBytes(12).toString('hex');
    adminUserModel.create('admin', defaultPassword);
    console.log('\n========================================');
    console.log('  First run — admin account created');
    console.log('  Username: admin');
    console.log(`  Password: ${defaultPassword}`);
    console.log('  Change this password after first login!');
    console.log('========================================\n');
  }
} catch (e) {
  logger.error('Failed to create default admin', { error: e.message });
}

// Session store backed by SQLite
const SqliteStore = require('connect-sqlite3')(session);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'cdn.jsdelivr.net', "'unsafe-inline'"],
      scriptSrc: ["'self'", 'cdn.jsdelivr.net', "'unsafe-inline'"],
      fontSrc: ["'self'", 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust reverse proxy (Traefik/Nginx) so secure cookies work behind HTTPS termination
app.set('trust proxy', 1);

app.use(session({
  store: new SqliteStore({ db: 'sessions.sqlite', dir: './data' }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Only set secure if explicitly running behind HTTPS proxy (PUBLIC_URL starts with https)
    secure: (process.env.PUBLIC_URL || '').startsWith('https://'),
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  },
}));

// EJS renderer middleware (adds res.renderPage)
app.use(ejsRenderer(path.join(__dirname, 'admin/views')));

// Rate-limit webhook endpoints
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' },
});

app.use('/webhooks', webhookLimiter, webhookRouter);
app.use('/health', healthRouter);
app.use('/admin', adminRouter);

// Redirect root to admin
app.get('/', (req, res) => res.redirect('/admin'));

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`MetaCapi listening on port ${PORT}`, { env: config.env });
  logger.info(`Admin panel: ${config.publicUrl}/admin`);
});

module.exports = app;
