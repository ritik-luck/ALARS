const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/stats', authenticate, getStats);

module.exports = router;
