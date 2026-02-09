class LogAnalyzer {
  constructor() {
    // Rules simulate Rules / Thresholds from UML
    this.rules = [
      { keyword: "failed login", risk: "HIGH", score: 8, type: "AUTH_ATTACK" },
      { keyword: "unauthorized", risk: "MEDIUM", score: 6, type: "ACCESS_VIOLATION" },
      { keyword: "sql injection", risk: "CRITICAL", score: 10, type: "INJECTION_ATTACK" },
      { keyword: "timeout", risk: "LOW", score: 3, type: "SYSTEM_ISSUE" },
      { keyword: "error", risk: "LOW", score: 2, type: "GENERIC_ERROR" }
    ];
  }

  // Normalize raw log input
  normalizeLog(log) {
    return {
      message: log.message.toLowerCase(),
      source: log.source || "UNKNOWN",
      ip: log.ip || "0.0.0.0",
      user: log.user || "anonymous",
      timestamp: log.timestamp || new Date()
    };
  }

  // Main analysis function
  analyze(log) {
    const normalizedLog = this.normalizeLog(log);
    let highestThreat = null;

    for (const rule of this.rules) {
      if (normalizedLog.message.includes(rule.keyword)) {
        highestThreat = {
          incidentDetected: true,
          incidentType: rule.type,
          riskLevel: rule.risk,
          severityScore: rule.score,
          description: log.message,
          source: normalizedLog.source,
          ip: normalizedLog.ip,
          user: normalizedLog.user,
          timestamp: normalizedLog.timestamp
        };
        break;
      }
    }

    if (highestThreat) {
      return highestThreat;
    }

    return {
      incidentDetected: false,
      incidentType: "NONE",
      riskLevel: "NONE",
      severityScore: 0,
      description: "No threat detected",
      source: normalizedLog.source,
      ip: normalizedLog.ip,
      user: normalizedLog.user,
      timestamp: normalizedLog.timestamp
    };
  }
}

module.exports = LogAnalyzer;