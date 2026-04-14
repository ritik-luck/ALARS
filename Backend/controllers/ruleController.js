const { getRules, updateRule } = require('../models/ruleModel');

const VALID_RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

async function listRules(req, res) {
  try {
    const rules = await getRules();
    res.json(rules);
  } catch (err) {
    console.error('listRules error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function updateDetectionRule(req, res) {
  try {
    const ruleId = Number(req.params.id);
    const keyword = String(req.body.keyword || '').trim().toUpperCase();
    const riskLevel = String(req.body.riskLevel || req.body.risk_level || '').trim().toUpperCase();
    const thresholdCount = Number(req.body.thresholdCount || req.body.threshold_count || 1);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return res.status(400).json({ error: 'Valid rule id is required.' });
    }

    if (!keyword) {
      return res.status(400).json({ error: 'Keyword is required.' });
    }

    if (!VALID_RISK_LEVELS.includes(riskLevel)) {
      return res.status(400).json({ error: `riskLevel must be one of: ${VALID_RISK_LEVELS.join(', ')}` });
    }

    if (!Number.isInteger(thresholdCount) || thresholdCount < 1) {
      return res.status(400).json({ error: 'thresholdCount must be a positive whole number.' });
    }

    const rule = await updateRule(ruleId, {
      keyword,
      riskLevel,
      createsIncident: toBoolean(req.body.createsIncident ?? req.body.creates_incident),
      alertEnabled: toBoolean(req.body.alertEnabled ?? req.body.alert_enabled),
      thresholdCount,
      enabled: toBoolean(req.body.enabled),
    });

    if (!rule) {
      return res.status(404).json({ error: 'Detection rule not found.' });
    }

    return res.json(rule);
  } catch (err) {
    console.error('updateDetectionRule error:', err);

    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(400).json({ error: 'Run the detection_rules database migration before editing rules.' });
    }

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A rule with that keyword already exists.' });
    }

    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { listRules, updateDetectionRule };
