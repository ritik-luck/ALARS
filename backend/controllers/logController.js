const { parseLog }       = require('../services/logParser');
const { detectIncident } = require('../services/incidentDetector');
const { generateAlert }  = require('../services/alertGenerator');
const { createLog, getAllLogs } = require('../models/logModel');
const { createIncident } = require('../models/incidentModel');

// POST /api/logs
async function ingestLog(req, res) {
  try {
    const { message, source } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Log message is required.' });
    }

    // Step 1 — Parse & normalize
    const parsed = parseLog(message, source);

    // Step 2 — Persist log
    const logId = await createLog(parsed.message, parsed.source);

    // Step 3 — Detect incident
    const detection = detectIncident(parsed.message);

    let incident = null;
    let alert    = null;

    if (detection.incidentRequired) {
      // Step 4 — Create incident record
      const incidentId = await createIncident(logId, detection.riskLevel);
      incident = { id: incidentId, riskLevel: detection.riskLevel };

      // Step 5 — Generate alert for CRITICAL
      alert = await generateAlert(incidentId, parsed.message, detection.riskLevel);
    }

    res.status(201).json({
      success: true,
      log:     { id: logId, message: parsed.message, source: parsed.source },
      incident,
      alert,
    });
  } catch (err) {
    console.error('ingestLog error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

// GET /api/logs
async function getLogs(req, res) {
  try {
    const logs = await getAllLogs();
    res.json(logs);
  } catch (err) {
    console.error('getLogs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { ingestLog, getLogs };
