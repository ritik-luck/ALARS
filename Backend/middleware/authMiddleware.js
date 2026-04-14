const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const VALID_ROLES = ['admin', 'analyst', 'viewer'];

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

exports.authenticateJWT = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { ...payload, role: normalizeRole(payload.role) };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

exports.authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const allowedRoles = roles.map(normalizeRole);
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' });
  next();
};

exports.VALID_ROLES = VALID_ROLES;
exports.normalizeRole = normalizeRole;
