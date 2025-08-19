import crypto from 'crypto';
import QuantumResistantCrypto from './quantumCrypto.js';
import logger from '../utils/logger.js';

// Database security interfaces
interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  version: string;
  timestamp: number;
}

interface DatabaseAuditLog {
  id: string;
  userId: string;
  action: string;
  table: string;
  recordId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  quantumSignature: string;
  riskScore: number;
}

interface FinancialTransaction {
  id: string;
  userId: string;
  type: 'energy_trade' | 'mobile_money' | 'blockchain' | 'withdrawal' | 'deposit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'suspicious';
  metadata: any;
  timestamp: Date;
  encrypted: boolean;
  auditTrail: string[];
}

// Enterprise-grade database security system
class DatabaseSecurity {
  private static readonly ENCRYPTION_VERSION = 'v2.0';
  private static readonly MASTER_KEY_SIZE = 512; // 512-bit master key
  private static readonly FIELD_ENCRYPTION_KEY_SIZE = 256; // 256-bit field keys
  private static readonly AUDIT_LOG_RETENTION_DAYS = 2555; // 7 years for financial records
  
  private masterKey: Buffer;
  private fieldKeys: Map<string, Buffer>;
  private auditLogs: DatabaseAuditLog[];
  private suspiciousTransactions: Set<string>;
  private riskThresholds: Map<string, number>;

  constructor() {
    this.masterKey = crypto.randomBytes(this.MASTER_KEY_SIZE / 8);
    this.fieldKeys = new Map();
    this.auditLogs = [];
    this.suspiciousTransactions = new Set();
    this.riskThresholds = new Map();
    
    // Initialize risk thresholds
    this.initializeRiskThresholds();
    
    logger.security('Database security system initialized with 512-bit master key');
  }

  // Initialize risk thresholds for different transaction types
  private initializeRiskThresholds(): void {
    this.riskThresholds.set('energy_trade', 0.3);
    this.riskThresholds.set('mobile_money', 0.5);
    this.riskThresholds.set('blockchain', 0.2);
    this.riskThresholds.set('withdrawal', 0.7);
    this.riskThresholds.set('deposit', 0.4);
  }

  // Generate field-specific encryption keys
  private generateFieldKey(fieldName: string): Buffer {
    if (!this.fieldKeys.has(fieldName)) {
      const fieldKey = crypto.pbkdf2Sync(
        this.masterKey,
        Buffer.from(fieldName, 'utf8'),
        100000, // 100K iterations
        this.FIELD_ENCRYPTION_KEY_SIZE / 8,
        'sha3-512'
      );
      this.fieldKeys.set(fieldName, fieldKey);
    }
    return this.fieldKeys.get(fieldName)!;
  }

  // Encrypt sensitive database fields
  async encryptField(fieldName: string, data: string): Promise<EncryptedData> {
    try {
      const fieldKey = this.generateFieldKey(fieldName);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', fieldKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      const encryptedData: EncryptedData = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: this.ENCRYPTION_VERSION,
        timestamp: Date.now()
      };
      
      logger.security(`Field '${fieldName}' encrypted successfully`);
      return encryptedData;
      
    } catch (error) {
      logger.error(`Field encryption failed for '${fieldName}':`, error);
      throw new Error(`Field encryption failed: ${error}`);
    }
  }

  // Decrypt sensitive database fields
  async decryptField(fieldName: string, encryptedData: EncryptedData): Promise<string> {
    try {
      const fieldKey = this.generateFieldKey(fieldName);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', fieldKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.security(`Field '${fieldName}' decrypted successfully`);
      return decrypted;
      
    } catch (error) {
      logger.error(`Field decryption failed for '${fieldName}':`, error);
      throw new Error(`Field decryption failed: ${error}`);
    }
  }

  // Create comprehensive audit log entry
  async createAuditLog(
    userId: string,
    action: string,
    table: string,
    recordId: string,
    oldValue?: any,
    newValue?: any,
    ipAddress: string = 'unknown',
    userAgent: string = 'unknown'
  ): Promise<string> {
    try {
      const auditLog: DatabaseAuditLog = {
        id: crypto.randomUUID(),
        userId,
        action,
        table,
        recordId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress,
        userAgent,
        timestamp: new Date(),
        quantumSignature: '',
        riskScore: 0
      };

      // Calculate risk score
      auditLog.riskScore = await this.calculateRiskScore(auditLog);
      
      // Generate quantum signature for audit log integrity
      const auditData = JSON.stringify({
        id: auditLog.id,
        userId: auditLog.userId,
        action: auditLog.action,
        table: auditLog.table,
        recordId: auditLog.recordId,
        timestamp: auditLog.timestamp.toISOString()
      });
      
      auditLog.quantumSignature = await QuantumResistantCrypto.sign(auditData, this.masterKey.toString('hex'));
      
      // Store audit log
      this.auditLogs.push(auditLog);
      
      // Clean old audit logs
      this.cleanOldAuditLogs();
      
      logger.security(`Audit log created: ${action} on ${table}.${recordId} by ${userId}`);
      return auditLog.id;
      
    } catch (error) {
      logger.error('Audit log creation failed:', error);
      throw new Error(`Audit log creation failed: ${error}`);
    }
  }

  // Calculate risk score for audit log
  private async calculateRiskScore(auditLog: DatabaseAuditLog): Promise<number> {
    let riskScore = 0;
    
    // Base risk for different actions
    const actionRisk = {
      'CREATE': 0.1,
      'READ': 0.05,
      'UPDATE': 0.3,
      'DELETE': 0.8,
      'TRANSFER': 0.6,
      'WITHDRAWAL': 0.7,
      'DEPOSIT': 0.4
    };
    
    riskScore += actionRisk[auditLog.action as keyof typeof actionRisk] || 0.5;
    
    // Risk based on table
    if (auditLog.table.includes('financial') || auditLog.table.includes('transaction')) {
      riskScore += 0.3;
    }
    
    // Risk based on IP address (simplified)
    if (auditLog.ipAddress !== 'unknown' && !auditLog.ipAddress.startsWith('192.168.')) {
      riskScore += 0.2;
    }
    
    // Risk based on time (off-hours)
    const hour = auditLog.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.1;
    }
    
    return Math.min(riskScore, 1.0);
  }

  // Clean old audit logs
  private cleanOldAuditLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.AUDIT_LOG_RETENTION_DAYS);
    
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
    
    logger.security(`Cleaned old audit logs, retained ${this.auditLogs.length} logs`);
  }

  // Monitor financial transactions for fraud
  async monitorFinancialTransaction(transaction: FinancialTransaction): Promise<{
    isSuspicious: boolean;
    riskScore: number;
    alerts: string[];
    recommendations: string[];
  }> {
    try {
      let riskScore = 0;
      const alerts: string[] = [];
      const recommendations: string[] = [];
      
      // Amount-based risk
      if (transaction.amount > 10000) {
        riskScore += 0.3;
        alerts.push('High-value transaction detected');
        recommendations.push('Require additional verification for high-value transactions');
      }
      
      // Frequency-based risk
      const recentTransactions = this.auditLogs.filter(log => 
        log.userId === transaction.userId &&
        log.action === 'TRANSFER' &&
        log.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );
      
      if (recentTransactions.length > 10) {
        riskScore += 0.4;
        alerts.push('High transaction frequency detected');
        recommendations.push('Implement rate limiting for user transactions');
      }
      
      // Pattern-based risk
      if (this.suspiciousTransactions.has(transaction.userId)) {
        riskScore += 0.5;
        alerts.push('User has suspicious transaction history');
        recommendations.push('Flag user for manual review');
      }
      
      // Geographic risk (simplified)
      const suspiciousIPs = ['10.0.0.1', '172.16.0.1']; // Example
      if (transaction.metadata?.ipAddress && suspiciousIPs.includes(transaction.metadata.ipAddress)) {
        riskScore += 0.6;
        alerts.push('Suspicious IP address detected');
        recommendations.push('Block transactions from suspicious IP addresses');
      }
      
      const isSuspicious = riskScore > 0.7;
      
      if (isSuspicious) {
        this.suspiciousTransactions.add(transaction.userId);
        logger.threat(`Suspicious transaction detected: ${transaction.id}, Risk: ${riskScore.toFixed(2)}`);
      }
      
      return {
        isSuspicious,
        riskScore: Math.min(riskScore, 1.0),
        alerts,
        recommendations
      };
      
    } catch (error) {
      logger.error('Transaction monitoring failed:', error);
      throw new Error(`Transaction monitoring failed: ${error}`);
    }
  }

  // Encrypt entire database records
  async encryptRecord(table: string, record: any): Promise<any> {
    try {
      const encryptedRecord: any = { ...record };
      
      // Define sensitive fields for each table
      const sensitiveFields: { [key: string]: string[] } = {
        users: ['phone', 'email', 'nationalId', 'bankAccount'],
        transactions: ['amount', 'metadata', 'userDetails'],
        energy_offers: ['price', 'userDetails'],
        mobile_money: ['phoneNumber', 'amount', 'reference'],
        blockchain: ['privateKey', 'signature', 'metadata']
      };
      
      const fieldsToEncrypt = sensitiveFields[table] || [];
      
      for (const field of fieldsToEncrypt) {
        if (record[field] && typeof record[field] === 'string') {
          encryptedRecord[field] = await this.encryptField(field, record[field]);
        }
      }
      
      // Mark record as encrypted
      encryptedRecord._encrypted = true;
      encryptedRecord._encryptionVersion = this.ENCRYPTION_VERSION;
      encryptedRecord._encryptedAt = new Date();
      
      logger.security(`Record encrypted for table '${table}'`);
      return encryptedRecord;
      
    } catch (error) {
      logger.error(`Record encryption failed for table '${table}':`, error);
      throw new Error(`Record encryption failed: ${error}`);
    }
  }

  // Decrypt entire database records
  async decryptRecord(table: string, record: any): Promise<any> {
    try {
      if (!record._encrypted) {
        return record; // Not encrypted
      }
      
      const decryptedRecord: any = { ...record };
      
      // Define sensitive fields for each table
      const sensitiveFields: { [key: string]: string[] } = {
        users: ['phone', 'email', 'nationalId', 'bankAccount'],
        transactions: ['amount', 'metadata', 'userDetails'],
        energy_offers: ['price', 'userDetails'],
        mobile_money: ['phoneNumber', 'amount', 'reference'],
        blockchain: ['privateKey', 'signature', 'metadata']
      };
      
      const fieldsToDecrypt = sensitiveFields[table] || [];
      
      for (const field of fieldsToDecrypt) {
        if (record[field] && record[field].encrypted) {
          decryptedRecord[field] = await this.decryptField(field, record[field]);
        }
      }
      
      // Remove encryption metadata
      delete decryptedRecord._encrypted;
      delete decryptedRecord._encryptionVersion;
      delete decryptedRecord._encryptedAt;
      
      logger.security(`Record decrypted for table '${table}'`);
      return decryptedRecord;
      
    } catch (error) {
      logger.error(`Record decryption failed for table '${table}':`, error);
      throw new Error(`Record decryption failed: ${error}`);
    }
  }

  // Get database security status
  getSecurityStatus(): {
    encryptionEnabled: boolean;
    masterKeySize: number;
    fieldKeysCount: number;
    auditLogsCount: number;
    suspiciousUsersCount: number;
    lastAuditCleanup: Date;
    encryptionVersion: string;
  } {
    return {
      encryptionEnabled: true,
      masterKeySize: this.MASTER_KEY_SIZE,
      fieldKeysCount: this.fieldKeys.size,
      auditLogsCount: this.auditLogs.length,
      suspiciousUsersCount: this.suspiciousTransactions.size,
      lastAuditCleanup: new Date(),
      encryptionVersion: this.ENCRYPTION_VERSION
    };
  }

  // Export audit logs for compliance
  exportAuditLogs(startDate: Date, endDate: Date): DatabaseAuditLog[] {
    return this.auditLogs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );
  }

  // Get risk analysis report
  getRiskAnalysisReport(): {
    totalTransactions: number;
    suspiciousTransactions: number;
    highRiskUsers: number;
    averageRiskScore: number;
    topRiskFactors: string[];
    recommendations: string[];
  } {
    const totalTransactions = this.auditLogs.filter(log => 
      log.action === 'TRANSFER' || log.action === 'WITHDRAWAL' || log.action === 'DEPOSIT'
    ).length;
    
    const suspiciousTransactions = this.auditLogs.filter(log => log.riskScore > 0.7).length;
    const highRiskUsers = this.suspiciousTransactions.size;
    const averageRiskScore = this.auditLogs.reduce((sum, log) => sum + log.riskScore, 0) / this.auditLogs.length;
    
    const riskFactors = ['High transaction frequency', 'Large amounts', 'Suspicious IPs', 'Off-hours activity'];
    const recommendations = [
      'Implement real-time fraud detection',
      'Add multi-factor authentication for high-risk transactions',
      'Monitor geographic patterns',
      'Set up automated alerts for suspicious activity'
    ];
    
    return {
      totalTransactions,
      suspiciousTransactions,
      highRiskUsers,
      averageRiskScore: averageRiskScore || 0,
      topRiskFactors: riskFactors,
      recommendations
    };
  }
}

export default DatabaseSecurity;
export type { EncryptedData, DatabaseAuditLog, FinancialTransaction }; 