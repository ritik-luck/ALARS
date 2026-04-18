const { parseLog } = require('./logParser');
const { classifyLog } = require('./mlIncidentDetector');
const { generateAlert } = require('./alertGenerator');
const { createLog, getLogById } = require('../models/logModel');
const { createIncident } = require('../models/incidentModel');

function hasRequiredMlFields(analysis) {
  const hasRiskLevel = typeof analysis?.riskLevel === 'string' && analysis.riskLevel.trim().length > 0;
  const numericConfidence = Number(analysis?.confidence);
  const hasConfidence = Number.isFinite(numericConfidence);

  return { hasRiskLevel, hasConfidence, numericConfidence };
}

function buildAnalysisPayload(detection) {
  const prediction = detection.prediction || {};

  return {
    method: detection.method,
    fallbackUsed: detection.method !== 'ml',
    mlError: detection.mlError || null,
    riskLevel: detection.riskLevel || prediction.risk_level || 'INFO',
    binaryPrediction:
      prediction.binary_prediction || (detection.incidentRequired ? 'Anomaly' : 'Normal'),
    anomalyProbability: prediction.anomaly_probability ?? null,
    confidence: prediction.confidence ?? null,
    riskScore: prediction.risk_score ?? null,
    topFeatures: Array.isArray(prediction.top_features) ? prediction.top_features : [],
    modelName: prediction.model_name || null,
    inputMode: prediction.input_mode || null,
  };
}

function buildIncidentPayload(incidentId, log, riskLevel) {
  if (!incidentId) {
    return null;
  }

  return {
    id: incidentId,
    log_id: log.id,
    riskLevel,
    risk_level: riskLevel,
    status: 'open',
    created_at: new Date().toISOString(),
    log_message: log.message,
    source: log.source,
  };
}

async function processIncomingLog(message, source) {
  // 1) Parse input
  const parsed = parseLog(message, source);

  if (!parsed.message || !parsed.message.trim()) {
    console.error('[Pipeline] Skipped insert: parsed log message is empty.');
    return {
      success: false,
      skipped: true,
      error: 'Parsed log message is empty',
      log: null,
      incident: null,
      alert: null,
      analysis: null,
      detectedKeywords: [],
    };
  }

  // 2) Normalize text
  parsed.message = parsed.message.trim().replace(/\s+/g, ' ');

  // 3) Call classify_log() (JS equivalent: classifyLog)
  const detection = await classifyLog(parsed.message);
  const analysis = buildAnalysisPayload(detection);

  // 4) Validate response (must include risk_level and confidence)
  const { hasRiskLevel, hasConfidence, numericConfidence } = hasRequiredMlFields(analysis);
  if (!hasRiskLevel || !hasConfidence) {
    console.error(
      `[Validation Guard] Missing risk_level or confidence. Skipping DB insert for log: "${parsed.message}". ML output: ${JSON.stringify(analysis)}`
    );
    return {
      success: false,
      skipped: true,
      error: 'Missing risk_level or confidence',
      log: null,
      incident: null,
      alert: null,
      analysis,
      detectedKeywords: detection.detectedKeywords || [],
    };
  }

  analysis.confidence = numericConfidence;

  if (detection.mlFailed) {
    console.error(
      `[ML Fallback] ML classification failed for log: "${parsed.message}". Using fallback risk_level=LOW, confidence=0.5.`
    );
  }

  // 5) Debug logging before DB write
  console.log(`[ML Output Before Insert] ${JSON.stringify(analysis)}`);

  // 6) Only then insert into logs table
  const logId = await createLog(parsed.message, parsed.source, analysis.riskLevel, analysis.confidence);
  const storedLog = (await getLogById(logId)) || {
    id: logId,
    message: parsed.message,
    source: parsed.source,
    timestamp: new Date().toISOString(),
  };

  let incident = null;
  let alert = null;

  if (detection.incidentRequired) {
    const incidentId = await createIncident(logId, storedLog.message, analysis.riskLevel);
    incident = buildIncidentPayload(incidentId, storedLog, analysis.riskLevel);
    alert = await generateAlert(incidentId, logId, parsed.message, analysis.riskLevel);
  }

  return {
    success: true,
    log: {
      id: storedLog.id,
      message: storedLog.message,
      source: storedLog.source,
      timestamp: storedLog.timestamp,
      analysis,
    },
    incident,
    alert,
    analysis,
    detectedKeywords: detection.detectedKeywords || [],
  };
}

function summarizeBatch(results) {
  const summary = {
    totalProcessed: results.length,
    incidentsCreated: 0,
    alertsCreated: 0,
    riskLevels: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    },
    methods: {
      ml: 0,
      'ml-fallback': 0,
    },
  };

  for (const result of results) {
    const riskLevel = result.analysis?.riskLevel || 'INFO';
    if (summary.riskLevels[riskLevel] !== undefined) {
      summary.riskLevels[riskLevel] += 1;
    }

    if (summary.methods[result.analysis?.method] !== undefined) {
      summary.methods[result.analysis.method] += 1;
    }

    if (result.incident) {
      summary.incidentsCreated += 1;
    }

    if (result.alert) {
      summary.alertsCreated += 1;
    }
  }

  return summary;
}

module.exports = {
  buildAnalysisPayload,
  processIncomingLog,
  summarizeBatch,
};
