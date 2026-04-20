const { getMlHealth } = require('../services/mlRiskService');
const { getAllLogs } = require('../models/logModel');
const { alertDAL, logDAL } = require('../dal');
const {
  processIncomingLog,
  summarizeBatch,
} = require('../services/logProcessingPipeline');

const MAX_BATCH_ENTRIES = 200;

function normalizeBatchEntries(body) {
  if (Array.isArray(body?.entries)) {
    return body.entries.map((entry) => ({
      message: String(entry?.message || ''),
      source: String(entry?.source || body?.source || 'upload'),
    }));
  }

  if (Array.isArray(body?.messages)) {
    return body.messages.map((message) => ({
      message: String(message || ''),
      source: String(body?.source || 'upload'),
    }));
  }

  return [];
}

async function ingestLog(req, res) {
  try {
    const { message, source } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Log message is required.' });
    }

    const result = await processIncomingLog(String(message), String(source || 'manual'));
    res.status(201).json(result);
  } catch (err) {
    console.error('ingestLog error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function ingestLogBatch(req, res) {
  try {
    const entries = normalizeBatchEntries(req.body).filter((entry) => entry.message.trim());

    if (entries.length === 0) {
      return res.status(400).json({
        error: "Provide 'entries' or 'messages' with at least one non-empty log line.",
      });
    }

    if (entries.length > MAX_BATCH_ENTRIES) {
      return res.status(400).json({
        error: `Batch limit exceeded. Submit at most ${MAX_BATCH_ENTRIES} log lines at once.`,
      });
    }

    const results = [];
    for (const entry of entries) {
      const result = await processIncomingLog(entry.message, entry.source);
      results.push(result);
    }

    res.status(201).json({
      success: true,
      summary: summarizeBatch(results),
      results,
    });
  } catch (err) {
    console.error('ingestLogBatch error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getLogs(req, res) {
  try {
    const logs = await getAllLogs();
    res.json(logs);
  } catch (err) {
    console.error('getLogs error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getMlStatus(req, res) {
  try {
    const status = await getMlHealth();
    res.json(status);
  } catch (err) {
    console.error('getMlStatus error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function notifyLog(req, res) {
  try {
    const { id } = req.params;
    const { risk_level, message } = req.body;

    const log = await logDAL.getLogById(id);
    if (!log) {
      return res.status(404).json({ 
        success: false, 
        error: `Log ID #${id} not found.` 
      });
    }

    const finalRisk = risk_level || 'INFO';
    const finalMessage = message || `Manual alert for log entry #${id}`;

    await alertDAL.createAlert(null, finalMessage, { logId: log.id, alertType: finalRisk });

    return res.status(201).json({ 
      success: true, 
      message: 'Notification alert successfully triggered.' 
    });
  } catch (err) {
    console.error('notifyLog error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to create alert in database. Please check connection.' 
    });
  }
}

module.exports = {
  getLogs,
  getMlStatus,
  ingestLog,
  ingestLogBatch,
  notifyLog,
};
