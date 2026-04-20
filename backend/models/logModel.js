const { logDAL } = require('../dal');

async function createLog(message, source, riskLevel, confidence) {
  return logDAL.createLog(message, source, riskLevel, confidence);
}

async function getAllLogs() {
  return logDAL.getAllLogs();
}

async function getLogById(id) {
  return logDAL.getLogById(id);
}

module.exports = { createLog, getAllLogs, getLogById };
