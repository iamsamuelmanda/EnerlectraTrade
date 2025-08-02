"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Import route handlers
const wallet_1 = __importDefault(require("./routes/wallet"));
const trade_1 = __importDefault(require("./routes/trade"));
const lease_1 = __importDefault(require("./routes/lease"));
const carbon_1 = __importDefault(require("./routes/carbon"));
const ussd_1 = __importDefault(require("./routes/ussd"));
const cluster_1 = __importDefault(require("./routes/cluster"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Health check endpoint
app.get('/health', (req, res) => {
    const response = {
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'Enerlectra Backend',
            version: '1.0.0'
        },
        message: 'Enerlectra energy trading platform is running'
    };
    res.json(response);
});
// API documentation endpoint
app.get('/', (req, res) => {
    const response = {
        success: true,
        data: {
            service: 'Enerlectra - African Energy Trading Platform',
            version: '1.0.0',
            description: 'Decentralized energy commerce with USSD mobile access',
            endpoints: {
                health: 'GET /health - Service health check',
                wallet: 'GET /wallet/:userId - Get user wallet information',
                trade: 'POST /trade - Trade energy between users',
                lease: 'POST /lease - Lease energy from clusters',
                carbon: 'GET /carbon/:userId - Get carbon footprint data',
                ussd: 'POST /ussd - USSD mobile interface',
                clusters: 'GET /cluster - Get all clusters, GET /cluster/:id - Get specific cluster',
                transactions: 'GET /transactions/:userId - Get user transaction history'
            },
            businessLogic: {
                energyRate: '1 kWh = 1.2 ZMW',
                carbonSavings: '0.8 kg CO2 saved per kWh traded',
                features: ['Energy trading', 'Cluster leasing', 'Carbon tracking', 'USSD access']
            }
        }
    };
    res.json(response);
});
// Mount API routes
app.use('/wallet', wallet_1.default);
app.use('/trade', trade_1.default);
app.use('/lease', lease_1.default);
app.use('/carbon', carbon_1.default);
app.use('/ussd', ussd_1.default);
app.use('/cluster', cluster_1.default);
app.use('/transactions', transactions_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    const response = {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    };
    res.status(500).json(response);
});
// 404 handler
app.use((req, res) => {
    const response = {
        success: false,
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`
    };
    res.status(404).json(response);
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔋 Enerlectra Backend Server running on port ${PORT}`);
    console.log(`🌍 African Energy Trading Platform - Ready for business!`);
    console.log(`📱 USSD Interface available at /ussd`);
    console.log(`💰 Energy Rate: 1 kWh = 1.2 ZMW`);
    console.log(`🌱 Carbon Impact: 0.8 kg CO2 saved per kWh`);
    console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
