/**
 * Log Parser Service
 * Cleans and normalizes raw log messages before storage.
 */

function parseLog(rawMessage, source = 'manual') {
  // Trim whitespace and collapse multiple spaces
  const cleaned = rawMessage.trim().replace(/\s+/g, ' ');

  return {
    message: cleaned,
    source:  source || 'manual',
  };
}

module.exports = { parseLog };
