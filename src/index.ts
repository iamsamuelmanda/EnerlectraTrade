import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApiResponse } from './types';
import logger from './utils/logger';
import { initializeDB } from './db/init';
import { consumeRateLimit } from './utils/rateLimiter';
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config();

// Initialize Anthropic client
const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Import all route handlers
import walletRoutes from './routes/wallet';
import tradeRoutes from './routes/trade';
import leaseRoutes from './routes/lease';
import carbonRoutes from './routes/carbon';
import ussdRoutes from './routes/ussd';
import clusterRoutes from './routes/cluster';
import clustersRoutes from './routes/clusters';
import transactionRoutes from './routes/transactions';
import aiRoutes from './routes/ai';
import blockchainRoutes from './routes/blockchain';
import marketRoutes from './routes/market';
import userRoutes from './routes/users';
import pricingRoutes from './routes/pricing';
import bulkRoutes from './routes/bulk';
import scheduleRoutes from './routes/schedule';
import monitoringRoutes from './routes/monitoring';
import mobileMoneyRoutes from './routes/mobilemoney';
import alertRoutes from './routes/alerts';

const app = express();
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
  '/ai/public'  // Public AI endpoints
];

// Make Anthropic available in routes
app.locals.anthropic = anthropic;

// ======================
// MIDDLEWARE SETUP
// ======================

// Enable CORS for cross-origin requests
app.use(cors());

// Add security headers (Helmet)
app.use(helmet({
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
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    await consumeRateLimit(req.ip || 'unknown');
    next();
  } catch (err) {
    logger.warn(`Rate limit exceeded: ${req.ip}`, { path: req.path });
    const response: ApiResponse = {
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
  const isPublicPath = publicPaths.some(path => 
    req.path === path || req.path.startsWith(`${path}/`)
  );
  
  if (isPublicPath) return next();
  
  // API key verification
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    logger.warn('API key missing', { path: req.path, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key required in X-API-Key header',
      documentation: `${req.protocol}://${req.get('host')}/#security`
    });
  }
  
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    logger.warn('Invalid API key attempt', { path: req.path, ip: req.ip });
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
  const response: ApiResponse = {
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
  const response: ApiResponse = {
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

app.use('/wallet', walletRoutes);
app.use('/trade', tradeRoutes);
app.use('/lease', leaseRoutes);
app.use('/carbon', carbonRoutes);
app.use('/ussd', ussdRoutes);
app.use('/cluster', clusterRoutes);
app.use('/clusters', clustersRoutes);
app.use('/transactions', transactionRoutes);
app.use('/market', marketRoutes);
app.use('/users', userRoutes);
app.use('/pricing', pricingRoutes);
app.use('/trade/bulk', bulkRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/monitoring', monitoringRoutes);
app.use('/mobilemoney', mobileMoneyRoutes);
app.use('/alerts', alertRoutes);
app.use('/ai', aiRoutes);
app.use('/blockchain', blockchainRoutes);

// ======================
// ERROR HANDLING
// ======================

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorId = `ERR-${Date.now()}`;
  logger.error(`Unhandled error [${errorId}]: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  const response: ApiResponse = {
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
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  
  const response: ApiResponse = {
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
initializeDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    // ASCII Art Banner
    logger.info(`
    ███████╗███╗   ██╗███████╗██████╗ ██╗     ███████╗ ██████╗████████╗██████╗  █████╗ 
    ██╔════╝████╗  ██║██╔════╝██╔══██╗██║     ██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
    █████╗  ██╔██╗ ██║█████╗  ██████╔╝██║     █████╗  ██║        ██║   ██████╔╝███████║
    ██╔══╝  ██║╚██╗██║██╔══╝  ██╔══██╗██║     ██╔══╝  ██║        ██║   ██╔══██╗██╔══██║
    ███████╗██║ ╚████║███████╗██║  ██║███████╗███████╗╚██████╗   ██║   ██║  ██║██║  ██║
    ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
    `);
    
    logger.info(`🔋 Enerlectra Backend Server v1.0.0`);
    logger.info(`🌍 Listening on port ${PORT}`);
    logger.info(`📱 USSD Interface: POST /ussd`);
    logger.info(`💸 Mobile Money: POST /mobilemoney`);
    logger.info(`🧠 AI Assistant: POST /ai/ask`);
    logger.info(`💰 Energy Rate: ${process.env.KWH_TO_ZMW_RATE || '1.2'} ZMW per kWh`);
    logger.info(`🌱 Carbon Impact: ${process.env.CARBON_SAVINGS_PER_KWH || '0.8'} kg CO2 saved per kWh`);
    logger.info(`⚙️ Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    
    // Security status report
    logger.info('🔐 Security Status:');
    logger.info(`• API Key Protection: ${process.env.INTERNAL_API_KEY ? '✅ Enabled' : '❌ DISABLED'}`);
    logger.info(`• Anthropic AI: ${anthropic ? '✅ Ready' : '❌ Disabled'}`);
    logger.info(`• Blockchain Node: ${process.env.BLOCKCHAIN_NODE_URL ? '✅ Connected' : '❌ Not configured'}`);
    logger.info(`• Mobile Money: ${process.env.MOBILE_MONEY_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    
    // Warning if security is disabled
    if (!process.env.INTERNAL_API_KEY) {
      logger.warn('⚠️  WARNING: API key protection is disabled. Set INTERNAL_API_KEY in .env for production!');
    }
    
    // Success message
    logger.info('🚀 Enerlectra trading platform ready for business!');
  });
}).catch(err => {
  logger.error('❌ FATAL: Failed to start server', err);
  process.exit(1);
});

// ======================
// GRACEFUL SHUTDOWN
// ======================

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { reason, promise });
  process.exit(1);
});