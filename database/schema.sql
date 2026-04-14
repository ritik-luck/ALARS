-- ============================================================
--  ALARS — Automated Log Analysis & Incident Response System
--  Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS alars_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE alars_db;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,           -- store hashed passwords in production
  role       VARCHAR(50)  NOT NULL DEFAULT 'viewer',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs (
  id        INT          AUTO_INCREMENT PRIMARY KEY,
  message   TEXT         NOT NULL,
  source    VARCHAR(255) NOT NULL DEFAULT 'manual',
  timestamp DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Incidents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id         INT         AUTO_INCREMENT PRIMARY KEY,
  log_id     INT         NOT NULL,
  risk_level VARCHAR(50) NOT NULL,            -- CRITICAL | HIGH | MEDIUM | LOW
  status     VARCHAR(50) NOT NULL DEFAULT 'open',
  assigned_to INT NULL,
  assigned_at DATETIME NULL,
  mitigation_action VARCHAR(100) NULL,
  mitigation_notes  TEXT NULL,
  mitigated_by      INT NULL,
  mitigated_at      DATETIME NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_incident_log FOREIGN KEY (log_id) REFERENCES logs (id),
  CONSTRAINT fk_incident_assigned_to FOREIGN KEY (assigned_to) REFERENCES users (id),
  CONSTRAINT fk_incident_mitigated_by FOREIGN KEY (mitigated_by) REFERENCES users (id)
);

-- ── Alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            INT      AUTO_INCREMENT PRIMARY KEY,
  incident_id   INT      NOT NULL,
  alert_message TEXT     NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alert_incident FOREIGN KEY (incident_id) REFERENCES incidents (id)
);

-- ── Detection Rules / Thresholds ─────────────────────────────
CREATE TABLE IF NOT EXISTS detection_rules (
  id              INT          AUTO_INCREMENT PRIMARY KEY,
  keyword         VARCHAR(100) NOT NULL UNIQUE,
  risk_level      VARCHAR(50)  NOT NULL DEFAULT 'INFO',
  creates_incident TINYINT(1)  NOT NULL DEFAULT 0,
  alert_enabled   TINYINT(1)   NOT NULL DEFAULT 0,
  threshold_count INT          NOT NULL DEFAULT 1,
  enabled         TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Sample seed data (optional demo rows) ────────────────────
INSERT INTO users (username, password, role) VALUES
  ('admin', 'changeme_hash_this', 'admin'),
  ('analyst', 'changeme_hash_this', 'analyst'),
  ('viewer', 'changeme_hash_this', 'viewer');

INSERT IGNORE INTO detection_rules
  (keyword, risk_level, creates_incident, alert_enabled, threshold_count, enabled)
VALUES
  ('CRITICAL', 'CRITICAL', 1, 1, 1, 1),
  ('ERROR', 'HIGH', 1, 0, 1, 1),
  ('FAIL', 'MEDIUM', 1, 0, 1, 1),
  ('WARNING', 'LOW', 0, 0, 1, 1),
  ('EXCEPTION', 'HIGH', 1, 0, 1, 1),
  ('TIMEOUT', 'HIGH', 1, 0, 1, 1);
