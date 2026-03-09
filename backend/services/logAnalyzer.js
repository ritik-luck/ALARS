/**
 * Log Analyzer Service
 * Scans normalized log messages for known severity keywords.
 */

const INCIDENT_KEYWORDS = ['CRITICAL', 'ERROR', 'FAIL'];
const ALL_KEYWORDS      = ['CRITICAL', 'ERROR', 'FAIL', 'WARNING', 'EXCEPTION', 'TIMEOUT'];

function analyzeLog(message) {
  const upper = message.toUpperCase();

  const detectedKeywords = ALL_KEYWORDS.filter(kw => upper.includes(kw));
  const requiresIncident = detectedKeywords.some(kw => INCIDENT_KEYWORDS.includes(kw));

  return { detectedKeywords, requiresIncident };
}

module.exports = { analyzeLog };
