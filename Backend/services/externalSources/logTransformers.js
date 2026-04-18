const normalizer = require('./dataNormalizer');

function parseExternalApiResponse(text, contentType, context) {
  return normalizer.normalizeExternalData(text, contentType, context);
}

function parseGenericJSON(data, context) {
  return normalizer.normalizeJsonData(data, context);
}

function parseGitHub(event, context) {
  return normalizer.normalizeGitHubEvent(event, context);
}

function parseMediaWikiRecentChange(item, index = 0, context = {}) {
  return normalizer.normalizeMediaWiki(
    { query: { recentchanges: [item] } },
    context
  )[0];
}

function parsePlainTextLogs(text, context) {
  return normalizer.normalizeTextData(text, context);
}

function parseReddit(data, context) {
  return normalizer.normalizeReddit(data, context);
}

function parseXmlFeed(text, context) {
  return normalizer.normalizeXmlData(text, context);
}

module.exports = {
  ...normalizer,
  detectLogLevel: normalizer.socialLevel,
  parseExternalApiResponse,
  parseGenericJSON,
  parseGitHub,
  parseMediaWikiRecentChange,
  parsePlainTextLogs,
  parseReddit,
  parseXmlFeed,
};
