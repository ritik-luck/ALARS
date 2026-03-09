/**
 * Risk Classifier Service
 * Assigns a severity level based on detected keywords.
 *
 * Priority order (highest wins):
 *   CRITICAL → CRITICAL
 *   ERROR    → HIGH
 *   FAIL     → MEDIUM
 *   WARNING  → LOW
 *   (none)   → INFO
 */

function classifyRisk(detectedKeywords) {
  if (detectedKeywords.includes('CRITICAL')) return 'CRITICAL';
  if (detectedKeywords.includes('ERROR'))    return 'HIGH';
  if (detectedKeywords.includes('FAIL'))     return 'MEDIUM';
  if (detectedKeywords.includes('WARNING'))  return 'LOW';
  return 'INFO';
}

module.exports = { classifyRisk };
