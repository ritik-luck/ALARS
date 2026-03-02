🔹 1️⃣ How End Users Access ALARS

👤 Actors:
	•	Admin
	•	Analyst
	•	User (Viewer)

⸻

🔹 System Access Flow (Step-by-step)

Step 1: User Access
	•	Admin / Analyst opens web application in browser.
	•	They log in using credentials.
	•	Request is sent to Auth Service.

⸻

Step 2: Authentication
	•	Auth Service validates user.
	•	If valid → access granted.
	•	Role determines permissions:
	•	Admin → manage incidents, reports, rules
	•	Analyst → analyze incidents

⸻

Step 3: Log Flow (System Backend)
	1.	Log Source sends logs to:
→ Log Ingestion
	2.	Logs move to:
→ Log Processing
(Parsing & Normalization)
	3.	Logs move to:
→ Analysis Service
(Rule matching & classification)
	4.	If suspicious:
→ Incident Detection

⸻

Step 4: Incident Handling
	•	Incident Detection sends data to:
→ Incident Management

Incident Management:
	•	Stores incident
	•	Allows Admin/Analyst to view/update
	•	Triggers:
✔ Notification Service (if critical)
✔ Reporting Service

⸻

Step 5: Reporting & Notifications
	•	Notification Service sends alerts.
	•	Reporting Service generates reports.
	•	Admin/Analyst view reports via UI.

2️⃣ Pictorial Representation

![User and Component Interaction](interaction.png)