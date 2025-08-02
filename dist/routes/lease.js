"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utils_1 = require("../utils");
const router = (0, express_1.Router)();
// POST /lease - Lease energy from a cluster
router.post('/', (req, res) => {
    try {
        const { userId, clusterId, kWh, amountZMW } = req.body;
        // Validation
        if (!userId || !clusterId || !kWh || !amountZMW || kWh <= 0 || amountZMW <= 0) {
            const response = {
                success: false,
                error: 'Missing or invalid parameters. Required: userId, clusterId, kWh (positive), amountZMW (positive)'
            };
            return res.status(400).json(response);
        }
        const users = (0, utils_1.readJsonFile)('users.json');
        const clusters = (0, utils_1.readJsonFile)('clusters.json');
        const transactions = (0, utils_1.readJsonFile)('transactions.json');
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
        // Check if cluster has enough available energy
        if (cluster.availableKWh < kWh) {
            const response = {
                success: false,
                error: `Insufficient energy in cluster. Required: ${kWh} kWh, Available: ${cluster.availableKWh} kWh`
            };
            return res.status(400).json(response);
        }
        // Check user balance
        if (user.balanceZMW < amountZMW) {
            const response = {
                success: false,
                error: `Insufficient ZMW balance. Required: ${amountZMW}, Available: ${user.balanceZMW}`
            };
            return res.status(400).json(response);
        }
        // Validate pricing (should be close to cluster's price per kWh)
        const expectedCost = kWh * cluster.pricePerKWh;
        if (Math.abs(amountZMW - expectedCost) > 0.1) {
            const response = {
                success: false,
                error: `Invalid pricing. Expected cost: ${expectedCost.toFixed(2)} ZMW for ${kWh} kWh at ${cluster.pricePerKWh} ZMW/kWh`
            };
            return res.status(400).json(response);
        }
        // Execute lease
        (0, utils_1.updateUserBalance)(users, userId, -amountZMW, kWh);
        // Update cluster availability
        const clusterIndex = clusters.findIndex(c => c.id === clusterId);
        clusters[clusterIndex].availableKWh -= kWh;
        // Create transaction record
        const transaction = (0, utils_1.createTransaction)('lease', {
            userId,
            clusterId,
            kWh,
            amountZMW
        });
        transactions.push(transaction);
        // Save changes
        (0, utils_1.writeJsonFile)('users.json', users);
        (0, utils_1.writeJsonFile)('clusters.json', clusters);
        (0, utils_1.writeJsonFile)('transactions.json', transactions);
        const response = {
            success: true,
            data: {
                transactionId: transaction.id,
                userId,
                clusterId,
                clusterLocation: cluster.location,
                kWh,
                amountZMW,
                carbonSaved: transaction.carbonSaved,
                timestamp: transaction.timestamp
            },
            message: 'Energy lease completed successfully'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Lease error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
