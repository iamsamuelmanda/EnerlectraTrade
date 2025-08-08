export interface User {
  id: string;
  name: string;
  balanceZMW: number;
  balanceKWh: number;
  phoneNumber?: string;
  blockchainAddress?: string; // Add blockchain address
}

export interface Cluster {
  id: string;
  location: string;
  capacityKWh: number;
  availableKWh: number;
  pricePerKWh: number;
  blockchainAddress?: string; // For cluster wallet
}

export interface Transaction {
  id: string;
  type: 'trade' | 'lease' | 'purchase' | 'blockchain_transfer';
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
  blockchainTradeId?: string; // Add trade ID
}

// Add blockchain-specific response types
export interface BlockchainTransaction {
  txHash: string;
  tradeId?: string;
  from: string;
  to: string;
  kWh: number;
  amountZMW?: number;
}

export interface TokenBalance {
  address: string;
  balance: string; // In kWh
}

// USSD types
export interface USSDRequest {
  text?: string;
  phoneNumber: string;
  sessionId: string;
}

export interface USSDResponse {
  text: string;
  continueSession: boolean;
}

// Extend API response for blockchain
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  blockchainData?: BlockchainTransaction; // Add blockchain metadata
  retryAfter?: string; // For rate limiting responses
  errorId?: string; // For error tracking
  suggestions?: string[]; // For helpful suggestions
  support?: string; // For support contact information
}