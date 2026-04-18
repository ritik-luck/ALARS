const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-alars-key';

function authenticate(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied. Invalid token.' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ error: 'Invalid token.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

function requireAnalystOrAdmin(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'analyst') {
    return res.status(403).json({ error: 'Access denied. Insufficient privileges.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireAnalystOrAdmin };
