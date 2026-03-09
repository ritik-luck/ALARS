const db = require('../config/db');

async function createLog(message, source) {
  const [result] = await db.execute(
    'INSERT INTO logs (message, source) VALUES (?, ?)',
    [message, source]
  );
  return result.insertId;
}

async function getAllLogs() {
  const [rows] = await db.execute(
    'SELECT * FROM logs ORDER BY timestamp DESC'
  );
  return rows;
}

module.exports = { createLog, getAllLogs };
