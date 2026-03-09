const express   = require('express');
const router    = express.Router();
const { ingestLog, getLogs } = require('../controllers/logController');

router.post('/', ingestLog);   // POST /api/logs
router.get('/',  getLogs);     // GET  /api/logs

module.exports = router;
