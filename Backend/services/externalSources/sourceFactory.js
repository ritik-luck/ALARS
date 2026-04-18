const { createGitHubEventsSource } = require('./githubEventsSource');
const { createPublicUrlSource } = require('./publicUrlSource');

const WIKIPEDIA_RECENT_CHANGES_URL =
  'https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json';
const REDDIT_SYSADMIN_NEW_URL =
  'https://www.reddit.com/r/sysadmin/new.json?limit=30&raw_json=1';
const STACK_OVERFLOW_QUESTIONS_URL =
  'https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=stackoverflow&pagesize=30';
const USGS_EARTHQUAKES_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

function createSourceFromConfig(config = {}) {
  const sourceType = config.sourceType || process.env.LIVE_STREAM_SOURCE_TYPE || 'github';

  if (sourceType === 'github') {
    return createGitHubEventsSource();
  }

  if (sourceType === 'wikipedia') {
    return createPublicUrlSource({
      url: config.sourceUrl || process.env.LIVE_STREAM_SOURCE_URL || WIKIPEDIA_RECENT_CHANGES_URL,
      name: config.sourceName || 'wikipedia-recent-changes',
    });
  }

  if (sourceType === 'reddit') {
    return createPublicUrlSource({
      url: config.sourceUrl || process.env.LIVE_STREAM_SOURCE_URL || REDDIT_SYSADMIN_NEW_URL,
      name: config.sourceName || 'reddit-sysadmin-new',
    });
  }

  if (sourceType === 'stackoverflow') {
    return createPublicUrlSource({
      url: config.sourceUrl || process.env.LIVE_STREAM_SOURCE_URL || STACK_OVERFLOW_QUESTIONS_URL,
      name: config.sourceName || 'stackoverflow-questions',
    });
  }

  if (sourceType === 'earthquake') {
    return createPublicUrlSource({
      url: config.sourceUrl || process.env.LIVE_STREAM_SOURCE_URL || USGS_EARTHQUAKES_URL,
      name: config.sourceName || 'usgs-earthquakes',
    });
  }

  if (sourceType === 'public-url') {
    return createPublicUrlSource({
      url: config.sourceUrl || process.env.LIVE_STREAM_SOURCE_URL,
      name: config.sourceName || 'custom-public-url',
    });
  }

  throw new Error(`Unsupported live stream source type: ${sourceType}`);
}

module.exports = {
  REDDIT_SYSADMIN_NEW_URL,
  STACK_OVERFLOW_QUESTIONS_URL,
  USGS_EARTHQUAKES_URL,
  WIKIPEDIA_RECENT_CHANGES_URL,
  createSourceFromConfig,
};
