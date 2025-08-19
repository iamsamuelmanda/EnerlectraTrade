export interface User {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  region?: string;
  balanceZMW: number;
  balanceKWh: number;
  blockchainAddress?: string;
  carbonSavings?: number;
  reputation?: number;
  clusters?: string[];
  createdAt?: string;
  lastLoginAt?: string;
  isVerified?: boolean;
  mfaEnabled?: boolean;
  securityLevel?: 'basic' | 'enhanced' | 'military';
  deviceTrustScore?: number;
  riskScore?: number;
  loginAttempts?: number;
  lockedUntil?: string;
  preferences?: {
    notifications?: boolean;
    twoFactorAuth?: boolean;
    biometricAuth?: boolean;
    sessionTimeout?: number;
  };
}

export interface Cluster {
  id: string;
  location: string;
  capacityKWh: number;
  availableKWh: number;
  pricePerKWh: number;
  blockchainAddress?: string;
  ownerId: string;
  status: 'active' | 'inactive' | 'maintenance';
  securityLevel: 'basic' | 'enhanced' | 'military';
  lastAudit: string;
  carbonOffset: number;
}

export interface Transaction {
  id: string;
  type: 'trade' | 'lease' | 'purchase' | 'blockchain_transfer' | 'mobile_money' | 'hybrid';
  timestamp: string;
  buyerId?: string;
  sellerId?: string;
  userId?: string;
  clusterId?: string;
  kWh: number;
  amountZMW: number;
  carbonSaved: number;
  blockchainTxHash?: string;
  paymentMethod?: 'blockchain' | 'mobile_money' | 'hybrid';
  blockchainTradeId?: string;
  securityLevel: 'basic' | 'enhanced' | 'military';
  verificationStatus: 'pending' | 'verified' | 'failed';
  riskScore: number;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
}

// Add blockchain-specific response types
export interface BlockchainTransaction {
  txHash: string;
  tradeId?: string;
  from: string;
  to: string;
  kWh: number;
  amountZMW?: number;
  gasUsed: string;
  blockNumber: number;
  confirmations: number;
  securityLevel: 'basic' | 'enhanced' | 'military';
}

export interface TokenBalance {
  address: string;
  balance: string; // In kWh
  lastUpdated: string;
  securityLevel: 'basic' | 'enhanced' | 'military';
}

// USSD types
export interface USSDRequest {
  text?: string;
  phoneNumber: string;
  sessionId: string;
  deviceId?: string;
  securityLevel?: 'basic' | 'enhanced' | 'military';
}

export interface USSDResponse {
  text: string;
  continueSession: boolean;
  securityLevel?: 'basic' | 'enhanced' | 'military';
  requiresMFA?: boolean;
}

// Security and authentication types
export interface AuthSession {
  id: string;
  userId: string;
  refreshToken: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastUsed: string;
  expiresAt: string;
  isActive: boolean;
  securityLevel: 'basic' | 'enhanced' | 'military';
  mfaVerified: boolean;
  riskScore: number;
  location?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
}

export interface SecurityContext {
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: string[];
  requiredMFA: string[];
  sessionTimeout: number;
  maxAttempts: number;
  securityLevel: 'basic' | 'enhanced' | 'military';
}

export interface MFAChallenge {
  id: string;
  userId: string;
  type: 'sms' | 'email' | 'authenticator' | 'biometric' | 'hardware_key';
  code?: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
}

// Extend API response for blockchain
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  blockchainData?: BlockchainTransaction;
  retryAfter?: string;
  errorId?: string;
  suggestions?: string[];
  support?: string;
  securityLevel?: 'basic' | 'enhanced' | 'military';
  requiresMFA?: boolean;
  riskScore?: number;
  threatLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}