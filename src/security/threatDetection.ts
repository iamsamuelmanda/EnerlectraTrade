import crypto from 'crypto';
import QuantumResistantCrypto from './quantumCrypto';
import logger from '../utils/logger';

interface ThreatEvent {
  id: string;
  type: 'INTRUSION' | 'MALWARE' | 'DDOS' | 'PHISHING' | 'INSIDER_THREAT' | 'ZERO_DAY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  target: string;
  description: string;
  indicators: string[];
  confidence: number;
  timestamp: Date;
  status: 'DETECTED' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
}

interface ThreatIntelligence {
  id: string;
  threatType: string;
  indicators: string[];
  description: string;
  mitigation: string[];
  confidence: number;
  lastUpdated: Date;
  source: string;
}

class AdvancedThreatDetection {
  private static readonly THREAT_PATTERNS = {
    SQL_INJECTION: /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|into|where|table|database)\b)/i,
    XSS: /<script[^>]*>.*?<\/script>/gi,
    PATH_TRAVERSAL: /\.\.\/|\.\.\\/,
    COMMAND_INJECTION: /(\b(cmd|powershell|bash|sh|exec|system|eval)\b)/i,
    DDOS_PATTERN: /(flood|overload|excessive|burst)/i
  };

  private static readonly ANOMALY_THRESHOLDS = {
    REQUEST_RATE: 1000, // requests per minute
    FAILED_LOGINS: 5, // failed login attempts per minute
    SUSPICIOUS_IPS: 10, // suspicious IPs per hour
    DATA_EXFILTRATION: 1000000 // bytes per minute
  };

  // Real-time threat detection
  static async detectThreats(
    request: any,
    userBehavior: any,
    networkActivity: any
  ): Promise<{ threats: ThreatEvent[]; riskScore: number; actions: string[] }> {
    const threats: ThreatEvent[] = [];
    let riskScore = 0;
    const actions: string[] = [];

    try {
      // 1. Pattern-based detection
      const patternThreats = await this.detectPatternThreats(request);
      threats.push(...patternThreats);

      // 2. Behavioral anomaly detection
      const behavioralThreats = await this.detectBehavioralThreats(userBehavior);
      threats.push(...behavioralThreats);

      // 3. Network anomaly detection
      const networkThreats = await this.detectNetworkThreats(networkActivity);
      threats.push(...networkThreats);

      // 4. AI-powered threat analysis
      const aiThreats = await this.aiThreatAnalysis(request, userBehavior, networkActivity);
      threats.push(...aiThreats);

      // 5. Calculate overall risk score
      riskScore = this.calculateRiskScore(threats);

      // 6. Determine required actions
      actions.push(...this.determineRequiredActions(threats, riskScore));

      // 7. Log threats for analysis
      await this.logThreats(threats);

      // 8. Trigger automated response if critical
      if (riskScore > 80) {
        await this.triggerAutomatedResponse(threats);
      }

    } catch (error) {
      logger.error('Threat detection failed:', error);
      threats.push({
        id: crypto.randomUUID(),
        type: 'ZERO_DAY',
        severity: 'CRITICAL',
        source: 'SYSTEM',
        target: 'THREAT_DETECTION',
        description: 'Threat detection system failure',
        indicators: ['SYSTEM_ERROR', 'DETECTION_FAILURE'],
        confidence: 100,
        timestamp: new Date(),
        status: 'DETECTED'
      });
      riskScore = 100;
      actions.push('SYSTEM_RECOVERY', 'ADMIN_NOTIFICATION');
    }

    return { threats, riskScore, actions };
  }

  // Pattern-based threat detection
  private static async detectPatternThreats(request: any): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    const { url, method, headers, body } = request;

    // Check for SQL injection
    if (this.THREAT_PATTERNS.SQL_INJECTION.test(url + JSON.stringify(body))) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INTRUSION',
        severity: 'HIGH',
        source: request.ip || 'UNKNOWN',
        target: url,
        description: 'Potential SQL injection attempt detected',
        indicators: ['SQL_INJECTION_PATTERN', 'MALICIOUS_PAYLOAD'],
        confidence: 85,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for XSS
    if (this.THREAT_PATTERNS.XSS.test(url + JSON.stringify(body))) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'MALWARE',
        severity: 'HIGH',
        source: request.ip || 'UNKNOWN',
        target: url,
        description: 'Potential XSS attack detected',
        indicators: ['XSS_PATTERN', 'MALICIOUS_SCRIPT'],
        confidence: 90,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for path traversal
    if (this.THREAT_PATTERNS.PATH_TRAVERSAL.test(url)) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INTRUSION',
        severity: 'MEDIUM',
        source: request.ip || 'UNKNOWN',
        target: url,
        description: 'Potential path traversal attempt detected',
        indicators: ['PATH_TRAVERSAL_PATTERN', 'DIRECTORY_ACCESS'],
        confidence: 75,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for command injection
    if (this.THREAT_PATTERNS.COMMAND_INJECTION.test(url + JSON.stringify(body))) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INTRUSION',
        severity: 'CRITICAL',
        source: request.ip || 'UNKNOWN',
        target: url,
        description: 'Potential command injection attempt detected',
        indicators: ['COMMAND_INJECTION_PATTERN', 'SYSTEM_COMMAND'],
        confidence: 95,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    return threats;
  }

  // Behavioral anomaly detection
  private static async detectBehavioralThreats(userBehavior: any): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];

    // Check for unusual login patterns
    if (userBehavior.failedLogins > this.ANOMALY_THRESHOLDS.FAILED_LOGINS) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INTRUSION',
        severity: 'HIGH',
        source: userBehavior.ip || 'UNKNOWN',
        target: 'AUTHENTICATION_SYSTEM',
        description: 'Excessive failed login attempts detected',
        indicators: ['FAILED_LOGIN_SPIKE', 'BRUTE_FORCE_ATTEMPT'],
        confidence: 80,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for unusual access patterns
    if (userBehavior.unusualAccess) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INSIDER_THREAT',
        severity: 'MEDIUM',
        source: userBehavior.userId || 'UNKNOWN',
        target: 'SYSTEM_RESOURCES',
        description: 'Unusual access pattern detected',
        indicators: ['UNUSUAL_ACCESS_TIME', 'UNUSUAL_RESOURCE_ACCESS'],
        confidence: 70,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for data exfiltration
    if (userBehavior.dataTransfer > this.ANOMALY_THRESHOLDS.DATA_EXFILTRATION) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INSIDER_THREAT',
        severity: 'CRITICAL',
        source: userBehavior.userId || 'UNKNOWN',
        target: 'SENSITIVE_DATA',
        description: 'Potential data exfiltration detected',
        indicators: ['LARGE_DATA_TRANSFER', 'UNUSUAL_EXPORT'],
        confidence: 90,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    return threats;
  }

  // Network anomaly detection
  private static async detectNetworkThreats(networkActivity: any): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];

    // Check for DDoS attacks
    if (networkActivity.requestRate > this.ANOMALY_THRESHOLDS.REQUEST_RATE) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'DDOS',
        severity: 'HIGH',
        source: 'MULTIPLE_IPS',
        target: 'NETWORK_INFRASTRUCTURE',
        description: 'Potential DDoS attack detected',
        indicators: ['HIGH_REQUEST_RATE', 'MULTIPLE_SOURCES'],
        confidence: 85,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Check for suspicious IP addresses
    if (networkActivity.suspiciousIPs > this.ANOMALY_THRESHOLDS.SUSPICIOUS_IPS) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INTRUSION',
        severity: 'MEDIUM',
        source: 'SUSPICIOUS_IPS',
        target: 'NETWORK_ACCESS',
        description: 'Multiple suspicious IP addresses detected',
        indicators: ['SUSPICIOUS_IP_SPIKE', 'REPUTATION_VIOLATION'],
        confidence: 75,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    return threats;
  }

  // AI-powered threat analysis
  private static async aiThreatAnalysis(
    request: any,
    userBehavior: any,
    networkActivity: any
  ): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];

    // This would integrate with AI/ML models for advanced threat detection
    // For now, implementing heuristic-based analysis

    // Analyze request patterns
    const requestAnomaly = this.analyzeRequestPatterns(request);
    if (requestAnomaly.score > 0.8) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'ZERO_DAY',
        severity: 'HIGH',
        source: request.ip || 'UNKNOWN',
        target: 'AI_DETECTION',
        description: 'AI detected anomalous request pattern',
        indicators: ['AI_ANOMALY_DETECTION', 'PATTERN_ANALYSIS'],
        confidence: requestAnomaly.score * 100,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    // Analyze user behavior patterns
    const behaviorAnomaly = this.analyzeBehaviorPatterns(userBehavior);
    if (behaviorAnomaly.score > 0.8) {
      threats.push({
        id: crypto.randomUUID(),
        type: 'INSIDER_THREAT',
        severity: 'MEDIUM',
        source: userBehavior.userId || 'UNKNOWN',
        target: 'USER_BEHAVIOR',
        description: 'AI detected anomalous user behavior',
        indicators: ['AI_BEHAVIOR_ANALYSIS', 'PATTERN_DEVIATION'],
        confidence: behaviorAnomaly.score * 100,
        timestamp: new Date(),
        status: 'DETECTED'
      });
    }

    return threats;
  }

  // Calculate overall risk score
  private static calculateRiskScore(threats: ThreatEvent[]): number {
    if (threats.length === 0) return 0;

    let totalScore = 0;
    let maxScore = 0;

    threats.forEach(threat => {
      const severityScore = this.getSeverityScore(threat.severity);
      const weightedScore = severityScore * (threat.confidence / 100);
      
      totalScore += weightedScore;
      maxScore = Math.max(maxScore, weightedScore);
    });

    // Weight recent threats more heavily
    const recentThreats = threats.filter(t => 
      Date.now() - t.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentThreats.length > 0) {
      totalScore *= 1.5; // 50% increase for recent threats
    }

    return Math.min(100, Math.round(totalScore));
  }

  // Determine required actions based on threats
  private static determineRequiredActions(threats: ThreatEvent[], riskScore: number): string[] {
    const actions: string[] = [];

    if (riskScore > 80) {
      actions.push('EMERGENCY_RESPONSE', 'SYSTEM_LOCKDOWN', 'ADMIN_ALERT');
    } else if (riskScore > 60) {
      actions.push('ENHANCED_MONITORING', 'ADDITIONAL_VERIFICATION', 'ADMIN_NOTIFICATION');
    } else if (riskScore > 30) {
      actions.push('INCREASED_LOGGING', 'PATTERN_ANALYSIS');
    }

    // Add specific actions based on threat types
    threats.forEach(threat => {
      if (threat.type === 'DDOS') {
        actions.push('RATE_LIMITING', 'IP_BLACKLISTING', 'CDN_PROTECTION');
      } else if (threat.type === 'SQL_INJECTION') {
        actions.push('INPUT_VALIDATION', 'WAF_ACTIVATION', 'DATABASE_MONITORING');
      } else if (threat.type === 'INSIDER_THREAT') {
        actions.push('USER_ACTIVITY_MONITORING', 'ACCESS_RESTRICTION', 'FORENSIC_ANALYSIS');
      }
    });

    return [...new Set(actions)]; // Remove duplicates
  }

  // Helper methods
  private static getSeverityScore(severity: string): number {
    const scores = {
      'LOW': 10,
      'MEDIUM': 30,
      'HIGH': 60,
      'CRITICAL': 100
    };
    return scores[severity] || 0;
  }

  private static analyzeRequestPatterns(request: any): { score: number } {
    // Simplified pattern analysis - in production, use ML models
    let score = 0;
    
    // Check for unusual HTTP methods
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
      score += 0.3;
    }

    // Check for unusual headers
    if (request.headers && Object.keys(request.headers).length > 20) {
      score += 0.2;
    }

    // Check for unusual payload size
    if (request.body && JSON.stringify(request.body).length > 10000) {
      score += 0.3;
    }

    return { score: Math.min(1, score) };
  }

  private static analyzeBehaviorPatterns(userBehavior: any): { score: number } {
    // Simplified behavior analysis - in production, use ML models
    let score = 0;
    
    // Check for unusual login times
    if (userBehavior.unusualLoginTime) {
      score += 0.4;
    }

    // Check for unusual resource access
    if (userBehavior.unusualResourceAccess) {
      score += 0.3;
    }

    // Check for unusual data patterns
    if (userBehavior.unusualDataPatterns) {
      score += 0.3;
    }

    return { score: Math.min(1, score) };
  }

  // Placeholder methods for external integrations
  private static async logThreats(threats: ThreatEvent[]): Promise<void> {
    // Implementation for logging threats
    threats.forEach(threat => {
      logger.warn('Threat detected', threat);
    });
  }

  private static async triggerAutomatedResponse(threats: ThreatEvent[]): Promise<void> {
    // Implementation for automated threat response
    logger.info('Automated response triggered for critical threats', { count: threats.length });
  }
}

export default AdvancedThreatDetection; 