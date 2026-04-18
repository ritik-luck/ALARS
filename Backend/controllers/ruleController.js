const db = require('../config/db');

async function getRules(req, res) {
  try {
    const [rules] = await db.execute('SELECT * FROM rules ORDER BY id ASC');
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addRule(req, res) {
  try {
    const { rule_name, description, severity_level } = req.body;
    await db.execute('INSERT INTO rules (rule_name, description, severity_level) VALUES (?, ?, ?)', 
      [rule_name, description, severity_level]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function toggleRule(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await db.execute('UPDATE rules SET is_active = ? WHERE id = ?', [is_active, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteRule(req, res) {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM rules WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getRules, addRule, toggleRule, deleteRule };
