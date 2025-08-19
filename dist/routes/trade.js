"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// POST /trade - Trade energy between users
router.post('/', (req, res) => {
    try {
        const { buyerId, sellerId, kWh } = req.body;
        // Validation
        if (!buyerId || !sellerId || !kWh || kWh <= 0) {
            const response = {
                success: false,
                error: 'Missing or invalid parameters. Required: buyerId, sellerId, kWh (positive number)'
            };
            return res.status(400).json(response);
        }
        if (buyerId === sellerId) {
            const response = {
                success: false,
                error: 'Buyer and seller cannot be the same user'
            };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const buyer = users.find(u => u.id === buyerId);
        const seller = users.find(u => u.id === sellerId);
        if (!buyer || !seller) {
            const response = {
                success: false,
                error: 'Buyer or seller not found'
            };
            return res.status(404).json(response);
        }
        const tradeCost = kWh * common_1.KWH_TO_ZMW_RATE;
        // Check balances
        if (buyer.balanceZMW < tradeCost) {
            const response = {
                success: false,
                error: `Insufficient ZMW balance. Required: ${tradeCost}, Available: ${buyer.balanceZMW}`
            };
            return res.status(400).json(response);
        }
        if (seller.balanceKWh < kWh) {
            const response = {
                success: false,
                error: `Insufficient kWh balance for seller. Required: ${kWh}, Available: ${seller.balanceKWh}`
            };
            return res.status(400).json(response);
        }
        // Execute trade
        (0, common_1.updateUserBalance)(users, buyerId, -tradeCost, kWh);
        (0, common_1.updateUserBalance)(users, sellerId, tradeCost, -kWh);
        // Create transaction record
        const transaction = (0, common_1.createTransaction)('trade', {
            buyerId,
            sellerId,
            kWh,
            amountZMW: tradeCost
        });
        transactions.push(transaction);
        // Save changes
        (0, common_1.writeJsonFile)('users.json', users);
        (0, common_1.writeJsonFile)('transactions.json', transactions);
        // Emit WebSocket events for real-time updates
        const io = req.app?.locals?.io;
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
        const response = {
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
    }
    catch (error) {
        console.error('Trade error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
const OFFERS_FILE = 'trade_offers.json';
// GET /trade/offers
router.get('/offers', (req, res) => {
    try {
        const { userId } = req.query;
        const offers = (0, common_1.readJsonFile)(OFFERS_FILE);
        const filtered = userId
            ? offers.filter(o => o.fromUserId === userId || o.toUserId === userId)
            : offers;
        const response = {
            success: true,
            data: { offers: filtered }
        };
        res.json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: 'Failed to fetch offers'
        };
        res.status(500).json(response);
    }
});
// POST /trade/offers - create a new offer
router.post('/offers', (req, res) => {
    try {
        const { fromUserId, energyAmount, pricePerKwh, tradeType, toUserId, fromUserName, clusterName, region } = req.body;
        if (!fromUserId || !energyAmount || energyAmount <= 0 || !pricePerKwh || pricePerKwh <= 0 || !tradeType) {
            const response = {
                success: false,
                error: 'Missing or invalid parameters'
            };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        const fromUser = users.find(u => u.id === fromUserId);
        if (!fromUser) {
            const response = {
                success: false,
                error: 'User not found'
            };
            return res.status(404).json(response);
        }
        const totalPrice = Math.round(energyAmount * pricePerKwh * 100) / 100;
        const newOffer = {
            id: (0, common_1.generateId)(),
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
        const offers = (0, common_1.readJsonFile)(OFFERS_FILE);
        offers.push(newOffer);
        (0, common_1.writeJsonFile)(OFFERS_FILE, offers);
        // Emit WebSocket event for new offer
        const io = req.app?.locals?.io;
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
        const response = {
            success: true,
            data: newOffer,
            message: 'Trade offer created'
        };
        res.status(201).json(response);
    }
    catch (error) {
        const response = {
            success: false,
            error: 'Failed to create offer'
        };
        res.status(500).json(response);
    }
});
// POST /trade/:id/accept - accept an offer and settle
router.post('/:id/accept', (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        if (!userId) {
            const response = { success: false, error: 'userId required' };
            return res.status(400).json(response);
        }
        const offers = (0, common_1.readJsonFile)(OFFERS_FILE);
        const offerIndex = offers.findIndex(o => o.id === id);
        if (offerIndex === -1) {
            const response = { success: false, error: 'Offer not found' };
            return res.status(404).json(response);
        }
        const offer = offers[offerIndex];
        if (offer.status !== 'pending') {
            const response = { success: false, error: 'Offer no longer available' };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        const buyer = users.find(u => u.id === userId);
        const seller = users.find(u => u.id === offer.fromUserId);
        if (!buyer || !seller) {
            const response = { success: false, error: 'Buyer or seller not found' };
            return res.status(404).json(response);
        }
        // Validate balances
        if (buyer.balanceZMW < offer.totalPrice) {
            const response = { success: false, error: 'Insufficient ZMW balance' };
            return res.status(400).json(response);
        }
        if (seller.balanceKWh < offer.energyAmount) {
            const response = { success: false, error: 'Seller has insufficient kWh' };
            return res.status(400).json(response);
        }
        // Execute settlement
        (0, common_1.updateUserBalance)(users, buyer.id, -offer.totalPrice, offer.energyAmount);
        (0, common_1.updateUserBalance)(users, seller.id, offer.totalPrice, -offer.energyAmount);
        // Record transaction
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const transaction = (0, common_1.createTransaction)('trade', {
            buyerId: buyer.id,
            sellerId: seller.id,
            kWh: offer.energyAmount,
            amountZMW: offer.totalPrice
        });
        transactions.push(transaction);
        // Update offer status
        offers[offerIndex].status = 'accepted';
        offers[offerIndex].toUserId = buyer.id;
        (0, common_1.writeJsonFile)('users.json', users);
        (0, common_1.writeJsonFile)('transactions.json', transactions);
        (0, common_1.writeJsonFile)(OFFERS_FILE, offers);
        // Emit WebSocket events for real-time updates
        const io = req.app?.locals?.io;
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
        const response = {
            success: true,
            data: { transactionId: transaction.id, offer: offers[offerIndex] },
            message: 'Offer accepted and settled'
        };
        res.json(response);
    }
    catch (error) {
        const response = { success: false, error: 'Failed to accept offer' };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=trade.js.map