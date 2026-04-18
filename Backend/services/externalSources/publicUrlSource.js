const { cleanText, normalizeExternalData } = require('./dataNormalizer');

const MAX_TEXT_BYTES = 1024 * 1024;

function ensurePublicHttpUrl(rawUrl) {
  const parsed = new URL(rawUrl);

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Live source URL must use http or https.');
  }

  return parsed.toString();
}

function getSourceName(sourceUrl, sourceName) {
  if (sourceName) {
    return cleanText(sourceName);
  }

  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return 'public-url';
  }
}

function createPublicUrlSource({ url, name } = {}) {
  if (!url) {
    throw new Error('A public source URL is required.');
  }

  const sourceUrl = ensurePublicHttpUrl(url);
  const sourceName = getSourceName(sourceUrl, name);
  let lastEtag = null;
  let lastModified = null;

  return {
    name: sourceName,
    type: 'public-url',
    url: sourceUrl,
    async fetch({ signal } = {}) {
      const headers = {
        Accept: 'application/json, text/plain, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': process.env.LIVE_STREAM_USER_AGENT || 'alars-live-log-ingestion',
      };

      if (lastEtag) {
        headers['If-None-Match'] = lastEtag;
      }

      if (lastModified) {
        headers['If-Modified-Since'] = lastModified;
      }

      const response = await fetch(sourceUrl, { headers, signal });

      if (response.status === 304) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`Public URL request failed with HTTP ${response.status}`);
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_TEXT_BYTES) {
        throw new Error('Public URL response is too large for live ingestion.');
      }

      const text = await response.text();
      if (text.length > MAX_TEXT_BYTES) {
        throw new Error('Public URL response is too large for live ingestion.');
      }

      lastEtag = response.headers.get('etag') || lastEtag;
      lastModified = response.headers.get('last-modified') || lastModified;

      return normalizeExternalData(
        text,
        response.headers.get('content-type') || '',
        { sourceUrl, sourceName }
      );
    },
  };
}

module.exports = {
  createPublicUrlSource,
  ensurePublicHttpUrl,
};
