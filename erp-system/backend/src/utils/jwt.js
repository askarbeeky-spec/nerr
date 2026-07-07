'use strict';

const jwt = require('jsonwebtoken');
const { JWT } = require('../config/env');

module.exports = {
  /**
   * Generate a short-lived access token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT.accessSecret, {
      expiresIn: JWT.accessExpiresIn,
    });
  },

  /**
   * Generate a long-lived refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT.refreshSecret, {
      expiresIn: JWT.refreshExpiresIn,
    });
  },

  /**
   * Verify an access token — throws on invalid/expired
   */
  verifyAccessToken(token) {
    return jwt.verify(token, JWT.accessSecret);
  },

  /**
   * Verify a refresh token — throws on invalid/expired
   */
  verifyRefreshToken(token) {
    return jwt.verify(token, JWT.refreshSecret);
  },
};
