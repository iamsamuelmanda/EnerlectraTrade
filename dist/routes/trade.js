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
exports.default = router;
