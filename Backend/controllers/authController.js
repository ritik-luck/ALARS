const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { normalizeRole, VALID_ROLES } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';
const BCRYPT_ROUNDS = 10;

function safeUser(user) {
  return { id: user.id, username: user.username, role: normalizeRole(user.role) };
}

exports.register = async (req, res) => {
  const { username, password, role = 'viewer' } = req.body;
  const normalizedUsername = String(username || '').trim();
  if (!normalizedUsername || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const normalizedRole = normalizeRole(role);
    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const existing = await userModel.findByUsername(normalizedUsername);
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userModel.createUser({ username: normalizedUsername, password: hashedPassword, role: normalizedRole });
    res.status(201).json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = String(username || '').trim();
  if (!normalizedUsername || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const user = await userModel.findByUsername(normalizedUsername);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const passwordMatches = user.password.startsWith('$2')
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!passwordMatches) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = safeUser(user);
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.bootstrapRegister = async (req, res, next) => {
  try {
    const userCount = await userModel.countUsers();

    if (userCount === 0) {
      req.body.role = 'admin';
      return exports.register(req, res);
    }

    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.me = (req, res) => {
  res.json({ user: safeUser(req.user) });
};
