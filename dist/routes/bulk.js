"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
// POST /trade/bulk - Execute multiple energy trades in one transaction
router.post('/trade', (req, res) => {
    try {
        const { trades } = req.body;
        if (!trades || !Array.isArray(trades) || trades.length === 0) {
            const response = {
                success: false,
                error: 'Trades array is required and must not be empty'
            };
            return res.status(400).json(response);
        }
        if (trades.length > 50) {
            const response = {
                success: false,
                error: 'Maximum 50 trades allowed per bulk operation'
            };
            return res.status(400).json(response);
        }
        const users = (0, utils_1.readJsonFile)('users.json');
        const transactions = (0, utils_1.readJsonFile)('transactions.json');
        const results = [];
        const errors = [];
        const successful = [];
        // Validate all trades first
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            const { buyerId, sellerId, kWh } = trade;
            // Basic validation
            if (!buyerId || !sellerId || !kWh || kWh <= 0) {
                errors.push({
                    tradeIndex: i,
                    error: 'Missing or invalid parameters',
                    trade
                });
                continue;
            }
            if (buyerId === sellerId) {
                errors.push({
                    tradeIndex: i,
                    error: 'Buyer and seller cannot be the same',
                    trade
                });
                continue;
            }
            const buyer = users.find(u => u.id === buyerId);
            const seller = users.find(u => u.id === sellerId);
            if (!buyer || !seller) {
                errors.push({
                    tradeIndex: i,
                    error: 'Buyer or seller not found',
                    trade
                });
                continue;
            }
            const tradeCost = kWh * utils_1.KWH_TO_ZMW_RATE;
            if (buyer.balanceZMW < tradeCost) {
                errors.push({
                    tradeIndex: i,
                    error: `Insufficient ZMW balance. Required: ${tradeCost}, Available: ${buyer.balanceZMW}`,
                    trade
                });
                continue;
            }
            if (seller.balanceKWh < kWh) {
                errors.push({
                    tradeIndex: i,
                    error: `Insufficient kWh balance. Required: ${kWh}, Available: ${seller.balanceKWh}`,
                    trade
                });
                continue;
            }
        }
        // Execute successful trades
        for (let i = 0; i < trades.length; i++) {
            const trade = trades[i];
            const { buyerId, sellerId, kWh } = trade;
            // Skip if this trade had errors
            if (errors.some(e => e.tradeIndex === i))
                continue;
            const tradeCost = kWh * utils_1.KWH_TO_ZMW_RATE;
            // Execute trade
            (0, utils_1.updateUserBalance)(users, buyerId, -tradeCost, kWh);
            (0, utils_1.updateUserBalance)(users, sellerId, tradeCost, -kWh);
            // Create transaction record
            const transaction = (0, utils_1.createTransaction)('trade', {
                buyerId,
                sellerId,
                kWh,
                amountZMW: tradeCost
            });
            successful.push(transaction);
            transactions.push(transaction);
            results.push({
                tradeIndex: i,
                success: true,
                transactionId: transaction.id,
                buyerId,
                sellerId,
                kWh,
                amountZMW: tradeCost,
                carbonSaved: transaction.carbonSaved
            });
        }
        // Save changes if any successful trades
        if (successful.length > 0) {
            (0, utils_1.writeJsonFile)('users.json', users);
            (0, utils_1.writeJsonFile)('transactions.json', transactions);
        }
        const response = {
            success: errors.length === 0,
            data: {
                totalTrades: trades.length,
                successfulTrades: successful.length,
                failedTrades: errors.length,
                totalVolumeZMW: Math.round(successful.reduce((sum, t) => sum + t.amountZMW, 0) * 100) / 100,
                totalEnergyKWh: Math.round(successful.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100,
                totalCarbonSaved: Math.round(successful.reduce((sum, t) => sum + t.carbonSaved, 0) * 100) / 100,
                results,
                errors: errors.length > 0 ? errors : undefined
            },
            message: `Bulk trade completed: ${successful.length} successful, ${errors.length} failed`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Bulk trade error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// POST /trade/bulk/purchase - Execute multiple energy purchases from clusters
router.post('/purchase', (req, res) => {
    try {
        const { purchases } = req.body;
        if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
            const response = {
                success: false,
                error: 'Purchases array is required and must not be empty'
            };
            return res.status(400).json(response);
        }
        if (purchases.length > 30) {
            const response = {
                success: false,
                error: 'Maximum 30 purchases allowed per bulk operation'
            };
            return res.status(400).json(response);
        }
        const users = (0, utils_1.readJsonFile)('users.json');
        const clusters = (0, utils_1.readJsonFile)('clusters.json');
        const transactions = (0, utils_1.readJsonFile)('transactions.json');
        const results = [];
        const errors = [];
        const successful = [];
        // Validate all purchases first
        for (let i = 0; i < purchases.length; i++) {
            const purchase = purchases[i];
            const { userId, clusterId, kWh } = purchase;
            if (!userId || !clusterId || !kWh || kWh <= 0) {
                errors.push({
                    purchaseIndex: i,
                    error: 'Missing or invalid parameters',
                    purchase
                });
                continue;
            }
            const user = users.find(u => u.id === userId);
            const cluster = clusters.find(c => c.id === clusterId);
            if (!user) {
                errors.push({
                    purchaseIndex: i,
                    error: 'User not found',
                    purchase
                });
                continue;
            }
            if (!cluster) {
                errors.push({
                    purchaseIndex: i,
                    error: 'Cluster not found',
                    purchase
                });
                continue;
            }
            const cost = kWh * cluster.pricePerKWh;
            if (user.balanceZMW < cost) {
                errors.push({
                    purchaseIndex: i,
                    error: `Insufficient ZMW balance. Required: ${cost}, Available: ${user.balanceZMW}`,
                    purchase
                });
                continue;
            }
            if (cluster.availableKWh < kWh) {
                errors.push({
                    purchaseIndex: i,
                    error: `Insufficient energy in cluster. Required: ${kWh}, Available: ${cluster.availableKWh}`,
                    purchase
                });
                continue;
            }
        }
        // Execute successful purchases
        for (let i = 0; i < purchases.length; i++) {
            const purchase = purchases[i];
            const { userId, clusterId, kWh } = purchase;
            // Skip if this purchase had errors
            if (errors.some(e => e.purchaseIndex === i))
                continue;
            const cluster = clusters.find(c => c.id === clusterId);
            const cost = kWh * cluster.pricePerKWh;
            // Execute purchase
            (0, utils_1.updateUserBalance)(users, userId, -cost, kWh);
            // Update cluster
            const clusterIndex = clusters.findIndex(c => c.id === clusterId);
            clusters[clusterIndex].availableKWh -= kWh;
            // Create transaction record
            const transaction = (0, utils_1.createTransaction)('lease', {
                userId,
                clusterId,
                kWh,
                amountZMW: cost
            });
            successful.push(transaction);
            transactions.push(transaction);
            results.push({
                purchaseIndex: i,
                success: true,
                transactionId: transaction.id,
                userId,
                clusterId,
                clusterLocation: cluster.location,
                kWh,
                amountZMW: cost,
                carbonSaved: transaction.carbonSaved
            });
        }
        // Save changes if any successful purchases
        if (successful.length > 0) {
            (0, utils_1.writeJsonFile)('users.json', users);
            (0, utils_1.writeJsonFile)('clusters.json', clusters);
            (0, utils_1.writeJsonFile)('transactions.json', transactions);
        }
        const response = {
            success: errors.length === 0,
            data: {
                totalPurchases: purchases.length,
                successfulPurchases: successful.length,
                failedPurchases: errors.length,
                totalCostZMW: Math.round(successful.reduce((sum, t) => sum + t.amountZMW, 0) * 100) / 100,
                totalEnergyKWh: Math.round(successful.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100,
                totalCarbonSaved: Math.round(successful.reduce((sum, t) => sum + t.carbonSaved, 0) * 100) / 100,
                results,
                errors: errors.length > 0 ? errors : undefined
            },
            message: `Bulk purchase completed: ${successful.length} successful, ${errors.length} failed`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Bulk purchase error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
