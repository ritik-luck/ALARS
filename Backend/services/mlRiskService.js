const DEFAULT_ML_SERVICE_URL = 'http://localhost:5001';
const DEFAULT_TIMEOUT_MS = 12000;

function getMlServiceUrl() {
  return (process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL).replace(/\/+$/, '');
}

function getTimeoutMs() {
  const parsed = Number(process.env.ML_SERVICE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function predictRisk(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`${getMlServiceUrl()}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message = data?.error || response.statusText || 'Unknown ML service error';
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`ML service timed out after ${getTimeoutMs()}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getMlHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`${getMlServiceUrl()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    const data = await parseResponse(response);
    if (!response.ok) {
      return {
        available: false,
        status: 'unhealthy',
        error: data?.error || response.statusText,
      };
    }

    return {
      available: true,
      status: data?.status || 'healthy',
      modelLoaded: Boolean(data?.model_loaded),
      modelName: data?.model_name || null,
      uptimeSeconds: data?.uptime_seconds ?? null,
      url: getMlServiceUrl(),
    };
  } catch (error) {
    return {
      available: false,
      status: 'offline',
      error: error.message,
      url: getMlServiceUrl(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  getMlHealth,
  getMlServiceUrl,
  predictRisk,
};
