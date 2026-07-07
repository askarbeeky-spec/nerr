'use strict';

const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains.
 * Collects errors and passes them to the error handler.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error('Validation failed');
    err.type = 'validation';
    err.errors = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(err);
  }
  next();
}

module.exports = validate;
