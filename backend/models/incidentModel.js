const { incidentDAL } = require('../dal');

async function createIncident(logId, message, riskLevel) {
  return incidentDAL.createIncident(logId, message, riskLevel);
}

async function getAllIncidents() {
  return incidentDAL.getAllIncidents();
}

async function getIncidentById(id) {
  return incidentDAL.getIncidentById(id);
}

async function assignIncident(id, assigneeId) {
  return incidentDAL.assignIncident(id, assigneeId);
}

async function updateIncidentStatus(id, status) {
  return incidentDAL.updateIncidentStatus(id, status);
}

async function resolveIncident(id, resolutionNotes, mitigationActions) {
  return incidentDAL.resolveIncident(id, resolutionNotes, mitigationActions);
}

module.exports = {
  createIncident,
  getAllIncidents,
  getIncidentById,
  assignIncident,
  updateIncidentStatus,
  resolveIncident,
};
