For ALARS – Automated Log Analysis & Incident Management System, the components will be hosted as follows:

🔹 Backend (Node.js – LogAnalyzer, AuthService, AlertManager)
	•	Host: AWS EC2 (Ubuntu Server)
	•	Alternative: Render / Railway / Azure VM
	•	Runtime: Node.js (LTS)

🔹 Database
	•	Host: AWS RDS (MySQL / PostgreSQL)
	•	Stores:
	•	Logs
	•	Incidents
	•	Alerts
	•	Users
	•	Reports

🔹 Frontend (if applicable)
	•	Host: Netlify / Vercel
	•	Built using HTML/CSS/JS (or React if used)

🔹 Notification Service
	•	Email via SendGrid / SMTP
	•	Or console-based internal notification service
    