"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const aiService_1 = require("../services/aiService");
const logger_1 = __importDefault(require("../utils/logger"));
const blockchainService_1 = require("../services/blockchainService");
const router = (0, express_1.Router)();
// GET /transactions/:userId - Get user transaction history
router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { limit, offset, type } = req.query;
        const users = (0, common_1.readJsonFile)('users.json');
        const transactions = (0, common_1.readJsonFile)('transactions.json');
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
        const totalCarbonSaved = userTransactions.reduce((sum, t) => sum + (t.carbonSaved || 0), 0);
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
        let transactions = (0, common_1.readJsonFile)('transactions.json');
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
        const totalCarbonSaved = transactions.reduce((sum, t) => sum + (t.carbonSaved || 0), 0);
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
// POST /transactions - Create new transaction
router.post('/', async (req, res) => {
    try {
        const { type, userId, buyerId, sellerId, clusterId, kWh, amountZMW } = req.body;
        // Validate input
        if (!type || !kWh || !amountZMW || kWh <= 0 || amountZMW <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid transaction data'
            });
        }
        const transactions = (0, common_1.readJsonFile)('transactions.json');
        const users = (0, common_1.readJsonFile)('users.json');
        // Create transaction
        const newTransaction = {
            id: `tx_${Date.now()}`,
            type,
            userId,
            buyerId,
            sellerId,
            clusterId,
            kWh: parseFloat(kWh.toFixed(2)),
            amountZMW: parseFloat(amountZMW.toFixed(2)),
            carbonSaved: kWh * parseFloat(process.env.CARBON_SAVINGS_PER_KWH || '0.8'),
            timestamp: new Date().toISOString()
        };
        // Update user balances
        if (buyerId) {
            const buyer = users.find(u => u.id === buyerId);
            if (buyer) {
                buyer.balanceKWh += newTransaction.kWh;
                buyer.balanceZMW -= newTransaction.amountZMW;
            }
        }
        if (sellerId) {
            const seller = users.find(u => u.id === sellerId);
            if (seller) {
                seller.balanceKWh -= newTransaction.kWh;
                seller.balanceZMW += newTransaction.amountZMW;
            }
        }
        (0, common_1.writeJsonFile)('users.json', users);
        // ==================== BLOCKCHAIN INTEGRATION ====================
        // Only record certain types of transactions on blockchain
        const blockchainEligibleTypes = ['trade', 'blockchain_transfer'];
        let blockchainResult = null;
        if (blockchainEligibleTypes.includes(type) && buyerId && sellerId) {
            try {
                blockchainResult = await (0, blockchainService_1.recordEnergyTrade)(newTransaction);
                if (blockchainResult.success) {
                    // Add blockchain metadata to transaction
                    newTransaction.blockchainTxHash = blockchainResult.data.txHash;
                    newTransaction.blockchainTradeId = blockchainResult.data.tradeId;
                    newTransaction.paymentMethod = 'blockchain';
                    logger_1.default.info(`Transaction recorded on blockchain: ${blockchainResult.data.txHash}`);
                }
                else {
                    logger_1.default.error('Blockchain recording failed', blockchainResult.error);
                }
            }
            catch (blockchainError) {
                logger_1.default.error('Blockchain integration failed', blockchainError);
            }
        }
        // ==================== END BLOCKCHAIN INTEGRATION ====================
        // Add to transactions
        transactions.push(newTransaction);
        (0, common_1.writeJsonFile)('transactions.json', transactions);
        // AI Anomaly Detection using Sonnet (fire and forget)
        try {
            const anomalyCheck = await (0, aiService_1.detectAnomalies)({
                ...newTransaction,
                user: buyerId ? users.find(u => u.id === buyerId) : sellerId ? users.find(u => u.id === sellerId) : null
            });
            if (anomalyCheck.anomaly && anomalyCheck.confidence > 0.7) {
                logger_1.default.warn(`‼️ HIGH CONFIDENCE ANOMALY DETECTED (${anomalyCheck.confidence}): ${newTransaction.id}`, {
                    reasons: anomalyCheck.reasons,
                    action: anomalyCheck.suggested_action
                });
            }
        }
        catch (aiError) {
            logger_1.default.error('Anomaly detection failed', aiError);
        }
        // Prepare response
        const responseData = {
            ...newTransaction,
            blockchainResult: blockchainResult
                ? { success: blockchainResult.success, data: blockchainResult.data }
                : { message: 'Not recorded on blockchain' }
        };
        const response = {
            success: true,
            data: responseData,
            message: 'Transaction created successfully'
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Transaction creation error:', error);
        const response = {
            success: false,
            error: 'Failed to create transaction'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
