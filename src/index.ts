import express from 'express';
import cors from 'cors';
import { ApiResponse } from './types';

// Import route handlers
import walletRoutes from './routes/wallet';
import tradeRoutes from './routes/trade';
import leaseRoutes from './routes/lease';
import carbonRoutes from './routes/carbon';
import ussdRoutes from './routes/ussd';
import clusterRoutes from './routes/cluster';
import transactionRoutes from './routes/transactions';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const response: ApiResponse = {
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
app.use('/wallet', walletRoutes);
app.use('/trade', tradeRoutes);
app.use('/lease', leaseRoutes);
app.use('/carbon', carbonRoutes);
app.use('/ussd', ussdRoutes);
app.use('/cluster', clusterRoutes);
app.use('/transactions', transactionRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  };
  res.status(500).json(response);
});

// 404 handler
app.use((req, res) => {
  const response: ApiResponse = {
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
