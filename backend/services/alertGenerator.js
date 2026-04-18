/**
 * Alert Generator Service
 * Creates an alert record in the database when a CRITICAL incident
 * is detected.
 */

const db = require('../config/db');

async function sendNotification(incidentId, level, message) {
  // Mock external Notification Service (e.g. Email/Slack webhook)
  console.log(`\n[NOTIFICATION SERVICE] 🚨 ALERT TRIGGERED`);
  console.log(` > Level: ${level}`);
  console.log(` > Incident ID: ${incidentId}`);
  console.log(` > Message: ${message}\n`);
}

async function generateAlert(incidentId, logId, logMessage, riskLevel) {
  let alertMessage = `High risk anomaly detected.`;

  if (riskLevel === 'CRITICAL') {
    alertMessage = `CRITICAL: Memory/System failure or fatal error. Immediate action required.`;
    // Trigger external notification extension for CRITICAL rules
    await sendNotification(incidentId, riskLevel, alertMessage);
  } else if (riskLevel === 'HIGH') {
    alertMessage = `HIGH RISK: Severe application error or write block failure.`;
  } else if (riskLevel === 'MEDIUM') {
    alertMessage = `MEDIUM RISK: Timeouts or repeated retrieval failures.`;
  }

  const [result] = await db.execute(
    'INSERT INTO alerts (incident_id, log_id, alert_type, alert_message) VALUES (?, ?, ?, ?)',
    [incidentId, logId, riskLevel, alertMessage]
  );

  return { id: result.insertId, alertMessage };
}

module.exports = { generateAlert };
