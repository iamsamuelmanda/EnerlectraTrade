import { Anthropic } from '@anthropic-ai/sdk';
import { Transaction, User } from '../types';
import { readJsonFile } from '../utils/common';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});
const MODEL = 'claude-4-sonnet';

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const cacheResponse = (key: string, ttlSeconds: number, fn: () => any) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
    return cached.data;
  }
  const data = fn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};

// Improved market data with caching
const getRealTimeMarketData = () => {
  return cacheResponse('market-data', 300, () => { // Cache for 5 minutes
    try {
      const transactions = readJsonFile<Transaction>('transactions.json');
      const last24hTransactions = transactions.filter(t => 
        new Date(t.timestamp) > new Date(Date.now() - 86400000)
      );
      
      const totalVolume = last24hTransactions.reduce((sum, t) => sum + t.amountZMW, 0);
      const totalEnergy = last24hTransactions.reduce((sum, t) => sum + t.kWh, 0);
      
      return {
        totalVolume24h: totalVolume,
        totalEnergy24h: totalEnergy,
        averagePrice: totalEnergy ? totalVolume / totalEnergy : 1.2,
        transactionCount: last24hTransactions.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Market data error:', error);
      return defaultMarketData();
    }
  });
};

// Improved grid data with fallback
const getGridLoadData = () => {
  return cacheResponse('grid-data', 600, () => { // Cache for 10 minutes
    try {
      const clusters = readJsonFile<any>('clusters.json');
      const totalCapacity = clusters.reduce((sum: number, c: any) => sum + c.capacityKWh, 0);
      const totalAvailable = clusters.reduce((sum: number, c: any) => sum + c.availableKWh, 0);
      const utilization = totalCapacity ? (totalCapacity - totalAvailable) / totalCapacity : 0;
      
      return {
        totalCapacity,
        totalAvailable,
        utilizationRate: Math.round(utilization * 100),
        loadStatus: utilization > 0.8 ? 'High' : utilization > 0.5 ? 'Medium' : 'Low',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Grid data error:', error);
      return defaultGridData();
    }
  });
};

// Default data helpers
const defaultMarketData = () => ({
  totalVolume24h: 0,
  totalEnergy24h: 0,
  averagePrice: 1.2,
  transactionCount: 0,
  timestamp: new Date().toISOString()
});

const defaultGridData = () => ({
  totalCapacity: 0,
  totalAvailable: 0,
  utilizationRate: 0,
  loadStatus: 'Low',
  timestamp: new Date().toISOString()
});

// Core insights service
export const generateEnergyInsights = async (user: User, transactions: Transaction[]) => {
  // Prepare data for AI analysis
  const userData = {
    id: user.id,
    location: (user as any).location || 'Unknown',
    usagePatterns: (user as any).usagePatterns || [],
    balanceZMW: user.balanceZMW,
    balanceKWh: user.balanceKWh,
    devices: (user as any).devices || []
  };
  
  const analysisPayload = {
    userProfile: userData,
    transactionPatterns: transactions.slice(-90),
    marketConditions: getRealTimeMarketData(),
    gridStatus: getGridLoadData()
  };

  // Enhanced Claude prompt for optimization tips
  const optimizationPrompt = `As an energy optimization expert, analyze this data and:
1. Identify 3 key savings opportunities
2. Recommend specific actions with estimated savings
3. Flag any usage anomalies
4. Format response as JSON: {
   optimizationTips: [{
     device: string, 
     savingPotential: string, 
     action: string, 
     implementation: "auto"|"manual"
   }],
   weeklySavingsEstimate: number
 }`;

  try {
    // Get optimization insights
    const usageAnalysis = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      system: "You are an energy efficiency expert providing actionable recommendations",
      messages: [{
        role: 'user',
        content: `${JSON.stringify(analysisPayload)}\n\n${optimizationPrompt}`
      }]
    });
    
    // Trading strategy prompt
    const tradingPrompt = `As a professional energy trader, create trading strategies based on:
- Current market conditions
- User's energy portfolio
- Grid load status
Format response as JSON: {
  tradingSignals: [{
    action: "BUY"|"SELL", 
    kwh: number, 
    timing: string, 
    confidence: 0.1-1.0, 
    rationale: string
  }],
  weeklyEarningsEstimate: number
}`;

    const forecast = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      system: "Generate profitable energy trading strategies with risk assessment",
      messages: [{
        role: 'user',
        content: `${JSON.stringify({
          market: getRealTimeMarketData(),
          grid: getGridLoadData(),
          userConstraints: { 
            maxRiskZMW: user.balanceZMW * 0.1,
            availableKWh: user.balanceKWh
          }
        })}\n\n${tradingPrompt}`
      }]
    });

    // Parse responses
    const optimization = parseClaudeResponse(usageAnalysis);
    const trading = parseClaudeResponse(forecast);
    
    // Calculate actual metrics
    const weeklySavings = calculateWeeklySavings(transactions);
    const weeklyEarnings = calculateWeeklyEarnings(transactions);
    const carbonImpact = calculateCarbonImpact(transactions);

    // Build premium dashboard response
    return {
      user: user.id,
      period: "weekly",
      valueMetrics: {
        financial: {
          savings: weeklySavings,
          tradingEarnings: weeklyEarnings,
          roi: calculateROI(user.balanceZMW, weeklyEarnings),
          avoidedPeakCosts: calculateAvoidedCosts(transactions)
        },
        environmental: {
          carbonReduction: carbonImpact,
          equivalent: carbonToTreeEquivalence(carbonImpact),
          gridStabilization: calculateGridContribution(transactions)
        },
        engagement: {
          masteryLevel: getUserLevel(user),
          knowledgeGain: calculateKnowledgeGain(user),
          communityRank: getCommunityRank(user)
        }
      },
      intelligence: {
        tradingSignals: trading.tradingSignals || [],
        optimizationTips: optimization.optimizationTips || []
      },
      generatedBy: MODEL,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Claude API error:', error);
    return getFallbackInsights(user, transactions);
  }
};

// Helper functions
const parseClaudeResponse = (response: any) => {
  try {
    const text = (response.content[0] as any).text;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}') + 1;
    return JSON.parse(text.substring(start, end));
  } catch (e) {
    console.error('Parse error:', e);
    return {};
  }
};

const calculateWeeklySavings = (transactions: Transaction[]) => {
  // Calculate savings from energy efficiency (not from transaction type)
  return transactions.reduce((sum, t) => {
    // Assume savings based on carbon saved or other metrics
    return sum + (t.carbonSaved || 0) * 0.1; // 0.1 ZMW per kg CO2 saved
  }, 0);
};

const calculateWeeklyEarnings = (transactions: Transaction[]) => {
  return transactions
    .filter(t => t.type === 'trade')
    .reduce((sum, t) => sum + t.amountZMW, 0);
};

const calculateCarbonImpact = (transactions: Transaction[]) => {
  return transactions.reduce((sum, t) => sum + (t.carbonSaved || 0), 0);
};

const calculateROI = (balance: number, earnings: number) => {
  return balance > 0 ? (earnings / balance) * 100 : 0;
};

const calculateAvoidedCosts = (transactions: Transaction[]) => {
  return transactions.reduce((sum, t) => sum + (t.carbonSaved || 0) * 0.05, 0);
};

const carbonToTreeEquivalence = (carbonKg: number) => {
  return `${Math.round(carbonKg / 22)} trees`; // 22kg CO2 per tree per year
};

const calculateGridContribution = (transactions: Transaction[]) => {
  return transactions.length * 0.1; // Simple metric based on transaction count
};

const getUserLevel = (user: User) => {
  const balance = user.balanceZMW + user.balanceKWh;
  if (balance > 1000) return 'Expert';
  if (balance > 500) return 'Intermediate';
  if (balance > 100) return 'Beginner';
  return 'Newcomer';
};

const calculateKnowledgeGain = (user: User) => {
  return Math.min((user.balanceZMW + user.balanceKWh) / 10, 100);
};

const getCommunityRank = (user: User) => {
  const score = user.balanceZMW + user.balanceKWh;
  if (score > 500) return 'Leader';
  if (score > 200) return 'Active';
  if (score > 50) return 'Member';
  return 'Newcomer';
};

// Fallback for API failures
const getFallbackInsights = (user: User, transactions: Transaction[]) => ({
  user: user.id,
  period: "weekly",
  valueMetrics: {
    financial: {
      savings: 0,
      tradingEarnings: 0,
      roi: 0,
      avoidedPeakCosts: 0
    },
    environmental: {
      carbonReduction: 0,
      equivalent: "0 trees",
      gridStabilization: 0
    },
    engagement: {
      masteryLevel: "Beginner",
      knowledgeGain: 0,
      communityRank: "Newcomer"
    }
  },
  intelligence: {
    tradingSignals: [{
      action: "HOLD", 
      kwh: 0, 
      timing: "N/A", 
      confidence: 0, 
      rationale: "System updating"
    }],
    optimizationTips: [{
      device: "All", 
      savingPotential: "0 ZMW/week", 
      action: "Check back later",
      implementation: "manual"
    }]
  },
  generatedBy: "fallback",
  timestamp: new Date().toISOString()
});