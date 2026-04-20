/**
 * ============================================================
 *  ALARS — Data Access Layer
 *  Log DAL  (logs table)
 * ============================================================
 */

const { query } = require('./connection');

// ── CREATE ────────────────────────────────────────────────────
/**
 * Insert a new log entry.
 * @param {string} message – cleaned / normalized log text
 * @param {string} [source='manual'] – originating system
 * @returns {Promise<number>} insertId
 */
async function createLog(message, source = 'manual', riskLevel = 'INFO', confidence = 0) {
  if (!message || !String(message).trim()) {
    throw new Error('Log message cannot be empty.');
  }
  const normalizedRiskLevel = String(riskLevel || 'INFO').trim().toUpperCase();
  const normalizedConfidence = Number(confidence);

  if (!Number.isFinite(normalizedConfidence)) {
    throw new Error('Log confidence must be a valid number.');
  }

  const result = await query(
    'INSERT INTO logs (message, source, risk_level, confidence) VALUES (?, ?, ?, ?)',
    [String(message).trim(), source || 'manual', normalizedRiskLevel, normalizedConfidence]
  );
  return result.insertId;
}

// ── READ (single) ────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getLogById(id) {
  const rows = await query('SELECT *, created_at as timestamp FROM logs WHERE id = ?', [id]);
  return rows.length ? rows[0] : null;
}

// ── READ (all) ───────────────────────────────────────────────
/**
 * @returns {Promise<Array>}
 */
async function getAllLogs() {
  return query('SELECT *, created_at as timestamp FROM logs ORDER BY created_at DESC');
}

// ── READ (filtered by source) ────────────────────────────────
/**
 * @param {string} source
 * @returns {Promise<Array>}
 */
async function getLogsBySource(source) {
  return query(
    'SELECT *, created_at as timestamp FROM logs WHERE source = ? ORDER BY created_at DESC',
    [source]
  );
}

// ── READ (count) ─────────────────────────────────────────────
/**
 * Return the total number of log rows.
 * @returns {Promise<number>}
 */
async function getLogCount() {
  const rows = await query('SELECT COUNT(*) AS total FROM logs');
  return rows[0].total;
}

async function getLogsByRiskLevel(riskLevel) {
  return query(
    'SELECT *, created_at as timestamp FROM logs WHERE risk_level = ? ORDER BY created_at DESC',
    [riskLevel]
  );
}

async function markLogSource(id, source) {
  const result = await query('UPDATE logs SET source = ? WHERE id = ?', [source, id]);
  return result.affectedRows > 0;
}

// ── DELETE ───────────────────────────────────────────────────
/**
 * Delete a single log by primary key.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteLog(id) {
  const result = await query('DELETE FROM logs WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createLog,
  getLogById,
  getAllLogs,
  getLogsBySource,
  getLogsByRiskLevel,
  getLogCount,
  markLogSource,
  deleteLog,
};
