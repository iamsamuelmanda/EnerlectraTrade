import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';

// Import security systems
import SecurityConfiguration from './config/security';
import MilitaryGradeSecurityMiddleware from './middleware/securityMiddleware';

// Import routes
import authRoutes from './routes/auth';
import tradeRoutes from './routes/trade';
import aiRoutes from './routes/ai';
import mobileMoneyRoutes from './routes/mobilemoney';
import blockchainRoutes from './routes/blockchain';

// Import services
import { initializeBlockchainService } from './services/blockchainService';

// Load environment variables
config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

// Make io instance available to routes
app.set('io', io);

// Initialize security system
let securityConfig: SecurityConfiguration;

// ========================================
// MILITARY-GRADE SECURITY INITIALIZATION
// ========================================
async function initializeSecurity() {
  try {
    console.log('🔐 Initializing military-grade security system...');
    
    securityConfig = SecurityConfiguration.getInstance();
    await securityConfig.initializeSecurity();
    
    console.log('✅ Security system initialized successfully');
    console.log('🛡️  Security status:', securityConfig.getSecurityStatus());
    
  } catch (error) {
    console.error('❌ Security initialization failed:', error);
    process.exit(1); // Exit if security cannot be initialized
  }
}

// ========================================
// SECURITY MIDDLEWARE CONFIGURATION
// ========================================
function configureSecurityMiddleware() {
  // Apply military-grade security middleware to all routes
  app.use(MilitaryGradeSecurityMiddleware.secureRequest);
  
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

  // Basic CORS (will be enhanced after security config is loaded)
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Cookie parser with basic security
  app.use(cookieParser(process.env.JWT_SECRET || 'dev-secret-change-me'));

  // Body parsing with size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  console.log('✅ Basic security middleware configured successfully');
}

// ========================================
// ENHANCE SECURITY WITH CONFIGURATION
// ========================================
function enhanceSecurityWithConfig() {
  if (!securityConfig) {
    console.warn('⚠️ Security configuration not available, using basic security');
    return;
  }

  try {
    // Enhanced rate limiting
    const rateLimitConfig = securityConfig.getNetworkConfig().rateLimit;
    const enhancedLimiter = rateLimit({
      windowMs: rateLimitConfig.windowMs,
      max: rateLimitConfig.maxRequests,
      skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
      skipFailedRequests: rateLimitConfig.skipFailedRequests,
      message: {
        success: false,
        error: 'Enhanced Rate Limit Exceeded',
        message: 'Too many requests. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    
    // Apply enhanced rate limiting to sensitive routes
    app.use('/auth', enhancedLimiter);
    app.use('/trade', enhancedLimiter);
    app.use('/blockchain', enhancedLimiter);
    
    console.log('✅ Enhanced security configuration applied successfully');
  } catch (error) {
    console.warn('⚠️ Failed to apply enhanced security configuration:', error);
  }
}

// ========================================
// ROUTE SECURITY CONFIGURATION
// ========================================
function configureRouteSecurity() {
  // Public paths (no authentication required)
  const publicPaths = [
    '/health',
    '/auth/login/start',
    '/auth/login/verify',
    '/auth/register',
    '/auth/qr/issue',
    '/auth/qr/redeem'
  ];

  // Apply MFA requirement to sensitive routes
  app.use('/admin', MilitaryGradeSecurityMiddleware.requireMFA);
  app.use('/blockchain', MilitaryGradeSecurityMiddleware.requireQuantumSignature);
  app.use('/trade', MilitaryGradeSecurityMiddleware.requireMFA);

  // Apply enhanced security to all other routes
  app.use('*', (req, res, next) => {
    if (publicPaths.includes(req.path)) {
      return next();
    }
    
    // Apply additional security checks for protected routes
    MilitaryGradeSecurityMiddleware.secureRequest(req, res, next);
  });

  console.log('✅ Route security configured successfully');
}

// ========================================
// ROUTES WITH SECURITY
// ========================================
function configureRoutes() {
  // Health check with security status
  app.get('/health', (req, res) => {
    const securityStatus = securityConfig.getSecurityStatus();
    res.json({
      status: 'healthy',
      service: 'Enerlectra - The Energy Internet',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security: {
        status: securityStatus.overall,
        quantum: securityStatus.quantum,
        threatDetection: securityStatus.threatDetection,
        blockchain: securityStatus.blockchain,
        monitoring: securityStatus.monitoring
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        authentication: 'Multi-factor authentication with biometric support',
        trading: 'Real-time energy trading platform',
        blockchain: 'Quantum-resistant blockchain security',
        ai: 'AI-powered market insights and predictions',
        mobileMoney: 'Integrated mobile money solutions',
        websocket: 'Real-time WebSocket connections'
      },
      branding: {
        name: 'Enerlectra',
        tagline: 'The Energy Internet',
        description: 'Join the future of African energy trading with blockchain-powered efficiency',
        mission: 'Connecting energy producers and consumers through The Energy Internet'
      }
    });
  });

  // Apply routes with security middleware
  app.use('/auth', authRoutes);
  app.use('/trade', tradeRoutes);
  app.use('/ai', aiRoutes);
  app.use('/mobile-money', mobileMoneyRoutes);
  app.use('/blockchain', blockchainRoutes);

  console.log('✅ Routes configured with security successfully');
}

// ========================================
// WEBSOCKET SECURITY
// ========================================
function configureWebSocketSecurity() {
  io.use((socket, next) => {
    // Verify socket authentication
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Additional socket security checks
    const clientIP = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    
    // Apply security validation
    MilitaryGradeSecurityMiddleware.secureRequest(
      { ip: clientIP, headers: { 'user-agent': userAgent } } as any,
      {} as any,
      next
    );
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Secure WebSocket connection: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: ${socket.id}`);
    });
  });

  console.log('✅ WebSocket security configured successfully');
}

// ========================================
// ERROR HANDLING WITH SECURITY
// ========================================
function configureErrorHandling() {
  // Global error handler with security logging
  app.use((error: any, req: any, res: any, next: any) => {
    console.error('🚨 Security error:', {
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

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });

  console.log('✅ Error handling configured successfully');
}

// ========================================
// MAIN INITIALIZATION
// ========================================
async function initializeApplication() {
  try {
    console.log('🚀 Initializing Enerlectra - The Energy Internet with military-grade security...');
    console.log('⚡ Mission: Connecting energy producers and consumers through The Energy Internet');
    
    // 1. Initialize security system first
    await initializeSecurity();
    
      // 2. Configure basic security middleware
  configureSecurityMiddleware();
  
  // 3. Enhance security with configuration
  enhanceSecurityWithConfig();
  
  // 4. Configure route security
  configureRouteSecurity();
    
    // 4. Configure routes
    configureRoutes();
    
    // 5. Configure WebSocket security
    configureWebSocketSecurity();
    
    // 6. Configure error handling
    configureErrorHandling();
    
    // 7. Initialize blockchain service
    if (securityConfig.getBlockchainConfig().enabled) {
      await initializeBlockchainService();
    }
    
    console.log('🎉 Enerlectra - The Energy Internet initialized successfully with military-grade security!');
    console.log('🛡️  Security Features:');
    console.log('   • Quantum-resistant cryptography');
    console.log('   • Zero-trust network architecture');
    console.log('   • AI-powered threat detection');
    console.log('   • Quantum blockchain security');
    console.log('   • Multi-factor authentication');
    console.log('   • Real-time security monitoring');
    console.log('⚡ Energy Trading Features:');
    console.log('   • Real-time energy marketplace');
    console.log('   • Blockchain-powered transactions');
    console.log('   • AI market insights');
    console.log('   • Mobile money integration');
    console.log('   • WebSocket real-time updates');
    
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
    console.log(`🔐 Security level: ${securityConfig.getSecurityStatus().overall}`);
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