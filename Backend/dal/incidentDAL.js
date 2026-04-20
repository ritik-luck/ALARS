/**
 * ============================================================
 *  ALARS — Data Access Layer
 *  Incident DAL  (incidents table)
 * ============================================================
 */

const { query } = require('./connection');

// ── CREATE ────────────────────────────────────────────────────
/**
 * Insert a new incident linked to an existing log entry.
 * @param {number} logId     – FK → logs.id
 * @param {string} riskLevel – CRITICAL | HIGH | MEDIUM | LOW
 * @param {string} [status='open']
 * @returns {Promise<number>} insertId
 */
async function createIncident(logId, message, riskLevel, status = 'open') {
  if (!logId || !riskLevel || !message) {
    throw new Error('logId, message and riskLevel are required.');
  }
  const validLevels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  if (!validLevels.includes(riskLevel)) {
    throw new Error(`Invalid riskLevel "${riskLevel}". Must be one of: ${validLevels.join(', ')}`);
  }
  const result = await query(
    'INSERT INTO incidents (log_id, message, risk_level, status) VALUES (?, ?, ?, ?)',
    [logId, message, riskLevel, status]
  );
  return result.insertId;
}

// ── READ (single) ────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getIncidentById(id) {
  const rows = await query(`
    SELECT
      i.*,
      l.source AS log_source,
      l.created_at AS log_timestamp,
      u.username AS assignee_name
    FROM incidents i
    JOIN logs l ON i.log_id = l.id
    LEFT JOIN users u ON i.assignee_id = u.id
    WHERE i.id = ?
  `, [id]);
  return rows.length ? rows[0] : null;
}

// ── READ (all — with joined log data) ────────────────────────
/**
 * @returns {Promise<Array>}
 */
async function getAllIncidents() {
  return query(`
    SELECT
      i.id,
      i.log_id,
      i.message,
      i.risk_level,
      i.status,
      i.assignee_id,
      i.resolution_notes,
      i.mitigation_actions,
      i.updated_at,
      i.created_at,
      l.message  AS log_message,
      l.source
    FROM incidents i
    JOIN logs l ON i.log_id = l.id
    ORDER BY i.created_at DESC
  `);
}

// ── READ (filtered by risk level) ────────────────────────────
/**
 * @param {string} riskLevel
 * @returns {Promise<Array>}
 */
async function getIncidentsByRiskLevel(riskLevel) {
  return query(
    'SELECT * FROM incidents WHERE risk_level = ? ORDER BY created_at DESC',
    [riskLevel]
  );
}

// ── READ (filtered by status) ────────────────────────────────
/**
 * @param {string} status – open | resolved | closed
 * @returns {Promise<Array>}
 */
async function getIncidentsByStatus(status) {
  return query(
    'SELECT * FROM incidents WHERE status = ? ORDER BY created_at DESC',
    [status]
  );
}

async function getIncidentByLogId(logId) {
  const rows = await query('SELECT * FROM incidents WHERE log_id = ? LIMIT 1', [logId]);
  return rows.length ? rows[0] : null;
}

// ── READ (count) ─────────────────────────────────────────────
/**
 * @returns {Promise<number>}
 */
async function getIncidentCount() {
  const rows = await query('SELECT COUNT(*) AS total FROM incidents');
  return rows[0].total;
}

// ── UPDATE ───────────────────────────────────────────────────
/**
 * Change the status of an incident (e.g. open → resolved).
 * @param {number} id
 * @param {string} newStatus
 * @returns {Promise<boolean>}
 */
async function updateIncidentStatus(id, newStatus) {
  const validStatuses = ['open', 'in_progress', 'resolved'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid incident status "${newStatus}".`);
  }
  const result = await query(
    'UPDATE incidents SET status = ? WHERE id = ?',
    [newStatus, id]
  );
  return result.affectedRows > 0;
}

async function assignIncident(id, assigneeId) {
  const result = await query(
    'UPDATE incidents SET assignee_id = ?, status = ? WHERE id = ?',
    [assigneeId, 'in_progress', id]
  );
  return result.affectedRows > 0;
}

async function resolveIncident(id, resolutionNotes = null, mitigationActions = null) {
  const result = await query(
    `UPDATE incidents
     SET status = ?, resolution_notes = ?, mitigation_actions = ?
     WHERE id = ?`,
    ['resolved', resolutionNotes, mitigationActions, id]
  );
  return result.affectedRows > 0;
}

// ── DELETE ───────────────────────────────────────────────────
/**
 * @param {number} id
 * @returns {Promise<boolean>}
 */
async function deleteIncident(id) {
  const result = await query('DELETE FROM incidents WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createIncident,
  getIncidentById,
  getAllIncidents,
  getIncidentsByRiskLevel,
  getIncidentsByStatus,
  getIncidentByLogId,
  getIncidentCount,
  assignIncident,
  updateIncidentStatus,
  resolveIncident,
  deleteIncident,
};
