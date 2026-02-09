class AlertManager {
  constructor() {
    // Severity to priority mapping
    this.priorityMap = {
      CRITICAL: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4
    };
  }

  generateAlert(incident) {
    console.log("Generating alert for incident:", incident.incidentType);

    return {
      alertId: "ALERT-" + Date.now(),
      incidentType: incident.incidentType,
      message: incident.description,
      severity: incident.riskLevel,
      priority: this.priorityMap[incident.riskLevel] || 5,
      source: incident.source,
      ip: incident.ip,
      user: incident.user,
      status: "OPEN",
      createdAt: new Date(),
      acknowledged: false
    };
  }

  acknowledgeAlert(alert) {
    alert.status = "ACKNOWLEDGED";
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    return alert;
  }

  resolveAlert(alert) {
    alert.status = "RESOLVED";
    alert.resolvedAt = new Date();
    return alert;
  }

  routeNotification(alert) {
    if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
      console.log("Routing alert to ADMIN and SECURITY TEAM");
    } else {
      console.log("Routing alert to ANALYST");
    }
  }
}

module.exports = AlertManager;