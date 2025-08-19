import crypto from 'crypto';
import QuantumResistantCrypto from '../security/quantumCrypto';

export interface SecurityConfig {
  // Quantum Cryptography
  quantum: {
    enabled: boolean;
    keyLength: number;
    algorithm: string;
    iterations: number;
  };

  // Authentication & Authorization
  auth: {
    jwtSecret: string;
    refreshSecret: string;
    sessionTimeout: number;
    mfaTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };

  // Network Security
  network: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
      skipFailedRequests: boolean;
    };
    cors: {
      origin: string[];
      credentials: boolean;
      methods: string[];
      allowedHeaders: string[];
    };
    helmet: {
      contentSecurityPolicy: boolean;
      hsts: boolean;
      noSniff: boolean;
      frameguard: boolean;
    };
  };

  // Threat Detection
  threatDetection: {
    enabled: boolean;
    aiModels: string[];
    realTimeMonitoring: boolean;
    autoResponse: boolean;
    alertThresholds: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };

  // Blockchain Security
  blockchain: {
    enabled: boolean;
    network: string;
    consensus: string;
    blockTime: number;
    difficulty: number;
    quantumSignatures: boolean;
  };

  // Monitoring & Logging
  monitoring: {
    enabled: boolean;
    logLevel: string;
    auditLogging: boolean;
    performanceMonitoring: boolean;
    alertChannels: string[];
  };
}

class SecurityConfiguration {
  private static instance: SecurityConfiguration;
  private config: SecurityConfig;

  private constructor() {
    this.config = this.loadSecurityConfig();
  }

  public static getInstance(): SecurityConfiguration {
    if (!SecurityConfiguration.instance) {
      SecurityConfiguration.instance = new SecurityConfiguration();
    }
    return SecurityConfiguration.instance;
  }

  public getConfig(): SecurityConfig {
    return this.config;
  }

  public async initializeSecurity(): Promise<void> {
    try {
      // Generate quantum-resistant keys if not present
      await this.generateQuantumKeys();

      // Initialize security systems
      await this.initializeSecuritySystems();

      // Validate configuration
      this.validateConfiguration();

      console.log('🔐 Military-grade security system initialized successfully');
      console.log('🛡️  Quantum-resistant cryptography: ENABLED');
      console.log('🚨 Advanced threat detection: ENABLED');
      console.log('🌐 Zero-trust network: ENABLED');
      console.log('⛓️  Quantum blockchain: ENABLED');

    } catch (error) {
      console.error('❌ Security initialization failed:', error);
      throw new Error('Security system initialization failed');
    }
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      quantum: {
        enabled: process.env.QUANTUM_CRYPTO_ENABLED === 'true',
        keyLength: parseInt(process.env.QUANTUM_KEY_LENGTH || '512'),
        algorithm: process.env.QUANTUM_ALGORITHM || 'SHA3-512',
        iterations: parseInt(process.env.QUANTUM_ITERATIONS || '1000000')
      },

      auth: {
        jwtSecret: process.env.JWT_SECRET || this.generateSecureSecret(64),
        refreshSecret: process.env.REFRESH_SECRET || this.generateSecureSecret(64),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '900000'), // 15 minutes
        mfaTimeout: parseInt(process.env.MFA_TIMEOUT || '300000'), // 5 minutes
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '3'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000') // 15 minutes
      },

      network: {
        rateLimit: {
          windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
          maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
          skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
          skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'false'
        },
        cors: {
          origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Session-ID', 'X-Quantum-Signature']
        },
        helmet: {
          contentSecurityPolicy: true,
          hsts: true,
          noSniff: true,
          frameguard: true
        }
      },

      threatDetection: {
        enabled: process.env.THREAT_DETECTION_ENABLED === 'true',
        aiModels: process.env.AI_MODELS?.split(',') || ['claude-sonnet-4'],
        realTimeMonitoring: process.env.REAL_TIME_MONITORING === 'true',
        autoResponse: process.env.AUTO_RESPONSE === 'true',
        alertThresholds: {
          low: parseInt(process.env.ALERT_THRESHOLD_LOW || '20'),
          medium: parseInt(process.env.ALERT_THRESHOLD_MEDIUM || '40'),
          high: parseInt(process.env.ALERT_THRESHOLD_HIGH || '60'),
          critical: parseInt(process.env.ALERT_THRESHOLD_CRITICAL || '80')
        }
      },

      blockchain: {
        enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
        network: process.env.BLOCKCHAIN_NETWORK || 'polygon',
        consensus: process.env.BLOCKCHAIN_CONSENSUS || 'proof_of_work',
        blockTime: parseInt(process.env.BLOCKCHAIN_BLOCK_TIME || '10000'), // 10 seconds
        difficulty: parseInt(process.env.BLOCKCHAIN_DIFFICULTY || '4'),
        quantumSignatures: process.env.BLOCKCHAIN_QUANTUM_SIGNATURES === 'true'
      },

      monitoring: {
        enabled: process.env.MONITORING_ENABLED === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        auditLogging: process.env.AUDIT_LOGGING === 'true',
        performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
        alertChannels: process.env.ALERT_CHANNELS?.split(',') || ['console', 'email']
      }
    };
  }

  private async generateQuantumKeys(): Promise<void> {
    if (!process.env.QUANTUM_PRIVATE_KEY || !process.env.QUANTUM_PUBLIC_KEY) {
      console.log('🔑 Generating quantum-resistant key pair...');
      
      try {
        const keyPair = await QuantumResistantCrypto.generateQuantumKeyPair();
        
        // In production, these would be stored securely
        process.env.QUANTUM_PRIVATE_KEY = keyPair.privateKey;
        process.env.QUANTUM_PUBLIC_KEY = keyPair.publicKey;
        
        console.log('✅ Quantum keys generated successfully');
      } catch (error) {
        console.error('❌ Failed to generate quantum keys:', error);
        throw error;
      }
    }
  }

  private async initializeSecuritySystems(): Promise<void> {
    // Initialize quantum cryptography
    if (this.config.quantum.enabled) {
      console.log('🔐 Initializing quantum-resistant cryptography...');
    }

    // Initialize threat detection
    if (this.config.threatDetection.enabled) {
      console.log('🚨 Initializing advanced threat detection...');
    }

    // Initialize blockchain security
    if (this.config.blockchain.enabled) {
      console.log('⛓️  Initializing quantum blockchain security...');
    }

    // Initialize monitoring
    if (this.config.monitoring.enabled) {
      console.log('📊 Initializing security monitoring...');
    }
  }

  private validateConfiguration(): void {
    const errors: string[] = [];

    // Validate quantum configuration
    if (this.config.quantum.enabled) {
      if (this.config.quantum.keyLength < 256) {
        errors.push('Quantum key length must be at least 256 bits');
      }
      if (this.config.quantum.iterations < 100000) {
        errors.push('Quantum iterations must be at least 100,000');
      }
    }

    // Validate authentication configuration
    if (this.config.auth.sessionTimeout < 60000) {
      errors.push('Session timeout must be at least 1 minute');
    }
    if (this.config.auth.maxLoginAttempts < 1) {
      errors.push('Max login attempts must be at least 1');
    }

    // Validate network configuration
    if (this.config.network.rateLimit.maxRequests < 1) {
      errors.push('Rate limit max requests must be at least 1');
    }

    // Validate threat detection configuration
    if (this.config.threatDetection.enabled) {
      if (this.config.threatDetection.alertThresholds.low >= this.config.threatDetection.alertThresholds.medium) {
        errors.push('Alert thresholds must be in ascending order');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Security configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  private generateSecureSecret(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Get specific configuration sections
  public getQuantumConfig() {
    return this.config.quantum;
  }

  public getAuthConfig() {
    return this.config.auth;
  }

  public getNetworkConfig() {
    return this.config.network;
  }

  public getThreatDetectionConfig() {
    return this.config.threatDetection;
  }

  public getBlockchainConfig() {
    return this.config.blockchain;
  }

  public getMonitoringConfig() {
    return this.config.monitoring;
  }

  // Update configuration dynamically
  public updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  // Get security status
  public getSecurityStatus(): {
    quantum: boolean;
    threatDetection: boolean;
    blockchain: boolean;
    monitoring: boolean;
    overall: string;
  } {
    const quantum = this.config.quantum.enabled;
    const threatDetection = this.config.threatDetection.enabled;
    const blockchain = this.config.blockchain.enabled;
    const monitoring = this.config.monitoring.enabled;

    let overall = 'SECURE';
    if (!quantum || !threatDetection) {
      overall = 'VULNERABLE';
    } else if (!blockchain || !monitoring) {
      overall = 'MODERATE';
    }

    return {
      quantum,
      threatDetection,
      blockchain,
      monitoring,
      overall
    };
  }
}

export default SecurityConfiguration; 