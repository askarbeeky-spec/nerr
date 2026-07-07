'use strict';

require('dotenv').config();
const app = require('./app');
const { PORT } = require('./config/env');
const db = require('./config/db');
const logger = require('./utils/logger');

async function bootstrap() {
  try {
    // Test DB connection on startup
    await db.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected successfully');

    app.listen(PORT, () => {
      logger.info(`🚀 ERP Backend running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
