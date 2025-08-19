"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const common_1 = require("../utils/common");
const router = (0, express_1.Router)();
// GET /wallet/:userId - Get user wallet information
router.get('/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const users = (0, common_1.readJsonFile)('users.json');
        const user = users.find(u => u.id === userId);
        if (!user) {
            const response = {
                success: false,
                error: 'User not found'
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: {
                userId: user.id,
                name: user.name,
                balanceZMW: user.balanceZMW,
                balanceKWh: user.balanceKWh,
                totalValueZMW: user.balanceZMW + (user.balanceKWh * 1.2)
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error('Wallet fetch error:', error);
        const response = {
            success: false,
            error: 'Internal server error'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=wallet.js.map