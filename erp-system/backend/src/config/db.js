'use strict';

const { Pool } = require('pg');
const { DB } = require('./env');

// Connection pool — reuses connections for performance
const pool = new Pool({
  host: DB.host,
  port: DB.port,
  database: DB.database,
  user: DB.user,
  password: DB.password,
  max: 20,           // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = {
  /**
   * Execute a parameterized query
   * @param {string} text - SQL query
   * @param {any[]} params - Query parameters
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Get a client from the pool (for transactions)
   */
  getClient: () => pool.connect(),
};
