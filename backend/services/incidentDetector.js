/**
 * Incident Detector Service
 * Combines log analysis and risk classification to decide
 * whether a log message should generate an incident.
 */

const { analyzeLog }   = require('./logAnalyzer');
const { classifyRisk } = require('./riskClassifier');

function detectIncident(message) {
  const { detectedKeywords, requiresIncident } = analyzeLog(message);

  if (!requiresIncident) {
    return { incidentRequired: false };
  }

  const riskLevel = classifyRisk(detectedKeywords);

  return {
    incidentRequired: true,
    riskLevel,
    detectedKeywords,
  };
}

module.exports = { detectIncident };
