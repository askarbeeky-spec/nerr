'use strict';

const LOG_LEVELS = { info: '📘 INFO', warn: '⚠️  WARN', error: '❌ ERROR' };

function log(level, ...args) {
  const ts = new Date().toISOString();
  console[level](`[${ts}] ${LOG_LEVELS[level]}`, ...args);
}

module.exports = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};
