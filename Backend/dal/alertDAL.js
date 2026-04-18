/**
 * ============================================================
 *  ALARS — Data Access Layer
 *  Alert DAL  (alerts table)
 * ============================================================
 */

const { query } = require('./connection');

// ── CREATE ────────────────────────────────────────────────────
/**
 * Insert a new alert linked to an incident.
 * @param {number} incidentId   – FK → incidents.id
 * @param {string} alertMessage – human-readable alert text
 * @returns {Promise<number>} insertId
 */
async function createAlert(incidentId, alertMessage) {
  if (!incidentId || !alertMessage) {
    throw new Error('incidentId and alertMessage are required.');
  }
  const result = await query(
    'INSERT INTO alerts (incident_id, alert_message) VALUES (?, ?)',
    [incidentId, alertMessage]
  );
  return result.insertId;
}

// ── READ (single) ────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getAlertById(id) {
  const rows = await query('SELECT * FROM alerts WHERE id = ?', [id]);
  return rows.length ? rows[0] : null;
}

// ── READ (all) ───────────────────────────────────────────────
/**
 * @returns {Promise<Array>}
 */
async function getAllAlerts() {
  return query(`
    SELECT
      a.id,
      a.incident_id,
      a.alert_message,
      a.created_at,
      i.risk_level,
      i.status AS incident_status
    FROM alerts a
    JOIN incidents i ON a.incident_id = i.id
    ORDER BY a.created_at DESC
  `);
}

// ── READ (by incident) ──────────────────────────────────────
/**
 * @param {number} incidentId
 * @returns {Promise<Array>}
 */
async function getAlertsByIncidentId(incidentId) {
  return query(
    'SELECT * FROM alerts WHERE incident_id = ? ORDER BY created_at DESC',
    [incidentId]
  );
}

// ── READ (count) ─────────────────────────────────────────────
/**
 * @returns {Promise<number>}
 */
async function getAlertCount() {
  const rows = await query('SELECT COUNT(*) AS total FROM alerts');
  return rows[0].total;
}

// ── DELETE ───────────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteAlert(id) {
  const result = await query('DELETE FROM alerts WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createAlert,
  getAlertById,
  getAllAlerts,
  getAlertsByIncidentId,
  getAlertCount,
  deleteAlert,
};
