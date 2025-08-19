import { Request, Response, NextFunction } from 'express';
import MilitaryGradeAuth from '../security/militaryAuth';
import QuantumResistantCrypto from '../security/quantumCrypto';
import AdvancedThreatDetection from '../security/threatDetection';
import ZeroTrustNetwork from '../security/zeroTrust';
import logger from '../utils/logger';

interface SecurityContext {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  requiredActions: string[];
  sessionValid: boolean;
  mfaRequired: boolean;
  accessGranted: boolean;
}

class MilitaryGradeSecurityMiddleware {
  private static readonly MAX_REQUESTS_PER_MINUTE = 100;
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  private static readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private failedAttempts: Map<string, { count: number; lastAttempt: number; blockedUntil: number }> = new Map();
  private blockedIPs: Map<string, number> = new Map();

  // Main security middleware
  static async secureRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // 1. IP Blocking Check
      if (this.isIPBlocked(clientIP)) {
        logger.warn(`Blocked IP attempted access: ${clientIP}`);
        return res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'IP address is temporarily blocked due to security violations'
        });
      }

      // 2. Rate Limiting
      if (!this.checkRateLimit(clientIP)) {
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.'
        });
      }

      // 3. Threat Detection
      const threatAssessment = await AdvancedThreatDetection.detectThreats(
        { ip: clientIP, url: req.url, method: req.method, headers: req.headers, body: req.body },
        { ip: clientIP, userAgent, timestamp: new Date() },
        { requestRate: this.getRequestRate(clientIP), suspiciousIPs: this.getSuspiciousIPs() }
      );

      // 4. Zero-Trust Network Verification
      const networkAccess = await ZeroTrustNetwork.verifyAccess(
        clientIP,
        req.headers.host || 'unknown',
        parseInt(req.headers['x-forwarded-port'] as string) || 80,
        req.protocol,
        req.headers['x-user-id'] as string || 'anonymous',
        req.headers['x-session-id'] as string || 'none'
      );

      // 5. Session Security Verification
      const sessionValid = await this.verifySessionSecurity(req);

      // 6. Risk Assessment
      const securityContext = await this.assessSecurityRisk(
        clientIP,
        userAgent,
        threatAssessment,
        networkAccess,
        sessionValid
      );

      // 7. Apply Security Measures
      if (!await this.applySecurityMeasures(securityContext, req, res)) {
        return; // Response already sent
      }

      // 8. Log Security Event
      await this.logSecurityEvent(req, securityContext, Date.now() - startTime);

      // 9. Add Security Headers
      this.addSecurityHeaders(res, securityContext);

      // 10. Continue to next middleware
      next();

    } catch (error) {
      logger.error('Security middleware error:', error);
      
      // Fail securely - deny access on error
      res.status(500).json({
        success: false,
        error: 'Security System Error',
        message: 'Access denied due to security system failure'
      });
    }
  }

  // Verify session security
  private static async verifySessionSecurity(req: Request): Promise<{ valid: boolean; sessionId?: string }> {
    try {
      const sessionId = req.headers['x-session-id'] as string || req.cookies?.sessionId;
      if (!sessionId) {
        return { valid: false };
      }

      // This would integrate with MilitaryGradeAuth
      // For now, return a basic validation
      return { valid: true, sessionId };
    } catch (error) {
      logger.error('Session verification failed:', error);
      return { valid: false };
    }
  }

  // Assess overall security risk
  private static async assessSecurityRisk(
    clientIP: string,
    userAgent: string,
    threatAssessment: any,
    networkAccess: any,
    sessionValid: any
  ): Promise<SecurityContext> {
    let riskScore = 0;
    const requiredActions: string[] = [];
    let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    // Base risk from threat detection
    riskScore += threatAssessment.riskScore;

    // Network access risk
    if (!networkAccess.allowed) {
      riskScore += 50;
      requiredActions.push('NETWORK_ACCESS_DENIED');
    }

    // Session risk
    if (!sessionValid.valid) {
      riskScore += 30;
      requiredActions.push('SESSION_VERIFICATION_REQUIRED');
    }

    // Determine threat level
    if (riskScore > 80) {
      threatLevel = 'CRITICAL';
    } else if (riskScore > 60) {
      threatLevel = 'HIGH';
    } else if (riskScore > 30) {
      threatLevel = 'MEDIUM';
    }

    return {
      threatLevel,
      riskScore,
      requiredActions,
      sessionValid: sessionValid.valid,
      mfaRequired: riskScore > 50,
      accessGranted: riskScore < 80
    };
  }

  // Apply security measures based on risk assessment
  private static async applySecurityMeasures(
    securityContext: SecurityContext,
    req: Request,
    res: Response
  ): Promise<boolean> {
    try {
      // Critical threat - immediate block
      if (securityContext.threatLevel === 'CRITICAL') {
        this.blockIP(req.ip || 'unknown');
        res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'Critical security threat detected. Access blocked.',
          requiredActions: securityContext.requiredActions
        });
        return false;
      }

      // High threat - require additional verification
      if (securityContext.threatLevel === 'HIGH') {
        if (securityContext.mfaRequired) {
          res.status(401).json({
            success: false,
            error: 'Additional Verification Required',
            message: 'Multi-factor authentication required due to security risk.',
            requiredActions: securityContext.requiredActions
          });
          return false;
        }
      }

      // Medium threat - enhanced monitoring
      if (securityContext.threatLevel === 'MEDIUM') {
        // Add enhanced logging and monitoring
        req.headers['x-security-risk'] = 'medium';
        req.headers['x-enhanced-monitoring'] = 'true';
      }

      return true;
    } catch (error) {
      logger.error('Security measures application failed:', error);
      return false;
    }
  }

  // Add security headers
  private static addSecurityHeaders(res: Response, securityContext: SecurityContext): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Custom security headers
    res.setHeader('X-Security-Level', securityContext.threatLevel);
    res.setHeader('X-Risk-Score', securityContext.riskScore.toString());
    res.setHeader('X-Required-Actions', securityContext.requiredActions.join(', '));
  }

  // Rate limiting
  private static checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const clientData = this.requestCounts.get(clientIP);

    if (!clientData || now > clientData.resetTime) {
      this.requestCounts.set(clientIP, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (clientData.count >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    clientData.count++;
    return true;
  }

  // IP blocking
  private static isIPBlocked(clientIP: string): boolean {
    const blockedUntil = this.blockedIPs.get(clientIP);
    if (!blockedUntil) return false;

    if (Date.now() > blockedUntil) {
      this.blockedIPs.delete(clientIP);
      return false;
    }

    return true;
  }

  // Block IP address
  private static blockIP(clientIP: string): void {
    this.blockedIPs.set(clientIP, Date.now() + this.BLOCK_DURATION);
    logger.warn(`IP address blocked: ${clientIP}`);
  }

  // Get request rate for IP
  private static getRequestRate(clientIP: string): number {
    const clientData = this.requestCounts.get(clientIP);
    if (!clientData) return 0;
    return clientData.count;
  }

  // Get suspicious IPs
  private static getSuspiciousIPs(): string[] {
    const suspicious: string[] = [];
    for (const [ip, data] of this.requestCounts.entries()) {
      if (data.count > this.MAX_REQUESTS_PER_MINUTE * 0.8) {
        suspicious.push(ip);
      }
    }
    return suspicious;
  }

  // Log security event
  private static async logSecurityEvent(req: Request, securityContext: SecurityContext, processingTime: number): Promise<void> {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      ip: req.ip || 'unknown',
      url: req.url,
      method: req.method,
      userAgent: req.headers['user-agent'] || 'unknown',
      threatLevel: securityContext.threatLevel,
      riskScore: securityContext.riskScore,
      requiredActions: securityContext.requiredActions,
      processingTime,
      sessionValid: securityContext.sessionValid,
      mfaRequired: securityContext.mfaRequired,
      accessGranted: securityContext.accessGranted
    };

    logger.info('Security event logged', securityEvent);

    // Store in security audit log
    await this.storeSecurityAuditLog(securityEvent);
  }

  // Store security audit log
  private static async storeSecurityAuditLog(event: any): Promise<void> {
    // Implementation for storing security audit logs
    // This would integrate with a secure logging system
  }

  // Additional security middleware methods
  static async requireMFA(req: Request, res: Response, next: NextFunction): Promise<void> {
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required',
        message: 'Valid session required'
      });
    }

    // Verify MFA status
    const mfaVerified = await this.verifyMFAStatus(sessionId);
    if (!mfaVerified) {
      return res.status(401).json({
        success: false,
        error: 'MFA Required',
        message: 'Multi-factor authentication required'
      });
    }

    next();
  }

  static async requireQuantumSignature(req: Request, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['x-quantum-signature'] as string;
    const data = req.body;
    const publicKey = req.headers['x-public-key'] as string;

    if (!signature || !publicKey) {
      return res.status(401).json({
        success: false,
        error: 'Quantum Signature Required',
        message: 'Valid quantum signature required'
      });
    }

    // Verify quantum signature
    const isValid = await QuantumResistantCrypto.verify(
      JSON.stringify(data),
      signature,
      publicKey
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Quantum Signature',
        message: 'Quantum signature verification failed'
      });
    }

    next();
  }

  // Verify MFA status
  private static async verifyMFAStatus(sessionId: string): Promise<boolean> {
    // Implementation for verifying MFA status
    // This would integrate with MilitaryGradeAuth
    return true;
  }
}

export default MilitaryGradeSecurityMiddleware; 