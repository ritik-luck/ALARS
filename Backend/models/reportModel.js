const db = require('../config/db');

async function getSystemReport() {
  const [
    [[logTotals]],
    [[incidentTotals]],
    [incidentsByRisk],
    [incidentsByStatus],
    [logsBySource],
    [recentIncidents],
  ] = await Promise.all([
    db.execute('SELECT COUNT(*) AS totalLogs FROM logs'),
    db.execute(`
      SELECT
        COUNT(*) AS totalIncidents,
        SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) AS criticalIncidents,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openIncidents,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolvedIncidents
      FROM incidents
    `),
    db.execute(`
      SELECT risk_level AS label, COUNT(*) AS count
      FROM incidents
      GROUP BY risk_level
      ORDER BY count DESC, risk_level ASC
    `),
    db.execute(`
      SELECT status AS label, COUNT(*) AS count
      FROM incidents
      GROUP BY status
      ORDER BY count DESC, status ASC
    `),
    db.execute(`
      SELECT source AS label, COUNT(*) AS count
      FROM logs
      GROUP BY source
      ORDER BY count DESC, source ASC
      LIMIT 5
    `),
    db.execute(`
      SELECT
        i.id,
        i.risk_level,
        i.status,
        i.created_at,
        l.message AS log_message,
        l.source
      FROM incidents i
      JOIN logs l ON i.log_id = l.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      logs: Number(logTotals.totalLogs || 0),
      incidents: Number(incidentTotals.totalIncidents || 0),
      criticalIncidents: Number(incidentTotals.criticalIncidents || 0),
      openIncidents: Number(incidentTotals.openIncidents || 0),
      resolvedIncidents: Number(incidentTotals.resolvedIncidents || 0),
    },
    incidentsByRisk,
    incidentsByStatus,
    logsBySource,
    recentIncidents,
  };
}

module.exports = { getSystemReport };
