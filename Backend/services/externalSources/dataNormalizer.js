const crypto = require('crypto');

const MAX_MESSAGE_LENGTH = 520;
const DEFAULT_LIMIT = 30;

const SOCIAL_WARNING_KEYWORDS = [
  'attack',
  'breach',
  'compromise',
  'compromised',
  'credential leak',
  'data leak',
  'exploit',
  'exploited',
  'intrusion',
  'leaked',
  'malware',
  'phishing',
  'ransomware',
  'security incident',
];

const EVENT_WARNING_KEYWORDS = [
  ...SOCIAL_WARNING_KEYWORDS,
  'blocked',
  'delete',
  'deleted',
  'error',
  'fail',
  'failed',
  'failing',
  'reverted',
  'warning',
];

const METADATA_KEYS = new Set([
  'id',
  'ids',
  'url',
  'uri',
  'link',
  'links',
  'permalink',
  'thumbnail',
  'avatar',
  'avatar_url',
  'icon_url',
  'html_url',
  'api_url',
  'detail',
  'metadata',
  'geometry',
  'coordinates',
  'bbox',
  'etag',
  'kind',
  'modhash',
]);

function hashValue(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 16);
}

function cleanText(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }

  const cleaned = String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\[object Object\]/gi, '')
    .replace(/[{}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallback;
}

function clip(value, maxLength = MAX_MESSAGE_LENGTH) {
  const cleaned = cleanText(value);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 3)}...` : cleaned;
}

function normalizeUrl(rawUrl) {
  try {
    return new URL(rawUrl).toString();
  } catch {
    return String(rawUrl || 'unknown-source');
  }
}

function getHostname(sourceUrl = '') {
  try {
    return new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function containsAny(text, keywords) {
  const normalized = cleanText(text).toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function socialLevel(...values) {
  return containsAny(values.join(' '), SOCIAL_WARNING_KEYWORDS) ? 'WARNING' : 'INFO';
}

function githubLevel(event, summary) {
  const eventType = cleanText(event?.type).toLowerCase();
  const action = cleanText(event?.payload?.action).toLowerCase();

  if (
    eventType.includes('delete') ||
    eventType.includes('security') ||
    action === 'reopened' ||
    containsAny(summary, EVENT_WARNING_KEYWORDS)
  ) {
    return 'WARNING';
  }

  return 'INFO';
}

function earthquakeLevel(properties = {}) {
  const mag = Number(properties.mag);
  const alert = cleanText(properties.alert).toLowerCase();
  const sig = Number(properties.sig);

  if (alert === 'red' || mag >= 7 || sig >= 800) {
    return 'CRITICAL';
  }

  if (alert === 'orange' || mag >= 6 || sig >= 600) {
    return 'ERROR';
  }

  if (alert === 'yellow' || mag >= 4.5 || sig >= 300 || properties.tsunami === 1) {
    return 'WARNING';
  }

  return 'INFO';
}

function unknownLevel() {
  return 'INFO';
}

function pickFirstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && cleanText(value)) {
      return value;
    }
  }

  return '';
}

function getSourceName(context = {}) {
  if (context.sourceName) {
    return cleanText(context.sourceName, 'external-source');
  }

  const hostname = getHostname(context.sourceUrl);
  return hostname || 'external-source';
}

function externalId(prefix, sourceUrl, value) {
  return `${prefix}:${hashValue(`${sourceUrl || 'unknown'}:${value}`)}`;
}

function getItemId(item, index) {
  return cleanText(pickFirstValue(item, [
    'id',
    'name',
    'rcid',
    'question_id',
    'answer_id',
    'event_id',
    'eventId',
    'guid',
    'url',
    'link',
    'permalink',
    'timestamp',
    'created_at',
    'updated_at',
    'pubDate',
  ]), `item-${index + 1}`);
}

function isPlainRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function findCandidateItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  const candidates = [
    data?.features,
    data?.query?.recentchanges,
    data?.data?.children,
    data?.items,
    data?.events,
    data?.results,
    data?.entries,
    data?.logs,
    data?.incidents,
    data?.scheduled_maintenances,
    data?.data,
    data?.feed?.entry,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return isPlainRecord(data) ? [data] : [];
}

function bestTextField(item) {
  return cleanText(pickFirstValue(item, [
    'title',
    'name',
    'message',
    'text',
    'description',
    'summary',
    'body',
    'selftext',
    'comment',
    'status',
    'impact',
  ]));
}

function collectReadableFields(item, output = [], prefix = '') {
  if (!isPlainRecord(item) || output.length >= 6) {
    return output;
  }

  for (const [key, value] of Object.entries(item)) {
    if (output.length >= 6 || METADATA_KEYS.has(key)) {
      continue;
    }

    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      continue;
    }

    if (['string', 'number', 'boolean'].includes(typeof value)) {
      const cleaned = clip(value, 90);
      if (cleaned) {
        output.push(`${fieldName}=${cleaned}`);
      }
      continue;
    }

    if (Array.isArray(value)) {
      continue;
    }

    if (isPlainRecord(value) && prefix.length < 16) {
      collectReadableFields(value, output, fieldName);
    }
  }

  return output;
}

function finalMessage(level, body) {
  return clip(`${level} ${cleanText(body, 'External event: no readable content')}`);
}

function normalizeRedditPost(post, index = 0, context = {}) {
  const data = post?.data || post || {};
  const subreddit = cleanText(data.subreddit || data.subreddit_name_prefixed, 'unknown').replace(/^r\//i, '');
  const author = cleanText(data.author || data.author_fullname, 'unknown-author');
  const title = clip(data.title || data.link_title || data.body || data.selftext || 'untitled Reddit item', 240);
  const score = Number.isFinite(Number(data.score)) ? Number(data.score) : 0;
  const comments = Number.isFinite(Number(data.num_comments)) ? Number(data.num_comments) : 0;
  const itemId = data.name || data.id || getItemId(data, index);
  const level = socialLevel(title, data.selftext, data.body);

  return {
    externalId: `reddit:${itemId}`,
    source: `reddit:r/${subreddit}`,
    message: finalMessage(level, `Reddit r/${subreddit}: ${title} by ${author} score=${score} comments=${comments}`),
    metadata: {
      provider: 'reddit',
      parser: 'reddit',
      sourceUrl: context.sourceUrl || null,
      itemId,
      subreddit,
      author,
    },
  };
}

function normalizeReddit(data, context = {}) {
  const items = data?.kind === 'Listing' && Array.isArray(data?.data?.children)
    ? data.data.children
    : findCandidateItems(data);

  return items
    .filter((item) => item?.data || item?.title || item?.subreddit)
    .slice(0, DEFAULT_LIMIT)
    .map((item, index) => normalizeRedditPost(item, index, context));
}

function githubSummary(event) {
  const payload = event?.payload || {};

  if (event.type === 'PushEvent') {
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const latestCommit = commits.map((commit) => commit.message).find(Boolean);
    return `pushed ${payload.size || commits.length || 0} commit(s) to ${cleanText(payload.ref, 'unknown-ref')}${latestCommit ? `; latest commit "${clip(latestCommit, 150)}"` : ''}`;
  }

  if (event.type === 'PullRequestEvent') {
    return `${cleanText(payload.action, 'updated')} pull request "${clip(payload.pull_request?.title || 'untitled', 180)}"`;
  }

  if (event.type === 'IssuesEvent') {
    return `${cleanText(payload.action, 'updated')} issue "${clip(payload.issue?.title || 'untitled', 180)}"`;
  }

  if (event.type === 'ReleaseEvent') {
    return `${cleanText(payload.action, 'updated')} release "${clip(payload.release?.name || payload.release?.tag_name || 'untitled', 180)}"`;
  }

  if (event.type === 'CreateEvent' || event.type === 'DeleteEvent') {
    return `${cleanText(payload.ref_type, 'ref')} ${cleanText(payload.ref, 'unknown-ref')}`;
  }

  return cleanText(payload.action || event.type, 'activity update');
}

function normalizeGitHubEvent(event, context = {}) {
  const repo = cleanText(event?.repo?.name, 'unknown-repo');
  const actor = cleanText(event?.actor?.login || event?.actor?.display_login, 'unknown-user');
  const eventType = cleanText(event?.type, 'GitHubEvent');
  const summary = githubSummary(event);
  const level = githubLevel(event, summary);
  const itemId = event?.id || hashValue(`${eventType}:${actor}:${repo}:${summary}`);

  return {
    externalId: `github:${itemId}`,
    source: `github:${repo}`,
    message: finalMessage(level, `GitHub event: ${eventType} by ${actor} on ${repo}: ${summary}`),
    metadata: {
      provider: 'github',
      parser: 'github',
      sourceUrl: context.sourceUrl || null,
      itemId,
      eventType,
      repo,
      actor,
    },
  };
}

function normalizeGitHub(data, context = {}) {
  return findCandidateItems(data)
    .filter((item) => item?.type && item?.actor && item?.repo)
    .slice(0, DEFAULT_LIMIT)
    .map((item) => normalizeGitHubEvent(item, context));
}

function normalizeStackOverflowItem(item, index = 0, context = {}) {
  const owner = item.owner || {};
  const site = getSourceName(context).includes('stack') ? 'StackOverflow' : 'StackExchange';
  const title = clip(item.title || item.name || item.body || 'untitled question', 260);
  const author = cleanText(owner.display_name || item.author || item.user, 'unknown-user');
  const score = Number.isFinite(Number(item.score)) ? Number(item.score) : 0;
  const tags = Array.isArray(item.tags) && item.tags.length > 0 ? ` tags=${item.tags.slice(0, 5).join(',')}` : '';
  const itemId = getItemId(item, index);
  const level = socialLevel(title, tags);

  return {
    externalId: externalId('stackoverflow', context.sourceUrl, itemId),
    source: `stackoverflow:${getSourceName(context)}`,
    message: finalMessage(level, `${site}: ${title} by ${author} score=${score}${tags}`),
    metadata: {
      provider: 'stackoverflow',
      parser: 'stackoverflow',
      sourceUrl: context.sourceUrl || null,
      itemId,
    },
  };
}

function normalizeStackOverflow(data, context = {}) {
  return findCandidateItems(data)
    .filter((item) => item?.question_id || item?.answer_id || item?.title)
    .slice(0, DEFAULT_LIMIT)
    .map((item, index) => normalizeStackOverflowItem(item, index, context));
}

function normalizeEarthquakeFeature(feature, index = 0, context = {}) {
  const properties = feature.properties || feature;
  const coordinates = feature.geometry?.coordinates || [];
  const mag = Number(properties.mag);
  const place = cleanText(properties.place || properties.title, 'unknown location');
  const depth = Number.isFinite(Number(coordinates[2])) ? ` depth=${Number(coordinates[2]).toFixed(1)}km` : '';
  const time = properties.time
    ? new Date(Number(properties.time)).toISOString()
    : cleanText(properties.time || properties.updated || properties.created_at, 'unknown-time');
  const alert = cleanText(properties.alert);
  const level = earthquakeLevel(properties);
  const itemId = feature.id || getItemId(properties, index);
  const magText = Number.isFinite(mag) ? mag.toFixed(1) : 'unknown';
  const alertText = alert ? ` alert=${alert}` : '';

  return {
    externalId: externalId('earthquake', context.sourceUrl, itemId),
    source: 'earthquake:usgs',
    message: finalMessage(level, `Earthquake: magnitude ${magText} at ${place}${depth}${alertText} time=${time}`),
    metadata: {
      provider: 'earthquake',
      parser: 'earthquake',
      sourceUrl: context.sourceUrl || null,
      itemId,
      magnitude: Number.isFinite(mag) ? mag : null,
      place,
    },
  };
}

function normalizeEarthquake(data, context = {}) {
  const items = Array.isArray(data?.features) ? data.features : findCandidateItems(data);

  return items
    .filter((item) => item?.properties?.mag !== undefined || item?.mag !== undefined)
    .slice(0, DEFAULT_LIMIT)
    .map((item, index) => normalizeEarthquakeFeature(item, index, context));
}

function normalizeMediaWikiChange(item, index = 0, context = {}) {
  const title = cleanText(item.title, 'unknown-page');
  const user = cleanText(item.user, 'unknown-user');
  const type = cleanText(item.type || item.logtype, 'edit');
  const comment = clip(item.comment || item.parsedcomment || item.logaction || 'no comment', 220);
  const timestamp = cleanText(item.timestamp || item.created_at || item.updated_at, 'unknown-time');
  const itemId = getItemId(item, index);
  const level = socialLevel(comment, title);

  return {
    externalId: externalId('mediawiki', context.sourceUrl, itemId),
    source: `mediawiki:${getSourceName(context)}`,
    message: finalMessage(level, `MediaWiki recent change: ${type} "${title}" by ${user}: ${comment} timestamp=${timestamp}`),
    metadata: {
      provider: 'mediawiki',
      parser: 'mediawiki',
      sourceUrl: context.sourceUrl || null,
      itemId,
      title,
    },
  };
}

function normalizeMediaWiki(data, context = {}) {
  return findCandidateItems(data)
    .filter((item) => item?.rcid || (item?.title && item?.user && item?.timestamp))
    .slice(0, DEFAULT_LIMIT)
    .map((item, index) => normalizeMediaWikiChange(item, index, context));
}

function normalizeGenericItem(item, index = 0, context = {}) {
  const sourceName = getSourceName(context);
  const itemId = getItemId(item, index);
  const text = bestTextField(item);
  const fields = collectReadableFields(item);
  const fallback = fields.length > 0 ? fields.join('; ') : 'no readable fields';
  const body = text
    ? `${text}${fields.length > 0 ? ` fields=${fields.join('; ')}` : ''}`
    : fallback;

  return {
    externalId: externalId('external', context.sourceUrl, itemId),
    source: `external:${sourceName}`,
    message: finalMessage(unknownLevel(), `External event: ${body}`),
    metadata: {
      provider: 'external',
      parser: 'generic-json',
      sourceUrl: context.sourceUrl || null,
      itemId,
    },
  };
}

function inferJsonSource(data, context = {}) {
  const hostname = getHostname(context.sourceUrl);

  if (hostname.includes('reddit') || data?.kind === 'Listing') return 'reddit';
  if (hostname.includes('api.github.com') || findCandidateItems(data).some((item) => item?.type && item?.actor && item?.repo)) return 'github';
  if (hostname.includes('stackexchange') || hostname.includes('stackoverflow') || findCandidateItems(data).some((item) => item?.question_id || item?.answer_id)) return 'stackoverflow';
  if (hostname.includes('earthquake.usgs.gov') || (data?.type === 'FeatureCollection' && Array.isArray(data?.features)) || findCandidateItems(data).some((item) => item?.properties?.mag !== undefined || item?.mag !== undefined)) return 'earthquake';
  if (data?.query?.recentchanges || hostname.includes('wikipedia') || hostname.includes('wikidata') || hostname.includes('mediawiki')) return 'mediawiki';

  return 'generic';
}

function normalizeJsonData(data, context = {}) {
  const sourceType = inferJsonSource(data, context);

  if (sourceType === 'reddit') return normalizeReddit(data, context);
  if (sourceType === 'github') return normalizeGitHub(data, context);
  if (sourceType === 'stackoverflow') return normalizeStackOverflow(data, context);
  if (sourceType === 'earthquake') return normalizeEarthquake(data, context);
  if (sourceType === 'mediawiki') return normalizeMediaWiki(data, context);

  return findCandidateItems(data)
    .slice(0, DEFAULT_LIMIT)
    .map((item, index) => normalizeGenericItem(item, index, context));
}

function stripXml(value) {
  return cleanText(String(value || '').replace(/<[^>]+>/g, ' '));
}

function extractTagValue(block, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  return stripXml(block.match(pattern)?.[1] || '');
}

function normalizeXmlData(text, context = {}) {
  const sourceName = getSourceName(context);
  const blocks = String(text || '').match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];

  return blocks.slice(0, DEFAULT_LIMIT).map((block, index) => {
    const title = extractTagValue(block, 'title') || `entry-${index + 1}`;
    const description =
      extractTagValue(block, 'description') ||
      extractTagValue(block, 'summary') ||
      extractTagValue(block, 'content') ||
      title;
    const timestamp =
      extractTagValue(block, 'pubDate') ||
      extractTagValue(block, 'updated') ||
      extractTagValue(block, 'published') ||
      'unknown-time';
    const guid = extractTagValue(block, 'guid') || extractTagValue(block, 'id') || title;
    const level = socialLevel(title, description);

    return {
      externalId: externalId('feed', context.sourceUrl, guid),
      source: `feed:${sourceName}`,
      message: finalMessage(level, `Feed item: ${clip(title, 220)} - ${clip(description, 240)} timestamp=${cleanText(timestamp)}`),
      metadata: {
        provider: 'feed',
        parser: 'rss-xml',
        sourceUrl: context.sourceUrl || null,
        itemId: guid,
      },
    };
  });
}

function normalizeTextData(text, context = {}) {
  const sourceName = getSourceName(context);

  return String(text || '')
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .slice(0, DEFAULT_LIMIT)
    .map((line, index) => ({
      externalId: externalId('text', context.sourceUrl, `${index}:${line}`),
      source: `text:${sourceName}`,
      message: finalMessage(unknownLevel(), `External event: ${line}`),
      metadata: {
        provider: 'text',
        parser: 'plain-text',
        sourceUrl: context.sourceUrl || null,
        itemId: `line-${index + 1}`,
      },
    }));
}

function parseJsonText(text) {
  const trimmed = String(text || '').trim();
  const jsonpMatch = trimmed.match(/^[\w$.]+\(([\s\S]*)\);?$/);
  return JSON.parse(jsonpMatch ? jsonpMatch[1] : trimmed);
}

function detectInputType(text, contentType = '') {
  const trimmed = String(text || '').trim();
  const normalizedContentType = String(contentType || '').toLowerCase();

  if (normalizedContentType.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[') || /^[\w$.]+\(.*\);?$/s.test(trimmed)) {
    return 'json';
  }

  if (normalizedContentType.includes('xml') || /<rss|<feed|<item|<entry/i.test(trimmed.slice(0, 500))) {
    return 'xml';
  }

  return 'text';
}

function normalizeExternalData(text, contentType = '', context = {}) {
  const sourceUrl = normalizeUrl(context.sourceUrl);
  const normalizedContext = {
    ...context,
    sourceUrl,
    sourceName: context.sourceName || getSourceName({ sourceUrl }),
  };
  const inputType = detectInputType(text, contentType);

  if (inputType === 'json') {
    return normalizeJsonData(parseJsonText(text), normalizedContext);
  }

  if (inputType === 'xml') {
    return normalizeXmlData(text, normalizedContext);
  }

  return normalizeTextData(text, normalizedContext);
}

module.exports = {
  cleanText,
  clip,
  detectInputType,
  earthquakeLevel,
  finalMessage,
  githubLevel,
  inferJsonSource,
  normalizeEarthquake,
  normalizeExternalData,
  normalizeGenericItem,
  normalizeGitHub,
  normalizeGitHubEvent,
  normalizeJsonData,
  normalizeMediaWiki,
  normalizeReddit,
  normalizeStackOverflow,
  normalizeTextData,
  normalizeXmlData,
  socialLevel,
  unknownLevel,
};
