const EventEmitter = require('events');

const { createSourceFromConfig } = require('./externalSources/sourceFactory');
const { processIncomingLog } = require('./logProcessingPipeline');

const DEFAULT_POLL_INTERVAL_MS = 60000;
const DEFAULT_FETCH_TIMEOUT_MS = 10000;
const DEFAULT_RETRY_BASE_MS = 5000;
const DEFAULT_RETRY_MAX_MS = 60000;
const DEFAULT_MAX_PER_POLL = 10;
const DEFAULT_MAX_QUEUE_DEPTH = 100;
const DEFAULT_DEDUP_CACHE_SIZE = 1000;
const DEFAULT_PROCESS_INTERVAL_MS = 1500;

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function serializeError(error) {
  return {
    message: error?.message || 'Unknown live stream error',
    at: new Date().toISOString(),
  };
}

function looksLikeRawJson(value) {
  const trimmed = String(value || '').trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

class LiveStreamService extends EventEmitter {
  constructor(source = createSourceFromConfig()) {
    super();
    this.source = source;
    this.sourceSignature = this.getSourceSignature(source);
    this.pollIntervalMs = getPositiveInteger(
      process.env.LIVE_STREAM_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS
    );
    this.fetchTimeoutMs = getPositiveInteger(
      process.env.LIVE_STREAM_FETCH_TIMEOUT_MS,
      DEFAULT_FETCH_TIMEOUT_MS
    );
    this.retryBaseMs = getPositiveInteger(
      process.env.LIVE_STREAM_RETRY_BASE_MS,
      DEFAULT_RETRY_BASE_MS
    );
    this.retryMaxMs = getPositiveInteger(
      process.env.LIVE_STREAM_RETRY_MAX_MS,
      DEFAULT_RETRY_MAX_MS
    );
    this.maxPerPoll = getPositiveInteger(
      process.env.LIVE_STREAM_MAX_PER_POLL,
      DEFAULT_MAX_PER_POLL
    );
    this.maxQueueDepth = getPositiveInteger(
      process.env.LIVE_STREAM_MAX_QUEUE_DEPTH,
      DEFAULT_MAX_QUEUE_DEPTH
    );
    this.dedupCacheSize = getPositiveInteger(
      process.env.LIVE_STREAM_DEDUP_CACHE_SIZE,
      DEFAULT_DEDUP_CACHE_SIZE
    );
    this.processIntervalMs = getPositiveInteger(
      process.env.LIVE_STREAM_PROCESS_INTERVAL_MS,
      DEFAULT_PROCESS_INTERVAL_MS
    );

    this.queue = [];
    this.seenExternalIds = new Map();
    this.timer = null;
    this.processTimer = null;
    this.processing = false;
    this.currentController = null;
    this.currentBackoffMs = 0;

    this.state = {
      running: false,
      source: this.source.name,
      sourceType: this.source.type || 'github',
      sourceUrl: this.source.url || null,
      startedAt: null,
      stoppedAt: null,
      lastPollAt: null,
      nextPollAt: null,
      lastEventAt: null,
      lastError: null,
      totalFetched: 0,
      totalQueued: 0,
      totalProcessed: 0,
      totalDropped: 0,
      totalErrors: 0,
      connectedClients: 0,
    };
  }

  getStatus() {
    return {
      ...this.state,
      queueDepth: this.queue.length,
      processing: this.processing,
      pollIntervalMs: this.pollIntervalMs,
      processIntervalMs: this.processIntervalMs,
      maxPerPoll: this.maxPerPoll,
      retryDelayMs: this.currentBackoffMs,
    };
  }

  start(config = {}) {
    if (config.sourceType || config.sourceUrl) {
      const requestedSource = createSourceFromConfig(config);
      const requestedSignature = this.getSourceSignature(requestedSource);

      if (this.state.running && requestedSignature !== this.sourceSignature) {
        this.stop();
      }

      if (!this.state.running && requestedSignature !== this.sourceSignature) {
        this.setSource(requestedSource);
        this.seenExternalIds.clear();
      }
    }

    if (this.state.running) {
      return this.getStatus();
    }

    this.resetSessionCounters();
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();
    this.state.stoppedAt = null;
    this.state.lastError = null;
    this.currentBackoffMs = 0;
    this.schedulePoll(0);
    this.emitStatus();
    return this.getStatus();
  }

  stop() {
    if (!this.state.running) {
      return this.getStatus();
    }

    this.state.running = false;
    this.state.stoppedAt = new Date().toISOString();
    this.state.nextPollAt = null;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }

    if (this.currentController) {
      this.currentController.abort();
    }

    if (this.queue.length > 0) {
      this.state.totalDropped += this.queue.length;
      this.queue = [];
    }

    this.emitStatus();
    return this.getStatus();
  }

  getSourceSignature(source) {
    return `${source.type || 'github'}:${source.url || source.name}`;
  }

  setSource(source) {
    this.source = source;
    this.sourceSignature = this.getSourceSignature(source);
    this.state.source = source.name;
    this.state.sourceType = source.type || 'github';
    this.state.sourceUrl = source.url || null;
  }

  resetSessionCounters() {
    if (this.processTimer) {
      clearTimeout(this.processTimer);
      this.processTimer = null;
    }

    this.queue = [];
    this.processing = false;
    this.currentBackoffMs = 0;
    this.state.lastPollAt = null;
    this.state.nextPollAt = null;
    this.state.lastEventAt = null;
    this.state.lastError = null;
    this.state.totalFetched = 0;
    this.state.totalQueued = 0;
    this.state.totalProcessed = 0;
    this.state.totalDropped = 0;
    this.state.totalErrors = 0;
  }

  incrementClientCount() {
    this.state.connectedClients += 1;
    this.emitStatus();
  }

  decrementClientCount() {
    this.state.connectedClients = Math.max(0, this.state.connectedClients - 1);
    this.emitStatus();
  }

  schedulePoll(delayMs) {
    if (!this.state.running) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.state.nextPollAt = new Date(Date.now() + delayMs).toISOString();
    this.timer = setTimeout(() => this.pollSource(), delayMs);
  }

  async pollSource() {
    if (!this.state.running) {
      return;
    }

    this.timer = null;
    this.state.lastPollAt = new Date().toISOString();
    this.emitStatus();

    const controller = new AbortController();
    this.currentController = controller;
    const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeoutMs);

    try {
      const entries = await this.source.fetch({ signal: controller.signal });
      const limitedEntries = entries.slice(0, this.maxPerPoll);

      this.state.totalFetched += limitedEntries.length;
      this.currentBackoffMs = 0;
      this.enqueue(limitedEntries);
      this.scheduleProcess(0);
      this.schedulePoll(this.pollIntervalMs);
      this.emitStatus();
    } catch (error) {
      if (error?.name === 'AbortError' && !this.state.running) {
        return;
      }

      this.captureError(error);
      this.currentBackoffMs = this.currentBackoffMs
        ? Math.min(this.currentBackoffMs * 2, this.retryMaxMs)
        : this.retryBaseMs;
      this.schedulePoll(this.currentBackoffMs);
      this.emitStatus();
    } finally {
      clearTimeout(timeoutId);
      this.currentController = null;
    }
  }

  enqueue(entries) {
    for (const entry of entries) {
      if (
        typeof entry?.message !== 'string' ||
        !entry.message.trim() ||
        looksLikeRawJson(entry.message) ||
        !entry?.externalId
      ) {
        this.captureError(new Error('External source returned an unparsed or empty log message.'));
        continue;
      }

      if (!this.rememberExternalId(entry.externalId)) {
        continue;
      }

      if (this.queue.length >= this.maxQueueDepth) {
        this.state.totalDropped += 1;
        continue;
      }

      this.queue.push(entry);
      this.state.totalQueued += 1;
    }

    this.emitStatus();
  }

  scheduleProcess(delayMs = this.processIntervalMs) {
    if (!this.state.running || this.processing || this.processTimer || this.queue.length === 0) {
      return;
    }

    this.processTimer = setTimeout(() => {
      this.processTimer = null;
      this.processNext();
    }, delayMs);
  }

  rememberExternalId(externalId) {
    if (this.seenExternalIds.has(externalId)) {
      return false;
    }

    this.seenExternalIds.set(externalId, Date.now());

    while (this.seenExternalIds.size > this.dedupCacheSize) {
      const oldestKey = this.seenExternalIds.keys().next().value;
      this.seenExternalIds.delete(oldestKey);
    }

    return true;
  }

  async processNext() {
    if (this.processing) {
      return;
    }

    if (!this.state.running || this.queue.length === 0) {
      this.emitStatus();
      return;
    }

    this.processing = true;
    this.emitStatus();
    try {
      // Drain one-by-one while awaiting ML classification + DB write for strict sequencing.
      while (this.state.running && this.queue.length > 0) {
          const entry = this.queue.shift();
          this.emitStatus(); // Update UI immediately after shifting from queue

        try {
          const result = await processIncomingLog(entry.message, entry.source);
          const payload = {
            ...result,
            external: entry.metadata || {},
            externalId: entry.externalId,
            streamedAt: new Date().toISOString(),
          };

          if (result?.skipped) {
            console.error(
              `[LiveStream] Skipped DB insert for externalId=${entry.externalId}. Reason: ${result.error || 'Unknown reason'}`
            );
          }

          this.state.totalProcessed += 1;
          this.state.lastEventAt = payload.streamedAt;
          this.emit('log', payload);
          this.emitStatus(); // Update UI immediately after processing
        } catch (error) {
          this.captureError(error);
        }

        if (!this.state.running || this.queue.length === 0) {
          break;
        }

        if (this.processIntervalMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.processIntervalMs));
        }
      }
    } finally {
      this.processing = false;
      this.emitStatus();
    }

    this.scheduleProcess(0);
  }

  captureError(error) {
    const serialized = serializeError(error);
    this.state.totalErrors += 1;
    this.state.lastError = serialized;
    this.emit('error-event', serialized);
    this.emitStatus();
  }

  emitStatus() {
    this.emit('status', this.getStatus());
  }
}

module.exports = new LiveStreamService();
