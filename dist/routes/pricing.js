"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// GET /pricing - Current market rates and pricing information
router.get('/', (req, res) => {
    try {
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        // Base energy rate
        const baseRate = 1.2; // ZMW per kWh
        // Calculate market dynamics
        const totalCapacity = clusters.reduce((sum, c) => sum + c.capacityKWh, 0);
        const totalAvailable = clusters.reduce((sum, c) => sum + c.availableKWh, 0);
        const utilizationRate = ((totalCapacity - totalAvailable) / totalCapacity) * 100;
        // Recent transactions for trend analysis
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentTransactions = transactions.filter(t => new Date(t.timestamp) > oneHourAgo);
        // Calculate average recent price
        const recentTradeVolume = recentTransactions
            .filter(t => t.type === 'trade')
            .reduce((sum, t) => sum + t.kWh, 0);
        const recentTradeValue = recentTransactions
            .filter(t => t.type === 'trade')
            .reduce((sum, t) => sum + t.amountZMW, 0);
        const recentAveragePrice = recentTradeVolume > 0 ? recentTradeValue / recentTradeVolume : baseRate;
        // Price adjustment based on supply and demand
        let demandMultiplier = 1.0;
        if (utilizationRate > 80) {
            demandMultiplier = 1.15; // 15% premium for high demand
        }
        else if (utilizationRate > 60) {
            demandMultiplier = 1.05; // 5% premium for medium demand
        }
        else if (utilizationRate < 20) {
            demandMultiplier = 0.95; // 5% discount for low demand
        }
        const adjustedBaseRate = baseRate * demandMultiplier;
        // Cluster-specific pricing
        const clusterPricing = clusters.map(cluster => {
            const clusterUtilization = ((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100;
            let clusterMultiplier = 1.0;
            if (clusterUtilization > 90) {
                clusterMultiplier = 1.2; // 20% premium for nearly full clusters
            }
            else if (clusterUtilization > 70) {
                clusterMultiplier = 1.1; // 10% premium for high utilization
            }
            return {
                clusterId: cluster.id,
                location: cluster.location,
                basePrice: cluster.pricePerKWh,
                currentPrice: Math.round(cluster.pricePerKWh * clusterMultiplier * 100) / 100,
                availableKWh: cluster.availableKWh,
                utilizationPercent: Math.round(clusterUtilization * 100) / 100,
                priceChange: Math.round((clusterMultiplier - 1) * 100 * 100) / 100 // percentage change
            };
        });
        // Price trend analysis
        let trend = 'stable';
        const priceDifference = ((recentAveragePrice - baseRate) / baseRate) * 100;
        if (priceDifference > 5) {
            trend = 'rising';
        }
        else if (priceDifference < -5) {
            trend = 'falling';
        }
        // Time-based pricing (peak/off-peak simulation)
        const currentHour = new Date().getHours();
        const isPeakHour = (currentHour >= 17 && currentHour <= 21) || (currentHour >= 6 && currentHour <= 9);
        const timeMultiplier = isPeakHour ? 1.1 : 0.95;
        const response = {
            success: true,
            data: {
                baseRate: {
                    standard: baseRate,
                    current: Math.round(adjustedBaseRate * 100) / 100,
                    demandAdjustment: Math.round((demandMultiplier - 1) * 100 * 100) / 100,
                    timeOfDayMultiplier: timeMultiplier,
                    effectiveRate: Math.round(adjustedBaseRate * timeMultiplier * 100) / 100
                },
                marketConditions: {
                    utilizationRate: Math.round(utilizationRate * 100) / 100,
                    trend,
                    recentAveragePrice: Math.round(recentAveragePrice * 100) / 100,
                    priceVolatility: Math.abs(Math.round(priceDifference * 100) / 100),
                    isPeakHour,
                    lastUpdated: new Date().toISOString()
                },
                clusterPricing,
                priceAlerts: {
                    highDemandAlert: utilizationRate > 80,
                    lowSupplyAlert: totalAvailable < (totalCapacity * 0.2),
                    priceSpike: priceDifference > 10,
                    recommendations: {
                        buyNow: utilizationRate < 30 && !isPeakHour,
                        sellNow: utilizationRate > 70 && isPeakHour,
                        waitForBetter: utilizationRate >= 30 && utilizationRate <= 70
                    }
                },
                historicalData: {
                    transactionsLastHour: recentTransactions.length,
                    volumeLastHour: Math.round(recentTradeVolume * 100) / 100,
                    averageDailyVolume: Math.round((transactions.length / 7) * 100) / 100 // Assuming 7 days of data
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Pricing data error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// GET /pricing/history - Historical pricing data
router.get('/history', (req, res) => {
    try {
        const { hours = 24, clusterId } = req.query;
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const hoursBack = parseInt(hours);
        const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        let relevantTransactions = transactions.filter(t => new Date(t.timestamp) > timeThreshold && t.type === 'trade');
        // Filter by cluster if specified
        if (clusterId) {
            relevantTransactions = relevantTransactions.filter(t => t.clusterId === clusterId);
        }
        // Group transactions by hour
        const hourlyData = relevantTransactions.reduce((acc, transaction) => {
            const hour = new Date(transaction.timestamp).getHours();
            const hourKey = `${new Date(transaction.timestamp).toDateString()}-${hour}`;
            if (!acc[hourKey]) {
                acc[hourKey] = {
                    timestamp: new Date(transaction.timestamp).setMinutes(0, 0, 0),
                    totalVolume: 0,
                    totalValue: 0,
                    transactionCount: 0,
                    averagePrice: 0
                };
            }
            acc[hourKey].totalVolume += transaction.kWh;
            acc[hourKey].totalValue += transaction.amountZMW;
            acc[hourKey].transactionCount += 1;
            acc[hourKey].averagePrice = acc[hourKey].totalValue / acc[hourKey].totalVolume;
            return acc;
        }, {});
        const historicalPrices = Object.values(hourlyData).map((data) => ({
            timestamp: new Date(data.timestamp).toISOString(),
            averagePrice: Math.round(data.averagePrice * 100) / 100,
            volume: Math.round(data.totalVolume * 100) / 100,
            transactionCount: data.transactionCount
        }));
        const response = {
            success: true,
            data: {
                timeRange: `${hoursBack} hours`,
                clusterId: clusterId || 'all',
                dataPoints: historicalPrices,
                summary: {
                    totalTransactions: relevantTransactions.length,
                    totalVolume: Math.round(relevantTransactions.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100,
                    averagePrice: relevantTransactions.length > 0 ?
                        Math.round((relevantTransactions.reduce((sum, t) => sum + t.amountZMW, 0) /
                            relevantTransactions.reduce((sum, t) => sum + t.kWh, 0)) * 100) / 100 : 0,
                    priceRange: {
                        min: Math.min(...historicalPrices.map(h => h.averagePrice)) || 0,
                        max: Math.max(...historicalPrices.map(h => h.averagePrice)) || 0
                    }
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Price history error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
