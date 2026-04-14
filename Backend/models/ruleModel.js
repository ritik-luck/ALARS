const db = require('../config/db');

const DEFAULT_RULES = [
  { id: null, keyword: 'CRITICAL', risk_level: 'CRITICAL', creates_incident: 1, alert_enabled: 1, threshold_count: 1, enabled: 1 },
  { id: null, keyword: 'ERROR', risk_level: 'HIGH', creates_incident: 1, alert_enabled: 0, threshold_count: 1, enabled: 1 },
  { id: null, keyword: 'FAIL', risk_level: 'MEDIUM', creates_incident: 1, alert_enabled: 0, threshold_count: 1, enabled: 1 },
  { id: null, keyword: 'WARNING', risk_level: 'LOW', creates_incident: 0, alert_enabled: 0, threshold_count: 1, enabled: 1 },
  { id: null, keyword: 'EXCEPTION', risk_level: 'HIGH', creates_incident: 1, alert_enabled: 0, threshold_count: 1, enabled: 1 },
  { id: null, keyword: 'TIMEOUT', risk_level: 'HIGH', creates_incident: 1, alert_enabled: 0, threshold_count: 1, enabled: 1 },
];

async function ensureRulesTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS detection_rules (
      id               INT          AUTO_INCREMENT PRIMARY KEY,
      keyword          VARCHAR(100) NOT NULL UNIQUE,
      risk_level       VARCHAR(50)  NOT NULL DEFAULT 'INFO',
      creates_incident TINYINT(1)   NOT NULL DEFAULT 0,
      alert_enabled    TINYINT(1)   NOT NULL DEFAULT 0,
      threshold_count  INT          NOT NULL DEFAULT 1,
      enabled          TINYINT(1)   NOT NULL DEFAULT 1,
      updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  for (const rule of DEFAULT_RULES) {
    await db.execute(
      `INSERT IGNORE INTO detection_rules
        (keyword, risk_level, creates_incident, alert_enabled, threshold_count, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rule.keyword,
        rule.risk_level,
        rule.creates_incident,
        rule.alert_enabled,
        rule.threshold_count,
        rule.enabled,
      ]
    );
  }
}

async function getRules() {
  await ensureRulesTable();

  try {
    const [rows] = await db.execute(`
      SELECT
        id,
        keyword,
        risk_level,
        creates_incident,
        alert_enabled,
        threshold_count,
        enabled,
        updated_at
      FROM detection_rules
      ORDER BY
        FIELD(risk_level, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'),
        keyword ASC
    `);

    return rows.length > 0 ? rows : DEFAULT_RULES;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return DEFAULT_RULES;
    }

    throw err;
  }
}

async function updateRule(id, rule) {
  await ensureRulesTable();

  const [result] = await db.execute(
    `UPDATE detection_rules
     SET keyword = ?,
         risk_level = ?,
         creates_incident = ?,
         alert_enabled = ?,
         threshold_count = ?,
         enabled = ?
     WHERE id = ?`,
    [
      rule.keyword,
      rule.riskLevel,
      rule.createsIncident ? 1 : 0,
      rule.alertEnabled ? 1 : 0,
      rule.thresholdCount,
      rule.enabled ? 1 : 0,
      id,
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await db.execute(
    `SELECT
       id,
       keyword,
       risk_level,
       creates_incident,
       alert_enabled,
       threshold_count,
       enabled,
       updated_at
     FROM detection_rules
     WHERE id = ?`,
    [id]
  );

  return rows[0];
}

module.exports = { DEFAULT_RULES, ensureRulesTable, getRules, updateRule };
