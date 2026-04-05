class AlertManager {
  constructor() {
    this.priorityMap = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
  }

  generateAlert(incident) {
    return {
      alertId: "ALERT-" + Date.now(),
      incidentType: incident.incidentType,
      message: incident.description,
      severity: incident.riskLevel,
      priority: this.priorityMap[incident.riskLevel] || 5,
      source: incident.source,
      status: "OPEN",
      createdAt: new Date(),
      acknowledged: false
    };
  }

  routeNotification(alert) {
    if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
      return "Routing alert to ADMIN and SECURITY TEAM";
    } else {
      return "Routing alert to ANALYST";
    }
  }
}

module.exports = new AlertManager();
