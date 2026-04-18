/**
 * ============================================================
 *  ALARS — BLACK BOX TESTS
 * ============================================================
 *  Black Box Testing evaluates the software from the OUTSIDE,
 *  treating it as a closed box.  The tester does NOT look at
 *  internal code; only the specification (inputs → expected
 *  outputs) matters.
 *
 *  Techniques applied:
 *    • Equivalence Partitioning
 *    • Boundary Value Analysis
 *    • Error Guessing
 *    • Decision Table Testing
 *
 *  Modules tested:
 *    1. Log Parser       — input → output transformation
 *    2. Log Analyzer     — message → keyword detection
 *    3. Risk Classifier  — keywords → risk level
 *    4. Incident Detector — message → incident decision
 *    5. Alert Generator  — riskLevel → alert or null
 *    6. DAL validation   — invalid inputs → error
 * ============================================================
 */

const { parseLog }        = require('../services/logParser');
const { analyzeLog }      = require('../services/logAnalyzer');
const { classifyRisk }    = require('../services/riskClassifier');
const { detectIncident }  = require('../services/incidentDetector');

// DAL modules (for input-validation black-box testing)
const { createLog }       = require('../dal/logDAL');
const { createIncident }  = require('../dal/incidentDAL');
const { createAlert }     = require('../dal/alertDAL');
const { createUser }      = require('../dal/userDAL');

// ==============================================================
//  TEST SUITE 1 — Log Parser (Equivalence Partitioning)
// ==============================================================
describe('Black Box — Log Parser', () => {

  /*  Equivalence classes:
   *    EC1: Normal message (no extra whitespace)
   *    EC2: Message with leading/trailing whitespace
   *    EC3: Message with multiple internal spaces
   *    EC4: Source provided
   *    EC5: Source not provided
   */

  test('BB-LP-01 [EC1]: normal message returned unchanged', () => {
    const result = parseLog('System started successfully', 'kernel');
    expect(result.message).toBe('System started successfully');
    expect(result.source).toBe('kernel');
  });

  test('BB-LP-02 [EC2]: whitespace-padded message is cleaned', () => {
    const result = parseLog('   padded message   ');
    expect(result.message).toBe('padded message');
  });

  test('BB-LP-03 [EC3]: extra spaces collapsed to single space', () => {
    const result = parseLog('too    many     spaces');
    expect(result.message).toBe('too many spaces');
  });

  test('BB-LP-04 [EC4]: source is preserved when given', () => {
    const result = parseLog('msg', 'firewall');
    expect(result.source).toBe('firewall');
  });

  test('BB-LP-05 [EC5]: source defaults when not given', () => {
    const result = parseLog('msg');
    expect(result.source).toBe('manual');
  });
});

// ==============================================================
//  TEST SUITE 2 — Log Analyzer (Decision Table Testing)
// ==============================================================
describe('Black Box — Log Analyzer', () => {

  /*  Decision Table:
   *  ┌────────────────────┬────────────┬───────────────────┐
   *  │ Input Message      │ Keywords   │ requiresIncident  │
   *  ├────────────────────┼────────────┼───────────────────┤
   *  │ Contains CRITICAL  │ [CRITICAL] │ true              │
   *  │ Contains ERROR     │ [ERROR]    │ true              │
   *  │ Contains FAIL      │ [FAIL]     │ true              │
   *  │ Contains WARNING   │ [WARNING]  │ false             │
   *  │ Contains TIMEOUT   │ [TIMEOUT]  │ false             │
   *  │ No keyword         │ []         │ false             │
   *  └────────────────────┴────────────┴───────────────────┘
   */

  test('BB-LA-01: CRITICAL message triggers incident requirement', () => {
    const r = analyzeLog('CRITICAL: Disk failure on /dev/sda');
    expect(r.requiresIncident).toBe(true);
  });

  test('BB-LA-02: ERROR message triggers incident requirement', () => {
    const r = analyzeLog('ERROR: Database connection timeout');
    expect(r.requiresIncident).toBe(true);
  });

  test('BB-LA-03: FAIL message triggers incident requirement', () => {
    const r = analyzeLog('FAIL: Authentication service unavailable');
    expect(r.requiresIncident).toBe(true);
  });

  test('BB-LA-04: WARNING alone does NOT trigger incident', () => {
    const r = analyzeLog('WARNING: Memory usage at 80%');
    expect(r.requiresIncident).toBe(false);
  });

  test('BB-LA-05: Informational message does NOT trigger incident', () => {
    const r = analyzeLog('Scheduled backup completed successfully');
    expect(r.requiresIncident).toBe(false);
  });

  test('BB-LA-06: TIMEOUT alone does NOT trigger incident', () => {
    const r = analyzeLog('TIMEOUT waiting for response');
    expect(r.requiresIncident).toBe(false);
  });
});

// ==============================================================
//  TEST SUITE 3 — Risk Classifier (Equivalence Partitioning)
// ==============================================================
describe('Black Box — Risk Classifier', () => {

  /*  Equivalence classes for input array:
   *    P1: Contains "CRITICAL"        → expected "CRITICAL"
   *    P2: Contains "ERROR" (no crit) → expected "HIGH"
   *    P3: Contains "FAIL"  (no err)  → expected "MEDIUM"
   *    P4: Contains "WARNING" only    → expected "LOW"
   *    P5: Empty                      → expected "INFO"
   */

  test('BB-RC-01 [P1]: CRITICAL keyword → CRITICAL risk', () => {
    expect(classifyRisk(['CRITICAL'])).toBe('CRITICAL');
  });

  test('BB-RC-02 [P2]: ERROR keyword → HIGH risk', () => {
    expect(classifyRisk(['ERROR'])).toBe('HIGH');
  });

  test('BB-RC-03 [P3]: FAIL keyword → MEDIUM risk', () => {
    expect(classifyRisk(['FAIL'])).toBe('MEDIUM');
  });

  test('BB-RC-04 [P4]: WARNING keyword → LOW risk', () => {
    expect(classifyRisk(['WARNING'])).toBe('LOW');
  });

  test('BB-RC-05 [P5]: no keywords → INFO risk', () => {
    expect(classifyRisk([])).toBe('INFO');
  });

  // ── Boundary: multiple keywords (highest should win) ───────
  test('BB-RC-06: multiple keywords returns the highest severity', () => {
    expect(classifyRisk(['WARNING', 'FAIL', 'CRITICAL'])).toBe('CRITICAL');
  });
});

// ==============================================================
//  TEST SUITE 4 — Incident Detector (End-to-End decision)
// ==============================================================
describe('Black Box — Incident Detector', () => {

  /*  Specification (from README):
   *    • CRITICAL, ERROR, FAIL → create incident
   *    • WARNING, INFO         → NO incident
   */

  test('BB-ID-01: CRITICAL message produces incident with CRITICAL level', () => {
    const r = detectIncident('CRITICAL: Memory usage exceeded 95%');
    expect(r.incidentRequired).toBe(true);
    expect(r.riskLevel).toBe('CRITICAL');
  });

  test('BB-ID-02: ERROR message produces incident with HIGH level', () => {
    const r = detectIncident('ERROR: Database connection timed out');
    expect(r.incidentRequired).toBe(true);
    expect(r.riskLevel).toBe('HIGH');
  });

  test('BB-ID-03: FAIL message produces incident with MEDIUM level', () => {
    const r = detectIncident('FAIL: Authentication service is unavailable');
    expect(r.incidentRequired).toBe(true);
    expect(r.riskLevel).toBe('MEDIUM');
  });

  test('BB-ID-04: WARNING message produces NO incident', () => {
    const r = detectIncident('WARNING: CPU load is elevated');
    expect(r.incidentRequired).toBe(false);
  });

  test('BB-ID-05: Informational message produces NO incident', () => {
    const r = detectIncident('Scheduled backup completed successfully');
    expect(r.incidentRequired).toBe(false);
  });

  // ── Error Guessing: unusual but valid inputs ───────────────
  test('BB-ID-06: mixed-case keyword still detected', () => {
    const r = detectIncident('CrItIcAl issue in subsystem');
    expect(r.incidentRequired).toBe(true);
  });

  test('BB-ID-07: keyword embedded inside a word is still detected', () => {
    const r = detectIncident('A CRITICAL_FAILURE occurred');
    expect(r.incidentRequired).toBe(true);
  });

  test('BB-ID-08: very long message is processed correctly', () => {
    const longMsg = 'ERROR: ' + 'x'.repeat(5000);
    const r = detectIncident(longMsg);
    expect(r.incidentRequired).toBe(true);
    expect(r.riskLevel).toBe('HIGH');
  });
});

// ==============================================================
//  TEST SUITE 5 — DAL Input Validation (Error Guessing)
// ==============================================================
describe('Black Box — DAL Input Validation', () => {

  /*  From the specification we know:
   *    • createLog requires a non-empty message
   *    • createIncident requires logId and a valid riskLevel
   *    • createAlert requires incidentId and a message
   *    • createUser requires username and password
   *
   *  We test the system's OBSERVABLE behavior (error thrown)
   *  without inspecting code logic.
   */

  test('BB-DAL-01: creating a log with empty message fails', async () => {
    await expect(createLog('')).rejects.toThrow();
  });

  test('BB-DAL-02: creating a log with null message fails', async () => {
    await expect(createLog(null)).rejects.toThrow();
  });

  test('BB-DAL-03: creating an incident without logId fails', async () => {
    await expect(createIncident(null, 'HIGH')).rejects.toThrow();
  });

  test('BB-DAL-04: creating an incident with bad risk level fails', async () => {
    await expect(createIncident(1, 'EXTREME')).rejects.toThrow();
  });

  test('BB-DAL-05: creating an alert without incidentId fails', async () => {
    await expect(createAlert(null, 'alert text')).rejects.toThrow();
  });

  test('BB-DAL-06: creating an alert without message fails', async () => {
    await expect(createAlert(1, null)).rejects.toThrow();
  });

  test('BB-DAL-07: creating a user without username fails', async () => {
    await expect(createUser('', 'pass')).rejects.toThrow();
  });

  test('BB-DAL-08: creating a user without password fails', async () => {
    await expect(createUser('john', '')).rejects.toThrow();
  });
});
