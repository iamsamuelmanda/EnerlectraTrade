"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// POST /schedule/trade - Schedule a future energy trade
router.post('/trade', (req, res) => {
    try {
        const { buyerId, sellerId, kWh, scheduledTime, maxPrice } = req.body;
        if (!buyerId || !sellerId || !kWh || !scheduledTime || kWh <= 0) {
            const response = {
                success: false,
                error: 'buyerId, sellerId, kWh (positive), and scheduledTime are required'
            };
            return res.status(400).json(response);
        }
        const scheduleDate = new Date(scheduledTime);
        if (scheduleDate <= new Date()) {
            const response = {
                success: false,
                error: 'Scheduled time must be in the future'
            };
            return res.status(400).json(response);
        }
        if (scheduleDate > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            const response = {
                success: false,
                error: 'Cannot schedule more than 30 days in advance'
            };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        const buyer = users.find(u => u.id === buyerId);
        const seller = users.find(u => u.id === sellerId);
        if (!buyer || !seller) {
            const response = {
                success: false,
                error: 'Buyer or seller not found'
            };
            return res.status(404).json(response);
        }
        if (buyerId === sellerId) {
            const response = {
                success: false,
                error: 'Buyer and seller cannot be the same'
            };
            return res.status(400).json(response);
        }
        const estimatedCost = kWh * (maxPrice || 1.2);
        const scheduledTransactions = (0, common_1.readJsonFile)('scheduled_transactions.json');
        const scheduledTrade = {
            id: (0, common_1.generateId)(),
            type: 'trade',
            scheduledTime,
            status: 'pending',
            buyerId,
            sellerId,
            kWh,
            amountZMW: estimatedCost,
            createdAt: new Date().toISOString()
        };
        scheduledTransactions.push(scheduledTrade);
        (0, common_1.writeJsonFile)('scheduled_transactions.json', scheduledTransactions);
        const response = {
            success: true,
            data: {
                scheduleId: scheduledTrade.id,
                buyerId,
                sellerId,
                kWh,
                estimatedCost,
                scheduledTime,
                status: 'pending',
                createdAt: scheduledTrade.createdAt
            },
            message: 'Energy trade scheduled successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Schedule trade error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// POST /schedule/purchase - Schedule a future energy purchase from cluster
router.post('/purchase', (req, res) => {
    try {
        const { userId, clusterId, kWh, scheduledTime, maxPrice } = req.body;
        if (!userId || !clusterId || !kWh || !scheduledTime || kWh <= 0) {
            const response = {
                success: false,
                error: 'userId, clusterId, kWh (positive), and scheduledTime are required'
            };
            return res.status(400).json(response);
        }
        const scheduleDate = new Date(scheduledTime);
        if (scheduleDate <= new Date()) {
            const response = {
                success: false,
                error: 'Scheduled time must be in the future'
            };
            return res.status(400).json(response);
        }
        const users = (0, common_1.readJsonFile)('users.json');
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const user = users.find(u => u.id === userId);
        const cluster = clusters.find(c => c.id === clusterId);
        if (!user) {
            const response = {
                success: false,
                error: 'User not found'
            };
            return res.status(404).json(response);
        }
        if (!cluster) {
            const response = {
                success: false,
                error: 'Cluster not found'
            };
            return res.status(404).json(response);
        }
        const estimatedCost = kWh * (maxPrice || cluster.pricePerKWh);
        const scheduledTransactions = (0, common_1.readJsonFile)('scheduled_transactions.json');
        const scheduledPurchase = {
            id: (0, common_1.generateId)(),
            type: 'purchase',
            scheduledTime,
            status: 'pending',
            userId,
            clusterId,
            kWh,
            amountZMW: estimatedCost,
            createdAt: new Date().toISOString()
        };
        scheduledTransactions.push(scheduledPurchase);
        (0, common_1.writeJsonFile)('scheduled_transactions.json', scheduledTransactions);
        const response = {
            success: true,
            data: {
                scheduleId: scheduledPurchase.id,
                userId,
                clusterId,
                clusterLocation: cluster.location,
                kWh,
                estimatedCost,
                scheduledTime,
                status: 'pending',
                createdAt: scheduledPurchase.createdAt
            },
            message: 'Energy purchase scheduled successfully'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Schedule purchase error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// GET /schedule/:userId - Get user's scheduled transactions
router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { status, limit, offset } = req.query;
        const users = (0, common_1.readJsonFile)('users.json');
        const user = users.find(u => u.id === userId);
        if (!user) {
            const response = {
                success: false,
                error: 'User not found'
            };
            return res.status(404).json(response);
        }
        let scheduledTransactions = (0, common_1.readJsonFile)('scheduled_transactions.json');
        // Filter by user
        scheduledTransactions = scheduledTransactions.filter(st => st.buyerId === userId || st.sellerId === userId || st.userId === userId);
        // Filter by status if provided
        if (status && typeof status === 'string') {
            scheduledTransactions = scheduledTransactions.filter(st => st.status === status);
        }
        // Sort by scheduled time
        scheduledTransactions.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
        // Apply pagination
        const limitNum = limit ? parseInt(limit) : 20;
        const offsetNum = offset ? parseInt(offset) : 0;
        const paginatedTransactions = scheduledTransactions.slice(offsetNum, offsetNum + limitNum);
        const response = {
            success: true,
            data: {
                scheduledTransactions: paginatedTransactions,
                pagination: {
                    total: scheduledTransactions.length,
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: offsetNum + limitNum < scheduledTransactions.length
                },
                summary: {
                    totalScheduled: scheduledTransactions.length,
                    pending: scheduledTransactions.filter(st => st.status === 'pending').length,
                    executed: scheduledTransactions.filter(st => st.status === 'executed').length,
                    cancelled: scheduledTransactions.filter(st => st.status === 'cancelled').length,
                    failed: scheduledTransactions.filter(st => st.status === 'failed').length
                }
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Get scheduled transactions error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// DELETE /schedule/:scheduleId - Cancel a scheduled transaction
router.delete('/:scheduleId', (req, res) => {
    try {
        const { scheduleId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            const response = {
                success: false,
                error: 'userId is required to cancel scheduled transaction'
            };
            return res.status(400).json(response);
        }
        const scheduledTransactions = (0, common_1.readJsonFile)('scheduled_transactions.json');
        const transactionIndex = scheduledTransactions.findIndex(st => st.id === scheduleId);
        if (transactionIndex === -1) {
            const response = {
                success: false,
                error: 'Scheduled transaction not found'
            };
            return res.status(404).json(response);
        }
        const transaction = scheduledTransactions[transactionIndex];
        // Verify user has permission to cancel
        const canCancel = transaction.buyerId === userId ||
            transaction.sellerId === userId ||
            transaction.userId === userId;
        if (!canCancel) {
            const response = {
                success: false,
                error: 'Not authorized to cancel this scheduled transaction'
            };
            return res.status(403).json(response);
        }
        if (transaction.status !== 'pending') {
            const response = {
                success: false,
                error: `Cannot cancel transaction with status: ${transaction.status}`
            };
            return res.status(400).json(response);
        }
        // Cancel the transaction
        scheduledTransactions[transactionIndex].status = 'cancelled';
        scheduledTransactions[transactionIndex].reason = 'Cancelled by user';
        (0, common_1.writeJsonFile)('scheduled_transactions.json', scheduledTransactions);
        const response = {
            success: true,
            data: {
                scheduleId: transaction.id,
                status: 'cancelled',
                type: transaction.type,
                kWh: transaction.kWh,
                scheduledTime: transaction.scheduledTime
            },
            message: 'Scheduled transaction cancelled successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Cancel scheduled transaction error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// POST /schedule/execute - Execute pending scheduled transactions (internal/cron endpoint)
router.post('/execute', (req, res) => {
    try {
        const scheduledTransactions = (0, common_1.readJsonFile)('scheduled_transactions.json');
        const users = (0, common_1.readJsonFile)('users.json');
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const now = new Date();
        const executionResults = [];
        const pendingTransactions = scheduledTransactions.filter(st => st.status === 'pending' && new Date(st.scheduledTime) <= now);
        for (const scheduledTx of pendingTransactions) {
            const txIndex = scheduledTransactions.findIndex(st => st.id === scheduledTx.id);
            try {
                if (scheduledTx.type === 'trade') {
                    // Execute trade
                    const buyer = users.find(u => u.id === scheduledTx.buyerId);
                    const seller = users.find(u => u.id === scheduledTx.sellerId);
                    if (!buyer || !seller) {
                        scheduledTransactions[txIndex].status = 'failed';
                        scheduledTransactions[txIndex].reason = 'User not found';
                        continue;
                    }
                    if (buyer.balanceZMW < scheduledTx.amountZMW || seller.balanceKWh < scheduledTx.kWh) {
                        scheduledTransactions[txIndex].status = 'failed';
                        scheduledTransactions[txIndex].reason = 'Insufficient balance';
                        continue;
                    }
                    (0, common_1.updateUserBalance)(users, scheduledTx.buyerId, -scheduledTx.amountZMW, scheduledTx.kWh);
                    (0, common_1.updateUserBalance)(users, scheduledTx.sellerId, scheduledTx.amountZMW, -scheduledTx.kWh);
                    const newTransaction = (0, common_1.createTransaction)('trade', {
                        buyerId: scheduledTx.buyerId,
                        sellerId: scheduledTx.sellerId,
                        kWh: scheduledTx.kWh,
                        amountZMW: scheduledTx.amountZMW
                    });
                    transactions.push(newTransaction);
                    scheduledTransactions[txIndex].status = 'executed';
                    scheduledTransactions[txIndex].executionTime = now.toISOString();
                }
                else if (scheduledTx.type === 'purchase') {
                    // Execute purchase
                    const user = users.find(u => u.id === scheduledTx.userId);
                    const cluster = clusters.find(c => c.id === scheduledTx.clusterId);
                    if (!user || !cluster) {
                        scheduledTransactions[txIndex].status = 'failed';
                        scheduledTransactions[txIndex].reason = 'User or cluster not found';
                        continue;
                    }
                    if (user.balanceZMW < scheduledTx.amountZMW || cluster.availableKWh < scheduledTx.kWh) {
                        scheduledTransactions[txIndex].status = 'failed';
                        scheduledTransactions[txIndex].reason = 'Insufficient balance or availability';
                        continue;
                    }
                    (0, common_1.updateUserBalance)(users, scheduledTx.userId, -scheduledTx.amountZMW, scheduledTx.kWh);
                    const clusterIndex = clusters.findIndex(c => c.id === scheduledTx.clusterId);
                    clusters[clusterIndex].availableKWh -= scheduledTx.kWh;
                    const newTransaction = (0, common_1.createTransaction)('lease', {
                        userId: scheduledTx.userId,
                        clusterId: scheduledTx.clusterId,
                        kWh: scheduledTx.kWh,
                        amountZMW: scheduledTx.amountZMW
                    });
                    transactions.push(newTransaction);
                    scheduledTransactions[txIndex].status = 'executed';
                    scheduledTransactions[txIndex].executionTime = now.toISOString();
                }
                executionResults.push({
                    scheduleId: scheduledTx.id,
                    status: 'executed',
                    type: scheduledTx.type
                });
            }
            catch (error) {
                scheduledTransactions[txIndex].status = 'failed';
                scheduledTransactions[txIndex].reason = 'Execution error';
                executionResults.push({
                    scheduleId: scheduledTx.id,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Save all changes
        (0, common_1.writeJsonFile)('scheduled_transactions.json', scheduledTransactions);
        (0, common_1.writeJsonFile)('users.json', users);
        (0, common_1.writeJsonFile)('clusters.json', clusters);
        (0, common_1.writeJsonFile)('transactions.json', transactions);
        const response = {
            success: true,
            data: {
                totalPending: pendingTransactions.length,
                executed: executionResults.filter(r => r.status === 'executed').length,
                failed: executionResults.filter(r => r.status === 'failed').length,
                results: executionResults
            },
            message: `Scheduled transaction execution completed`
        };
        res.json(response);
    }
    catch (error) {
        console.error('Execute scheduled transactions error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
