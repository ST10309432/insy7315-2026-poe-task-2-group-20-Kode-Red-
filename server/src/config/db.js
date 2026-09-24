const { Pool, types } = require('pg');
const env = require('./env');

// Return NUMERIC (money) columns as JS numbers instead of strings
types.setTypeParser(1700, v => (v === null ? null : parseFloat(v)));
// Return DATE columns as 'YYYY-MM-DD' strings (no timezone shift)
types.setTypeParser(1082, v => v);

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

/** Run a single parameterised query. */
const query = (text, params) => pool.query(text, params);

/**
 * Run several queries in one transaction. The callback receives a client;
 * everything is rolled back if it throws (e.g. insufficient credit).
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
