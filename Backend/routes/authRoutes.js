const express = require('express');
const router = express.Router();
const { register, login, me, bootstrapRegister } = require('../controllers/authController');
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/register', bootstrapRegister, authenticateJWT, authorizeRoles('admin'), register);
router.post('/login', login);
router.get('/me', authenticateJWT, me);

module.exports = router;
