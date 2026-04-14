const express = require('express');
const router = express.Router();
const { listRules, updateDetectionRule } = require('../controllers/ruleController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'analyst', 'viewer'), listRules);
router.patch('/:id', authorizeRoles('admin'), updateDetectionRule);

module.exports = router;
