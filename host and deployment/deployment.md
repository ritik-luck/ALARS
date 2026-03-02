2️⃣ Deployment Strategy (Step-by-step)

Step 1: Server Setup
	•	Launch Ubuntu EC2 instance
	•	Install:
	•	Node.js
	•	Nginx (Reverse Proxy)
	•	PM2 (Process Manager)

Step 2: Deploy Backend
	•	Push project to GitHub
	•	Clone repository on server
	•	Install dependencies:
            npm install
    •	Start server:
            pm2 start app.js

Step 3: Configure Database
	•	Create database schema:
	•	Logs table
	•	Incident table
	•	Alert table
	•	User table
	•	Connect backend using environment variables

Step 4: API Configuration
	•	REST APIs:
	•	/login
	•	/upload-log
	•	/get-incidents
	•	/generate-report
	•	Configure CORS for frontend-backend communication

Step 5: Reverse Proxy Setup
	•	Nginx forwards:
            public-domain → Node.js backend