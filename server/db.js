import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for PostgreSQL mode.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

function placeholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function normalizeSyntax(sql) {
  let q = String(sql).trim();
  if (/^INSERT\s+OR\s+IGNORE\s+/i.test(q)) {
    q = q.replace(/^INSERT\s+OR\s+IGNORE\s+/i, "INSERT ");
    if (!/\bON\s+CONFLICT\b/i.test(q)) q += " ON CONFLICT DO NOTHING";
  }
  return q;
}

async function runQuery(sql, params = [], client = pool) {
  return client.query(placeholders(normalizeSyntax(sql)), params);
}

class Statement {
  constructor(sql, getClient) {
    this.sql = sql;
    this.getClient = getClient;
  }

  async get(...params) {
    const result = await runQuery(this.sql, params, this.getClient());
    return result.rows[0];
  }

  async all(...params) {
    const result = await runQuery(this.sql, params, this.getClient());
    return result.rows;
  }

  async run(...params) {
    let sql = normalizeSyntax(this.sql);
    const isInsert = /^\s*INSERT\b/i.test(sql);

    if (isInsert && !/\bRETURNING\b/i.test(sql)) {
      const table = sql.match(/^\s*INSERT\s+INTO\s+([a-zA-Z0-9_."]+)/i)?.[1]?.replaceAll('"', '');
      const noIdentity = new Set(["profiles", "ai_usage"]);
      const base = table?.split(".").pop();
      if (base && !noIdentity.has(base)) sql = `${sql.trim()} RETURNING id`;
    }

    const result = await this.getClient().query(placeholders(sql), params);
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows?.[0]?.id ?? null
    };
  }
}

const txStore = new AsyncLocalStorage();
const activeClient = () => txStore.getStore() || pool;

const db = {
  prepare(sql) {
    return new Statement(sql, activeClient);
  },

  transaction(fn) {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await txStore.run(client, () => fn(...args));
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch {}
        throw err;
      } finally {
        client.release();
      }
    };
  },

  async query(sql, params = []) {
    return runQuery(sql, params, activeClient());
  },

  async ping() {
    await pool.query("SELECT 1");
    return true;
  },

  async backup() {
    throw new Error("Local SQLite backups are disabled in PostgreSQL mode; use Supabase database backups/export instead.");
  },

  async close() {
    await pool.end();
  }
};

export const dbPath = null;
export default db;
