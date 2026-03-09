const { getAllIncidents } = require('../models/incidentModel');

// GET /api/incidents
async function getIncidents(req, res) {
  try {
    const incidents = await getAllIncidents();
    res.json(incidents);
  } catch (err) {
    console.error('getIncidents error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getIncidents };
