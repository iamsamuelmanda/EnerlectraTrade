import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, updateUserBalance, createTransaction, KWH_TO_ZMW_RATE } from '../utils';
import { User, Transaction, ApiResponse } from '../types';

const router = Router();

// POST /trade - Trade energy between users
router.post('/', (req: Request, res: Response) => {
  try {
    const { buyerId, sellerId, kWh } = req.body;

    // Validation
    if (!buyerId || !sellerId || !kWh || kWh <= 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing or invalid parameters. Required: buyerId, sellerId, kWh (positive number)'
      };
      return res.status(400).json(response);
    }

    if (buyerId === sellerId) {
      const response: ApiResponse = {
        success: false,
        error: 'Buyer and seller cannot be the same user'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const transactions = readJsonFile<Transaction>('transactions.json');

    const buyer = users.find(u => u.id === buyerId);
    const seller = users.find(u => u.id === sellerId);

    if (!buyer || !seller) {
      const response: ApiResponse = {
        success: false,
        error: 'Buyer or seller not found'
      };
      return res.status(404).json(response);
    }

    const tradeCost = kWh * KWH_TO_ZMW_RATE;

    // Check balances
    if (buyer.balanceZMW < tradeCost) {
      const response: ApiResponse = {
        success: false,
        error: `Insufficient ZMW balance. Required: ${tradeCost}, Available: ${buyer.balanceZMW}`
      };
      return res.status(400).json(response);
    }

    if (seller.balanceKWh < kWh) {
      const response: ApiResponse = {
        success: false,
        error: `Insufficient kWh balance for seller. Required: ${kWh}, Available: ${seller.balanceKWh}`
      };
      return res.status(400).json(response);
    }

    // Execute trade
    updateUserBalance(users, buyerId, -tradeCost, kWh);
    updateUserBalance(users, sellerId, tradeCost, -kWh);

    // Create transaction record
    const transaction = createTransaction('trade', {
      buyerId,
      sellerId,
      kWh,
      amountZMW: tradeCost
    });

    transactions.push(transaction);

    // Save changes
    writeJsonFile('users.json', users);
    writeJsonFile('transactions.json', transactions);

    const response: ApiResponse = {
      success: true,
      data: {
        transactionId: transaction.id,
        buyerId,
        sellerId,
        kWh,
        amountZMW: tradeCost,
        carbonSaved: transaction.carbonSaved,
        timestamp: transaction.timestamp
      },
      message: 'Energy trade completed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Trade error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
