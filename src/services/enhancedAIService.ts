import { Anthropic } from '@anthropic-ai/sdk';
import logger from '../utils/logger';
import { readJsonFile, writeJsonFile, generateId } from '../utils/common';
import { User, Transaction, Cluster } from '../types';
import UsageTrackingService from './usageTrackingService';

interface AIAgent {
  id: string;
  name: string;
  role: 'energy_advisor' | 'trading_assistant' | 'carbon_tracker' | 'customer_support' | 'market_analyst';
  personality: string;
  expertise: string[];
  knowledgeBase: string[];
  conversationHistory: Conversation[];
  learningData: LearningData;
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
}

interface Conversation {
  id: string;
  userId: string;
  sessionId: string;
  messages: Message[];
  context: ConversationContext;
  satisfaction: number;
  outcome: string;
  timestamp: string;
  duration: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ConversationContext {
  userProfile: {
    id: string;
    name: string;
    balanceZMW: number;
    balanceKWh: number;
    energyUsage: number;
    carbonSaved: number;
    tradingHistory: number;
    preferences: any;
  };
  marketConditions: {
    currentPrice: number;
    demand: string;
    supply: string;
    volatility: number;
    trends: string[];
  };
  energyData: {
    availableClusters: Cluster[];
    recentTransactions: Transaction[];
    weatherConditions: any;
    gridStatus: string;
  };
  sessionData: {
    startTime: string;
    currentGoal: string;
    previousQueries: string[];
    userIntent: string;
  };
}

interface LearningData {
  successfulInteractions: number;
  failedInteractions: number;
  commonQueries: Map<string, number>;
  userPreferences: Map<string, any>;
  marketInsights: Map<string, any>;
  energyPatterns: Map<string, any>;
  improvementSuggestions: string[];
  lastLearningUpdate: string;
}

interface AIResponse {
  content: string;
  confidence: number;
  suggestions: string[];
  followUpQuestions: string[];
  actions: string[];
  metadata: {
    model: string;
    tokensUsed: number;
    responseTime: number;
    contextUsed: string[];
  };
}

interface EnergyAdvice {
  category: 'efficiency' | 'cost_savings' | 'renewable_energy' | 'trading_strategy' | 'carbon_reduction';
  advice: string;
  impact: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short_term' | 'long_term';
  cost: number;
  savings: number;
  carbonReduction: number;
  steps: string[];
  resources: string[];
}

interface MarketInsight {
  type: 'price_prediction' | 'demand_forecast' | 'supply_analysis' | 'trend_analysis' | 'opportunity_alert';
  insight: string;
  confidence: number;
  timeframe: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  data: any;
}

class EnhancedAIService {
  private static instance: EnhancedAIService;
  private anthropic: Anthropic;
  private agents: Map<string, AIAgent> = new Map();
  private usageTrackingService: UsageTrackingService;
  private readonly DEFAULT_MODEL = "claude-sonnet-4-20250514";

  private constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
    this.usageTrackingService = UsageTrackingService.getInstance();
    this.initializeAgents();
  }

  public static getInstance(): EnhancedAIService {
    if (!EnhancedAIService.instance) {
      EnhancedAIService.instance = new EnhancedAIService();
    }
    return EnhancedAIService.instance;
  }

  private initializeAgents(): void {
    // Energy Advisor Agent
    this.agents.set('energy_advisor', {
      id: 'energy_advisor',
      name: 'Enerlectra Energy Advisor',
      role: 'energy_advisor',
      personality: 'Knowledgeable, practical, and environmentally conscious. Focuses on helping users optimize their energy usage and reduce costs while promoting sustainability.',
      expertise: ['energy_efficiency', 'renewable_energy', 'cost_optimization', 'carbon_reduction', 'smart_home_automation'],
      knowledgeBase: [
        'Energy efficiency best practices',
        'Renewable energy technologies',
        'Carbon footprint reduction strategies',
        'Energy trading optimization',
        'Smart grid technologies',
        'Energy storage solutions',
        'Peak demand management',
        'Energy audit procedures'
      ],
      conversationHistory: [],
      learningData: {
        successfulInteractions: 0,
        failedInteractions: 0,
        commonQueries: new Map(),
        userPreferences: new Map(),
        marketInsights: new Map(),
        energyPatterns: new Map(),
        improvementSuggestions: [],
        lastLearningUpdate: new Date().toISOString()
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Trading Assistant Agent
    this.agents.set('trading_assistant', {
      id: 'trading_assistant',
      name: 'Enerlectra Trading Assistant',
      role: 'trading_assistant',
      personality: 'Analytical, data-driven, and strategic. Helps users make informed trading decisions based on market conditions and personal energy needs.',
      expertise: ['market_analysis', 'trading_strategies', 'price_prediction', 'risk_management', 'portfolio_optimization'],
      knowledgeBase: [
        'Energy market dynamics',
        'Trading strategies and patterns',
        'Price forecasting models',
        'Risk assessment techniques',
        'Market timing strategies',
        'Portfolio diversification',
        'Technical analysis',
        'Fundamental analysis'
      ],
      conversationHistory: [],
      learningData: {
        successfulInteractions: 0,
        failedInteractions: 0,
        commonQueries: new Map(),
        userPreferences: new Map(),
        marketInsights: new Map(),
        energyPatterns: new Map(),
        improvementSuggestions: [],
        lastLearningUpdate: new Date().toISOString()
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Carbon Tracker Agent
    this.agents.set('carbon_tracker', {
      id: 'carbon_tracker',
      name: 'Enerlectra Carbon Tracker',
      role: 'carbon_tracker',
      personality: 'Environmental advocate, informative, and motivating. Focuses on helping users understand and reduce their carbon footprint through energy choices.',
      expertise: ['carbon_accounting', 'environmental_impact', 'sustainability_metrics', 'green_energy', 'climate_action'],
      knowledgeBase: [
        'Carbon footprint calculation methods',
        'Environmental impact assessment',
        'Sustainability best practices',
        'Green energy technologies',
        'Climate change mitigation',
        'Carbon offset strategies',
        'Environmental regulations',
        'Sustainable development goals'
      ],
      conversationHistory: [],
      learningData: {
        successfulInteractions: 0,
        failedInteractions: 0,
        commonQueries: new Map(),
        userPreferences: new Map(),
        marketInsights: new Map(),
        energyPatterns: new Map(),
        improvementSuggestions: [],
        lastLearningUpdate: new Date().toISOString()
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Customer Support Agent
    this.agents.set('customer_support', {
      id: 'customer_support',
      name: 'Enerlectra Support Assistant',
      role: 'customer_support',
      personality: 'Helpful, patient, and solution-oriented. Provides technical support and answers questions about the Enerlectra platform.',
      expertise: ['platform_support', 'technical_troubleshooting', 'account_management', 'billing_support', 'feature_guidance'],
      knowledgeBase: [
        'Enerlectra platform features',
        'Account management procedures',
        'Billing and payment systems',
        'Technical troubleshooting guides',
        'Mobile money integration',
        'USSD functionality',
        'Energy trading processes',
        'Carbon tracking features'
      ],
      conversationHistory: [],
      learningData: {
        successfulInteractions: 0,
        failedInteractions: 0,
        commonQueries: new Map(),
        userPreferences: new Map(),
        marketInsights: new Map(),
        energyPatterns: new Map(),
        improvementSuggestions: [],
        lastLearningUpdate: new Date().toISOString()
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });

    // Market Analyst Agent
    this.agents.set('market_analyst', {
      id: 'market_analyst',
      name: 'Enerlectra Market Analyst',
      role: 'market_analyst',
      personality: 'Professional, insightful, and forward-thinking. Provides market analysis and insights to help users understand energy market trends.',
      expertise: ['market_research', 'trend_analysis', 'economic_forecasting', 'industry_insights', 'competitive_analysis'],
      knowledgeBase: [
        'Energy market trends',
        'Economic indicators',
        'Industry analysis',
        'Competitive landscape',
        'Regulatory changes',
        'Technology disruptions',
        'Investment opportunities',
        'Risk factors'
      ],
      conversationHistory: [],
      learningData: {
        successfulInteractions: 0,
        failedInteractions: 0,
        commonQueries: new Map(),
        userPreferences: new Map(),
        marketInsights: new Map(),
        energyPatterns: new Map(),
        improvementSuggestions: [],
        lastLearningUpdate: new Date().toISOString()
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  }

  public async processQuery(
    userId: string,
    query: string,
    agentType: string = 'energy_advisor',
    context?: any
  ): Promise<AIResponse> {
    try {
      const startTime = Date.now();
      const agent = this.agents.get(agentType);
      
      if (!agent) {
        throw new Error(`Agent ${agentType} not found`);
      }

      // Build conversation context
      const conversationContext = await this.buildConversationContext(userId, context);
      
      // Generate system prompt
      const systemPrompt = this.generateSystemPrompt(agent, conversationContext);
      
      // Create conversation
      const conversation = await this.createConversation(userId, query, agent, conversationContext);
      
      // Get AI response
      const response = await this.anthropic.messages.create({
        model: this.DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: query
          }
        ]
      });

      const responseTime = Date.now() - startTime;
      const content = response.content[0];
      
      if (content.type !== 'text') {
        throw new Error('Unexpected response format');
      }

      // Process response
      const aiResponse: AIResponse = {
        content: content.text,
        confidence: this.calculateConfidence(content.text, conversationContext),
        suggestions: this.generateSuggestions(content.text, conversationContext),
        followUpQuestions: this.generateFollowUpQuestions(content.text, conversationContext),
        actions: this.extractActions(content.text),
        metadata: {
          model: this.DEFAULT_MODEL,
          tokensUsed: response.usage?.output_tokens || 0,
          responseTime,
          contextUsed: Object.keys(conversationContext)
        }
      };

      // Update conversation
      await this.updateConversation(conversation, query, aiResponse.content);
      
      // Track interaction
      await this.trackAIInteraction(userId, query, agentType, aiResponse, responseTime);
      
      // Update agent learning
      await this.updateAgentLearning(agent, query, aiResponse, true);

      return aiResponse;
    } catch (error) {
      logger.error('AI query processing failed:', error);
      
      // Track failed interaction
      await this.trackAIInteraction(userId, query, agentType, {
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        confidence: 0,
        suggestions: [],
        followUpQuestions: [],
        actions: [],
        metadata: {
          model: this.DEFAULT_MODEL,
          tokensUsed: 0,
          responseTime: 0,
          contextUsed: []
        }
      }, 0);

      throw error;
    }
  }

  private async buildConversationContext(userId: string, additionalContext?: any): Promise<ConversationContext> {
    try {
      // Get user profile
      const users = readJsonFile('users.json');
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Get user transactions
      const transactions = readJsonFile('transactions.json');
      const userTransactions = transactions.filter(t => t.userId === userId);

      // Get available clusters
      const clusters = readJsonFile('clusters.json');

      // Calculate user metrics
      const energyUsage = userTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const carbonSaved = userTransactions.reduce((sum, t) => sum + (t.carbonSaved || 0), 0);

      return {
        userProfile: {
          id: user.id,
          name: user.name,
          balanceZMW: user.balanceZMW,
          balanceKWh: user.balanceKWh,
          energyUsage,
          carbonSaved,
          tradingHistory: userTransactions.length,
          preferences: user.preferences || {}
        },
        marketConditions: {
          currentPrice: parseFloat(process.env.KWH_TO_ZMW_RATE || '1.2'),
          demand: 'medium',
          supply: 'medium',
          volatility: 0.15,
          trends: ['increasing_renewable_adoption', 'stable_pricing']
        },
        energyData: {
          availableClusters: clusters,
          recentTransactions: userTransactions.slice(-10),
          weatherConditions: additionalContext?.weather || {},
          gridStatus: 'stable'
        },
        sessionData: {
          startTime: new Date().toISOString(),
          currentGoal: additionalContext?.goal || 'general_inquiry',
          previousQueries: additionalContext?.previousQueries || [],
          userIntent: this.detectUserIntent(additionalContext?.query || '')
        }
      };
    } catch (error) {
      logger.error('Failed to build conversation context:', error);
      throw error;
    }
  }

  private generateSystemPrompt(agent: AIAgent, context: ConversationContext): string {
    return `
You are ${agent.name}, an AI assistant for Enerlectra, Africa's leading peer-to-peer energy trading platform.

PERSONALITY: ${agent.personality}

EXPERTISE: ${agent.expertise.join(', ')}

CURRENT CONTEXT:
- User: ${context.userProfile.name} (${context.userProfile.id})
- Balance: ${context.userProfile.balanceZMW.toFixed(2)} ZMW, ${context.userProfile.balanceKWh.toFixed(2)} kWh
- Energy Usage: ${context.userProfile.energyUsage.toFixed(2)} kWh
- Carbon Saved: ${context.userProfile.carbonSaved.toFixed(1)} kg CO2
- Trading History: ${context.userProfile.tradingHistory} transactions

MARKET CONDITIONS:
- Current Price: ${context.marketConditions.currentPrice} ZMW/kWh
- Demand: ${context.marketConditions.demand}
- Supply: ${context.marketConditions.supply}
- Volatility: ${context.marketConditions.volatility}

AVAILABLE ENERGY CLUSTERS:
${context.energyData.availableClusters.map(c => 
  `- ${c.name}: ${c.availableKWh.toFixed(1)} kWh at ${c.pricePerKWh.toFixed(2)} ZMW/kWh`
).join('\n')}

PLATFORM FEATURES:
- Energy trading (1 kWh = ${process.env.KWH_TO_ZMW_RATE || '1.2'} ZMW base rate)
- Energy cluster leasing
- Carbon footprint tracking (${process.env.CARBON_SAVINGS_PER_KWH || '0.8'}kg CO2 saved per kWh)
- USSD access for mobile phones
- Mobile money integration (MTN, Airtel, Zamtel)
- AI-powered insights and recommendations

INSTRUCTIONS:
1. Provide helpful, accurate, and actionable advice
2. Use simple, clear language suitable for African energy users
3. Consider the user's current balance and energy needs
4. Suggest specific actions they can take
5. Be encouraging about energy efficiency and carbon reduction
6. If you don't know something, say so and suggest where to find more information
7. Always end with a relevant follow-up question or suggestion

Remember: You're helping users make informed decisions about energy trading, efficiency, and sustainability in the African context.
`;
  }

  private async createConversation(
    userId: string,
    query: string,
    agent: AIAgent,
    context: ConversationContext
  ): Promise<Conversation> {
    const conversation: Conversation = {
      id: generateId(),
      userId,
      sessionId: generateId(),
      messages: [
        {
          id: generateId(),
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        }
      ],
      context,
      satisfaction: 0,
      outcome: 'in_progress',
      timestamp: new Date().toISOString(),
      duration: 0
    };

    agent.conversationHistory.push(conversation);
    return conversation;
  }

  private async updateConversation(conversation: Conversation, query: string, response: string): Promise<void> {
    conversation.messages.push({
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });

    conversation.duration = Date.now() - new Date(conversation.timestamp).getTime();
  }

  private calculateConfidence(response: string, context: ConversationContext): number {
    // Simple confidence calculation based on response length and context usage
    let confidence = 0.5;
    
    if (response.length > 100) confidence += 0.2;
    if (response.includes('specific') || response.includes('recommend')) confidence += 0.1;
    if (response.includes('ZMW') || response.includes('kWh')) confidence += 0.1;
    if (response.includes('carbon') || response.includes('energy')) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateSuggestions(response: string, context: ConversationContext): string[] {
    const suggestions: string[] = [];
    
    if (context.userProfile.balanceKWh < 10) {
      suggestions.push('Consider buying energy to maintain your balance');
    }
    
    if (context.userProfile.carbonSaved < 50) {
      suggestions.push('Explore renewable energy options to increase your carbon savings');
    }
    
    if (context.marketConditions.demand === 'high') {
      suggestions.push('Current high demand - consider selling energy if you have surplus');
    }
    
    return suggestions;
  }

  private generateFollowUpQuestions(response: string, context: ConversationContext): string[] {
    return [
      'Would you like to know more about energy efficiency tips?',
      'Are you interested in joining an energy cluster?',
      'Would you like to see your carbon footprint details?',
      'Do you need help with a specific energy trading strategy?'
    ];
  }

  private extractActions(response: string): string[] {
    const actions: string[] = [];
    
    if (response.includes('buy') || response.includes('purchase')) {
      actions.push('navigate_to_trading');
    }
    
    if (response.includes('cluster') || response.includes('join')) {
      actions.push('navigate_to_clusters');
    }
    
    if (response.includes('carbon') || response.includes('environment')) {
      actions.push('navigate_to_carbon_tracking');
    }
    
    return actions;
  }

  private detectUserIntent(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('buy') || lowerQuery.includes('purchase')) return 'buy_energy';
    if (lowerQuery.includes('sell') || lowerQuery.includes('offer')) return 'sell_energy';
    if (lowerQuery.includes('efficient') || lowerQuery.includes('save')) return 'energy_efficiency';
    if (lowerQuery.includes('carbon') || lowerQuery.includes('environment')) return 'carbon_reduction';
    if (lowerQuery.includes('price') || lowerQuery.includes('cost')) return 'pricing_inquiry';
    if (lowerQuery.includes('help') || lowerQuery.includes('support')) return 'support_request';
    
    return 'general_inquiry';
  }

  private async trackAIInteraction(
    userId: string,
    query: string,
    category: string,
    response: AIResponse,
    responseTime: number
  ): Promise<void> {
    try {
      const users = readJsonFile('users.json');
      const user = users.find(u => u.id === userId);
      const transactions = readJsonFile('transactions.json');
      const userTransactions = transactions.filter(t => t.userId === userId);

      this.usageTrackingService.trackAIIntraction({
        userId,
        query,
        category: category as any,
        response: response.content,
        satisfaction: response.confidence,
        followUpActions: response.actions,
        context: {
          userBalance: user?.balanceZMW || 0,
          recentTransactions: userTransactions.length,
          energyUsage: userTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
          carbonSaved: userTransactions.reduce((sum, t) => sum + (t.carbonSaved || 0), 0)
        },
        model: response.metadata.model,
        tokensUsed: response.metadata.tokensUsed,
        responseTime: response.metadata.responseTime
      });
    } catch (error) {
      logger.error('Failed to track AI interaction:', error);
    }
  }

  private async updateAgentLearning(agent: AIAgent, query: string, response: AIResponse, success: boolean): Promise<void> {
    try {
      if (success) {
        agent.learningData.successfulInteractions++;
      } else {
        agent.learningData.failedInteractions++;
      }

      // Update common queries
      const queryKey = query.toLowerCase().substring(0, 50);
      const currentCount = agent.learningData.commonQueries.get(queryKey) || 0;
      agent.learningData.commonQueries.set(queryKey, currentCount + 1);

      // Update last learning update
      agent.learningData.lastLearningUpdate = new Date().toISOString();
      agent.lastUpdated = new Date().toISOString();

      // Save agent data
      const agents = readJsonFile('ai_agents.json');
      const agentIndex = agents.findIndex(a => a.id === agent.id);
      
      if (agentIndex >= 0) {
        agents[agentIndex] = agent;
      } else {
        agents.push(agent);
      }
      
      writeJsonFile('ai_agents.json', agents);
    } catch (error) {
      logger.error('Failed to update agent learning:', error);
    }
  }

  public async getEnergyAdvice(userId: string, category: string): Promise<EnergyAdvice[]> {
    try {
      const context = await this.buildConversationContext(userId);
      const agent = this.agents.get('energy_advisor');
      
      if (!agent) {
        throw new Error('Energy advisor agent not found');
      }

      const query = `Provide specific energy advice for ${category} category. Consider the user's current situation and provide actionable recommendations.`;
      const response = await this.processQuery(userId, query, 'energy_advisor', context);

      // Parse response into structured advice
      const advice: EnergyAdvice[] = [
        {
          category: category as any,
          advice: response.content,
          impact: 'medium',
          timeframe: 'short_term',
          cost: 0,
          savings: 0,
          carbonReduction: 0,
          steps: response.suggestions,
          resources: []
        }
      ];

      return advice;
    } catch (error) {
      logger.error('Failed to get energy advice:', error);
      throw error;
    }
  }

  public async getMarketInsights(userId: string, type: string): Promise<MarketInsight[]> {
    try {
      const context = await this.buildConversationContext(userId);
      const agent = this.agents.get('market_analyst');
      
      if (!agent) {
        throw new Error('Market analyst agent not found');
      }

      const query = `Provide market insights for ${type} analysis. Include current trends, predictions, and actionable recommendations.`;
      const response = await this.processQuery(userId, query, 'market_analyst', context);

      // Parse response into structured insights
      const insights: MarketInsight[] = [
        {
          type: type as any,
          insight: response.content,
          confidence: response.confidence,
          timeframe: '1 week',
          impact: 'medium',
          actionable: response.actions.length > 0,
          recommendations: response.suggestions,
          data: context.marketConditions
        }
      ];

      return insights;
    } catch (error) {
      logger.error('Failed to get market insights:', error);
      throw error;
    }
  }

  public async getAgentStatus(): Promise<any> {
    try {
      const agents = Array.from(this.agents.values());
      
      return {
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.isActive).length,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          isActive: agent.isActive,
          successfulInteractions: agent.learningData.successfulInteractions,
          failedInteractions: agent.learningData.failedInteractions,
          lastUpdated: agent.lastUpdated
        }))
      };
    } catch (error) {
      logger.error('Failed to get agent status:', error);
      throw error;
    }
  }

  public async updateAgentKnowledge(agentId: string, knowledge: string[]): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      agent.knowledgeBase = [...agent.knowledgeBase, ...knowledge];
      agent.lastUpdated = new Date().toISOString();

      // Save updated agent
      const agents = readJsonFile('ai_agents.json');
      const agentIndex = agents.findIndex(a => a.id === agent.id);
      
      if (agentIndex >= 0) {
        agents[agentIndex] = agent;
      } else {
        agents.push(agent);
      }
      
      writeJsonFile('ai_agents.json', agents);
    } catch (error) {
      logger.error('Failed to update agent knowledge:', error);
      throw error;
    }
  }
}

export default EnhancedAIService;
