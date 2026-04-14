const express = require('express');
const router = express.Router();
const { getReport } = require('../controllers/reportController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateJWT);

router.get('/system', authorizeRoles('admin', 'analyst', 'viewer'), getReport);

module.exports = router;
