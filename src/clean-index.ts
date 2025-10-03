import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from 'dotenv';
import crypto from 'crypto';

// Load environment variables
config();

// Type definitions
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    identifier: string;
    verified: boolean;
  };
}

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    identifier: string;
    verified: boolean;
  };
  handshake: any;
  id: string;
  on: any;
  broadcast: any;
  join: any;
  emit: any;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app'],
    credentials: true
  }
});

// In-memory storage for demo purposes (replace with database in production)
const users = new Map();
const sessions = new Map();

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
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://enerlectra-frontend-c406365od-samuel-mandas-projects.vercel.app'],
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
// AUTHENTICATION MIDDLEWARE
// ========================================
function authenticateToken(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access Token Required',
      message: 'Please provide a valid authentication token'
    });
  }

  // Simple token validation (replace with JWT in production)
  const session = sessions.get(token);
  if (!session) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid Token',
      message: 'Token is invalid or expired'
    });
  }

  req.user = session.user;
  next();
}

// ========================================
// ROUTES
// ========================================
function configureRoutes() {
  // Health check with branding
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Enerlectra - The Energy Internet',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      security: {
        status: 'active',
        features: ['rate-limiting', 'helmet', 'cors', 'cookies', 'authentication']
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      features: {
        authentication: 'Enhanced authentication system with sessions',
        trading: 'Energy trading platform',
        websocket: 'Real-time WebSocket connections',
        api: 'RESTful API endpoints with security'
      },
      branding: {
        name: 'Enerlectra',
        tagline: 'The Energy Internet',
        description: 'Join the future of African energy trading with blockchain-powered efficiency',
        mission: 'Connecting energy producers and consumers through The Energy Internet'
      }
    });
  });

  // Basic API endpoints
  app.get('/api', (req, res) => {
    res.json({
      message: 'Welcome to Enerlectra API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        auth: {
          login: 'POST /auth/login',
          register: 'POST /auth/register',
          verify: 'POST /auth/verify',
          logout: 'POST /auth/logout'
        },
        trading: {
          offers: 'GET /api/trading/offers',
          create: 'POST /api/trading/offers'
        }
      }
    });
  });

  // Authentication routes
  app.post('/auth/login', (req, res) => {
    const { phone, email } = req.body;
    
    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing Credentials',
        message: 'Please provide phone number or email'
      });
    }

    const identifier = phone || email;
    const user = users.get(identifier) || { id: crypto.randomUUID(), identifier, verified: false };
    
    if (!users.has(identifier)) {
      users.set(identifier, user);
    }

    // Generate OTP (in production, send via SMS/email)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log(`OTP for ${identifier}: ${otp}`); // Remove in production

    res.json({
      success: true,
      message: 'OTP sent successfully',
      userId: user.id,
      expiresIn: '10 minutes'
    });
  });

  app.post('/auth/verify', (req, res) => {
    const { identifier, otp } = req.body;
    
    if (!identifier || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Missing Parameters',
        message: 'Please provide identifier and OTP'
      });
    }

    const user = users.get(identifier);
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP',
        message: 'OTP is invalid or expired'
      });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.verified = true;

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    const session = { user: { id: user.id, identifier, verified: user.verified }, createdAt: Date.now() };
    sessions.set(token, session);

    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      user: { id: user.id, identifier, verified: user.verified }
    });
  });

  app.post('/auth/logout', authenticateToken, (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      sessions.delete(token);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Protected trading routes
  app.get('/api/trading/offers', authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      offers: [
        {
          id: '1',
          type: 'solar',
          amount: '100kW',
          price: 0.15,
          location: 'Nairobi, Kenya',
          seller: 'SolarFarm Ltd',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'wind',
          amount: '50kW',
          price: 0.12,
          location: 'Cape Town, South Africa',
          seller: 'WindPower Co',
          expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        }
      ]
    });
  });

  app.post('/api/trading/offers', authenticateToken, (req: AuthenticatedRequest, res) => {
    const { type, amount, price, location } = req.body;
    
    if (!type || !amount || !price || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing Fields',
        message: 'Please provide type, amount, price, and location'
      });
    }

    const offer = {
      id: crypto.randomUUID(),
      type,
      amount,
      price: parseFloat(price),
      location,
      seller: req.user?.identifier || 'Unknown',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // In production, save to database
    console.log('New offer created:', offer);

    res.json({
      success: true,
      message: 'Offer created successfully',
      offer
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
  io.use((socket: AuthenticatedSocket, next) => {
    // Basic socket authentication (can be enhanced later)
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      console.log('Socket connection without token (guest mode)');
    } else {
      // Validate token
      const session = sessions.get(token);
      if (session) {
        socket.user = session.user;
        console.log(`Authenticated socket connection: ${socket.user.identifier}`);
      }
    }
    
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
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

    // Join user to their trading room
    if (socket.user) {
      socket.join(`user-${socket.user.id}`);
      socket.emit('authenticated', { user: socket.user });
    }
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
    
    // 1. Configure basic security middleware
    configureSecurityMiddleware();
    
    // 2. Configure routes
    configureRoutes();
    
    // 3. Configure WebSocket
    configureWebSocket();
    
    // 4. Configure error handling
    configureErrorHandling();
    
    console.log('🎉 Enerlectra - The Energy Internet initialized successfully!');
    console.log('🛡️  Security Features:');
    console.log('   • Rate limiting and DDoS protection');
    console.log('   • Security headers with Helmet');
    console.log('   • CORS configuration');
    console.log('   • Cookie security');
    console.log('   • Authentication middleware');
    console.log('⚡ Energy Trading Features:');
    console.log('   • Real-time WebSocket connections');
    console.log('   • RESTful API endpoints');
    console.log('   • Health monitoring');
    console.log('   • Error handling');
    console.log('   • User authentication system');
    console.log('   • Trading offers management');
    
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
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/auth/*`);
    console.log(`📈 Trading API: http://localhost:${PORT}/api/trading/*`);
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