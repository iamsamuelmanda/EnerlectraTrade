"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// GET /monitoring/clusters - Real-time cluster status monitoring
router.get('/clusters', (req, res) => {
    try {
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const clusterStats = clusters.map(cluster => {
            // Recent activity for this cluster
            const recentActivity = transactions.filter(t => t.clusterId === cluster.id && new Date(t.timestamp) > oneHourAgo);
            const dailyActivity = transactions.filter(t => t.clusterId === cluster.id && new Date(t.timestamp) > oneDayAgo);
            const utilizationPercent = ((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100;
            // Calculate efficiency metrics
            const dailyEnergyUsed = dailyActivity.reduce((sum, t) => sum + t.kWh, 0);
            const dailyRevenue = dailyActivity.reduce((sum, t) => sum + t.amountZMW, 0);
            // Health status determination
            let healthStatus = 'healthy';
            let healthScore = 100;
            const alerts = [];
            if (utilizationPercent > 95) {
                healthStatus = 'critical';
                healthScore -= 30;
                alerts.push('Near capacity - immediate attention needed');
            }
            else if (utilizationPercent > 85) {
                healthStatus = 'warning';
                healthScore -= 15;
                alerts.push('High utilization - monitor closely');
            }
            if (cluster.availableKWh < 10) {
                healthStatus = 'critical';
                healthScore -= 25;
                alerts.push('Low energy reserves');
            }
            if (recentActivity.length === 0 && cluster.availableKWh > 50) {
                healthStatus = 'idle';
                healthScore -= 10;
                alerts.push('No recent activity despite availability');
            }
            // Performance metrics
            const averageTransactionSize = recentActivity.length > 0 ?
                recentActivity.reduce((sum, t) => sum + t.kWh, 0) / recentActivity.length : 0;
            return {
                clusterId: cluster.id,
                location: cluster.location,
                status: {
                    health: healthStatus,
                    score: Math.max(0, healthScore),
                    alerts,
                    lastUpdated: now.toISOString()
                },
                capacity: {
                    totalKWh: cluster.capacityKWh,
                    availableKWh: cluster.availableKWh,
                    usedKWh: cluster.capacityKWh - cluster.availableKWh,
                    utilizationPercent: Math.round(utilizationPercent * 100) / 100
                },
                pricing: {
                    currentPrice: cluster.pricePerKWh,
                    averageRevenue24h: Math.round(dailyRevenue * 100) / 100,
                    revenuePerKWh: dailyEnergyUsed > 0 ? Math.round((dailyRevenue / dailyEnergyUsed) * 100) / 100 : 0
                },
                activity: {
                    transactionsLastHour: recentActivity.length,
                    transactionsLast24h: dailyActivity.length,
                    energyTradedLastHour: Math.round(recentActivity.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100,
                    energyTradedLast24h: Math.round(dailyEnergyUsed * 100) / 100,
                    averageTransactionSize: Math.round(averageTransactionSize * 100) / 100
                },
                predictions: {
                    timeToFullCapacity: utilizationPercent < 95 && recentActivity.length > 0 ?
                        Math.round((cluster.availableKWh / (recentActivity.reduce((sum, t) => sum + t.kWh, 0) / recentActivity.length)) * 60) : null,
                    projectedDailyRevenue: recentActivity.length > 0 ?
                        Math.round((recentActivity.reduce((sum, t) => sum + t.amountZMW, 0) * 24) * 100) / 100 : 0
                }
            };
        });
        // Overall system health
        const overallHealth = {
            totalClusters: clusters.length,
            healthyClusters: clusterStats.filter(c => c.status.health === 'healthy').length,
            warningClusters: clusterStats.filter(c => c.status.health === 'warning').length,
            criticalClusters: clusterStats.filter(c => c.status.health === 'critical').length,
            idleClusters: clusterStats.filter(c => c.status.health === 'idle').length,
            averageHealthScore: Math.round(clusterStats.reduce((sum, c) => sum + c.status.score, 0) / clusters.length),
            totalCapacity: clusters.reduce((sum, c) => sum + c.capacityKWh, 0),
            totalAvailable: clusters.reduce((sum, c) => sum + c.availableKWh, 0),
            systemUtilization: Math.round(((clusters.reduce((sum, c) => sum + c.capacityKWh, 0) -
                clusters.reduce((sum, c) => sum + c.availableKWh, 0)) /
                clusters.reduce((sum, c) => sum + c.capacityKWh, 0)) * 100 * 100) / 100
        };
        const response = {
            success: true,
            data: {
                timestamp: now.toISOString(),
                systemHealth: overallHealth,
                clusters: clusterStats,
                recommendations: {
                    immediate: clusterStats.filter(c => c.status.health === 'critical').map(c => `${c.location}: ${c.status.alerts.join(', ')}`),
                    optimization: [
                        overallHealth.systemUtilization > 80 ? 'Consider adding more capacity' : null,
                        overallHealth.idleClusters > 0 ? 'Review pricing for idle clusters' : null,
                        overallHealth.averageHealthScore < 70 ? 'System health requires attention' : null
                    ].filter(Boolean)
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Cluster monitoring error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// GET /monitoring/cluster/:clusterId - Detailed monitoring for specific cluster
router.get('/cluster/:clusterId', (req, res) => {
    try {
        const { clusterId } = req.params;
        const { hours = 24 } = req.query;
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const cluster = clusters.find(c => c.id === clusterId);
        if (!cluster) {
            const response = {
                success: false,
                error: 'Cluster not found'
            };
            return res.status(404).json(response);
        }
        const hoursBack = parseInt(hours);
        const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
        const clusterTransactions = transactions.filter(t => t.clusterId === clusterId && new Date(t.timestamp) > timeThreshold);
        // Hourly breakdown
        const hourlyData = clusterTransactions.reduce((acc, transaction) => {
            const hour = new Date(transaction.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
            if (!acc[hour]) {
                acc[hour] = {
                    timestamp: hour,
                    transactions: 0,
                    energyTraded: 0,
                    revenue: 0,
                    averagePrice: 0
                };
            }
            acc[hour].transactions += 1;
            acc[hour].energyTraded += transaction.kWh;
            acc[hour].revenue += transaction.amountZMW;
            acc[hour].averagePrice = acc[hour].revenue / acc[hour].energyTraded;
            return acc;
        }, {});
        const hourlyStats = Object.values(hourlyData).map((data) => ({
            timestamp: data.timestamp,
            transactions: data.transactions,
            energyTraded: Math.round(data.energyTraded * 100) / 100,
            revenue: Math.round(data.revenue * 100) / 100,
            averagePrice: Math.round(data.averagePrice * 100) / 100
        }));
        const response = {
            success: true,
            data: {
                cluster: {
                    id: cluster.id,
                    location: cluster.location,
                    capacity: cluster.capacityKWh,
                    available: cluster.availableKWh,
                    pricePerKWh: cluster.pricePerKWh
                },
                timeRange: `${hoursBack} hours`,
                summary: {
                    totalTransactions: clusterTransactions.length,
                    totalEnergyTraded: Math.round(clusterTransactions.reduce((sum, t) => sum + t.kWh, 0) * 100) / 100,
                    totalRevenue: Math.round(clusterTransactions.reduce((sum, t) => sum + t.amountZMW, 0) * 100) / 100,
                    averageTransactionSize: clusterTransactions.length > 0 ?
                        Math.round((clusterTransactions.reduce((sum, t) => sum + t.kWh, 0) / clusterTransactions.length) * 100) / 100 : 0,
                    peakHour: hourlyStats.length > 0 ?
                        hourlyStats.reduce((peak, hour) => hour.energyTraded > peak.energyTraded ? hour : peak) : null
                },
                hourlyBreakdown: hourlyStats,
                recentTransactions: clusterTransactions.slice(-10).map(t => ({
                    id: t.id,
                    type: t.type,
                    timestamp: t.timestamp,
                    kWh: t.kWh,
                    amountZMW: t.amountZMW,
                    carbonSaved: t.carbonSaved
                }))
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Cluster detail monitoring error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
