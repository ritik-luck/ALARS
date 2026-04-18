# ALARS - Automated Log Analysis & Incident Response System

ALARS is a university demonstration project for log ingestion, ML-based risk
classification, incident creation, and alerting.

## Architecture

```text
React Frontend -> Node.js API -> MySQL
                      |
                      -> Flask ML Service -> Binary Anomaly Model -> Risk Levels
                      |
                      -> Live Ingestion Service -> Public APIs / URLs
                                                -> SSE Dashboard Stream
```

The live app now uses the Flask ML service on port `5001` for prediction. If
that service is unavailable, the backend falls back to the legacy keyword
detector so the demo still runs.

Live ingestion can poll Reddit, GitHub public events, StackOverflow, USGS
earthquake feeds, Wikipedia/Wikidata recent changes, or a custom public
JSON/text/RSS/XML URL. A universal data normalization layer auto-detects the
payload shape and converts API responses into clean log-like text before ML
classification, so raw JSON payloads such as Reddit `Listing` objects are never
sent to the model. The service then deduplicates external event IDs in memory,
stores the resulting log rows, and pushes classified results to the dashboard
over Server-Sent Events.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 |
| Backend | Node.js + Express |
| ML Service | Flask + scikit-learn + XGBoost |
| Database | MySQL |

## Prerequisites

- Node.js 18+
- MySQL 8+
- Python environment for `ml_service`

## Step 1 - Set Up MySQL

Run the schema:

```bash
mysql -u root -p < database/schema.sql
```

This creates `alars_db` with `users`, `logs`, `incidents`, and `alerts`.

## Step 2 - Configure the Backend

```bash
cd backend
copy .env.example .env
```

Set your values in `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourMySQLPasswordHere
DB_NAME=alars_db
ML_SERVICE_URL=http://localhost:5001
ML_SERVICE_TIMEOUT_MS=12000
LIVE_STREAM_AUTOSTART=false
LIVE_STREAM_SOURCE_TYPE=github
LIVE_STREAM_SOURCE_URL=
LIVE_STREAM_POLL_INTERVAL_MS=60000
LIVE_STREAM_PROCESS_INTERVAL_MS=1500
LIVE_STREAM_MAX_PER_POLL=10
GITHUB_EVENTS_URL=https://api.github.com/events
```

## Step 3 - Run the Backend

```bash
cd backend
npm install
npm start
```

Expected:

```text
ALARS Backend running on http://localhost:5000
```

## Step 4 - Run the ML Service

From the project root:

```powershell
.\ml_service\.winvenv\Scripts\python.exe ml_service\server.py
```

Expected:

```text
ALARS ML service starting on port 5001...
ML service ready. Model: xgboost
```

Quick check:

```bash
curl http://localhost:5001/health
curl http://localhost:5001/model-info
```

## Step 5 - Run the Frontend

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000`.

## What the UI Can Do

- Submit a single log line through the ML-backed backend
- Upload a `.log`, `.txt`, or `.csv` file and process each non-empty line
- Show anomaly probability, binary prediction, risk score, and top features
- Start/stop live external ingestion and watch classified events stream in
  without refreshing the page
- Choose a built-in public source or paste a custom public URL for extraction
- Normalize Reddit, StackOverflow, GitHub, USGS earthquake GeoJSON, MediaWiki,
  generic JSON arrays/objects, RSS/XML, and plain text into readable log lines
  before ML classification
- Apply source-aware severity rules so social and Q&A text stays INFO unless it
  contains strong security terms, while earthquake feeds use magnitude/alert
  thresholds
- Persist logs and incidents in MySQL
- Show incident history and log history in the dashboard

## API Endpoints

### Submit one log

```http
POST /api/logs
Content-Type: application/json

{
  "message": "PacketResponder 1 for block blk_-1608999687919862906 terminating",
  "source": "hdfs-packet-responder"
}
```

### Submit many log lines

```http
POST /api/logs/batch
Content-Type: application/json

{
  "source": "demo-file.log",
  "entries": [
    {
      "message": "Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010"
    },
    {
      "message": "PacketResponder 1 for block blk_-1608999687919862906 terminating"
    }
  ]
}
```

### ML status

```http
GET /api/logs/ml-status
```

### Stored records

```http
GET /api/logs
GET /api/incidents
```

### Live external ingestion

```http
GET  /api/live/status
GET  /api/live/events
POST /api/live/start
POST /api/live/stop
```

`/api/live/events` is an SSE endpoint. It emits `live:status`, `live:log`,
`live:error`, and `live:heartbeat` events.

Start from a custom public URL:

```http
POST /api/live/start
Content-Type: application/json

{
  "sourceType": "public-url",
  "sourceName": "wikipedia-recent-changes",
  "sourceUrl": "https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json"
}
```

Public URLs to try:

- Wikipedia recent changes: `https://en.wikipedia.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json`
- Wikidata recent changes: `https://www.wikidata.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json`
- MediaWiki recent changes: `https://www.mediawiki.org/w/api.php?action=query&list=recentchanges&rcprop=title%7Ctimestamp%7Cuser%7Ccomment%7Cflags%7Cids%7Csizes%7Cloginfo&rclimit=30&format=json`
- Reddit r/sysadmin new posts: `https://www.reddit.com/r/sysadmin/new.json?limit=30&raw_json=1`
- StackOverflow newest questions: `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=stackoverflow&pagesize=30`
- USGS earthquakes, past hour: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson`
- Reddit status incidents: `https://www.redditstatus.com/api/v2/incidents.json`
- GitHub public events: `https://api.github.com/events`

## ML Notes

- HDFS labels are block-level.
- The model predicts `Normal` vs `Anomaly`.
- The app maps anomaly probability to `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.
- Incidents are created when the binary prediction is `Anomaly`.
- `CRITICAL` incidents generate alerts.

## Demo Flow

1. Start MySQL, backend, ML service, and frontend.
2. Open `http://localhost:3000`.
3. On the submit tab, choose an HDFS sample and submit it.
4. Show the returned anomaly probability, risk score, and top features.
5. Open the live tab, select a public source, and click Extract live.
6. Watch public events arrive one-by-one as classified logs.
7. Upload a small `.log` file and show the file summary table.
8. Open the incidents tab and log history tab to show persisted results.

## Troubleshooting

- If the frontend says backend offline, check port `5000`.
- If the dashboard says `ML offline, fallback mode`, start `ml_service/server.py`.
- If MySQL fails, confirm `.env` values and run `database/schema.sql`.
- The file upload endpoint accepts up to `200` non-empty lines per request for demo stability.
