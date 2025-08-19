"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// GET /cluster/:id - Get cluster information
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const cluster = clusters.find(c => c.id === id);
        if (!cluster) {
            const response = {
                success: false,
                error: 'Cluster not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                ...cluster,
                utilizationPercent: Math.round(((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100),
                status: cluster.availableKWh > 0 ? 'Available' : 'Full Capacity'
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Cluster fetch error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
// GET /cluster - Get all clusters
router.get('/', (req, res) => {
    try {
        const clusters = (0, common_1.readJsonFile)('clusters.json');
        const clustersWithStats = clusters.map(cluster => ({
            ...cluster,
            utilizationPercent: Math.round(((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100),
            status: cluster.availableKWh > 0 ? 'Available' : 'Full Capacity'
        }));
        const response = {
            success: true,
            data: {
                clusters: clustersWithStats,
                totalCapacity: clusters.reduce((sum, c) => sum + c.capacityKWh, 0),
                totalAvailable: clusters.reduce((sum, c) => sum + c.availableKWh, 0),
                averagePrice: clusters.reduce((sum, c) => sum + c.pricePerKWh, 0) / clusters.length
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Clusters fetch error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=cluster.js.map