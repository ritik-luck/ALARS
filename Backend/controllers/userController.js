const db = require('../config/db');

async function getUsers(req, res) {
  try {
    const [users] = await db.execute('SELECT id, username, role, created_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getUsers, updateUserRole };
