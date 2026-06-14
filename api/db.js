const { Pool } = require('pg');

function createPools() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set!');
    return { pool: null, directPool: null };
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 300000,
    max: 3,
    ssl: { rejectUnauthorized: false }
  });

  // Try direct connection (bypass pooler, may fail on IPv4-only networks)
  let directPool = null;
  try {
    const pwd = DATABASE_URL.split(':')[2].split('@')[0];
    const directUrl = `postgresql://postgres:${pwd}@db.ndtmffadeaadywnykzgr.supabase.co:5432/postgres`;
    directPool = new Pool({
      connectionString: directUrl,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 300000,
      max: 1,
      ssl: { rejectUnauthorized: false }
    });
    directPool.query('SELECT 1').catch(() => { directPool = null; });
  } catch { directPool = null; }

  // Warm up main pool
  pool.query('SELECT 1').catch(() => {});

  return { pool, directPool };
}

const { pool, directPool } = createPools();

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

db.directPool = directPool;
db.runQueryDirect = async function(sql, params) {
  if (!directPool) throw new Error('Direct connection not available');
  const client = await directPool.connect();
  try { return (await client.query(sql, params || [])).rows; }
  finally { client.release(); }
};
module.exports = db;