/**
 * ============================================================
 *  ALARS — Data Access Layer (DAL)
 *  Connection Manager
 * ============================================================
 *
 *  Centralizes database connectivity so every DAL component
 *  uses a single, configurable connection pool.
 *
 *  Exports:
 *    pool            – the raw mysql2/promise pool (for advanced use)
 *    query(sql, p)   – shorthand for pool.execute(sql, params)
 *    getConnection() – checkout a connection (for transactions)
 *    close()         – gracefully shut down the pool
 * ============================================================
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// ── Create the connection pool ────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'alars_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// ── Helper: execute a parameterized query ─────────────────────
async function query(sql, params = []) {
  const [rows, fields] = await pool.execute(sql, params);
  return rows;
}

// ── Helper: get a dedicated connection (for transactions) ─────
async function getConnection() {
  return pool.getConnection();
}

// ── Graceful shutdown ─────────────────────────────────────────
async function close() {
  await pool.end();
}

module.exports = { pool, query, getConnection, close };
