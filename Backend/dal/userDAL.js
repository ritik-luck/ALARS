/**
 * ============================================================
 *  ALARS — Data Access Layer
 *  User DAL  (users table)
 * ============================================================
 *
 *  Provides CRUD operations for the `users` table, fully
 *  decoupled from HTTP / Express so it can be consumed by
 *  controllers, services, scripts, or tests.
 * ============================================================
 */

const { query } = require('./connection');

// ── CREATE ────────────────────────────────────────────────────
/**
 * Insert a new user row.
 * @param {string} username  – unique username
 * @param {string} password  – hashed password string
 * @param {string} [role='user'] – role name
 * @returns {Promise<number>} insertId
 */
async function createUser(username, password, role = 'user') {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }
  const result = await query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, password, role]
  );
  return result.insertId;
}

// ── READ (single) ────────────────────────────────────────────
/**
 * Get a user by their primary key.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return rows.length ? rows[0] : null;
}

/**
 * Get a user by username.
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function getUserByUsername(username) {
  const rows = await query('SELECT * FROM users WHERE username = ?', [username]);
  return rows.length ? rows[0] : null;
}

// ── READ (all) ───────────────────────────────────────────────
/**
 * Retrieve every user, ordered by creation date (newest first).
 * @returns {Promise<Array>}
 */
async function getAllUsers() {
  return query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
}

// ── UPDATE ───────────────────────────────────────────────────
/**
 * Update a user's role.
 * @param {number} id
 * @param {string} newRole
 * @returns {Promise<boolean>} true if a row was actually updated
 */
async function updateUserRole(id, newRole) {
  const result = await query(
    'UPDATE users SET role = ? WHERE id = ?',
    [newRole, id]
  );
  return result.affectedRows > 0;
}

// ── DELETE ───────────────────────────────────────────────────
/**
 * Remove a user by primary key.
 * @param {number} id
 * @returns {Promise<boolean>} true if a row was deleted
 */
async function deleteUser(id) {
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createUser,
  getUserById,
  getUserByUsername,
  getAllUsers,
  updateUserRole,
  deleteUser,
};
