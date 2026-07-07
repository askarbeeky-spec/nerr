'use strict';

const bcrypt = require('bcryptjs');
const { BCRYPT_SALT_ROUNDS } = require('../config/env');

module.exports = {
  /**
   * Hash a plain-text password
   */
  hash(password) {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  },

  /**
   * Compare plain text with stored hash
   */
  compare(password, hash) {
    return bcrypt.compare(password, hash);
  },
};
