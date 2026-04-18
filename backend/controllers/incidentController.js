const db = require('../config/db');
const { getAllIncidents } = require('../models/incidentModel');

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
    const [rows] = await db.execute(`
      SELECT 
        i.*, 
        l.message as log_message,
        l.source as log_source,
        l.created_at as log_timestamp,
        u.username as assignee_name
      FROM incidents i
      JOIN logs l ON i.log_id = l.id
      LEFT JOIN users u ON i.assignee_id = u.id
      WHERE i.id = ?
    `, [id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function assignIncident(req, res) {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body; // user_id
    
    await db.execute('UPDATE incidents SET assignee_id = ?, status = "in_progress" WHERE id = ?', [assignee_id, id]);
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
    
    await db.execute('UPDATE incidents SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function resolveIncident(req, res) {
  try {
    const { id } = req.params;
    const { resolution_notes, mitigation_actions } = req.body;
    
    await db.execute(
      'UPDATE incidents SET status = "resolved", resolution_notes = ?, mitigation_actions = ? WHERE id = ?',
      [resolution_notes, mitigation_actions, id]
    );
    res.json({ success: true, message: 'Incident resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function promoteLogToIncident(req, res) {
  try {
    const { log_id, risk_level } = req.body;
    
    if (!log_id) return res.status(400).json({ error: 'log_id is required' });

    // Prevent duplicate promotions
    const [existing] = await db.execute('SELECT id FROM incidents WHERE log_id = ?', [log_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Log has already been promoted to an incident', incident_id: existing[0].id });
    }

    // Verify log exists and get message
    const [logs] = await db.execute('SELECT id, message FROM logs WHERE id = ?', [log_id]);
    if (logs.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `Log entry #${log_id} not found. Connection may be stale.` 
      });
    }

    const logMessage = logs[0].message;
    const finalRisk = risk_level || 'MEDIUM';

    // Insert into incidents
    const [result] = await db.execute(
      'INSERT INTO incidents (log_id, message, risk_level, status) VALUES (?, ?, ?, "open")',
      [log_id, logMessage, finalRisk]
    );

    return res.status(201).json({ 
      success: true, 
      message: 'Log successfully promoted to incident',
      incident_id: result.insertId 
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
