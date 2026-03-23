const pool = require('../config/db');

module.exports = {
  createUser: async ({ username, password, role = 'user' }) => {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, role]
    );
    return { id: result.insertId, username, role };
  },

  findByUsername: async (username) => {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await pool.execute('SELECT id, username, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  },
};
