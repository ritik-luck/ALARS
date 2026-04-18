const express = require('express');
const {
  getLiveStreamStatus,
  startLiveStream,
  stopLiveStream,
  streamLiveEvents,
} = require('../controllers/liveStreamController');

const router = express.Router();

router.get('/status', getLiveStreamStatus);
router.get('/events', streamLiveEvents);
router.post('/start', startLiveStream);
router.post('/stop', stopLiveStream);

module.exports = router;
