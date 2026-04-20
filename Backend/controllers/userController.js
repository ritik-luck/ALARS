const { userDAL } = require('../dal');

async function getUsers(req, res) {
  try {
    const users = await userDAL.getAllUsers();
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
    const updated = await userDAL.updateUserRole(id, role);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getUsers, updateUserRole };
