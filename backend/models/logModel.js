const db = require('../config/db');

async function createLog(message, source, riskLevel, confidence) {
  if (!message || !String(message).trim()) {
    throw new Error('Log message cannot be empty.');
  }

  const normalizedRiskLevel = String(riskLevel || '').trim().toUpperCase();
  if (!normalizedRiskLevel) {
    throw new Error('risk_level is required before inserting log.');
  }

  const normalizedConfidence = Number(confidence);
  if (!Number.isFinite(normalizedConfidence)) {
    throw new Error('confidence is required before inserting log.');
  }

  const [result] = await db.execute(
    'INSERT INTO logs (message, source, risk_level, confidence) VALUES (?, ?, ?, ?)',
    [String(message).trim(), source || 'manual', normalizedRiskLevel, normalizedConfidence]
  );
  return result.insertId;
}

async function getAllLogs() {
  const [rows] = await db.execute(
    'SELECT *, created_at as timestamp FROM logs ORDER BY created_at DESC'
  );
  return rows;
}

async function getLogById(id) {
  const [rows] = await db.execute(
    'SELECT *, created_at as timestamp FROM logs WHERE id = ?',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { createLog, getAllLogs, getLogById };
