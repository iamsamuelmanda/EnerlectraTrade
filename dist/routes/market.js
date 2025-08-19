"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// GET /market/stats - Platform-wide market statistics
router.get('/stats', (req, res) => {
    try {
        const users = (0, common_1.readJsonFile)('users.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        // Calculate platform statistics
        const totalUsers = users.length;
        const totalTransactions = transactions.length;
        const totalVolumeZMW = transactions.reduce((sum, t) => sum + t.amountZMW, 0);
        const totalEnergyTraded = transactions.reduce((sum, t) => sum + t.kWh, 0);
        const totalCarbonSaved = transactions.reduce((sum, t) => sum + t.carbonSaved, 0);
        // User balances
        const totalUserBalanceZMW = users.reduce((sum, u) => sum + u.balanceZMW, 0);
        const totalUserBalanceKWh = users.reduce((sum, u) => sum + u.balanceKWh, 0);
        // Cluster statistics
        const totalClusterCapacity = clusters.reduce((sum, c) => sum + c.capacityKWh, 0);
        const totalAvailableEnergy = clusters.reduce((sum, c) => sum + c.availableKWh, 0);
        const averagePrice = clusters.reduce((sum, c) => sum + c.pricePerKWh, 0) / clusters.length;
        // Recent activity (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTransactions = transactions.filter(t => new Date(t.timestamp) > oneDayAgo);
        // Transaction type breakdown
        const transactionTypes = transactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {});
        // Market health indicators
        const utilizationRate = ((totalClusterCapacity - totalAvailableEnergy) / totalClusterCapacity) * 100;
        const liquidityRatio = totalUserBalanceZMW / (totalAvailableEnergy * averagePrice);
        const response = {
            success: true,
            data: {
                platform: {
                    totalUsers,
                    totalTransactions,
                    totalVolumeZMW: Math.round(totalVolumeZMW * 100) / 100,
                    totalEnergyTradedKWh: Math.round(totalEnergyTraded * 100) / 100,
                    totalCarbonSavedKg: Math.round(totalCarbonSaved * 100) / 100
                },
                userEconomy: {
                    totalUserBalanceZMW: Math.round(totalUserBalanceZMW * 100) / 100,
                    totalUserBalanceKWh: Math.round(totalUserBalanceKWh * 100) / 100,
                    averageUserBalanceZMW: Math.round((totalUserBalanceZMW / totalUsers) * 100) / 100,
                    averageUserBalanceKWh: Math.round((totalUserBalanceKWh / totalUsers) * 100) / 100
                },
                energyMarket: {
                    totalClusterCapacityKWh: totalClusterCapacity,
                    totalAvailableEnergyKWh: totalAvailableEnergy,
                    utilizationRate: Math.round(utilizationRate * 100) / 100,
                    averagePriceZMWPerKWh: Math.round(averagePrice * 100) / 100,
                    liquidityRatio: Math.round(liquidityRatio * 100) / 100
                },
                recentActivity: {
                    transactionsLast24h: recentTransactions.length,
                    volumeLast24h: Math.round(recentTransactions.reduce((sum, t) => sum + t.amountZMW, 0) * 100) / 100,
                    energyTradedLast24h: Math.round(recentTransactions.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100
                },
                transactionBreakdown: transactionTypes,
                marketHealth: {
                    status: utilizationRate > 80 ? 'High Demand' : utilizationRate > 50 ? 'Active' : 'Low Activity',
                    liquidityStatus: liquidityRatio > 1.5 ? 'High Liquidity' : liquidityRatio > 0.8 ? 'Good Liquidity' : 'Low Liquidity'
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Market stats error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
