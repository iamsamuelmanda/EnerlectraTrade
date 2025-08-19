"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_1 = __importDefault(require("./utils/logger"));
const init_1 = require("./db/init");
const rateLimiter_1 = require("./utils/rateLimiter");
const dotenv_1 = __importDefault(require("dotenv"));
const sdk_1 = require("@anthropic-ai/sdk");
// Load environment variables
dotenv_1.default.config();
// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY
    ? new sdk_1.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
// Import all route handlers
const wallet_1 = __importDefault(require("./routes/wallet"));
const trade_1 = __importDefault(require("./routes/trade"));
const lease_1 = __importDefault(require("./routes/lease"));
const carbon_1 = __importDefault(require("./routes/carbon"));
const ussd_1 = __importDefault(require("./routes/ussd"));
const cluster_1 = __importDefault(require("./routes/cluster"));
const clusters_1 = __importDefault(require("./routes/clusters"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const ai_1 = __importDefault(require("./routes/ai"));
const blockchain_1 = __importDefault(require("./routes/blockchain"));
const market_1 = __importDefault(require("./routes/market"));
const users_1 = __importDefault(require("./routes/users"));
const pricing_1 = __importDefault(require("./routes/pricing"));
const bulk_1 = __importDefault(require("./routes/bulk"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const mobilemoney_1 = __importDefault(require("./routes/mobilemoney"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5000;
// Define public paths for authentication
const publicPaths = [
    '/health',
    '/',
    '/ussd',
    '/mobilemoney',
    '/cluster',
    '/clusters',
    '/market/stats',
    '/pricing',
    '/ai/public' // Public AI endpoints
];
// Make Anthropic available in routes
app.locals.anthropic = anthropic;
// ======================
// MIDDLEWARE SETUP
// ======================
// Enable CORS for cross-origin requests
app.use((0, cors_1.default)());
// Add security headers (Helmet)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https: 'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));
// Parse JSON bodies
app.use(express_1.default.json());
// Parse URL-encoded bodies
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    logger_1.default.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    next();
});
// Rate limiting middleware
app.use(async (req, res, next) => {
    try {
        await (0, rateLimiter_1.consumeRateLimit)(req.ip || 'unknown');
        next();
    }
    catch (err) {
        logger_1.default.warn(`Rate limit exceeded: ${req.ip}`, { path: req.path });
        const response = {
            success: false,
            message: 'Too many requests',
            error: 'Rate limit exceeded',
            retryAfter: '60 seconds'
        };
        res.status(429).json(response);
    }
});
// API KEY AUTHENTICATION MIDDLEWARE
// =================================
app.use((req, res, next) => {
    // Skip authentication for public endpoints
    const isPublicPath = publicPaths.some(path => req.path === path || req.path.startsWith(`${path}/`));
    if (isPublicPath)
        return next();
    // API key verification
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        logger_1.default.warn('API key missing', { path: req.path, ip: req.ip });
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'API key required in X-API-Key header',
            documentation: `${req.protocol}://${req.get('host')}/#security`
        });
    }
    if (apiKey !== process.env.INTERNAL_API_KEY) {
        logger_1.default.warn('Invalid API key attempt', { path: req.path, ip: req.ip });
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Invalid API key',
            support: 'contact@enerlectra.zm'
        });
    }
    next();
});
// ======================
// ROUTE HANDLERS
// ======================
// Health check endpoint
app.get('/health', (req, res) => {
    const response = {
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'Enerlectra Backend',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            dependencies: {
                database: 'operational',
                blockchain: process.env.BLOCKCHAIN_NODE_URL ? 'connected' : 'disconnected',
                anthropic: anthropic ? 'ready' : 'disabled',
                mobileMoney: process.env.MOBILE_MONEY_API_KEY ? 'configured' : 'missing'
            }
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
                transactions: 'GET /transactions/:userId - Get user transaction history',
                market: 'GET /market/stats - Platform market statistics',
                users: 'POST /users/register - Register new user, GET /users/:userId - Get user profile',
                pricing: 'GET /pricing - Current market rates and pricing',
                bulk: 'POST /trade/bulk/trade - Execute multiple trades, POST /trade/bulk/purchase - Bulk purchases',
                schedule: 'POST /schedule/trade - Schedule future trade, GET /schedule/:userId - User scheduled transactions',
                monitoring: 'GET /monitoring/clusters - Real-time cluster monitoring',
                mobilemoney: 'POST /mobilemoney/ussd - Mobile money USSD interface',
                alerts: 'POST /alerts/subscribe - Subscribe to price alerts, POST /alerts/ussd - Alert management via USSD',
                ai: 'POST /ai/ask - Ask AI assistant'
            },
            businessLogic: {
                energyRate: `${process.env.KWH_TO_ZMW_RATE || '1.2'} ZMW per kWh`,
                carbonSavings: `${process.env.CARBON_SAVINGS_PER_KWH || '0.8'} kg CO2 saved per kWh traded`,
                features: [
                    'Energy trading',
                    'Cluster leasing',
                    'Carbon tracking',
                    'USSD access',
                    'Mobile money integration',
                    'Price alerts',
                    'Bulk operations',
                    'Energy scheduling',
                    'Real-time monitoring',
                    'AI-powered assistance'
                ]
            },
            security: {
                note: 'Protected endpoints require X-API-Key header',
                publicEndpoints: publicPaths,
                keyHeader: 'X-API-Key'
            }
        }
    };
    res.json(response);
});
// ======================
// API ROUTES
// ======================
app.use('/wallet', wallet_1.default);
app.use('/trade', trade_1.default);
app.use('/lease', lease_1.default);
app.use('/carbon', carbon_1.default);
app.use('/ussd', ussd_1.default);
app.use('/cluster', cluster_1.default);
app.use('/clusters', clusters_1.default);
app.use('/transactions', transactions_1.default);
app.use('/market', market_1.default);
app.use('/users', users_1.default);
app.use('/pricing', pricing_1.default);
app.use('/trade/bulk', bulk_1.default);
app.use('/schedule', schedule_1.default);
app.use('/monitoring', monitoring_1.default);
app.use('/mobilemoney', mobilemoney_1.default);
app.use('/alerts', alerts_1.default);
app.use('/ai', ai_1.default);
app.use('/blockchain', blockchain_1.default);
// ======================
// ERROR HANDLING
// ======================
// Error handling middleware
app.use((err, req, res, next) => {
    const errorId = `ERR-${Date.now()}`;
    logger_1.default.error(`Unhandled error [${errorId}]: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    const response = {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        errorId: errorId,
        support: 'support@enerlectra.zm'
    };
    res.status(500).json(response);
});
// 404 handler
app.use((req, res) => {
    logger_1.default.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    const response = {
        success: false,
        error: 'Not found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        suggestions: [
            '/health - Service status',
            '/ - API documentation'
        ]
    };
    res.status(404).json(response);
});
// ======================
// SERVER INITIALIZATION
// ======================
// Initialize database and start server
(0, init_1.initializeDB)().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        // ASCII Art Banner
        logger_1.default.info(`
    ███████╗███╗   ██╗███████╗██████╗ ██╗     ███████╗ ██████╗████████╗██████╗  █████╗ 
    ██╔════╝████╗  ██║██╔════╝██╔══██╗██║     ██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
    █████╗  ██╔██╗ ██║█████╗  ██████╔╝██║     █████╗  ██║        ██║   ██████╔╝███████║
    ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██║     ██╔══╝  ██║        ██║   ██╔══██╗██╔══██║
    ███████╗██║ ╚████║███████╗██║  ██║███████╗███████╗╚██████╗   ██║   ██║  ██║██║  ██║
    ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
    `);
        logger_1.default.info(`🔋 Enerlectra Backend Server v1.0.0`);
        logger_1.default.info(`🌍 Listening on port ${PORT}`);
        logger_1.default.info(`📱 USSD Interface: POST /ussd`);
        logger_1.default.info(`💸 Mobile Money: POST /mobilemoney`);
        logger_1.default.info(`🧠 AI Assistant: POST /ai/ask`);
        logger_1.default.info(`💰 Energy Rate: ${process.env.KWH_TO_ZMW_RATE || '1.2'} ZMW per kWh`);
        logger_1.default.info(`🌱 Carbon Impact: ${process.env.CARBON_SAVINGS_PER_KWH || '0.8'} kg CO2 saved per kWh`);
        logger_1.default.info(`⚙️ Environment: ${process.env.NODE_ENV || 'development'}`);
        logger_1.default.info(`📊 Health check: http://localhost:${PORT}/health`);
        // Security status report
        logger_1.default.info('🔐 Security Status:');
        logger_1.default.info(`• API Key Protection: ${process.env.INTERNAL_API_KEY ? '✅ Enabled' : '❌ DISABLED'}`);
        logger_1.default.info(`• Anthropic AI: ${anthropic ? '✅ Ready' : '❌ Disabled'}`);
        logger_1.default.info(`• Blockchain Node: ${process.env.BLOCKCHAIN_NODE_URL ? '✅ Connected' : '❌ Not configured'}`);
        logger_1.default.info(`• Mobile Money: ${process.env.MOBILE_MONEY_API_KEY ? '✅ Configured' : '❌ Missing'}`);
        // Warning if security is disabled
        if (!process.env.INTERNAL_API_KEY) {
            logger_1.default.warn('⚠️  WARNING: API key protection is disabled. Set INTERNAL_API_KEY in .env for production!');
        }
        // Success message
        logger_1.default.info('🚀 Enerlectra trading platform ready for business!');
    });
}).catch(err => {
    logger_1.default.error('❌ FATAL: Failed to start server', err);
    process.exit(1);
});
// ======================
// GRACEFUL SHUTDOWN
// ======================
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger_1.default.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
    process.exit(1);
});
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('UNHANDLED REJECTION! 💥 Shutting down...', { reason, promise });
    process.exit(1);
});
