import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://enerlectra.vercel.app'],
    credentials: true
  }
});

// Make io instance available to routes
app.set('io', io);

// ========================================
// BASIC SECURITY MIDDLEWARE
// ========================================
function configureSecurityMiddleware() {
  // Enhanced security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://enerlectra.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Cookie parser
  app.use(cookieParser(process.env.JWT_SECRET || 'dev-secret-change-me'));

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  console.log('✅ Basic security middleware configured successfully');
}

// ========================================
// ROUTES
// ========================================
function configureRoutes() {
  // Import route modules
  const authRoutes = require('./routes/auth');
  const userRoutes = require('./routes/users');
  const tradeRoutes = require('./routes/trade');
  const walletRoutes = require('./routes/wallet');
  const clusterRoutes = require('./routes/cluster');
  const transactionRoutes = require('./routes/transactions');
  const carbonRoutes = require('./routes/carbon');
  const ussdRoutes = require('./routes/ussd');
  const mobileMoneyRoutes = require('./routes/mobilemoney');
  const blockchainRoutes = require('./routes/blockchain');
  const aiRoutes = require('./routes/ai');
  const enhancedMobileMoneyRoutes = require('./routes/enhancedMobileMoney');
  const analyticsRoutes = require('./routes/analytics');
  const enhancedAIRoutes = require('./routes/enhancedAI');
  const autoUpdateRoutes = require('./routes/autoUpdate');

  // Health check with branding
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Enerlectra - The Energy Internet',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security: {
        status: 'active',
        features: ['rate-limiting', 'helmet', 'cors', 'cookies']
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        authentication: 'Enhanced authentication system',
        trading: 'Energy trading platform',
        websocket: 'Real-time WebSocket connections',
        api: 'RESTful API endpoints',
        offline: 'Offline functionality with sync',
        mobileMoney: 'Enhanced mobile money services',
        ai: 'AI-powered assistance system',
        analytics: 'Usage tracking and analytics',
        autoUpdate: 'Automatic update system'
      },
      branding: {
        name: 'Enerlectra',
        tagline: 'The Energy Internet',
        description: 'Join the future of African energy trading with blockchain-powered efficiency',
        mission: 'Connecting energy producers and consumers through The Energy Internet'
      }
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/trade', tradeRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/cluster', clusterRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/carbon', carbonRoutes);
  app.use('/api/ussd', ussdRoutes);
  app.use('/api/mobilemoney', mobileMoneyRoutes);
  app.use('/api/blockchain', blockchainRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/enhanced-mobile-money', enhancedMobileMoneyRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/enhanced-ai', enhancedAIRoutes);
  app.use('/api/auto-update', autoUpdateRoutes);

  // Basic API endpoints
  app.get('/api', (req, res) => {
    res.json({
      message: 'Welcome to Enerlectra API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        auth: '/api/auth',
        users: '/api/users',
        trade: '/api/trade',
        wallet: '/api/wallet',
        cluster: '/api/cluster',
        transactions: '/api/transactions',
        carbon: '/api/carbon',
        ussd: '/api/ussd',
        mobileMoney: '/api/mobilemoney',
        blockchain: '/api/blockchain',
        ai: '/api/ai',
        enhancedMobileMoney: '/api/enhanced-mobile-money',
        analytics: '/api/analytics',
        enhancedAI: '/api/enhanced-ai',
        autoUpdate: '/api/auto-update'
      }
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });

  console.log('✅ Routes configured successfully');
}

// ========================================
// WEBSOCKET CONFIGURATION
// ========================================
function configureWebSocket() {
  io.use((socket, next) => {
    // Basic socket authentication (can be enhanced later)
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      console.log('Socket connection without token (guest mode)');
    }
    
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 WebSocket connection: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: ${socket.id}`);
    });

    // Handle energy trading events
    socket.on('trade-completed', (data) => {
      console.log('Trade completed:', data);
      socket.broadcast.emit('trade-update', data);
    });

    socket.on('offer-created', (data) => {
      console.log('Offer created:', data);
      socket.broadcast.emit('offer-update', data);
    });
  });

  console.log('✅ WebSocket configured successfully');
}

// ========================================
// ERROR HANDLING
// ========================================
function configureErrorHandling() {
  // Global error handler
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('🚨 Error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Don't expose internal errors to clients
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request'
    });
  });

  console.log('✅ Error handling configured successfully');
}

// ========================================
// MAIN INITIALIZATION
// ========================================
async function initializeApplication() {
  try {
    console.log('🚀 Initializing Enerlectra - The Energy Internet...');
    console.log('⚡ Mission: Connecting energy producers and consumers through The Energy Internet');
    
    // 1. Initialize database
    const { initializeDB } = require('./db/init');
    await initializeDB();
    
    // 2. Initialize services
    const OfflineService = require('./services/offlineService').default;
    const UsageTrackingService = require('./services/usageTrackingService').default;
    const EnhancedAIService = require('./services/enhancedAIService').default;
    const AutoUpdateService = require('./services/autoUpdateService').default;
    
    // Initialize service instances
    OfflineService.getInstance();
    UsageTrackingService.getInstance();
    EnhancedAIService.getInstance();
    AutoUpdateService.getInstance();
    
    // 3. Configure basic security middleware
    configureSecurityMiddleware();
    
    // 4. Configure routes
    configureRoutes();
    
    // 5. Configure WebSocket
    configureWebSocket();
    
    // 6. Configure error handling
    configureErrorHandling();
    
    console.log('🎉 Enerlectra - The Energy Internet initialized successfully!');
    console.log('🛡️  Security Features:');
    console.log('   • Rate limiting and DDoS protection');
    console.log('   • Security headers with Helmet');
    console.log('   • CORS configuration');
    console.log('   • Cookie security');
    console.log('⚡ Energy Trading Features:');
    console.log('   • Real-time WebSocket connections');
    console.log('   • RESTful API endpoints');
    console.log('   • Health monitoring');
    console.log('   • Error handling');
    console.log('📱 Enhanced Features:');
    console.log('   • Offline functionality with sync');
    console.log('   • Enhanced mobile money services (MTN, Airtel, Zamtel)');
    console.log('   • AI-powered assistance system');
    console.log('   • Usage tracking and analytics');
    console.log('   • Automatic update system');
    
  } catch (error) {
    console.error('❌ Application initialization failed:', error);
    process.exit(1);
  }
}

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  await initializeApplication();
  
  server.listen(PORT, () => {
    console.log(`🚀 Enerlectra - The Energy Internet server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`⚡ Welcome to The Energy Internet!`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the application
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});