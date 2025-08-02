"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
// GET /transactions/:userId - Get user transaction history
router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { limit, offset, type } = req.query;
        const users = (0, utils_1.readJsonFile)('users.json');
        const transactions = (0, utils_1.readJsonFile)('transactions.json');
        const user = users.find(u => u.id === userId);
        if (!user) {
            const response = {
                success: false,
                error: 'User not found'
            };
            return res.status(404).json(response);
        }
        // Filter transactions for this user
        let userTransactions = transactions.filter(t => t.buyerId === userId || t.sellerId === userId || t.userId === userId);
        // Filter by transaction type if specified
        if (type && typeof type === 'string') {
            userTransactions = userTransactions.filter(t => t.type === type);
        }
        // Sort by timestamp (newest first)
        userTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Apply pagination
        const limitNum = limit ? parseInt(limit) : 50;
        const offsetNum = offset ? parseInt(offset) : 0;
        const paginatedTransactions = userTransactions.slice(offsetNum, offsetNum + limitNum);
        // Add user role to each transaction for better understanding
        const transactionsWithRole = paginatedTransactions.map(transaction => {
            let userRole = 'participant';
            if (transaction.buyerId === userId)
                userRole = 'buyer';
            else if (transaction.sellerId === userId)
                userRole = 'seller';
            else if (transaction.userId === userId)
                userRole = 'lessee';
            return {
                ...transaction,
                userRole
            };
        });
        // Calculate summary statistics
        const totalSpent = userTransactions
            .filter(t => t.buyerId === userId || t.userId === userId)
            .reduce((sum, t) => sum + t.amountZMW, 0);
        const totalEarned = userTransactions
            .filter(t => t.sellerId === userId)
            .reduce((sum, t) => sum + t.amountZMW, 0);
        const totalCarbonSaved = userTransactions.reduce((sum, t) => sum + t.carbonSaved, 0);
        const response = {
            success: true,
            data: {
                transactions: transactionsWithRole,
                pagination: {
                    total: userTransactions.length,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < userTransactions.length
                },
                summary: {
                    totalTransactions: userTransactions.length,
                    totalSpentZMW: Math.round(totalSpent * 100) / 100,
                    totalEarnedZMW: Math.round(totalEarned * 100) / 100,
                    netPositionZMW: Math.round((totalEarned - totalSpent) * 100) / 100,
                    totalCarbonSavedKg: Math.round(totalCarbonSaved * 100) / 100
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Transaction history error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// GET /transactions - Get all transactions (admin view)
router.get('/', (req, res) => {
    try {
        const { limit, offset, type } = req.query;
        let transactions = (0, utils_1.readJsonFile)('transactions.json');
        // Filter by transaction type if specified
        if (type && typeof type === 'string') {
            transactions = transactions.filter(t => t.type === type);
        }
        // Sort by timestamp (newest first)
        transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Apply pagination
        const limitNum = limit ? parseInt(limit) : 100;
        const offsetNum = offset ? parseInt(offset) : 0;
        const paginatedTransactions = transactions.slice(offsetNum, offsetNum + limitNum);
        // Calculate platform statistics
        const totalVolume = transactions.reduce((sum, t) => sum + t.amountZMW, 0);
        const totalEnergy = transactions.reduce((sum, t) => sum + t.kWh, 0);
        const totalCarbonSaved = transactions.reduce((sum, t) => sum + t.carbonSaved, 0);
        const typeBreakdown = transactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {});
        const response = {
            success: true,
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    total: transactions.length,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < transactions.length
                },
                platformStats: {
                    totalTransactions: transactions.length,
                    totalVolumeZMW: Math.round(totalVolume * 100) / 100,
                    totalEnergyKWh: Math.round(totalEnergy * 100) / 100,
                    totalCarbonSavedKg: Math.round(totalCarbonSaved * 100) / 100,
                    typeBreakdown
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('All transactions fetch error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
