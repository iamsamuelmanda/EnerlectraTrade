import { Router, Request, Response } from 'express';
import EnhancedMobileMoneyService from '../services/enhancedMobileMoneyService';
import { readJsonFile, writeJsonFile } from '../utils/common';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();
const mobileMoneyService = EnhancedMobileMoneyService.getInstance();

// POST /enhanced-mobile-money/ussd - Enhanced USSD with multiple providers
router.post('/ussd', async (req: Request, res: Response) => {
  try {
    const { text, phoneNumber } = req.body;

    if (!phoneNumber) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Phone number is required'
      };
      return res.status(400).json(response);
    }

    const ussdResponse = await mobileMoneyService.processUSSDRequest(text, phoneNumber);
    
    const response: ApiResponse<string> = {
      success: true,
      data: ussdResponse
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Enhanced USSD processing failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'USSD processing failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-mobile-money/providers - Get supported mobile money providers
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = mobileMoneyService.getSupportedProviders();
    
    const response: ApiResponse<any[]> = {
      success: true,
      data: providers
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get providers:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get providers'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-mobile-money/deposit - Initiate deposit
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const { providerId, amount, phoneNumber, userId } = req.body;

    if (!providerId || !amount || !phoneNumber || !userId) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    const transactionId = await mobileMoneyService.initiateDeposit(
      providerId,
      amount,
      phoneNumber,
      userId
    );
    
    const response: ApiResponse<string> = {
      success: true,
      data: transactionId
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Deposit initiation failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Deposit initiation failed'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-mobile-money/transfer - Transfer money
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { providerId, amount, fromPhone, toPhone, userId } = req.body;

    if (!providerId || !amount || !fromPhone || !toPhone || !userId) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    const transactionId = await mobileMoneyService.transferMoney(
      providerId,
      amount,
      fromPhone,
      toPhone,
      userId
    );
    
    const response: ApiResponse<string> = {
      success: true,
      data: transactionId
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Money transfer failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Money transfer failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-mobile-money/status/:transactionId - Get transaction status
router.get('/status/:transactionId', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { providerId } = req.query;

    if (!providerId) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Provider ID is required'
      };
      return res.status(400).json(response);
    }

    const status = await mobileMoneyService.getPaymentStatus(
      providerId as string,
      transactionId
    );
    
    const response: ApiResponse<any> = {
      success: true,
      data: status
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Status check failed:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Status check failed'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-mobile-money/webhook/:providerId - Webhook endpoint
router.post('/webhook/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const payload = req.body;
    const signature = req.headers['x-signature'] as string;

    await mobileMoneyService.processWebhook(providerId, payload, signature);
    
    const response: ApiResponse<string> = {
      success: true,
      data: 'Webhook processed successfully'
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Webhook processing failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Webhook processing failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-mobile-money/transactions/:userId - Get user transactions
router.get('/transactions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = readJsonFile('mobile_money_transactions.json');
    const userTransactions = transactions
      .filter(t => t.userId === userId)
      .slice(Number(offset), Number(offset) + Number(limit))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const response: ApiResponse<any[]> = {
      success: true,
      data: userTransactions
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get transactions:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get transactions'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-mobile-money/balance/:userId - Get user balance
router.get('/balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const users = readJsonFile('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse<any> = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const balance = {
      zmw: user.balanceZMW,
      kwh: user.balanceKWh,
      lastUpdated: new Date().toISOString()
    };
    
    const response: ApiResponse<any> = {
      success: true,
      data: balance
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get balance:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get balance'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-mobile-money/withdraw - Initiate withdrawal
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { providerId, amount, phoneNumber, userId } = req.body;

    if (!providerId || !amount || !phoneNumber || !userId) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    // Check user balance
    const users = readJsonFile('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    if (user.balanceZMW < amount) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Insufficient balance'
      };
      return res.status(400).json(response);
    }

    // Create withdrawal transaction
    const transactions = readJsonFile('mobile_money_transactions.json');
    const transactionId = `withdraw_${Date.now()}`;
    
    const transaction = {
      id: transactionId,
      provider: providerId,
      type: 'withdraw',
      amount,
      currency: 'ZMW',
      phoneNumber,
      reference: `ENERLECTRA_WITHDRAW_${transactionId}`,
      status: 'pending',
      timestamp: new Date().toISOString(),
      userId
    };

    transactions.push(transaction);
    writeJsonFile('mobile_money_transactions.json', transactions);

    // Update user balance
    user.balanceZMW -= amount;
    writeJsonFile('users.json', users);
    
    const response: ApiResponse<string> = {
      success: true,
      data: transactionId
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Withdrawal failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Withdrawal failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-mobile-money/fees/:providerId - Get provider fees
router.get('/fees/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const provider = mobileMoneyService.getProviderById(providerId);

    if (!provider) {
      const response: ApiResponse<any> = {
        success: false,
        error: 'Provider not found'
      };
      return res.status(404).json(response);
    }

    const fees = {
      provider: provider.name,
      deposit: provider.fees.deposit,
      withdraw: provider.fees.withdraw,
      transfer: provider.fees.transfer,
      minAmount: provider.minAmount,
      maxAmount: provider.maxAmount,
      supportedCurrencies: provider.supportedCurrencies
    };
    
    const response: ApiResponse<any> = {
      success: true,
      data: fees
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Failed to get fees:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get fees'
    };
    res.status(500).json(response);
  }
});

export default router;
