const express = require('express');
const router = express.Router();
const { 
  getIncidents, 
  getIncidentById, 
  assignIncident, 
  updateIncidentStatus, 
  resolveIncident,
  promoteLogToIncident
} = require('../controllers/incidentController');
const { authenticate, requireAnalystOrAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, getIncidents);
router.get('/:id', authenticate, getIncidentById);
router.put('/:id/assign', authenticate, requireAnalystOrAdmin, assignIncident);
router.put('/:id/status', authenticate, requireAnalystOrAdmin, updateIncidentStatus);
router.put('/:id/resolve', authenticate, requireAnalystOrAdmin, resolveIncident);
router.post('/promote', authenticate, requireAnalystOrAdmin, promoteLogToIncident);

module.exports = router;
