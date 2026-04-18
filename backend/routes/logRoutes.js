const express   = require('express');
const router    = express.Router();
const {
  ingestLog,
  ingestLogBatch,
  getLogs,
  getMlStatus,
  notifyLog,
} = require('../controllers/logController');

const { authenticate, requireAnalystOrAdmin } = require('../middleware/authMiddleware');

router.post('/', ingestLog);   // POST /api/logs
router.post('/batch', ingestLogBatch); // POST /api/logs/batch
router.get('/',  getLogs);     // GET  /api/logs
router.get('/ml-status', getMlStatus); // GET /api/logs/ml-status
router.post('/:id/notify', authenticate, requireAnalystOrAdmin, notifyLog);

module.exports = router;
