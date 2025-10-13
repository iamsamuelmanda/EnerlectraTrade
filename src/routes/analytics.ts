import { Router, Request, Response } from 'express';
import UsageTrackingService from '../services/usageTrackingService';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();
const usageTrackingService = UsageTrackingService.getInstance();

// POST /analytics/track/activity - Track user activity
router.post('/track/activity', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, activity, category, details, deviceInfo, location, metadata } = req.body;

    if (!userId || !sessionId || !activity || !category) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackUserActivity({
      userId,
      sessionId,
      activity,
      category,
      details,
      deviceInfo,
      location,
      metadata
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'Activity tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track activity:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track activity'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/energy-usage - Track energy usage
router.post('/track/energy-usage', async (req: Request, res: Response) => {
  try {
    const { userId, energyConsumed, energyGenerated, energyTraded, carbonSaved, cost, source, location, weather, efficiency } = req.body;

    if (!userId || energyConsumed === undefined) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackEnergyUsage({
      userId,
      energyConsumed,
      energyGenerated,
      energyTraded,
      carbonSaved,
      cost,
      source,
      location,
      weather,
      efficiency
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'Energy usage tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track energy usage:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track energy usage'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/trading-behavior - Track trading behavior
router.post('/track/trading-behavior', async (req: Request, res: Response) => {
  try {
    const { userId, action, amount, price, currency, marketConditions, success, duration, retryCount, paymentMethod, clusterId } = req.body;

    if (!userId || !action || amount === undefined || price === undefined) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackTradingBehavior({
      userId,
      action,
      amount,
      price,
      currency,
      marketConditions,
      success,
      duration,
      retryCount,
      paymentMethod,
      clusterId
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'Trading behavior tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track trading behavior:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track trading behavior'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/ai-interaction - Track AI interaction
router.post('/track/ai-interaction', async (req: Request, res: Response) => {
  try {
    const { userId, query, category, response: aiResponse, satisfaction, followUpActions, context, model, tokensUsed, responseTime } = req.body;

    if (!userId || !query || !category || !aiResponse) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackAIIntraction({
      userId,
      query,
      category,
      response: aiResponse,
      satisfaction,
      followUpActions,
      context,
      model,
      tokensUsed,
      responseTime
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'AI interaction tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track AI interaction:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track AI interaction'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/ussd-usage - Track USSD usage
router.post('/track/ussd-usage', async (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, menuPath, action, success, duration, errorMessage, deviceType, network, location } = req.body;

    if (!userId || !phoneNumber || !menuPath || !action) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackUSSDUsage({
      userId,
      phoneNumber,
      menuPath,
      action,
      success,
      duration,
      errorMessage,
      deviceType,
      network,
      location
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'USSD usage tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track USSD usage:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track USSD usage'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/mobile-money-usage - Track mobile money usage
router.post('/track/mobile-money-usage', async (req: Request, res: Response) => {
  try {
    const { userId, provider, action, amount, currency, success, fees, duration, retryCount, errorCode, deviceInfo } = req.body;

    if (!userId || !provider || !action || amount === undefined) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackMobileMoneyUsage({
      userId,
      provider,
      action,
      amount,
      currency,
      success,
      fees,
      duration,
      retryCount,
      errorCode,
      deviceInfo
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'Mobile money usage tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track mobile money usage:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track mobile money usage'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/track/carbon-footprint - Track carbon footprint
router.post('/track/carbon-footprint', async (req: Request, res: Response) => {
  try {
    const { userId, energySource, energyConsumed, carbonEmitted, carbonSaved, offsetCredits, efficiency, location, weather } = req.body;

    if (!userId || energyConsumed === undefined || carbonEmitted === undefined) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    usageTrackingService.trackCarbonFootprint({
      userId,
      energySource,
      energyConsumed,
      carbonEmitted,
      carbonSaved,
      offsetCredits,
      efficiency,
      location,
      weather
    });

    const response: ApiResponse<string> = {
      success: true,
      data: 'Carbon footprint tracked successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to track carbon footprint:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to track carbon footprint'
    };
    res.status(500).json(response);
  }
});

// GET /analytics/dashboard - Get analytics dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { timeRange = 'week' } = req.query;

    const analytics = await usageTrackingService.generateAnalytics(timeRange as any);

    const response: ApiResponse<any> = {
      success: true,
      data: analytics
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to generate analytics:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to generate analytics'
    };
    res.status(500).json(response);
  }
});

// GET /analytics/export - Export analytics data
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'json' } = req.query;

    const data = await usageTrackingService.exportData(format as any);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="enerlectra-analytics.csv"');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="enerlectra-analytics.json"');
    }

    res.send(data);
  } catch (error) {
    logger.error('Failed to export analytics:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to export analytics'
    };
    res.status(500).json(response);
  }
});

// POST /analytics/sync - Force sync to cloud
router.post('/sync', async (req: Request, res: Response) => {
  try {
    await usageTrackingService.forceSync();

    const response: ApiResponse<string> = {
      success: true,
      data: 'Analytics synced to cloud successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to sync analytics:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to sync analytics'
    };
    res.status(500).json(response);
  }
});

// GET /analytics/status - Get analytics service status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const pendingCount = usageTrackingService.getPendingDataCount();

    const status = {
      service: 'active',
      pendingDataCount: pendingCount,
      lastSync: new Date().toISOString(),
      cloudDatabaseUrl: process.env.CLOUD_DATABASE_URL || 'Not configured'
    };

    const response: ApiResponse<any> = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get analytics status:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get analytics status'
    };
    res.status(500).json(response);
  }
});

// GET /analytics/user/:userId - Get user-specific analytics
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { timeRange = 'week' } = req.query;

    // This would typically fetch user-specific analytics
    // For now, return a placeholder response
    const userAnalytics = {
      userId,
      timeRange,
      totalEnergyTraded: 0,
      totalCarbonSaved: 0,
      totalTransactions: 0,
      averageSessionDuration: 0,
      favoriteFeatures: [],
      lastActivity: new Date().toISOString()
    };

    const response: ApiResponse<any> = {
      success: true,
      data: userAnalytics
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get user analytics:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get user analytics'
    };
    res.status(500).json(response);
  }
});

export default router;
