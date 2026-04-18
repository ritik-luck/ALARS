const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole } = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', authenticate, requireAdmin, getUsers);
router.put('/:id/role', authenticate, requireAdmin, updateUserRole);

module.exports = router;
