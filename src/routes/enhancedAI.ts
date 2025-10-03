import { Router, Request, Response } from 'express';
import EnhancedAIService from '../services/enhancedAIService';
import { ApiResponse } from '../types';
import logger from '../utils/logger';

const router = Router();
const aiService = EnhancedAIService.getInstance();

// POST /enhanced-ai/query - Process AI query
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, query, agentType = 'energy_advisor', context } = req.body;

    if (!userId || !query) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    const aiResponse = await aiService.processQuery(userId, query, agentType, context);

    const response: ApiResponse<any> = {
      success: true,
      data: aiResponse
    };

    res.json(response);
  } catch (error) {
    logger.error('AI query processing failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'AI query processing failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-ai/energy-advice/:userId - Get energy advice
router.get('/energy-advice/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { category = 'efficiency' } = req.query;

    const advice = await aiService.getEnergyAdvice(userId, category as string);

    const response: ApiResponse<any[]> = {
      success: true,
      data: advice
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get energy advice:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get energy advice'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-ai/market-insights/:userId - Get market insights
router.get('/market-insights/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { type = 'trend_analysis' } = req.query;

    const insights = await aiService.getMarketInsights(userId, type as string);

    const response: ApiResponse<any[]> = {
      success: true,
      data: insights
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get market insights:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get market insights'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-ai/agents/status - Get AI agents status
router.get('/agents/status', async (req: Request, res: Response) => {
  try {
    const status = await aiService.getAgentStatus();

    const response: ApiResponse<any> = {
      success: true,
      data: status
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get agent status:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get agent status'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-ai/agents/:agentId/knowledge - Update agent knowledge
router.post('/agents/:agentId/knowledge', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { knowledge } = req.body;

    if (!knowledge || !Array.isArray(knowledge)) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Knowledge must be an array'
      };
      return res.status(400).json(response);
    }

    await aiService.updateAgentKnowledge(agentId, knowledge);

    const response: ApiResponse<string> = {
      success: true,
      data: 'Agent knowledge updated successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to update agent knowledge:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to update agent knowledge'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-ai/chat - Chat with AI assistant
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { userId, message, sessionId, agentType = 'energy_advisor' } = req.body;

    if (!userId || !message) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    const context = {
      sessionId,
      previousQueries: [],
      goal: 'general_chat'
    };

    const aiResponse = await aiService.processQuery(userId, message, agentType, context);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: aiResponse.content,
        suggestions: aiResponse.suggestions,
        followUpQuestions: aiResponse.followUpQuestions,
        actions: aiResponse.actions,
        confidence: aiResponse.confidence,
        metadata: aiResponse.metadata
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Chat processing failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Chat processing failed'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-ai/ussd - USSD AI interaction
router.post('/ussd', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, query, menuPath } = req.body;

    if (!phoneNumber || !query) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    // Get user by phone number
    const { readJsonFile } = require('../utils/common');
    const users = readJsonFile('users.json');
    const user = users.find((u: any) => u.phoneNumber === phoneNumber);

    if (!user) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    // Determine agent type based on menu path
    let agentType = 'energy_advisor';
    if (menuPath?.includes('5')) {
      agentType = 'energy_advisor';
    } else if (menuPath?.includes('1')) {
      agentType = 'trading_assistant';
    } else if (menuPath?.includes('4')) {
      agentType = 'carbon_tracker';
    }

    const context = {
      sessionId: `ussd_${Date.now()}`,
      previousQueries: [],
      goal: 'ussd_interaction',
      deviceType: 'feature_phone'
    };

    const aiResponse = await aiService.processQuery(user.id, query, agentType, context);

    // Format response for USSD (limit to 160 characters)
    let ussdResponse = aiResponse.content;
    if (ussdResponse.length > 160) {
      ussdResponse = ussdResponse.substring(0, 157) + '...';
    }

    const response: ApiResponse<string> = {
      success: true,
      data: `END ${ussdResponse}`
    };

    res.json(response);
  } catch (error) {
    logger.error('USSD AI processing failed:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'USSD AI processing failed'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-ai/agents - Get all AI agents
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const status = await aiService.getAgentStatus();
    const agents = status.agents;

    const response: ApiResponse<any[]> = {
      success: true,
      data: agents
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get agents:', error);
    const response: ApiResponse<any[]> = {
      success: false,
      error: 'Failed to get agents'
    };
    res.status(500).json(response);
  }
});

// POST /enhanced-ai/feedback - Submit feedback for AI interaction
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { userId, interactionId, rating, feedback, agentType } = req.body;

    if (!userId || !interactionId || rating === undefined) {
      const response: ApiResponse<string> = {
        success: false,
        error: 'Missing required fields'
      };
      return res.status(400).json(response);
    }

    // Store feedback
    const { readJsonFile, writeJsonFile, generateId } = require('../utils/common');
    const feedbacks = readJsonFile('ai_feedback.json');
    
    const newFeedback = {
      id: generateId(),
      userId,
      interactionId,
      rating,
      feedback,
      agentType,
      timestamp: new Date().toISOString()
    };

    feedbacks.push(newFeedback);
    writeJsonFile('ai_feedback.json', feedbacks);

    const response: ApiResponse<string> = {
      success: true,
      data: 'Feedback submitted successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to submit feedback:', error);
    const response: ApiResponse<string> = {
      success: false,
      error: 'Failed to submit feedback'
    };
    res.status(500).json(response);
  }
});

// GET /enhanced-ai/analytics - Get AI analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { timeRange = 'week' } = req.query;

    // Get AI interaction data
    const { readJsonFile } = require('../utils/common');
    const interactions = readJsonFile('ai_interactions.json');
    
    // Filter by time range
    const now = new Date();
    const startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const filteredInteractions = interactions.filter((i: any) => 
      new Date(i.timestamp) >= startDate
    );

    // Calculate analytics
    const analytics = {
      totalInteractions: filteredInteractions.length,
      averageSatisfaction: filteredInteractions.reduce((sum: number, i: any) => sum + (i.satisfaction || 0), 0) / filteredInteractions.length || 0,
      averageResponseTime: filteredInteractions.reduce((sum: number, i: any) => sum + (i.responseTime || 0), 0) / filteredInteractions.length || 0,
      totalTokensUsed: filteredInteractions.reduce((sum: number, i: any) => sum + (i.tokensUsed || 0), 0),
      categoryBreakdown: {},
      agentPerformance: {}
    };

    // Category breakdown
    filteredInteractions.forEach((interaction: any) => {
      const category = interaction.category || 'unknown';
      analytics.categoryBreakdown[category] = (analytics.categoryBreakdown[category] || 0) + 1;
    });

    // Agent performance
    filteredInteractions.forEach((interaction: any) => {
      const agent = interaction.model || 'unknown';
      if (!analytics.agentPerformance[agent]) {
        analytics.agentPerformance[agent] = {
          interactions: 0,
          averageSatisfaction: 0,
          totalTokens: 0
        };
      }
      analytics.agentPerformance[agent].interactions++;
      analytics.agentPerformance[agent].averageSatisfaction += interaction.satisfaction || 0;
      analytics.agentPerformance[agent].totalTokens += interaction.tokensUsed || 0;
    });

    // Calculate averages
    Object.keys(analytics.agentPerformance).forEach(agent => {
      const perf = analytics.agentPerformance[agent];
      perf.averageSatisfaction = perf.averageSatisfaction / perf.interactions;
    });

    const response: ApiResponse<any> = {
      success: true,
      data: analytics
    };

    res.json(response);
  } catch (error) {
    logger.error('Failed to get AI analytics:', error);
    const response: ApiResponse<any> = {
      success: false,
      error: 'Failed to get AI analytics'
    };
    res.status(500).json(response);
  }
});

export default router;
