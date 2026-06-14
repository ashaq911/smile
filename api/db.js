const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 300000,
  max: 3,
  ssl: DATABASE_URL ? { rejectUnauthorized: false } : false
});

module.exports = { pool };

async function runQuery(sql, params, method) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params || []);
    switch (method) {
      case 'get': return result.rows[0] || null;
      case 'all': return result.rows;
      default: return result;
    }
  } finally {
    client.release();
  }
}

const db = {
  prepare(sql) {
    let idx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
    return {
      run: (...params) => runQuery(pgSql, params, 'run'),
      get: (...params) => runQuery(pgSql, params, 'get'),
      all: (...params) => runQuery(pgSql, params, 'all'),
    };
  },
  exec(sql) {
    return runQuery(sql, [], 'run');
  }
};

// Warm up DB connection immediately and every 30s
pool.query('SELECT 1').catch(() => {});
setInterval(() => {
  pool.query('SELECT 1').catch(() => {});
}, 30000);

module.exports = db;