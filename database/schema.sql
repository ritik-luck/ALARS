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
  role       VARCHAR(50)  NOT NULL DEFAULT 'user',
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
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_incident_log FOREIGN KEY (log_id) REFERENCES logs (id)
);

-- ── Alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id            INT      AUTO_INCREMENT PRIMARY KEY,
  incident_id   INT      NOT NULL,
  alert_message TEXT     NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alert_incident FOREIGN KEY (incident_id) REFERENCES incidents (id)
);

-- ── Sample seed data (optional demo rows) ────────────────────
INSERT INTO users (username, password, role) VALUES
  ('admin', 'changeme_hash_this', 'admin'),
  ('analyst', 'changeme_hash_this', 'user');
