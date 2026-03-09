const db = require('../config/db');

async function createIncident(logId, riskLevel) {
  const [result] = await db.execute(
    'INSERT INTO incidents (log_id, risk_level, status) VALUES (?, ?, ?)',
    [logId, riskLevel, 'open']
  );
  return result.insertId;
}

async function getAllIncidents() {
  const [rows] = await db.execute(`
    SELECT
      i.id,
      i.log_id,
      i.risk_level,
      i.status,
      i.created_at,
      l.message AS log_message,
      l.source
    FROM incidents i
    JOIN logs l ON i.log_id = l.id
    ORDER BY i.created_at DESC
  `);
  return rows;
}

module.exports = { createIncident, getAllIncidents };
