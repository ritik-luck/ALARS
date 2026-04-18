const {
  normalizeEarthquake,
  normalizeExternalData,
  normalizeGitHubEvent,
  normalizeJsonData,
  normalizeReddit,
  normalizeStackOverflow,
} = require('../services/externalSources/dataNormalizer');

describe('Universal data normalization layer', () => {
  test('parses Reddit Listing JSON into a social log without raw JSON or CRITICAL spam', () => {
    const listing = {
      kind: 'Listing',
      data: {
        children: [
          {
            kind: 't3',
            data: {
              name: 't3_abc123',
              subreddit: 'sysadmin',
              author: 'alice',
              title: 'Database warning after deploy',
              score: 42,
              num_comments: 7,
            },
          },
        ],
      },
    };

    const [entry] = normalizeReddit(listing, {
      sourceUrl: 'https://www.reddit.com/r/sysadmin/new.json',
    });

    expect(entry.message).toBe(
      'INFO Reddit r/sysadmin: Database warning after deploy by alice score=42 comments=7'
    );
    expect(entry.message).not.toContain('"kind"');
    expect(entry.message).not.toContain('Listing');
    expect(entry.message).not.toContain('CRITICAL');
    expect(entry.source).toBe('reddit:r/sysadmin');
  });

  test('social parser only raises to WARNING for strong security keywords', () => {
    const [entry] = normalizeReddit({
      kind: 'Listing',
      data: {
        children: [
          {
            kind: 't3',
            data: {
              id: 'breach',
              subreddit: 'security',
              author: 'analyst',
              title: 'Credential leak reported by vendor',
            },
          },
        ],
      },
    });

    expect(entry.message.startsWith('WARNING Reddit')).toBe(true);
  });

  test('parses GitHub event JSON into INFO/WARNING log text only', () => {
    const entry = normalizeGitHubEvent({
      id: '1',
      type: 'PushEvent',
      actor: { login: 'octocat' },
      repo: { name: 'octocat/Hello-World' },
      payload: {
        size: 1,
        ref: 'refs/heads/main',
        commits: [{ message: 'Fix failing health check' }],
      },
      created_at: '2026-04-18T12:00:00Z',
    });

    expect(entry.message).toContain('WARNING GitHub event: PushEvent by octocat on octocat/Hello-World');
    expect(entry.message).toContain('Fix failing health check');
    expect(entry.message).not.toContain('"payload"');
    expect(entry.message).not.toContain('CRITICAL');
  });

  test('parses StackOverflow API items as Q&A logs with balanced severity', () => {
    const [entry] = normalizeStackOverflow({
      items: [
        {
          question_id: 123,
          title: 'Why does my Node.js app show error after npm install?',
          score: 5,
          tags: ['node.js', 'npm'],
          owner: { display_name: 'dev-user' },
        },
      ],
    }, {
      sourceUrl: 'https://api.stackexchange.com/2.3/questions?site=stackoverflow',
      sourceName: 'stackoverflow-questions',
    });

    expect(entry.message).toBe(
      'INFO StackOverflow: Why does my Node.js app show error after npm install? by dev-user score=5 tags=node.js,npm'
    );
  });

  test('parses USGS earthquake GeoJSON using magnitude thresholds', () => {
    const [low] = normalizeEarthquake({
      features: [
        {
          id: 'low',
          properties: { mag: 2.4, place: '10 km S of Test City', time: 1776513600000, sig: 80 },
          geometry: { coordinates: [-120, 35, 8.2] },
        },
      ],
    }, {
      sourceUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    });

    const [high] = normalizeEarthquake({
      features: [
        {
          id: 'high',
          properties: { mag: 7.1, place: 'near Example Islands', time: 1776513600000, sig: 900 },
          geometry: { coordinates: [140, -20, 12.6] },
        },
      ],
    });

    expect(low.message).toContain('INFO Earthquake: magnitude 2.4 at 10 km S of Test City');
    expect(high.message).toContain('CRITICAL Earthquake: magnitude 7.1 at near Example Islands');
  });

  test('generic JSON parser falls back to readable fields instead of raw JSON', () => {
    const [entry] = normalizeJsonData(
      {
        id: 'service-1',
        status: 'degraded',
        nested: {
          region: 'us-east',
        },
      },
      {
        sourceUrl: 'https://example.com/status.json',
        sourceName: 'example-status',
      }
    );

    expect(entry.message).toContain('INFO External event: degraded');
    expect(entry.message).toContain('status=degraded');
    expect(entry.message).not.toContain('{');
    expect(entry.message).not.toContain('}');
    expect(entry.message).not.toContain('[object Object]');
  });

  test('content parser routes Reddit JSON before it reaches ML', () => {
    const response = JSON.stringify({
      kind: 'Listing',
      data: {
        children: [
          {
            kind: 't3',
            data: {
              id: 'xyz',
              subreddit: 'devops',
              author: 'bob',
              title: 'Normal release notes',
            },
          },
        ],
      },
    });

    const [entry] = normalizeExternalData(response, 'application/json', {
      sourceUrl: 'https://www.reddit.com/r/devops/new.json',
      sourceName: 'reddit-devops',
    });

    expect(entry.message).toBe('INFO Reddit r/devops: Normal release notes by bob score=0 comments=0');
  });
});
