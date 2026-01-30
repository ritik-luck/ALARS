# SRS Document: Automated Log Analysis & Incident Management System  
**Tech Stack:** React (Frontend) + Node.js/Express (Backend)  
**Version:** 1.0  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the requirements for a system that automatically collects, analyzes, detects incidents from logs, and generates alerts for security/operational teams.

### 1.2 Scope
The system will:
- Accept logs from multiple sources (server logs, application logs, firewall/auth logs)
- Automatically detect suspicious patterns and incidents
- Classify risk level of incidents
- Notify users/admins via dashboard alerts
- Store logs and incident reports for auditing

---

## 2. Overall Description

### 2.1 Product Perspective
This system works as a centralized platform for:
- Log ingestion  
- Log parsing + processing  
- Rule-based detection + optional ML detection  
- Incident management workflow  

### 2.2 Product Features
- Log input (file upload / API ingestion)
- Automated analysis engine
- Risk classification (Low / Medium / High)
- Incident creation and tracking
- Alerts and mitigation suggestions
- Searchable log archive

### 2.3 User Classes
| User Type | Permissions |
|----------|-------------|
| Admin | Manage system, rules, users |
| Analyst | View logs, investigate incidents |
| Viewer | Read-only access to dashboard |

---

## 3. Functional Requirements (FR)

### FR1: Log Input
The system shall allow users to upload log files or send logs through an API endpoint.

### FR2: Log Parsing & Normalization
The system shall parse log entries and normalize fields such as timestamp, source, IP, user, and event type.

### FR3: Automated Log Analysis
The system shall analyze logs using:
- Rule-based detection  
- Optional ML-based anomaly detection (future-ready)

### FR4: Incident Detection
The system shall automatically detect incidents such as:
- Multiple failed logins (brute-force)
- Unknown IP access
- Suspicious admin activity
- High error rate spikes
- Unauthorized access attempts

### FR5: Incident Risk Classification
The system shall classify incidents into:
- Safe / Normal  
- Suspicious  
- Critical / Incident  

### FR6: Alerts and Notifications
The system shall display alerts on the dashboard when incidents are detected.

### FR7: Incident Report Generation
The system shall generate an incident report containing:
- Incident summary  
- Evidence logs  
- Risk score  
- Recommended mitigation  

### FR8: Mitigation Suggestions
The system shall suggest actions like:
- Block suspicious IP  
- Reset user password  
- Report abnormal behavior  
- Enable MFA / rate limiting  

### FR9: Incident Management Workflow
The system shall allow analysts to:
- Assign incidents  
- Mark status (Open, In Progress, Resolved)  
- Add comments/notes  

### FR10: Search & Filter Logs
The system shall allow searching logs using filters:
- Date range  
- Severity  
- Source  
- User/IP  

### FR11: User Authentication
The system shall support login for Admin/Analyst/Viewer roles.

---

## 4. Non-Functional Requirements (NFR)

### NFR1: Security
- Secure handling of uploaded logs (no execution)
- Input sanitization
- Password hashing (bcrypt)
- Role-based access control (RBAC)

### NFR2: Usability
- UI shall be simple, clean, and easy to use
- Dashboard should show incidents clearly with colors/labels

### NFR3: Reliability
- System should not lose data during crashes (persistent DB storage)

### NFR4: Maintainability
- Modular design: ingestion → detection engine → alerting → storage
- Easy to add new detection rules

### NFR5: Compatibility
- Runs on Linux/Windows
- Works in modern browsers (Chrome, Edge)

---

## 5. System Architecture (Initial)

### 5.1 Architecture Overview

#### Frontend (Web UI)
- React.js
- HTML, CSS, JavaScript
- Dashboard UI for incidents/logs

#### Backend (API Server)
- Node.js with Express.js
- REST API support

#### Detection Engine
- Rule-based engine (regex + thresholds)
- ML module (optional / future enhancement)

#### Database
Stores:
- Logs
- Incidents
- User actions
- Rule configurations

---

## 6. External Interfaces

### 6.1 User Interface
Modules:
- Login Page
- Dashboard (Incidents Overview)
- Logs Viewer (Search + Filters)
- Incident Details Page
- Admin Panel (Rules + Users)

### 6.2 API Interface (Sample Endpoints)
- `POST /api/logs/upload`
- `POST /api/logs/ingest`
- `GET /api/logs/search`
- `GET /api/incidents`
- `PATCH /api/incidents/{id}`

### 6.3 Database
Recommended free DB options:
- PostgreSQL
- MySQL

---

## 7. Data Requirements

### 7.1 Log Fields (Normalized Format)
- `timestamp`
- `source` (server/app/firewall)
- `severity` (INFO/WARN/ERROR)
- `ip_address`
- `username`
- `message`
- `event_type`

### 7.2 Incident Fields
- `incident_id`
- `title`
- `description`
- `classification` (Safe/Suspicious/Critical)
- `risk_score`
- `created_at`
- `assigned_to`
- `status`
- `evidence_logs`

---

## 8. Assumptions and Dependencies

### Assumptions
- Users have logs in standard formats (txt, json, csv)
- System can be deployed locally or on a free cloud tier (optional)

### Dependencies (Free Tools)
- Backend: Node.js + Express.js
- Database: PostgreSQL / MySQL
- UI: React.js
- Deployment: Docker (optional)

---

## 9. Future Enhancements
- Real-time streaming using Kafka/RabbitMQ
- Email/SMS alert integration
- SIEM integration (Elastic Stack)
- Real-time blacklist / threat intel updates
- ML-based anomaly detection model upgrades
- Agent-based log collection (like Filebeat alternative)

---
