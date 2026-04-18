const { predictRisk } = require('./mlRiskService');

function normalizeRiskLevel(value) {
  const normalized = String(value || '').trim().toUpperCase();
  const allowed = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'INFO']);
  return allowed.has(normalized) ? normalized : null;
}

function isValidConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

async function classifyLog(message) {
  try {
    const prediction = await predictRisk({ message });
    const normalizedRiskLevel = normalizeRiskLevel(prediction?.risk_level);
    const normalizedConfidence = Number(prediction?.confidence);

    if (!normalizedRiskLevel || !isValidConfidence(normalizedConfidence)) {
      throw new Error('ML response missing required risk_level or confidence fields.');
    }

    return {
      incidentRequired:
        ['MEDIUM', 'HIGH', 'CRITICAL'].includes(normalizedRiskLevel) ||
        prediction.binary_prediction === 'Anomaly',
      riskLevel: normalizedRiskLevel,
      detectedKeywords: [],
      prediction: {
        ...prediction,
        risk_level: normalizedRiskLevel,
        confidence: normalizedConfidence,
      },
      method: 'ml',
      mlFailed: false,
    };
  } catch (error) {
    return {
      incidentRequired: false,
      riskLevel: 'LOW',
      detectedKeywords: [],
      prediction: {
        risk_level: 'LOW',
        confidence: 0.5,
        binary_prediction: 'Normal',
      },
      method: 'ml-fallback',
      mlError: error.message,
      mlFailed: true,
    };
  }
}

async function detectIncident(message) {
  return classifyLog(message);
}

module.exports = { classifyLog, detectIncident };
