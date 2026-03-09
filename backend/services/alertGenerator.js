/**
 * Alert Generator Service
 * Creates an alert record in the database when a CRITICAL incident
 * is detected.
 */

const db = require('../config/db');

async function generateAlert(incidentId, logMessage, riskLevel) {
  if (riskLevel !== 'CRITICAL') return null;

  const preview       = logMessage.substring(0, 120);
  const alertMessage  = `CRITICAL ALERT: Incident #${incidentId} requires immediate attention. Log: "${preview}"`;

  const [result] = await db.execute(
    'INSERT INTO alerts (incident_id, alert_message) VALUES (?, ?)',
    [incidentId, alertMessage]
  );

  return {
    alertId:      result.insertId,
    alertMessage,
  };
}

module.exports = { generateAlert };
