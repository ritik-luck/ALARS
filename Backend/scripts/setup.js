const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

async function setup() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    multipleStatements: true
  });

  try {
    console.log('Connected to MySQL. Setting up database...');

    // Read the schema but we will execute it carefully
    await connection.query('CREATE DATABASE IF NOT EXISTS alars_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.query('USE alars_db');

    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT          AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(100) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        role       VARCHAR(50)  NOT NULL DEFAULT 'user',
        created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id        INT          AUTO_INCREMENT PRIMARY KEY,
        message   TEXT         NOT NULL,
        source    VARCHAR(255) NOT NULL DEFAULT 'manual',
        timestamp DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id                 INT         AUTO_INCREMENT PRIMARY KEY,
        log_id             INT         NOT NULL,
        risk_level         VARCHAR(50) NOT NULL,
        status             VARCHAR(50) NOT NULL DEFAULT 'open',
        assignee_id        INT         NULL,
        resolution_notes   TEXT        NULL,
        mitigation_actions TEXT        NULL,
        created_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_incident_log FOREIGN KEY (log_id) REFERENCES logs (id),
        CONSTRAINT fk_incident_assignee FOREIGN KEY (assignee_id) REFERENCES users (id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id            INT         AUTO_INCREMENT PRIMARY KEY,
        incident_id   INT         NULL,
        log_id        INT         NULL,
        alert_type    VARCHAR(50) NOT NULL DEFAULT 'INFO',
        alert_message TEXT        NOT NULL,
        is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
        created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_alert_incident FOREIGN KEY (incident_id) REFERENCES incidents (id),
        CONSTRAINT fk_alert_log FOREIGN KEY (log_id) REFERENCES logs (id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id             INT          AUTO_INCREMENT PRIMARY KEY,
        rule_name      VARCHAR(100) NOT NULL,
        description    TEXT         NOT NULL,
        severity_level VARCHAR(50)  NOT NULL,
        is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns to existing incidents if they don't exist
    try {
      await connection.query('ALTER TABLE incidents ADD COLUMN assignee_id INT NULL');
      await connection.query('ALTER TABLE incidents ADD CONSTRAINT fk_incident_assignee FOREIGN KEY (assignee_id) REFERENCES users(id)');
      await connection.query('ALTER TABLE incidents ADD COLUMN resolution_notes TEXT NULL');
      await connection.query('ALTER TABLE incidents ADD COLUMN mitigation_actions TEXT NULL');
      await connection.query('ALTER TABLE incidents ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    } catch(e) {
      // Ignored if they already exist
    }

    // Seed Users securely
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedAnalyst = await bcrypt.hash('analyst123', 10);

    // clear duplicate users or old changeme passwords
    await connection.query('DELETE FROM users WHERE username IN ("admin", "analyst", "viewer")');

    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedAdmin, 'admin']);
    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['analyst', hashedAnalyst, 'analyst']);
    
    const hashedViewer = await bcrypt.hash('viewer123', 10);
    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['viewer', hashedViewer, 'viewer']);

    console.log('Database schema and seed completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

setup();
