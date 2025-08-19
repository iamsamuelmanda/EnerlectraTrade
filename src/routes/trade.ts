import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, updateUserBalance, createTransaction, KWH_TO_ZMW_RATE, generateId } from '../utils/common';
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

    // Emit WebSocket events for real-time updates
    const io = (req as any).app?.locals?.io;
    if (io) {
      io.to(`trading-${buyerId}`).emit('trade-completed', {
        type: 'buy',
        transactionId: transaction.id,
        amount: kWh,
        cost: tradeCost,
        timestamp: transaction.timestamp
      });
      
      io.to(`trading-${sellerId}`).emit('trade-completed', {
        type: 'sell',
        transactionId: transaction.id,
        amount: kWh,
        cost: tradeCost,
        timestamp: transaction.timestamp
      });
      
      io.to('trading-public').emit('market-update', {
        type: 'trade',
        volume: kWh,
        value: tradeCost,
        timestamp: transaction.timestamp
      });
    }

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

// ======================
// OFFER BOOK ENDPOINTS
// ======================

interface TradeOffer {
  id: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId?: string;
  energyAmount: number;
  pricePerKwh: number;
  totalPrice: number;
  tradeType: 'peer_to_peer' | 'cluster_to_user' | 'user_to_cluster';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  expiresAt: string;
  clusterName?: string;
  region?: string;
}

const OFFERS_FILE = 'trade_offers.json';

// GET /trade/offers
router.get('/offers', (req: Request, res: Response) => {
  try {
    const { userId } = req.query as { userId?: string };
    const offers = readJsonFile<TradeOffer>(OFFERS_FILE);
    const filtered = userId
      ? offers.filter(o => o.fromUserId === userId || o.toUserId === userId)
      : offers;

    const response: ApiResponse = {
      success: true,
      data: { offers: filtered }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch offers'
    };
    res.status(500).json(response);
  }
});

// POST /trade/offers - create a new offer
router.post('/offers', (req: Request, res: Response) => {
  try {
    const { fromUserId, energyAmount, pricePerKwh, tradeType, toUserId, fromUserName, clusterName, region } = req.body;

    if (!fromUserId || !energyAmount || energyAmount <= 0 || !pricePerKwh || pricePerKwh <= 0 || !tradeType) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing or invalid parameters'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const fromUser = users.find(u => u.id === fromUserId);
    if (!fromUser) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const totalPrice = Math.round(energyAmount * pricePerKwh * 100) / 100;
    const newOffer: TradeOffer = {
      id: generateId(),
      fromUserId,
      fromUserName: fromUserName || fromUser.name,
      toUserId,
      energyAmount,
      pricePerKwh,
      totalPrice,
      tradeType,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      clusterName,
      region
    };

    const offers = readJsonFile<TradeOffer>(OFFERS_FILE);
    offers.push(newOffer);
    writeJsonFile(OFFERS_FILE, offers);

    // Emit WebSocket event for new offer
    const io = (req as any).app?.locals?.io;
    if (io) {
      io.to('trading-public').emit('offer-created', {
        offerId: newOffer.id,
        fromUserId: newOffer.fromUserId,
        energyAmount: newOffer.energyAmount,
        pricePerKwh: newOffer.pricePerKwh,
        tradeType: newOffer.tradeType,
        timestamp: newOffer.createdAt
      });
    }

    const response: ApiResponse = {
      success: true,
      data: newOffer,
      message: 'Trade offer created'
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create offer'
    };
    res.status(500).json(response);
  }
});

// POST /trade/:id/accept - accept an offer and settle
router.post('/:id/accept', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };
    if (!userId) {
      const response: ApiResponse = { success: false, error: 'userId required' };
      return res.status(400).json(response);
    }

    const offers = readJsonFile<TradeOffer>(OFFERS_FILE);
    const offerIndex = offers.findIndex(o => o.id === id);
    if (offerIndex === -1) {
      const response: ApiResponse = { success: false, error: 'Offer not found' };
      return res.status(404).json(response);
    }
    const offer = offers[offerIndex];
    if (offer.status !== 'pending') {
      const response: ApiResponse = { success: false, error: 'Offer no longer available' };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const buyer = users.find(u => u.id === userId);
    const seller = users.find(u => u.id === offer.fromUserId);
    if (!buyer || !seller) {
      const response: ApiResponse = { success: false, error: 'Buyer or seller not found' };
      return res.status(404).json(response);
    }

    // Validate balances
    if (buyer.balanceZMW < offer.totalPrice) {
      const response: ApiResponse = { success: false, error: 'Insufficient ZMW balance' };
      return res.status(400).json(response);
    }
    if (seller.balanceKWh < offer.energyAmount) {
      const response: ApiResponse = { success: false, error: 'Seller has insufficient kWh' };
      return res.status(400).json(response);
    }

    // Execute settlement
    updateUserBalance(users, buyer.id, -offer.totalPrice, offer.energyAmount);
    updateUserBalance(users, seller.id, offer.totalPrice, -offer.energyAmount);

    // Record transaction
    const transactions = readJsonFile<Transaction>('transactions.json');
    const transaction = createTransaction('trade', {
      buyerId: buyer.id,
      sellerId: seller.id,
      kWh: offer.energyAmount,
      amountZMW: offer.totalPrice
    });
    transactions.push(transaction);

    // Update offer status
    offers[offerIndex].status = 'accepted';
    offers[offerIndex].toUserId = buyer.id;

    writeJsonFile('users.json', users);
    writeJsonFile('transactions.json', transactions);
    writeJsonFile(OFFERS_FILE, offers);

    // Emit WebSocket events for real-time updates
    const io = (req as any).app?.locals?.io;
    if (io) {
      io.to(`trading-${buyer.id}`).emit('offer-accepted', {
        offerId: offer.id,
        type: 'buy',
        amount: offer.energyAmount,
        cost: offer.totalPrice,
        timestamp: transaction.timestamp
      });
      
      io.to(`trading-${seller.id}`).emit('offer-accepted', {
        offerId: offer.id,
        type: 'sell',
        amount: offer.energyAmount,
        cost: offer.totalPrice,
        timestamp: transaction.timestamp
      });
      
      io.to('trading-public').emit('offer-updated', {
        offerId: offer.id,
        status: 'accepted',
        timestamp: transaction.timestamp
      });
    }

    const response: ApiResponse = {
      success: true,
      data: { transactionId: transaction.id, offer: offers[offerIndex] },
      message: 'Offer accepted and settled'
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = { success: false, error: 'Failed to accept offer' };
    res.status(500).json(response);
  }
});

export default router;

