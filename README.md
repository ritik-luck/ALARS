# ALARS — Automated Log Analysis & Incident Response System

A university lab demonstration project showing how logs are ingested, parsed,
analyzed, and turned into incidents and alerts in real time.

```
User → React Frontend → Node.js API → MySQL Database
                                     ↓
                              Log Parser & Analyzer
                                     ↓
                           Incident Detector → Risk Classifier
                                     ↓
                              Alert Generator → Incident Reports
```

---

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | React.js 18         |
| Backend  | Node.js + Express   |
| Database | MySQL               |

---

## Project Structure

```
alars-system/
├── backend/
│   ├── server.js                  ← Express entry point
│   ├── .env.example               ← Environment variable template
│   ├── config/
│   │   └── db.js                  ← MySQL connection pool
│   ├── routes/
│   │   ├── logRoutes.js
│   │   └── incidentRoutes.js
│   ├── controllers/
│   │   ├── logController.js       ← Orchestrates the full log pipeline
│   │   └── incidentController.js
│   ├── services/
│   │   ├── logParser.js           ← Cleans raw log text
│   │   ├── logAnalyzer.js         ← Keyword detection
│   │   ├── incidentDetector.js    ← Decides whether to raise an incident
│   │   ├── riskClassifier.js      ← Assigns CRITICAL / HIGH / MEDIUM / LOW
│   │   └── alertGenerator.js      ← Creates DB alert for CRITICAL incidents
│   └── models/
│       ├── logModel.js
│       └── incidentModel.js
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       ├── App.js
│       ├── api.js                 ← axios wrappers for all API calls
│       └── components/
│           ├── LogUpload.js       ← Log submission form
│           ├── IncidentTable.js   ← Incident listing
│           └── Dashboard.js       ← Stats + tabs layout
│
└── database/
    └── schema.sql                 ← Full DB schema + seed data
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MySQL](https://dev.mysql.com/downloads/) 8.0 or later (MySQL Community Edition is free)
- A terminal / command prompt

---

## Step 1 — Set Up the MySQL Database

1. Open **MySQL Workbench** or the MySQL CLI.
2. Run the schema script:

```sql
-- In MySQL Workbench: File → Open SQL Script → select database/schema.sql, then click ⚡
-- Or via CLI:
mysql -u root -p < database/schema.sql
```

This creates the `alars_db` database with tables:
`users`, `logs`, `incidents`, `alerts`

---

## Step 2 — Configure the Backend

```bash
cd alars-system/backend
```

Copy the example environment file and edit it:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and set your MySQL password:

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YourMySQLPasswordHere
DB_NAME=alars_db
```

> If your MySQL root account has no password, leave `DB_PASSWORD=` blank.

---

## Step 3 — Install & Run the Backend

```bash
cd alars-system/backend

npm install

# Development mode (auto-restart on file changes)
npm run dev

# OR production mode
npm start
```

Expected output:
```
ALARS Backend running on http://localhost:5000
```

Test it quickly:
```bash
curl http://localhost:5000/
# → {"message":"ALARS API is running","version":"1.0.0"}
```

---

## Step 4 — Install & Run the React Frontend

Open a **second** terminal:

```bash
cd alars-system/frontend

npm install

npm start
```

The browser opens automatically at **http://localhost:3000**.

> The backend must be running on port 5000 before submitting logs.

---

## API Reference

### POST /api/logs — Submit a log

```http
POST http://localhost:5000/api/logs
Content-Type: application/json

{
  "message": "CRITICAL: Disk failure on /dev/sda",
  "source":  "storage-monitor"
}
```

Response:
```json
{
  "success": true,
  "log":      { "id": 1, "message": "...", "source": "storage-monitor" },
  "incident": { "id": 1, "riskLevel": "CRITICAL" },
  "alert":    { "alertId": 1, "alertMessage": "CRITICAL ALERT: ..." }
}
```

---

### GET /api/logs — List all logs

```http
GET http://localhost:5000/api/logs
```

---

### GET /api/incidents — List all incidents

```http
GET http://localhost:5000/api/incidents
```

---

## Risk Classification Rules

| Keyword in message | Risk Level |
|--------------------|------------|
| `CRITICAL`         | CRITICAL   |
| `ERROR`            | HIGH       |
| `FAIL`             | MEDIUM     |
| `WARNING`          | LOW        |
| (none matched)     | INFO (no incident created) |

Only **CRITICAL**, **ERROR**, and **FAIL** create incident records.
Only **CRITICAL** incidents additionally generate an alert record.

---

## Demo Walkthrough

1. Open **http://localhost:3000** in your browser.
2. On the **Submit Log** tab, paste one of these messages and click **Submit Log**:
   - `CRITICAL: Memory usage exceeded 95% — system unstable`
   - `ERROR: Database connection timed out after 30s`
   - `FAIL: Authentication service is unavailable`
   - `INFO: Scheduled backup completed successfully`
3. Observe the response — risk level, incident ID, and alert (for CRITICAL).
4. Switch to the **Incidents** tab to see the live incident table.
5. Switch to the **All Logs** tab to see every submitted log.
6. The **Stat cards** at the top update automatically after each submission.

---

## Architecture Notes (UML flows)

```
[LogUpload Form]
      │  POST /api/logs { message, source }
      ▼
[logController.ingestLog]
      │
      ├─► logParser.parseLog()         — trim & normalize text
      ├─► logModel.createLog()         — INSERT into logs table
      ├─► incidentDetector.detectIncident()
      │       ├─ logAnalyzer.analyzeLog()   — keyword scan
      │       └─ riskClassifier.classifyRisk() — severity assignment
      ├─► incidentModel.createIncident()   — INSERT into incidents table
      └─► alertGenerator.generateAlert()   — INSERT into alerts (CRITICAL only)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ER_ACCESS_DENIED_ERROR` | Check `DB_USER` / `DB_PASSWORD` in `.env` |
| `ER_BAD_DB_ERROR: Unknown database 'alars_db'` | Run `database/schema.sql` first |
| Frontend shows "Could not reach the backend" | Make sure the backend is running on port 5000 |
| Port 3000 already in use | React will prompt to use a different port — press **Y** |
| `nodemon: command not found` | Run `npm install` again inside the `backend/` folder |
