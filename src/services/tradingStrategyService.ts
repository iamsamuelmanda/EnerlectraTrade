import { Anthropic } from '@anthropic-ai/sdk';

// MarketData interface for trading strategy
interface MarketData {
  historical: {
    transactions: any[];
    prices: number[];
    volumes: number[];
  };
  realTime: {
    currentPrice: number;
    volume24h: number;
    utilizationRate: number;
  };
  volatility: {
    priceVolatility: number;
    volumeVolatility: number;
  };
  regulations: {
    maxTradeSize: number;
    tradingHours: string[];
    restrictions: string[];
  };
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});
const MODEL = 'claude-4-sonnet'; // Updated to Claude Sonnet 4

export const generateTradingStrategy = async (marketData: MarketData) => {
  const strategy = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: "Act as a professional algorithmic energy trader. Generate multi-timeframe trading strategies with integrated risk management and real-time adaptation capabilities.",
    messages: [{
      role: 'user',
      content: JSON.stringify({
        historicalData: marketData.historical,
        realTimeSignals: marketData.realTime,
        volatilityIndicators: marketData.volatility,
        regulatoryEnvironment: marketData.regulations
      })
    }]
  });

  // Convert to executable trading bot
  const executableStrategy = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: "Convert trading strategy into TypeScript code for AWS Lambda execution. Include: 1) Dynamic position sizing 2) Real-time risk limits 3) Market anomaly detection 4) Fail-safe mechanisms",
    messages: [{
      role: 'assistant',
      content: (strategy.content[0] as any).text || ''
    }]
  });

  return {
    strategyAnalysis: JSON.parse((strategy.content[0] as any).text || '{}'),
    executableCode: (executableStrategy.content[0] as any).text || '',
    modelVersion: "claude-4-sonnet",
    riskProfile: {
      maxDrawdown: 0.05,
      dailyLossLimit: 0.02,
      positionConcentration: 0.15
    }
  };
};