const express = require('express');
const router = express.Router();
const { getRules, addRule, toggleRule, deleteRule } = require('../controllers/ruleController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, getRules);
router.post('/', authenticate, requireAdmin, addRule);
router.put('/:id/toggle', authenticate, requireAdmin, toggleRule);
router.delete('/:id', authenticate, requireAdmin, deleteRule);

module.exports = router;
