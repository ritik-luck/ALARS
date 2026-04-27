# Testing Assignment for ALARS


## Q1(a): Test Plan

### 1. Objective of Testing
The objective of testing is to verify that ALARS correctly accepts log data, applies ML-based risk classification to supported log patterns, creates incidents for abnormal events, stores the processed records, and displays the results through the frontend dashboard. Testing also checks role-based access behavior, incident details, and batch processing output.

### 2. Scope of Testing
The following modules/features are included in the test scope:

- Log submission module (`POST /api/logs`)
- Batch log upload module (`POST /api/logs/batch`)
- ML-based risk classification module
- Log parsing and normalization
- Incident creation and incident queue display
- Incident details page
- Authentication and role-based access control
- Database operations for logs, incidents, alerts, and users

### 3. Types of Testing to be Performed

#### Unit Testing
Testing individual internal functions such as:

- `parseLog()`
- `classifyLog()`
- `buildAnalysisPayload()`
- validation guards in the DAL layer

#### Integration Testing
Testing interaction between modules such as:

- submitted log -> ML prediction -> incident generation -> database storage
- frontend incident details page -> backend incident/user APIs

#### System Testing
Testing the complete workflow from the user side:

- submit a log
- classify and store it
- show it in incidents/logs views
- verify role-based restrictions

#### Functional Testing (Black Box)
Checking whether the system gives correct outputs for given log inputs without depending on internal code details.

#### White Box Testing
Reviewing internal branches and validation logic already covered by the backend Jest suite.

### 4. Tools Used

- **Backend:** Node.js / Express
- **Frontend:** React
- **Database:** MySQL
- **ML Service:** Flask + XGBoost model
- **Execution environment:** PowerShell terminal
- **ML test script:** `manual_test.py`
- **API validation method:** PowerShell `Invoke-WebRequest`
- **Browser evidence:** Brave/Chrome screenshots and DevTools Network tab

### 5. Entry Criteria

- Backend server is running successfully
- Frontend is running successfully
- MySQL database `alars_db` is available
- Schema from `database/schema.sql` is loaded
- ML service is running and shows `ML ready: xgboost`
- Model artifacts are available in `ml_service/artifacts`

### 6. Exit Criteria

- All designed test cases are executed
- Actual outputs and statuses are recorded
- Evidence is captured using screenshots/logs
- At least 3 defects are identified and analyzed

---

## Q1(b): Test Case Design

### Major Module Selected
**ML-Based Log Classification and Incident Generation Module**

| Test Case ID | Test Scenario / Description | Input Data | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| TC-01 | Classify a normal HDFS block receive log | `Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010` | Risk level should be `LOW` | Risk level returned as `LOW` | Pass |
| TC-02 | Classify a normal block served log | `10.251.73.220:50010 Served block blk_7128370237687728475 to /10.250.19.102` | Risk level should be `LOW` | Risk level returned as `LOW` | Pass |
| TC-03 | Classify a timeout/warning log | `Connection timeout to DataNode 10.250.19.102:50010 after 30000ms` | Risk level should be `MEDIUM` | Risk level returned as `MEDIUM` | Pass |
| TC-04 | Classify a writeBlock anomaly log | `writeBlock blk_-1608999687919862906 is being written to 10.250.19.102:50010` | Risk level should be `HIGH` | Risk level returned as `HIGH` | Pass |
| TC-05 | Classify a PacketResponder termination log | `PacketResponder 1 for block blk_38865049064139660 terminating` | Risk level should be `CRITICAL` | Risk level returned as `CRITICAL` | Pass |
| TC-06 | Classify an OutOfMemoryError log | `Exception in thread main java.lang.OutOfMemoryError: Java heap space` | Risk level should be `CRITICAL` | Risk level returned as `CRITICAL` | Pass |
| TC-07 | Classify a FATAL initialization failure log | `FATAL dfs.DataNode: Initialization failed for block blk_-3544583377289625738` | Risk level should be `CRITICAL` | Risk level returned as `CRITICAL` | Pass |
| TC-08 | Reject empty log submission | Empty message sent to `POST /api/logs` | Request should be rejected with validation error | API returned `{"error":"Log message is required."}` | Pass |

---

## Q2(a): Test Case Execution and Results

### Execution Method
The ML-aligned test cases were executed using the project's own ML validation script and one API validation request.

### Commands Executed

#### ML classification execution

```powershell
$env:PYTHONIOENCODING='utf-8'
.\ml_service\.winvenv\Scripts\python.exe manual_test.py
```

#### Empty-input validation execution

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:5002/api/logs -ContentType "application/json" -Body '{"message":"","source":"manual"}'
```

### Test Execution Table

| Test Case ID | Actual Output | Status | Evidence |
|---|---|---|---|
| TC-01 | `LOW` returned for normal block receive log | Pass | `manual_test.py` output |
| TC-02 | `LOW` returned for block served log | Pass | `manual_test.py` output |
| TC-03 | `MEDIUM` returned for timeout log | Pass | `manual_test.py` output |
| TC-04 | `HIGH` returned for writeBlock anomaly log | Pass | `manual_test.py` output |
| TC-05 | `CRITICAL` returned for PacketResponder termination log | Pass | `manual_test.py` output |
| TC-06 | `CRITICAL` returned for OutOfMemoryError log | Pass | `manual_test.py` output |
| TC-07 | `CRITICAL` returned for FATAL initialization failure log | Pass | `manual_test.py` output |
| TC-08 | API rejected empty input with `Log message is required.` | Pass | PowerShell API response |

### Summary of Results

- Total test cases executed: **8**
- Passed: **8**
- Failed: **0**

The selected ML-based classification module behaved as expected for the executed test cases.

### Log Evidence

The following execution log was recorded during **ML classification testing for TC-01 to TC-07**:

```text
Results: 7/7 tests passed
ALL TESTS PASSED - Risk levels are correctly differentiated.
```

The **eighth test case (TC-08)** was executed separately as an API validation check.  
The empty-input validation returned:

```text
{"error":"Log message is required."}
```

Therefore, the final result is:

```text
TC-01 to TC-07: 7/7 passed
TC-08: 1/1 passed
Overall: 8/8 passed
```

### Screenshot/Log Evidence Used for Q2(a)

- `TC-Execution-ML-Results.png`
- `TC-08-Empty-Input-Validation.png`

---

## Q2(b): Defect Analysis

During supplementary testing of the current ALARS implementation, the following defects were identified.

### Bug 1
**Bug ID:** BUG-01

**Description:** Incident details page does not display the associated log message correctly.

**Steps to Reproduce:**

1. Open the dashboard
2. Open any incident from the incident list
3. View the "Associated Log Entry" section

**Expected Result:**  
The original log message related to the incident should be displayed.

**Actual Result:**  
The incident details page shows a blank "Associated Log Entry" section because the frontend reads `incident.log_message`, but the backend `getIncidentById()` query does not include `l.message AS log_message`.

**Severity:** High

**Suggested Fix:**  
Update the backend incident detail query to return `l.message AS log_message`, or update the frontend to use `incident.message` consistently.

**Code Evidence:**  
Frontend expects `incident.log_message` in `frontend/src/pages/IncidentDetails.js`.  
Backend query in `Backend/dal/incidentDAL.js` does not return `log_message` for the detail view.

**Screenshot Evidence:**  
`BUG-01-Incident-Details-Missing-Log.png`

### Bug 2
**Bug ID:** BUG-02

**Description:** Analyst users can access the incident details management UI, but the user list API they need is restricted to admins only.

**Steps to Reproduce:**

1. Login as an `analyst`
2. Open an incident detail page
3. Observe the network request to `/api/users`

**Expected Result:**  
An analyst should be able to fetch the assignee list needed by the incident management screen, or the UI should hide that function for analysts.

**Actual Result:**  
The frontend calls `GET /api/users` for an analyst user, and the backend rejects the request with `403 Forbidden` because the route is protected by admin-only access.

**Severity:** Medium

**Suggested Fix:**  
Either allow analysts to access a limited user list endpoint, or change the frontend so only admins fetch the user list.

**Code Evidence:**  
Frontend analyst condition in `frontend/src/pages/IncidentDetails.js`.  
Backend route restriction in `Backend/routes/userRoutes.js`.

**Screenshot Evidence:**  
`BUG-02-Analyst-Users-403.png`

### Bug 3
**Bug ID:** BUG-03

**Description:** Batch upload summary shows the wrong fallback counter key.

**Steps to Reproduce:**

1. Process a batch when ML fallback is used
2. Open the batch summary panel
3. Observe the "Fallback processed" value

**Expected Result:**  
The fallback counter should display the number of logs processed by fallback classification.

**Actual Result:**  
The batch summary shows `ML processed = 0` and leaves `Fallback processed` blank because the backend summary uses the key `ml-fallback`, while the frontend reads `keyword-fallback`.

**Severity:** Medium

**Suggested Fix:**  
Use the same counter key on both sides, preferably standardizing on `ml-fallback`.

**Code Evidence:**  
Frontend reads `batchResult.summary.methods['keyword-fallback']` in `frontend/src/components/LogUpload.js`.  
Backend generates `summary.methods['ml-fallback']` in `Backend/services/logProcessingPipeline.js`.

**Screenshot Evidence:**  
`BUG-03-Batch-Summary-Fallback-Count-Missing.png`
