const express  = require('express');
const router   = express.Router();
const { getIncidents } = require('../controllers/incidentController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// Protect all incident routes - require valid JWT
router.use(authenticateJWT);

router.get('/', getIncidents);  // GET /api/incidents

module.exports = router;
