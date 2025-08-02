export interface User {
  id: string;
  name: string;
  balanceZMW: number;
  balanceKWh: number;
  phoneNumber?: string;
}

export interface Cluster {
  id: string;
  location: string;
  capacityKWh: number;
  availableKWh: number;
  pricePerKWh: number;
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
}

export interface USSDRequest {
  text: string;
  phoneNumber: string;
}

export interface USSDResponse {
  text: string;
  continueSession: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
