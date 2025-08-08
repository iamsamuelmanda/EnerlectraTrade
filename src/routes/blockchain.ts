import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import { User, Transaction, ApiResponse } from '../types';

const router = Router();

interface BlockchainTransaction {
  id: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amountZMW: number;
  kWh: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: number;
  confirmations: number;
  timestamp: string;
  createdAt: string;
}

interface WalletAddress {
  id: string;
  userId: string;
  address: string;
  privateKey: string; // In production, this would be encrypted
  type: 'energy_token' | 'payment_token';
  balance: number;
  isActive: boolean;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  userId: string;
  type: 'blockchain' | 'mobile_money' | 'hybrid';
  isDefault: boolean;
  blockchain?: {
    address: string;
    network: 'ethereum' | 'polygon' | 'bsc' | 'energy_chain';
    tokenAddress?: string;
  };
  mobileMoney?: {
    phoneNumber: string;
    provider: 'MTN' | 'Airtel' | 'Zamtel';
    accountName: string;
  };
  createdAt: string;
}

// Mock blockchain network simulation
class MockBlockchain {
  private static transactions: BlockchainTransaction[] = [];
  private static currentBlockNumber = 1000000;

  static async createTransaction(
    fromAddress: string,
    toAddress: string,
    amountZMW: number,
    kWh: number
  ): Promise<BlockchainTransaction> {
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const transaction: BlockchainTransaction = {
      id: generateId(),
      txHash,
      fromAddress,
      toAddress,
      amountZMW,
      kWh,
      status: 'pending',
      confirmations: 0,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.transactions.push(transaction);

    // Simulate blockchain confirmation (1-3 seconds)
    setTimeout(() => {
      this.confirmTransaction(txHash);
    }, Math.random() * 2000 + 1000);

    return transaction;
  }

  static confirmTransaction(txHash: string): void {
    const tx = this.transactions.find(t => t.txHash === txHash);
    if (tx) {
      tx.status = 'confirmed';
      tx.blockNumber = this.currentBlockNumber++;
      tx.confirmations = Math.floor(Math.random() * 10) + 1;
      tx.gasUsed = Math.floor(Math.random() * 50000) + 21000;
      tx.gasPrice = Math.floor(Math.random() * 20) + 5;
    }
  }

  static getTransaction(txHash: string): BlockchainTransaction | undefined {
    return this.transactions.find(t => t.txHash === txHash);
  }

  static getTransactionsByAddress(address: string): BlockchainTransaction[] {
    return this.transactions.filter(t => 
      t.fromAddress === address || t.toAddress === address
    );
  }
}

// POST /blockchain/wallet/create - Create blockchain wallet for user
router.post('/wallet/create', (req: Request, res: Response) => {
  try {
    const { userId, type = 'energy_token' } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID is required'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    // Generate mock wallet address
    const address = `0x${Math.random().toString(16).substr(2, 40)}`;
    const privateKey = `0x${Math.random().toString(16).substr(2, 64)}`;

    const wallets = readJsonFile<WalletAddress>('blockchain_wallets.json');
    
    // Check if user already has a wallet of this type
    const existingWallet = wallets.find(w => w.userId === userId && w.type === type);
    if (existingWallet) {
      const response: ApiResponse = {
        success: false,
        error: `User already has a ${type} wallet`
      };
      return res.status(400).json(response);
    }

    const newWallet: WalletAddress = {
      id: generateId(),
      userId,
      address,
      privateKey,
      type,
      balance: type === 'energy_token' ? user.balanceKWh : user.balanceZMW,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    wallets.push(newWallet);
    writeJsonFile('blockchain_wallets.json', wallets);

    const response: ApiResponse = {
      success: true,
      data: {
        walletId: newWallet.id,
        address: newWallet.address,
        type: newWallet.type,
        balance: newWallet.balance,
        network: 'energy_chain'
      },
      message: 'Blockchain wallet created successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Create wallet error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create blockchain wallet'
    };
    res.status(500).json(response);
  }
});

// POST /blockchain/transfer - Initiate blockchain transfer
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, amountZMW, kWh, paymentMethod = 'blockchain' } = req.body;

    if (!fromUserId || !toUserId || (!amountZMW && !kWh)) {
      const response: ApiResponse = {
        success: false,
        error: 'fromUserId, toUserId, and either amountZMW or kWh are required'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);

    if (!fromUser || !toUser) {
      const response: ApiResponse = {
        success: false,
        error: 'One or both users not found'
      };
      return res.status(404).json(response);
    }

    const wallets = readJsonFile<WalletAddress>('blockchain_wallets.json');
    const fromWallet = wallets.find(w => w.userId === fromUserId && w.isActive);
    const toWallet = wallets.find(w => w.userId === toUserId && w.isActive);

    if (!fromWallet || !toWallet) {
      const response: ApiResponse = {
        success: false,
        error: 'Blockchain wallets not found for one or both users'
      };
      return res.status(404).json(response);
    }

    // Validate sufficient balance
    const transferAmount = amountZMW || 0;
    const transferEnergy = kWh || 0;

    if (transferAmount > 0 && fromUser.balanceZMW < transferAmount) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient ZMW balance'
      };
      return res.status(400).json(response);
    }

    if (transferEnergy > 0 && fromUser.balanceKWh < transferEnergy) {
      const response: ApiResponse = {
        success: false,
        error: 'Insufficient kWh balance'
      };
      return res.status(400).json(response);
    }

    // Create blockchain transaction
    const blockchainTx = await MockBlockchain.createTransaction(
      fromWallet.address,
      toWallet.address,
      transferAmount,
      transferEnergy
    );

    // Create platform transaction record
    const transactions = readJsonFile<Transaction>('transactions.json');
    const newTransaction: Transaction = {
      id: generateId(),
      type: 'blockchain_transfer',
      buyerId: toUserId,
      sellerId: fromUserId,
      kWh: transferEnergy,
      amountZMW: transferAmount,
      carbonSaved: transferEnergy * 0.8,
      timestamp: new Date().toISOString(),
      blockchainTxHash: blockchainTx.txHash,
      paymentMethod: paymentMethod as 'blockchain' | 'mobile_money' | 'hybrid'
    };

    transactions.push(newTransaction);
    writeJsonFile('transactions.json', transactions);

    // Update user balances (will be confirmed when blockchain tx confirms)
    fromUser.balanceZMW -= transferAmount;
    fromUser.balanceKWh -= transferEnergy;
    toUser.balanceZMW += transferAmount;
    toUser.balanceKWh += transferEnergy;

    writeJsonFile('users.json', users);

    const response: ApiResponse = {
      success: true,
      data: {
        transactionId: newTransaction.id,
        blockchainTxHash: blockchainTx.txHash,
        fromAddress: fromWallet.address,
        toAddress: toWallet.address,
        amountZMW: transferAmount,
        kWh: transferEnergy,
        status: blockchainTx.status,
        estimatedConfirmationTime: '1-3 minutes',
        network: 'energy_chain'
      },
      message: 'Blockchain transfer initiated successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Blockchain transfer error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to initiate blockchain transfer'
    };
    res.status(500).json(response);
  }
});

// GET /blockchain/transaction/:txHash - Get blockchain transaction status
router.get('/transaction/:txHash', (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    
    const blockchainTx = MockBlockchain.getTransaction(txHash);
    
    if (!blockchainTx) {
      const response: ApiResponse = {
        success: false,
        error: 'Transaction not found'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        txHash: blockchainTx.txHash,
        status: blockchainTx.status,
        confirmations: blockchainTx.confirmations,
        blockNumber: blockchainTx.blockNumber,
        gasUsed: blockchainTx.gasUsed,
        gasPrice: blockchainTx.gasPrice,
        amountZMW: blockchainTx.amountZMW,
        kWh: blockchainTx.kWh,
        timestamp: blockchainTx.timestamp,
        fromAddress: blockchainTx.fromAddress,
        toAddress: blockchainTx.toAddress
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get transaction error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve transaction'
    };
    res.status(500).json(response);
  }
});

// POST /blockchain/payment-method - Add hybrid payment method
router.post('/payment-method', (req: Request, res: Response) => {
  try {
    const { userId, type, blockchain, mobileMoney, isDefault = false } = req.body;

    if (!userId || !type) {
      const response: ApiResponse = {
        success: false,
        error: 'User ID and payment method type are required'
      };
      return res.status(400).json(response);
    }

    const validTypes = ['blockchain', 'mobile_money', 'hybrid'];
    if (!validTypes.includes(type)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid payment method type'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const paymentMethods = readJsonFile<PaymentMethod>('payment_methods.json');

    // If setting as default, unset other defaults
    if (isDefault) {
      paymentMethods.forEach(pm => {
        if (pm.userId === userId) {
          pm.isDefault = false;
        }
      });
    }

    const newPaymentMethod: PaymentMethod = {
      id: generateId(),
      userId,
      type,
      isDefault,
      blockchain,
      mobileMoney,
      createdAt: new Date().toISOString()
    };

    paymentMethods.push(newPaymentMethod);
    writeJsonFile('payment_methods.json', paymentMethods);

    const response: ApiResponse = {
      success: true,
      data: {
        paymentMethodId: newPaymentMethod.id,
        type: newPaymentMethod.type,
        isDefault: newPaymentMethod.isDefault,
        blockchain: newPaymentMethod.blockchain,
        mobileMoney: newPaymentMethod.mobileMoney
      },
      message: 'Payment method added successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Add payment method error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to add payment method'
    };
    res.status(500).json(response);
  }
});

// GET /blockchain/wallet/:userId - Get user's blockchain wallets
router.get('/wallet/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const wallets = readJsonFile<WalletAddress>('blockchain_wallets.json');
    const userWallets = wallets.filter(w => w.userId === userId && w.isActive);
    
    const walletsWithTransactions = userWallets.map(wallet => {
      const transactions = MockBlockchain.getTransactionsByAddress(wallet.address);
      return {
        ...wallet,
        transactionCount: transactions.length,
        lastTransactionAt: transactions.length > 0 ? 
          Math.max(...transactions.map(t => new Date(t.timestamp).getTime())) : null
      };
    });

    const response: ApiResponse = {
      success: true,
      data: {
        wallets: walletsWithTransactions.map(w => ({
          id: w.id,
          address: w.address,
          type: w.type,
          balance: w.balance,
          transactionCount: w.transactionCount,
          lastTransactionAt: w.lastTransactionAt,
          createdAt: w.createdAt
        })),
        summary: {
          totalWallets: userWallets.length,
          totalBalance: userWallets.reduce((sum, w) => sum + w.balance, 0)
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get wallets error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve wallets'
    };
    res.status(500).json(response);
  }
});

// GET /blockchain/payment-methods/:userId - Get user's payment methods
router.get('/payment-methods/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const paymentMethods = readJsonFile<PaymentMethod>('payment_methods.json');
    const userPaymentMethods = paymentMethods.filter(pm => pm.userId === userId);
    
    const response: ApiResponse = {
      success: true,
      data: {
        paymentMethods: userPaymentMethods,
        summary: {
          total: userPaymentMethods.length,
          blockchain: userPaymentMethods.filter(pm => pm.type === 'blockchain').length,
          mobileMoney: userPaymentMethods.filter(pm => pm.type === 'mobile_money').length,
          hybrid: userPaymentMethods.filter(pm => pm.type === 'hybrid').length,
          defaultMethod: userPaymentMethods.find(pm => pm.isDefault)?.type || null
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get payment methods error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve payment methods'
    };
    res.status(500).json(response);
  }
});

export default router;
