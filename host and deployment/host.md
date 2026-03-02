## 1️⃣ Hosting Plan – ALARS

For **ALARS – Automated Log Analysis & Incident Management System**, the application components will be hosted as follows:

---

### 🔹 Backend Services

**Technology:** Node.js  
**Modules:** LogAnalyzer, AuthService, AlertManager  

- **Primary Host:** AWS EC2 (Ubuntu Server)
- **Alternative Hosting Options:**
  - Render
  - Railway
  - Azure Virtual Machine
- **Runtime Environment:** Node.js (LTS Version)

---

### 🔹 Database Layer

- **Host:** AWS RDS (MySQL / PostgreSQL)
- **Purpose:** Stores persistent system data

**Database Tables Include:**
- Logs
- Incidents
- Alerts
- Users
- Reports

---

### 🔹 Frontend Layer (If Applicable)

- **Host:** Netlify / Vercel
- **Built Using:** HTML, CSS, JavaScript (or React if implemented)
- **Purpose:** Provides web-based interface for Admin, Analyst, and Viewer

---

### 🔹 Notification Service

- **Email Integration:** SendGrid / SMTP
- **Alternative:** Console-based internal notification system
- **Purpose:** Sends alerts for critical incidents

---