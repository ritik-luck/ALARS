const DEFAULT_EVENTS_URL = 'https://api.github.com/events';
const DEFAULT_USER_AGENT = 'alars-live-log-ingestion';

const { normalizeGitHubEvent } = require('./dataNormalizer');

function mapGitHubEventToLogEntry(event, sourceUrl = DEFAULT_EVENTS_URL) {
  return normalizeGitHubEvent(event, { sourceUrl });
}

function createGitHubEventsSource() {
  const url = process.env.GITHUB_EVENTS_URL || DEFAULT_EVENTS_URL;
  const userAgent = process.env.GITHUB_EVENTS_USER_AGENT || DEFAULT_USER_AGENT;
  let lastEtag = null;

  return {
    name: 'github-public-events',
    url,
    async fetch({ signal } = {}) {
      const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': userAgent,
      };

      if (lastEtag) {
        headers['If-None-Match'] = lastEtag;
      }

      const response = await fetch(url, {
        headers,
        signal,
      });

      if (response.status === 304) {
        return [];
      }

      if (!response.ok) {
        throw new Error(`GitHub Events request failed with HTTP ${response.status}`);
      }

      lastEtag = response.headers.get('etag') || lastEtag;

      const events = await response.json();
      if (!Array.isArray(events)) {
        throw new Error('GitHub Events response was not an array');
      }

      return events
        .filter((event) => event?.id)
        .map((event) => mapGitHubEventToLogEntry(event, url))
        .reverse();
    },
  };
}

module.exports = {
  createGitHubEventsSource,
  mapGitHubEventToLogEntry,
};
