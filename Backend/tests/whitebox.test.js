/**
 * ============================================================
 *  ALARS — WHITE BOX TESTS
 * ============================================================
 *  White Box Testing examines the INTERNAL structure, code
 *  paths, branches, and logic of the application.
 *
 *  We test:
 *    1. Service-layer pure functions (logParser, logAnalyzer,
 *       riskClassifier, incidentDetector) — covering every
 *       branch and code path.
 *    2. DAL validation logic — ensuring guard-clauses and
 *       edge-case branches execute correctly.
 *
 *  These tests run WITHOUT a live database; service functions
 *  are pure and DAL validation throws before any DB call.
 * ============================================================
 */

// ── Import service modules under test ─────────────────────────
const { parseLog }        = require('../services/logParser');
const { analyzeLog }      = require('../services/logAnalyzer');
const { classifyRisk }    = require('../services/riskClassifier');
const { detectIncident }  = require('../services/incidentDetector');

// ── Import DAL modules (for validation branch testing) ────────
const { createLog }       = require('../dal/logDAL');
const { createIncident }  = require('../dal/incidentDAL');
const { createAlert }     = require('../dal/alertDAL');
const { createUser }      = require('../dal/userDAL');

// ==============================================================
//  TEST SUITE 1 — Log Parser (Statement & Branch Coverage)
// ==============================================================
describe('White Box — logParser.parseLog()', () => {

  // ── Statement Coverage: verify the basic path executes ──────
  test('WB-LP-01: trims leading and trailing whitespace', () => {
    const result = parseLog('   hello world   ');
    expect(result.message).toBe('hello world');
  });

  test('WB-LP-02: collapses multiple internal spaces into one', () => {
    const result = parseLog('disk     failure     detected');
    expect(result.message).toBe('disk failure detected');
  });

  // ── Branch Coverage: source parameter branches ──────────────
  test('WB-LP-03: uses provided source value', () => {
    const result = parseLog('test', 'syslog');
    expect(result.source).toBe('syslog');
  });

  test('WB-LP-04: defaults source to "manual" when undefined', () => {
    const result = parseLog('test');
    expect(result.source).toBe('manual');
  });

  test('WB-LP-05: defaults source to "manual" when empty string', () => {
    const result = parseLog('test', '');
    expect(result.source).toBe('manual');
  });

  test('WB-LP-06: defaults source to "manual" when null', () => {
    const result = parseLog('test', null);
    expect(result.source).toBe('manual');
  });

  // ── Path Coverage: combined whitespace edge cases ───────────
  test('WB-LP-07: handles tabs and newlines', () => {
    const result = parseLog('\tline one\nline two\t');
    expect(result.message).toBe('line one line two');
  });
});

// ==============================================================
//  TEST SUITE 2 — Log Analyzer (Decision & Condition Coverage)
// ==============================================================
describe('White Box — logAnalyzer.analyzeLog()', () => {

  // ── Each keyword triggers a specific branch ─────────────────
  test('WB-LA-01: detects CRITICAL keyword → requiresIncident = true', () => {
    const result = analyzeLog('CRITICAL: disk failure');
    expect(result.detectedKeywords).toContain('CRITICAL');
    expect(result.requiresIncident).toBe(true);
  });

  test('WB-LA-02: detects ERROR keyword → requiresIncident = true', () => {
    const result = analyzeLog('ERROR: connection refused');
    expect(result.detectedKeywords).toContain('ERROR');
    expect(result.requiresIncident).toBe(true);
  });

  test('WB-LA-03: detects FAIL keyword → requiresIncident = true', () => {
    const result = analyzeLog('FAIL: auth service down');
    expect(result.detectedKeywords).toContain('FAIL');
    expect(result.requiresIncident).toBe(true);
  });

  test('WB-LA-04: detects WARNING keyword → requiresIncident = false', () => {
    const result = analyzeLog('WARNING: high memory usage');
    expect(result.detectedKeywords).toContain('WARNING');
    expect(result.requiresIncident).toBe(false);
  });

  test('WB-LA-05: no keywords → empty array, requiresIncident = false', () => {
    const result = analyzeLog('Scheduled backup completed');
    expect(result.detectedKeywords).toEqual([]);
    expect(result.requiresIncident).toBe(false);
  });

  // ── Multiple keyword branch ────────────────────────────────
  test('WB-LA-06: message with CRITICAL and ERROR detects both', () => {
    const result = analyzeLog('CRITICAL ERROR: total system breakdown');
    expect(result.detectedKeywords).toContain('CRITICAL');
    expect(result.detectedKeywords).toContain('ERROR');
    expect(result.requiresIncident).toBe(true);
  });

  // ── Case-insensitivity branch (toUpperCase path) ───────────
  test('WB-LA-07: keywords detected regardless of original case', () => {
    const result = analyzeLog('critical error in module');
    expect(result.detectedKeywords).toContain('CRITICAL');
    expect(result.detectedKeywords).toContain('ERROR');
  });

  // ── TIMEOUT and EXCEPTION keywords ─────────────────────────
  test('WB-LA-08: detects TIMEOUT keyword (non-incident)', () => {
    const result = analyzeLog('TIMEOUT on API call');
    expect(result.detectedKeywords).toContain('TIMEOUT');
    expect(result.requiresIncident).toBe(false);
  });

  test('WB-LA-09: detects EXCEPTION keyword (non-incident)', () => {
    const result = analyzeLog('Unhandled EXCEPTION in worker');
    expect(result.detectedKeywords).toContain('EXCEPTION');
    expect(result.requiresIncident).toBe(false);
  });
});

// ==============================================================
//  TEST SUITE 3 — Risk Classifier (All decision branches)
// ==============================================================
describe('White Box — riskClassifier.classifyRisk()', () => {

  test('WB-RC-01: CRITICAL keyword → returns "CRITICAL"', () => {
    expect(classifyRisk(['CRITICAL'])).toBe('CRITICAL');
  });

  test('WB-RC-02: ERROR keyword → returns "HIGH"', () => {
    expect(classifyRisk(['ERROR'])).toBe('HIGH');
  });

  test('WB-RC-03: FAIL keyword → returns "MEDIUM"', () => {
    expect(classifyRisk(['FAIL'])).toBe('MEDIUM');
  });

  test('WB-RC-04: WARNING keyword → returns "LOW"', () => {
    expect(classifyRisk(['WARNING'])).toBe('LOW');
  });

  test('WB-RC-05: empty array → returns "INFO"', () => {
    expect(classifyRisk([])).toBe('INFO');
  });

  // ── Priority-order branch: highest severity wins ───────────
  test('WB-RC-06: CRITICAL + ERROR → CRITICAL wins (priority)', () => {
    expect(classifyRisk(['ERROR', 'CRITICAL'])).toBe('CRITICAL');
  });

  test('WB-RC-07: ERROR + FAIL → HIGH wins (priority)', () => {
    expect(classifyRisk(['FAIL', 'ERROR'])).toBe('HIGH');
  });

  test('WB-RC-08: FAIL + WARNING → MEDIUM wins (priority)', () => {
    expect(classifyRisk(['WARNING', 'FAIL'])).toBe('MEDIUM');
  });
});

// ==============================================================
//  TEST SUITE 4 — Incident Detector (Integration of branches)
// ==============================================================
describe('White Box — incidentDetector.detectIncident()', () => {

  // ── Branch: incidentRequired = true path ───────────────────
  test('WB-ID-01: CRITICAL message → incidentRequired true, riskLevel CRITICAL', () => {
    const result = detectIncident('CRITICAL: server crash');
    expect(result.incidentRequired).toBe(true);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.detectedKeywords).toContain('CRITICAL');
  });

  test('WB-ID-02: ERROR message → incidentRequired true, riskLevel HIGH', () => {
    const result = detectIncident('ERROR: DB timeout');
    expect(result.incidentRequired).toBe(true);
    expect(result.riskLevel).toBe('HIGH');
  });

  test('WB-ID-03: FAIL message → incidentRequired true, riskLevel MEDIUM', () => {
    const result = detectIncident('FAIL: auth service');
    expect(result.incidentRequired).toBe(true);
    expect(result.riskLevel).toBe('MEDIUM');
  });

  // ── Branch: incidentRequired = false path ──────────────────
  test('WB-ID-04: INFO message → incidentRequired false, no riskLevel', () => {
    const result = detectIncident('INFO: backup finished');
    expect(result.incidentRequired).toBe(false);
    expect(result.riskLevel).toBeUndefined();
  });

  test('WB-ID-05: WARNING message → incidentRequired false', () => {
    const result = detectIncident('WARNING: disk space low');
    expect(result.incidentRequired).toBe(false);
  });

  // ── Path: multiple keywords, highest wins ──────────────────
  test('WB-ID-06: message with ERROR and FAIL → riskLevel HIGH', () => {
    const result = detectIncident('ERROR: FAIL in processing');
    expect(result.incidentRequired).toBe(true);
    expect(result.riskLevel).toBe('HIGH');
  });
});

// ==============================================================
//  TEST SUITE 5 — DAL Validation Logic (Guard-clause branches)
// ==============================================================
describe('White Box — DAL Input Validation Guards', () => {

  // ── logDAL.createLog guard clause ──────────────────────────
  test('WB-DAL-01: createLog throws when message is empty string', async () => {
    await expect(createLog('')).rejects.toThrow('Log message cannot be empty.');
  });

  test('WB-DAL-02: createLog throws when message is whitespace only', async () => {
    await expect(createLog('   ')).rejects.toThrow('Log message cannot be empty.');
  });

  test('WB-DAL-03: createLog throws when message is null', async () => {
    await expect(createLog(null)).rejects.toThrow('Log message cannot be empty.');
  });

  // ── incidentDAL.createIncident guard clauses ───────────────
  test('WB-DAL-04: createIncident throws when logId is missing', async () => {
    await expect(createIncident(null, 'Disk failure detected', 'HIGH'))
      .rejects.toThrow('logId, message and riskLevel are required.');
  });

  test('WB-DAL-05: createIncident throws when riskLevel is missing', async () => {
    await expect(createIncident(1, 'Disk failure detected', null))
      .rejects.toThrow('logId, message and riskLevel are required.');
  });

  test('WB-DAL-06: createIncident throws for invalid riskLevel', async () => {
    await expect(createIncident(1, 'Disk failure detected', 'INVALID'))
      .rejects.toThrow('Invalid riskLevel "INVALID"');
  });

  // ── alertDAL.createAlert guard clauses ─────────────────────
  test('WB-DAL-07: createAlert throws when incidentId is missing', async () => {
    await expect(createAlert(null, 'alert text'))
      .rejects.toThrow('An alert must include a target incident or log and an alertMessage.');
  });

  test('WB-DAL-08: createAlert throws when alertMessage is missing', async () => {
    await expect(createAlert(1, null))
      .rejects.toThrow('An alert must include a target incident or log and an alertMessage.');
  });

  // ── userDAL.createUser guard clauses ───────────────────────
  test('WB-DAL-09: createUser throws when username is missing', async () => {
    await expect(createUser(null, 'password123'))
      .rejects.toThrow('Username and password are required.');
  });

  test('WB-DAL-10: createUser throws when password is missing', async () => {
    await expect(createUser('john', null))
      .rejects.toThrow('Username and password are required.');
  });
});
