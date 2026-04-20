const {
  getAllIncidents,
  getIncidentById: fetchIncidentById,
  assignIncident: assignIncidentToUser,
  updateIncidentStatus: persistIncidentStatus,
  resolveIncident: persistResolvedIncident,
  createIncident,
} = require('../models/incidentModel');
const { incidentDAL, logDAL } = require('../dal');

async function getIncidents(req, res) {
  try {
    const incidents = await getAllIncidents();
    res.json(incidents);
  } catch (err) {
    console.error('getIncidents error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getIncidentById(req, res) {
  try {
    const { id } = req.params;
    const incident = await fetchIncidentById(id);

    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function assignIncident(req, res) {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body; // user_id

    const updated = await assignIncidentToUser(id, assignee_id);
    if (!updated) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json({ success: true, message: 'Incident assigned' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateIncidentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updated = await persistIncidentStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function resolveIncident(req, res) {
  try {
    const { id } = req.params;
    const { resolution_notes, mitigation_actions } = req.body;

    const updated = await persistResolvedIncident(id, resolution_notes, mitigation_actions);
    if (!updated) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json({ success: true, message: 'Incident resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function promoteLogToIncident(req, res) {
  try {
    const { log_id, risk_level } = req.body;

    if (!log_id) return res.status(400).json({ error: 'log_id is required' });

    const existing = await incidentDAL.getIncidentByLogId(log_id);
    if (existing) {
      return res.status(409).json({ error: 'Log has already been promoted to an incident', incident_id: existing.id });
    }

    const log = await logDAL.getLogById(log_id);
    if (!log) {
      return res.status(404).json({ 
        success: false, 
        error: `Log entry #${log_id} not found. Connection may be stale.` 
      });
    }

    const logMessage = log.message;
    const finalRisk = risk_level || 'MEDIUM';

    const incidentId = await createIncident(log_id, logMessage, finalRisk);

    return res.status(201).json({ 
      success: true, 
      message: 'Log successfully promoted to incident',
      incident_id: incidentId 
    });
  } catch (err) {
    console.error('promoteLogToIncident error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Database operation failed during promotion. Please try again.' 
    });
  }
}

module.exports = { 
  getIncidents, 
  getIncidentById, 
  assignIncident, 
  updateIncidentStatus, 
  resolveIncident,
  promoteLogToIncident
};
