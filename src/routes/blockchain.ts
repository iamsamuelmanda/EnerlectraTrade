import express, { Request, Response } from 'express';
import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import blockchainService from '../services/blockchainService';
import logger from '../utils/logger';

const router = express.Router();

// GET /blockchain/status - Get blockchain service status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = blockchainService.getStatus();
    
    res.json({
      success: true,
      data: {
        blockchain: status,
        features: {
          hybridPayments: true,
          mobileMoneyIntegration: true,
          automaticFallback: true,
          realTimeSync: true
        },
        message: 'Blockchain service status retrieved successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to get blockchain status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain status',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/offers - Create energy offer on blockchain
router.post('/offers', async (req: Request, res: Response) => {
  try {
    const { sellerAddress, energyAmount, pricePerKwh, acceptMobileMoney = true } = req.body;

    if (!sellerAddress || !energyAmount || !pricePerKwh) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'sellerAddress, energyAmount, and pricePerKwh are required'
      });
    }

    const result = await blockchainService.createEnergyOffer(
      sellerAddress,
      energyAmount,
      pricePerKwh,
      acceptMobileMoney
    );

    if (result.success) {
      // Also create local offer record
      const offers = readJsonFile<any>('trade_offers.json');
      const newOffer = {
        id: generateId(),
        blockchainOfferId: result.offerId,
        fromUserId: sellerAddress,
        energyAmount,
        pricePerKwh,
        totalPrice: energyAmount * pricePerKwh,
        tradeType: 'peer_to_peer',
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isHybrid: acceptMobileMoney,
        source: 'blockchain'
      };
      
      offers.push(newOffer);
      writeJsonFile('trade_offers.json', offers);

      res.status(201).json({
        success: true,
        data: {
          offerId: result.offerId,
          localOfferId: newOffer.id,
          message: 'Energy offer created on blockchain successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to create energy offer on blockchain'
      });
    }
  } catch (error) {
    logger.error('Failed to create blockchain offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blockchain offer',
      message: 'Internal server error'
    });
  }
});

// GET /blockchain/offers - Get active offers from blockchain
router.get('/offers', async (req: Request, res: Response) => {
  try {
    const offers = await blockchainService.getActiveOffers();
    
    res.json({
      success: true,
      data: {
        offers,
        count: offers.length,
        message: 'Blockchain offers retrieved successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to get blockchain offers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain offers',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/trade/execute - Execute trade with automatic payment method selection
router.post('/trade/execute', async (req: Request, res: Response) => {
  try {
    const { 
      offerId, 
      buyerId, 
      phoneNumber, 
      paymentMethod = 'hybrid',
      mobileMoneyReference 
    } = req.body;

    if (!offerId || !buyerId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'offerId, buyerId, and phoneNumber are required'
      });
    }

    // Get offer details
    const offers = readJsonFile<any>('trade_offers.json');
    const offer = offers.find((o: any) => o.id === offerId || o.blockchainOfferId === offerId.toString());
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
        message: 'The specified offer does not exist'
      });
    }

    // Process hybrid payment
    const result = await blockchainService.processHybridPayment({
      userId: buyerId,
      phoneNumber,
      energyAmount: offer.energyAmount,
      pricePerKwh: offer.pricePerKwh,
      paymentMethod: paymentMethod as 'mobile_money' | 'blockchain' | 'hybrid',
      mobileMoneyReference
    });

    if (result.success) {
      // Update offer status
      const offerIndex = offers.findIndex((o: any) => o.id === offerId || o.blockchainOfferId === offerId.toString());
      if (offerIndex !== -1) {
        offers[offerIndex].status = 'completed';
        offers[offerIndex].buyerId = buyerId;
        offers[offerIndex].completedAt = new Date().toISOString();
        offers[offerIndex].paymentMethod = result.paymentMethod;
        writeJsonFile('trade_offers.json', offers);
      }

      // Create transaction record
      const transactions = readJsonFile<any>('transactions.json');
      const transaction = {
        id: generateId(),
        blockchainTradeId: result.tradeId,
        blockchainOfferId: offerId,
        buyerId,
        sellerId: offer.fromUserId,
        kWh: offer.energyAmount,
        amountZMW: offer.totalPrice,
        type: 'trade',
        status: 'completed',
        timestamp: new Date().toISOString(),
        paymentMethod: result.paymentMethod,
        source: 'blockchain'
      };
      
      transactions.push(transaction);
      writeJsonFile('transactions.json', transactions);

      // Emit WebSocket event for real-time updates
      const io = (req as any).app?.locals?.io;
      if (io) {
        io.to(`trading-${buyerId}`).emit('trade-completed', {
          type: 'buy',
          transactionId: transaction.id,
          amount: offer.energyAmount,
          cost: offer.totalPrice,
          paymentMethod: result.paymentMethod,
          timestamp: transaction.timestamp
        });

        io.to(`trading-${offer.fromUserId}`).emit('trade-completed', {
          type: 'sell',
          transactionId: transaction.id,
          amount: offer.energyAmount,
          cost: offer.totalPrice,
          paymentMethod: result.paymentMethod,
          timestamp: transaction.timestamp
        });

        io.to('trading-public').emit('market-update', {
          type: 'trade',
          volume: offer.energyAmount,
          value: offer.totalPrice,
          paymentMethod: result.paymentMethod,
          timestamp: transaction.timestamp
        });
      }

      res.json({
        success: true,
        data: {
          tradeId: result.tradeId,
          transactionId: transaction.id,
          paymentMethod: result.paymentMethod,
          message: `Trade executed successfully using ${result.paymentMethod}`
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to execute trade'
      });
    }
  } catch (error) {
    logger.error('Failed to execute blockchain trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute blockchain trade',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/trade/blockchain - Execute trade using blockchain payment only
router.post('/trade/blockchain', async (req: Request, res: Response) => {
  try {
    const { offerId, buyerAddress } = req.body;

    if (!offerId || !buyerAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'offerId and buyerAddress are required'
      });
    }

    const result = await blockchainService.executeTradeWithBlockchain(
      parseInt(offerId),
      buyerAddress
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          tradeId: result.tradeId,
          message: 'Blockchain trade executed successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to execute blockchain trade'
      });
    }
  } catch (error) {
    logger.error('Failed to execute blockchain trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute blockchain trade',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/trade/mobile-money - Execute trade using mobile money only
router.post('/trade/mobile-money', async (req: Request, res: Response) => {
  try {
    const { offerId, buyerPhone, mobileMoneyReference } = req.body;

    if (!offerId || !buyerPhone || !mobileMoneyReference) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'offerId, buyerPhone, and mobileMoneyReference are required'
      });
    }

    const result = await blockchainService.executeTradeWithMobileMoney(
      parseInt(offerId),
      buyerPhone,
      mobileMoneyReference
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          tradeId: result.tradeId,
          message: 'Mobile money trade executed successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to execute mobile money trade'
      });
    }
  } catch (error) {
    logger.error('Failed to execute mobile money trade:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute mobile money trade',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/mobile-money/process - Process mobile money payment and credit energy
router.post('/mobile-money/process', async (req: Request, res: Response) => {
  try {
    const { userAddress, mobileMoneyReference, energyAmount } = req.body;

    if (!userAddress || !mobileMoneyReference || !energyAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userAddress, mobileMoneyReference, and energyAmount are required'
      });
    }

    const result = await blockchainService.processMobileMoneyPayment(
      userAddress,
      mobileMoneyReference,
      energyAmount
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: 'Mobile money payment processed successfully',
          energyCredits: energyAmount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to process mobile money payment'
      });
    }
  } catch (error) {
    logger.error('Failed to process mobile money payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process mobile money payment',
      message: 'Internal server error'
    });
  }
});

// GET /blockchain/trades/:userAddress - Get user's trade history from blockchain
router.get('/trades/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing user address',
        message: 'User address is required'
      });
    }

    const trades = await blockchainService.getUserTrades(userAddress);
    
    res.json({
      success: true,
      data: {
        trades,
        count: trades.length,
        message: 'User trades retrieved successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to get user trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user trades',
      message: 'Internal server error'
    });
  }
});

// GET /blockchain/balance/:userAddress - Get user's energy balance from blockchain
router.get('/balance/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing user address',
        message: 'User address is required'
      });
    }

    const balance = await blockchainService.getEnergyBalance(userAddress);
    
    res.json({
      success: true,
      data: {
        userAddress,
        balance,
        unit: 'kWh',
        message: 'Energy balance retrieved successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to get energy balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get energy balance',
      message: 'Internal server error'
    });
  }
});

// PUT /blockchain/profile/:userAddress - Update user profile on blockchain
router.put('/profile/:userAddress', async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const { phoneNumber, isVerified } = req.body;
    
    if (!userAddress || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userAddress and phoneNumber are required'
      });
    }

    const result = await blockchainService.updateUserProfile(
      userAddress,
      phoneNumber,
      isVerified || false
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: 'User profile updated on blockchain successfully'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: 'Failed to update user profile on blockchain'
      });
    }
  } catch (error) {
    logger.error('Failed to update user profile on blockchain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile on blockchain',
      message: 'Internal server error'
    });
  }
});

// POST /blockchain/sync - Sync blockchain data with local database
router.post('/sync', async (req: Request, res: Response) => {
  try {
    // Get active offers from blockchain
    const blockchainOffers = await blockchainService.getActiveOffers();
    
    // Sync with local database
    const localOffers = readJsonFile<any>('trade_offers.json');
    let syncedCount = 0;

    for (const blockchainOffer of blockchainOffers) {
      const existingIndex = localOffers.findIndex(
        (o: any) => o.blockchainOfferId === blockchainOffer.offerId.toString()
      );

      if (existingIndex === -1) {
        // Add new offer
        localOffers.push({
          id: generateId(),
          blockchainOfferId: blockchainOffer.offerId.toString(),
          fromUserId: blockchainOffer.seller,
          energyAmount: blockchainOffer.energyAmount,
          pricePerKwh: blockchainOffer.pricePerKwh,
          totalPrice: blockchainOffer.totalPrice,
          tradeType: 'peer_to_peer',
          status: blockchainOffer.isActive ? 'pending' : 'expired',
          createdAt: new Date(blockchainOffer.timestamp * 1000).toISOString(),
          expiresAt: new Date(blockchainOffer.expiresAt * 1000).toISOString(),
          isHybrid: blockchainOffer.isHybrid,
          source: 'blockchain'
        });
        syncedCount++;
      }
    }

    writeJsonFile('trade_offers.json', localOffers);

    res.json({
      success: true,
      data: {
        syncedOffers: syncedCount,
        totalBlockchainOffers: blockchainOffers.length,
        message: 'Blockchain data synced successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to sync blockchain data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync blockchain data',
      message: 'Internal server error'
    });
  }
});

// GET /blockchain/health - Health check for blockchain service
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = blockchainService.getStatus();
    
    res.json({
      success: true,
      data: {
        service: 'blockchain',
        status: status.isInitialized ? 'healthy' : 'unavailable',
        blockchain: status,
        timestamp: new Date().toISOString(),
        message: status.isInitialized ? 'Blockchain service is operational' : 'Blockchain service is not configured'
      }
    });
  } catch (error) {
    logger.error('Blockchain health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Blockchain health check failed',
      message: 'Internal server error'
    });
  }
});

export default router;
