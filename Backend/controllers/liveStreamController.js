const liveStreamService = require('../services/liveStreamService');

function sendSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function getLiveStreamStatus(req, res) {
  res.json(liveStreamService.getStatus());
}

function startLiveStream(req, res) {
  try {
    const status = liveStreamService.start(req.body || {});
    res.json({ success: true, status });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

function stopLiveStream(req, res) {
  const status = liveStreamService.stop();
  res.json({ success: true, status });
}

function streamLiveEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  liveStreamService.incrementClientCount();
  sendSseEvent(res, 'live:status', liveStreamService.getStatus());

  const handleLog = (payload) => sendSseEvent(res, 'live:log', payload);
  const handleStatus = (payload) => sendSseEvent(res, 'live:status', payload);
  const handleError = (payload) => sendSseEvent(res, 'live:error', payload);
  const heartbeat = setInterval(() => {
    sendSseEvent(res, 'live:heartbeat', { at: new Date().toISOString() });
  }, 25000);

  liveStreamService.on('log', handleLog);
  liveStreamService.on('status', handleStatus);
  liveStreamService.on('error-event', handleError);

  req.on('close', () => {
    clearInterval(heartbeat);
    liveStreamService.off('log', handleLog);
    liveStreamService.off('status', handleStatus);
    liveStreamService.off('error-event', handleError);
    liveStreamService.decrementClientCount();
    if (!res.writableEnded) {
      res.end();
    }
  });
}

module.exports = {
  getLiveStreamStatus,
  startLiveStream,
  stopLiveStream,
  streamLiveEvents,
};
