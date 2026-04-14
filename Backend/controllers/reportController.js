const { getSystemReport } = require('../models/reportModel');

async function getReport(req, res) {
  try {
    const report = await getSystemReport();
    res.json(report);
  } catch (err) {
    console.error('getReport error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getReport };
