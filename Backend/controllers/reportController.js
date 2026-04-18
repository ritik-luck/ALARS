const db = require('../config/db');

async function getStats(req, res) {
  try {
    const [[{ total_logs }]] = await db.execute('SELECT COUNT(*) as total_logs FROM logs');
    const [[{ total_incidents }]] = await db.execute('SELECT COUNT(*) as total_incidents FROM incidents');
    const [[{ total_alerts }]] = await db.execute('SELECT COUNT(*) as total_alerts FROM alerts');
    
    const [incidentsByRisk] = await db.execute('SELECT risk_level, COUNT(*) as count FROM incidents GROUP BY risk_level');
    const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    incidentsByRisk.forEach(row => {
      riskCounts[row.risk_level] = row.count;
    });

    const [recentIncidents] = await db.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM incidents 
      GROUP BY DATE(created_at) 
      ORDER BY date DESC LIMIT 7
    `);

    res.json({
      totalLogs: total_logs,
      totalIncidents: total_incidents,
      totalAlerts: total_alerts,
      incidentsByRisk: riskCounts,
      recentIncidents: recentIncidents.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getStats };
