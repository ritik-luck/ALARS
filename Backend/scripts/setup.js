const mysql = require('mysql2/promise');
const fs = require('fs/promises');
const path = require('path');
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

    await connection.query('CREATE DATABASE IF NOT EXISTS alars_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await connection.query('USE alars_db');

    // Rebuild all non-user tables so the live schema matches the current DAL.
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('DROP TABLE IF EXISTS alerts');
    await connection.query('DROP TABLE IF EXISTS incidents');
    await connection.query('DROP TABLE IF EXISTS logs');
    await connection.query('DROP TABLE IF EXISTS rules');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await connection.query(schemaSql);

    // clear demo placeholders before reseeding demo credentials
    await connection.query('DELETE FROM users WHERE username IN ("admin", "analyst", "viewer")');

    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', 'admin123', 'admin']);
    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['analyst', 'analyst123', 'analyst']);
    await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['viewer', 'viewer123', 'viewer']);

    console.log('Database schema and seed completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

setup();
