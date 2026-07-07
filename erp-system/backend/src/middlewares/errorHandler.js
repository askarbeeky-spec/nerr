'use strict';

const logger = require('../utils/logger');

/**
 * Central error handler — must be last middleware in Express chain.
 * Normalizes all errors to a consistent JSON response shape.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} →`, err.message);

  // Validation errors (express-validator)
  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Duplicate key (PostgreSQL error code 23505)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  // Foreign key violation (PostgreSQL error code 23503)
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced resource not found',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal Server Error';

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;
