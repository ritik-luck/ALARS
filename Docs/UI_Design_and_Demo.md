# UI Design and Interaction Demo

## Part I: Chosen UI and Justification

For ALARS, the most appropriate choice is a **menu-based interface with direct manipulation elements**.

Why this fits the project:

1. The system has three recurring user tasks: submit a log, inspect incidents, and review log history. A menu or tab-based structure makes those tasks explicit and easy to reach.
2. ALARS is an operational tool, not a developer-only command line utility. A menu-based dashboard reduces training effort and avoids command syntax errors.
3. Direct manipulation controls, such as clickable sample scenarios, severity filters, and quick source buttons, let the user test the system quickly and see immediate feedback.
4. The backend response is event-driven. A dashboard can show the full interaction loop in one place: input, incident decision, alert generation, and updated monitoring tables.

Because of these reasons, the implemented UI combines:

- `Submit log` as the main action screen
- `Incident queue` for monitoring detected incidents
- `Log history` for reviewing all stored events

## Part II: Implemented UI Components

The UI was implemented in the React frontend with these main components:

- [App.js](C:/Users/sanus/OneDrive/Desktop/S-LAB/alars-system/frontend/src/App.js) for the overall dashboard shell and UI rationale banner
- [Dashboard.js](C:/Users/sanus/OneDrive/Desktop/S-LAB/alars-system/frontend/src/components/Dashboard.js) for navigation, statistics, filtering, refresh state, and monitoring panels
- [LogUpload.js](C:/Users/sanus/OneDrive/Desktop/S-LAB/alars-system/frontend/src/components/LogUpload.js) for log submission, sample scenarios, and immediate processing results
- [IncidentTable.js](C:/Users/sanus/OneDrive/Desktop/S-LAB/alars-system/frontend/src/components/IncidentTable.js) for the incident review table with severity filters and search
- [index.css](C:/Users/sanus/OneDrive/Desktop/S-LAB/alars-system/frontend/src/index.css) for the responsive layout and visual styling

## User Interaction Flow

### 1. Submit a log

The user opens the `Submit log` menu, then:

- clicks a sample scenario such as `Critical outage`
- or types a custom message and source
- clicks `Submit log`

The UI immediately shows:

- stored log ID
- whether an incident was created
- the detected risk level
- whether an alert was generated

### 2. Review the incident queue

The user opens `Incident queue`, then:

- filters incidents by `ALL`, `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`
- searches by source, log message, or record ID
- reads the risk badge, status, and timestamp for each incident

### 3. Review the full log history

The user opens `Log history`, then:

- searches for logs by source or message text
- reviews all captured logs in time order
- confirms that informational logs are stored even when they do not create incidents

## Example Demo Scenario

Input:

```text
CRITICAL: Memory usage exceeded 95% - system unstable
Source: compute-cluster
```

Expected interaction:

1. The log is stored in the database.
2. The backend classifies the message as `CRITICAL`.
3. An incident record is created.
4. An alert record is generated.
5. The dashboard updates the statistics, incident queue, and history tables.

## How to Run the UI

From the project folders:

```bash
cd frontend
npm start
```

With the backend running, open:

```text
http://localhost:3000
```

## Verification

The frontend build should pass with:

```bash
cd frontend
npm run build
```
