const LogAnalyzer = require("./LogAnalyzer");
const AlertManager = require("./AlertManager");
const AuthService = require("./AuthService");

// Setup modules
const analyzer = new LogAnalyzer();
const alertManager = new AlertManager();
const authService = new AuthService();

// Login
const authResult = authService.authenticate("admin", "admin123");

if (!authResult.success) {
  console.log("Authentication failed:", authResult.message);
  process.exit(0);
}

console.log("User authenticated with role:", authResult.role);

// Generate logs
const logs = [];

const sampleMessages = [
  "User failed login multiple times",
  "Unauthorized access attempt detected",
  "SQL injection attempt in login form",
  "System timeout error occurred",
  "Normal system operation",
  "Generic error in application module"
];

for (let i = 1; i <= 50; i++) {
  logs.push({
    message: sampleMessages[i % sampleMessages.length],
    source: i % 2 === 0 ? "AuthService" : "WebServer",
    ip: `192.168.1.${i}`,
    user: i % 3 === 0 ? "admin" : "analyst"
  });
}

// Analyze logs
logs.forEach((log) => {
  const analysisResult = analyzer.analyze(log);

  if (analysisResult.incidentDetected) {
    console.log("Incident detected:", analysisResult.incidentType);

    // Create alert
    const alert = alertManager.generateAlert(analysisResult);

    // Notify 
    alertManager.routeNotification(alert);

    // Close alert
    alertManager.acknowledgeAlert(alert);
    alertManager.resolveAlert(alert);

    console.log("Final Alert State:", alert);
  } else {
    console.log("No incident in log:", log.message);
  }
});